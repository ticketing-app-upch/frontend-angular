import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/auth/auth.service';
import { epicEnabled } from '../../core/demo-scope';

/**
 * Landing "segura" de demo: no depende de ninguna épica encendida. Si el
 * visitante no ha iniciado sesión, invita a registrarse/ingresar (Épica 1).
 * Si ya inició sesión, confirma el rol y token — sin exponer catálogo,
 * compra ni paneles que todavía no corresponden a esta demo.
 */
@Component({
  selector: 'tkt-bienvenida',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatButtonModule, MatIconModule],
  template: `
    <div class="tkt-page center">
      <div class="card">
        <mat-icon class="brand-icon">confirmation_number</mat-icon>
        @if (auth.isAuthenticated()) {
          <h1>¡Sesión iniciada!</h1>
          <p>
            Hola <strong>{{ auth.user()!.fullName }}</strong>, bienvenido a AlpaTeck.
            Tu sesión está activa como <strong>{{ roleLabel() }}</strong>.
          </p>
          <p class="muted">
            Demo 1 mantiene visibles las rutas principales en la URL, mientras la
            experiencia visual se concentra en el login y esta confirmación.
          </p>
          @if (routesForRole().length) {
            <div class="route-actions" aria-label="Accesos disponibles">
              @for (route of routesForRole(); track route.url) {
                <a mat-stroked-button [routerLink]="route.url">{{ route.label }}</a>
              }
            </div>
          }
          <button mat-stroked-button (click)="auth.logout()">
            <mat-icon>logout</mat-icon> Cerrar sesión
          </button>
        } @else {
          <h1>Registro e inicio de sesión</h1>
          <p class="muted">
            Esta demo cubre solo la gestión de usuarios: registro con rol, login y
            un token distinto según seas Cliente, Organizador o Administrador.
          </p>
          <div class="actions">
            <a mat-flat-button class="tkt-cta" routerLink="/auth/register">Crear cuenta</a>
            <a mat-stroked-button routerLink="/auth/login">Ya tengo cuenta</a>
          </div>
        }
      </div>
    </div>
  `,
  styles: `
    .center { display: grid; place-items: center; min-height: calc(100vh - 200px); }
    .card {
      max-width: 480px;
      text-align: center;
      padding: 2.5rem 2rem;
      border: 1px solid color-mix(in srgb, var(--mat-sys-on-surface) 10%, transparent);
      border-radius: var(--tkt-radius);
      background: var(--mat-sys-surface);
      box-shadow: var(--tkt-shadow);
    }
    .brand-icon { font-size: 2.5rem; width: 2.5rem; height: 2.5rem; color: var(--mat-sys-primary); margin-bottom: 0.5rem; }
    h1 { margin: 0.25rem 0 0.75rem; font-size: 1.5rem; }
    p { margin: 0 0 0.75rem; line-height: 1.5; }
    .muted { color: var(--mat-sys-on-surface-variant); font-size: 0.9rem; }
    .actions { display: flex; gap: 0.75rem; justify-content: center; margin-top: 1.25rem; flex-wrap: wrap; }
    .route-actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 0.5rem;
      margin: 1.25rem 0;
    }
    .route-actions a { font-size: 0.78rem; }
  `,
})
export class Bienvenida {
  readonly auth = inject(AuthService);
  readonly epicEnabled = epicEnabled;

  roleLabel(): string {
    const role = this.auth.user()?.role;
    return role === 'ADMIN' ? 'Administrador' : role === 'ORGANIZER' ? 'Organizador' : 'Cliente';
  }

  routesForRole(): { url: string; label: string }[] {
    switch (this.auth.user()?.role) {
      case 'ORGANIZER':
        return [
          { url: '/organizer/create-event', label: 'Crear evento' },
          { url: '/organizer/dashboard', label: 'Dashboard de ventas' },
        ];
      case 'ADMIN':
        return [];
      default:
        return [
          { url: '/attendee/catalog', label: 'Catálogo de eventos' },
          { url: '/attendee/event/1', label: 'Detalle del evento' },
          { url: '/attendee/checkout/1', label: 'Compra de entradas' },
          { url: '/attendee/tickets', label: 'Mis tickets' },
        ];
    }
  }
}
