import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import {
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import {
  MatFormFieldModule,
  MAT_FORM_FIELD_DEFAULT_OPTIONS,
} from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AdminService } from '../../../core/services/admin.service';
import { NotificationService } from '../../../core/services/notification.service';
import { User } from '../../../core/models/user.model';
import { PASSWORD_HINT, PASSWORD_PATTERN } from '../../../core/auth/password-policy';

/** Diálogo para dar de alta un nuevo administrador; es la única forma de crear uno. */
@Component({
  selector: 'tkt-create-admin-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  providers: [
    {
      provide: MAT_FORM_FIELD_DEFAULT_OPTIONS,
      useValue: { subscriptSizing: 'dynamic', appearance: 'outline' },
    },
  ],
  template: `
    <div class="wrap">
      <header>
        <h2 mat-dialog-title>Nuevo administrador</h2>
        <button mat-icon-button mat-dialog-close aria-label="Cerrar">
          <mat-icon>close</mat-icon>
        </button>
      </header>

      <form [formGroup]="form" (ngSubmit)="submit()">
        <mat-dialog-content>
          <mat-form-field>
            <mat-label>Nombre completo</mat-label>
            <input matInput formControlName="fullName" autocomplete="name" />
            @if (form.controls.fullName.invalid && form.controls.fullName.touched) {
              <mat-error>Ingresa el nombre.</mat-error>
            }
          </mat-form-field>

          <mat-form-field>
            <mat-label>Correo electrónico</mat-label>
            <input matInput type="email" formControlName="email" autocomplete="email" />
            @if (form.controls.email.hasError('required') && form.controls.email.touched) {
              <mat-error>Ingresa el correo.</mat-error>
            }
            @if (form.controls.email.hasError('email')) {
              <mat-error>Correo no válido.</mat-error>
            }
          </mat-form-field>

          <mat-form-field>
            <mat-label>Contraseña</mat-label>
            <input
              matInput
              [type]="hide() ? 'password' : 'text'"
              formControlName="password"
              autocomplete="new-password"
            />
            <button
              type="button"
              mat-icon-button
              matSuffix
              (click)="hide.set(!hide())"
              [attr.aria-label]="hide() ? 'Mostrar contraseña' : 'Ocultar contraseña'"
            >
              <mat-icon>{{ hide() ? 'visibility' : 'visibility_off' }}</mat-icon>
            </button>
            <mat-hint>{{ passwordHint }}</mat-hint>
            @if (form.controls.password.invalid && form.controls.password.touched) {
              <mat-error>{{ passwordHint }}</mat-error>
            }
          </mat-form-field>
        </mat-dialog-content>

        <mat-dialog-actions align="end">
          <button mat-button type="button" mat-dialog-close [disabled]="loading()">Cancelar</button>
          <button mat-flat-button type="submit" [disabled]="loading()">
            @if (loading()) { Creando… } @else { Crear administrador }
          </button>
        </mat-dialog-actions>
      </form>
    </div>
  `,
  styles: `
    .wrap { display: flex; flex-direction: column; min-width: min(420px, 86vw); }

    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.35rem 0.5rem 0 1.25rem;
    }
    header h2 {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 800;
      letter-spacing: -0.01em;
    }

    mat-dialog-content {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding: 0.75rem 1.25rem 0.5rem;
    }

    mat-dialog-actions { padding: 0.75rem 1.25rem 1rem; }
  `,
})
export class CreateAdminDialog {
  private fb = inject(FormBuilder);
  private admin = inject(AdminService);
  private notify = inject(NotificationService);
  private ref = inject(MatDialogRef<CreateAdminDialog>);

  readonly loading = signal(false);
  readonly hide = signal(true);
  readonly passwordHint = PASSWORD_HINT;

  readonly form = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.pattern(PASSWORD_PATTERN)]],
  });

  submit(): void {
    if (this.loading() || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    this.loading.set(true);
    this.admin
      .createAdmin({
        fullName: raw.fullName.trim(),
        email: raw.email.trim(),
        password: raw.password,
      })
      .subscribe({
        next: (user: User) => {
          this.loading.set(false);
          this.notify.success(`${user.fullName} ahora es administrador.`);
          this.ref.close(user);
        },
        error: (err) => {
          this.loading.set(false);
          this.notify.error(err?.message ?? 'No se pudo crear el administrador.');
        },
      });
  }
}
