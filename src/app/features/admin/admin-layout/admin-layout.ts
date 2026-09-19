import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'tkt-admin-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatIconModule],
  template: `
    <div class="tkt-page">
      <header class="head">
        <h1 class="tkt-section-title">Administración</h1>
        <p class="tkt-section-sub">
          Acceso total al sistema: usuarios, eventos y compras de toda la plataforma.
        </p>
      </header>

      <nav class="tabs">
        <a routerLink="resumen" routerLinkActive="active">
          <mat-icon>insights</mat-icon> Resumen
        </a>
        <a routerLink="usuarios" routerLinkActive="active">
          <mat-icon>group</mat-icon> Usuarios
        </a>
        <a routerLink="eventos" routerLinkActive="active">
          <mat-icon>event</mat-icon> Eventos
        </a>
        <a routerLink="compras" routerLinkActive="active">
          <mat-icon>receipt_long</mat-icon> Compras
        </a>
      </nav>

      <router-outlet />
    </div>
  `,
  styleUrl: './admin-layout.scss',
})
export class AdminLayout {}
