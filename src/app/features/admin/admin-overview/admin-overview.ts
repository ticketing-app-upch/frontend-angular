import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  AdminMetrics,
  AdminService,
} from '../../../core/services/admin.service';
import { NotificationService } from '../../../core/services/notification.service';
import { StatCard } from '../../../shared/stat-card/stat-card';

@Component({
  selector: 'tkt-admin-overview',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrencyPipe, DecimalPipe, MatProgressSpinnerModule, StatCard],
  template: `
    @if (loading()) {
      <div class="center"><mat-progress-spinner mode="indeterminate" diameter="40" /></div>
    } @else if (m(); as x) {
      <div class="grid">
        <tkt-stat-card
          icon="payments"
          label="Ingresos brutos"
          [value]="x.grossRevenue | currency: 'PEN' : 'symbol-narrow' : '1.0-0'"
          [hint]="(x.orders.confirmed | number) + ' compras confirmadas'"
        />
        <tkt-stat-card
          icon="confirmation_number"
          label="Entradas vendidas"
          [value]="x.ticketsSold | number"
        />
        <tkt-stat-card
          icon="group"
          label="Usuarios"
          [value]="x.users.total"
          [hint]="x.users.clients + ' clientes · ' + x.users.organizers + ' organizadores · ' + x.users.admins + ' admins'"
        />
        <tkt-stat-card
          icon="event"
          label="Eventos"
          [value]="x.events.total"
          [hint]="x.events.published + ' publicados · ' + x.events.drafts + ' borradores'"
        />
        <tkt-stat-card
          icon="receipt_long"
          label="Compras"
          [value]="x.orders.total"
          [hint]="x.orders.confirmed + ' confirmadas · ' + x.orders.cancelled + ' canceladas'"
        />
      </div>
    }
  `,
  styles: `
    :host { display: block; }
    .center { display: grid; place-items: center; min-height: 30vh; }
    .grid {
      display: grid;
      gap: 1rem;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    }
  `,
})
export class AdminOverview {
  private admin = inject(AdminService);
  private notify = inject(NotificationService);

  readonly loading = signal(true);
  readonly m = signal<AdminMetrics | null>(null);

  constructor() {
    this.admin.metrics().subscribe({
      next: (data) => {
        this.m.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.notify.error('No se pudo cargar el resumen.');
      },
    });
  }
}
