import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { AuthService } from '../../../core/auth/auth.service';
import { PASSWORD_PATTERN } from '../../../core/auth/password-policy';
import { PublicRole } from '../../../core/models/user.model';
import { NotificationService } from '../../../core/services/notification.service';
import { LegalDialog } from '../../../shared/legal/legal-dialog';

@Component({
  selector: 'tkt-register',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatButtonToggleModule,
    MatCardModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
  ],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private notify = inject(NotificationService);
  private dialog = inject(MatDialog);

  readonly loading = signal(false);
  readonly hide = signal(true);

  readonly form = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.pattern(PASSWORD_PATTERN)]],
    role: ['CLIENT' as PublicRole, Validators.required],
    acceptedTerms: [false, Validators.requiredTrue],
    client: this.fb.nonNullable.group({
      document: ['', [Validators.required, Validators.pattern(/^[0-9]{8}$/)]],
    }),
    organizer: this.fb.nonNullable.group({
      companyName: ['', [Validators.required, Validators.minLength(2)]],
      taxId: ['', [Validators.required, Validators.pattern(/^(10|15|17|20)[0-9]{9}$/)]],
    }),
  });

  readonly client = this.form.controls.client;
  readonly organizer = this.form.controls.organizer;
  private readonly roleValue = toSignal(this.form.controls.role.valueChanges, {
    initialValue: this.form.controls.role.value,
  });
  readonly isOrganizer = computed(() => this.roleValue() === 'ORGANIZER');

  constructor() {
    this.applyRole(this.form.controls.role.value);
    this.form.controls.role.valueChanges.subscribe((role) => this.applyRole(role));
  }

  private applyRole(role: PublicRole): void {
    if (role === 'ORGANIZER') {
      this.client.disable({ emitEvent: false });
      this.organizer.enable({ emitEvent: false });
      return;
    }
    this.organizer.disable({ emitEvent: false });
    this.client.enable({ emitEvent: false });
  }

  openTerms(): void {
    this.dialog.open(LegalDialog, {
      data: { key: 'terms', role: this.isOrganizer() ? 'ORGANIZADOR' : 'CLIENTE' },
      width: 'min(94vw, 720px)',
    });
  }

  submit(): void {
    if (this.loading()) return;

    const branch = this.isOrganizer() ? this.organizer : this.client;
    if (
      this.form.controls.fullName.invalid ||
      this.form.controls.email.invalid ||
      this.form.controls.password.invalid ||
      branch.invalid ||
      this.form.controls.acceptedTerms.invalid
    ) {
      this.form.markAllAsTouched();
      this.notify.error(this.form.controls.acceptedTerms.invalid
        ? 'Debes aceptar los términos y condiciones para registrarte.'
        : 'Completa los campos obligatorios.');
      return;
    }

    const raw = this.form.getRawValue();
    this.loading.set(true);
    this.auth
      .register({
        fullName: raw.fullName.trim(),
        email: raw.email.trim(),
        password: raw.password,
        role: raw.role,
        acceptedTerms: raw.acceptedTerms,
        marketingOptIn: false,
        profile:
          raw.role === 'CLIENT'
            ? {
                country: 'PE',
                city: '',
                district: '',
                hasPeruvianNationality: false,
                docType: 'DNI',
                docNumber: raw.client.document.trim(),
                gender: 'F',
                phoneCode: '+51',
                phone: '',
              }
            : undefined,
        organizer:
          raw.role === 'ORGANIZER'
            ? {
                orgType: 'EMPRESA',
                displayName: raw.organizer.companyName.trim(),
                taxId: raw.organizer.taxId.trim(),
                legalName: raw.organizer.companyName.trim(),
                repName: raw.fullName.trim(),
                phone: '',
                country: 'PE',
                city: '',
                website: '',
              }
            : undefined,
      })
      .subscribe({
        next: (res) => {
          this.notify.success(`Cuenta creada. ¡Bienvenido, ${res.user.fullName.split(' ')[0]}!`);
          void this.router.navigateByUrl(raw.role === 'CLIENT' ? '/attendee/catalog' : '/organizer/home');
        },
        error: (err) => {
          this.loading.set(false);
          this.notify.error(err?.error?.message ?? err?.message ?? 'No se pudo crear la cuenta.');
        },
      });
  }
}
