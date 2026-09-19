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
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { AuthService } from '../../../core/auth/auth.service';
import { PASSWORD_PATTERN } from '../../../core/auth/password-policy';
import { PublicRole } from '../../../core/models/user.model';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'tkt-register',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatButtonToggleModule,
    MatCardModule,
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

  readonly loading = signal(false);
  readonly hide = signal(true);

  readonly form = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.pattern(PASSWORD_PATTERN)]],
    role: ['CLIENT' as PublicRole, Validators.required],
    client: this.fb.nonNullable.group({
      country: ['', Validators.required],
      city: ['', Validators.required],
      document: ['', [Validators.required, Validators.minLength(8)]],
      phone: ['', [Validators.required, Validators.minLength(6)]],
    }),
    organizer: this.fb.nonNullable.group({
      companyName: ['', [Validators.required, Validators.minLength(2)]],
      taxId: ['', [Validators.required, Validators.minLength(8)]],
      country: ['', Validators.required],
      phone: ['', [Validators.required, Validators.minLength(6)]],
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

  submit(): void {
    if (this.loading()) return;

    const branch = this.isOrganizer() ? this.organizer : this.client;
    if (
      this.form.controls.fullName.invalid ||
      this.form.controls.email.invalid ||
      this.form.controls.password.invalid ||
      branch.invalid
    ) {
      this.form.markAllAsTouched();
      this.notify.error('Completa los campos obligatorios.');
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
        acceptedTerms: true,
        marketingOptIn: false,
        profile:
          raw.role === 'CLIENT'
            ? {
                country: raw.client.country.trim(),
                city: raw.client.city.trim(),
                district: '',
                hasPeruvianNationality: false,
                docType: 'DNI',
                docNumber: raw.client.document.trim(),
                gender: 'F',
                phoneCode: '+51',
                phone: raw.client.phone.trim(),
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
                phone: raw.organizer.phone.trim(),
                country: raw.organizer.country.trim(),
                city: '',
                website: '',
              }
            : undefined,
      })
      .subscribe({
        next: (res) => {
          this.notify.success(`Cuenta creada. ¡Bienvenido, ${res.user.fullName.split(' ')[0]}!`);
          void this.router.navigateByUrl('/bienvenida');
        },
        error: (err) => {
          this.loading.set(false);
          this.notify.error(err?.message ?? 'No se pudo crear la cuenta.');
        },
      });
  }
}
