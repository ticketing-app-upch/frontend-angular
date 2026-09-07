import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { AuthService } from '../../../core/auth/auth.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'tkt-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatProgressBarModule,
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private notify = inject(NotificationService);

  readonly loading = signal(false);
  readonly hide = signal(true);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(4)]],
    remember: [true],
  });

  fill(kind: 'organizador' | 'cliente'): void {
    this.form.patchValue({
      email: `${kind}@tkt.pe`,
      password: kind,
    });
  }

  forgotPassword(event: Event): void {
    event.preventDefault();
    this.notify.info(
      'Recuperación de contraseña no disponible en la demo (aún sin backend).',
    );
  }

  submit(): void {
    if (this.form.invalid || this.loading()) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.auth.login(this.form.getRawValue()).subscribe({
      next: (res) => {
        this.notify.success(`Hola, ${res.user.fullName.split(' ')[0]}`);
        const redirect =
          this.route.snapshot.queryParamMap.get('redirect') ?? '/eventos';
        this.router.navigateByUrl(redirect);
      },
      error: (err) => {
        this.loading.set(false);
        this.notify.error(err?.message ?? 'No se pudo iniciar sesión.');
      },
    });
  }
}
