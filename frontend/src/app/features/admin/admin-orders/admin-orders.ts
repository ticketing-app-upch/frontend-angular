import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe, TitleCasePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TicketService } from '../../../core/services/ticket.service';
import { NotificationService } from '../../../core/services/notification.service';
import { TicketOrder } from '../../../core/models/ticket.model';
import { EmptyState } from '../../../shared/empty-state/empty-state';

@Component({
  selector: 'tkt-admin-orders',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CurrencyPipe,
    DatePipe,
    TitleCasePipe,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    EmptyState,
  ],
  templateUrl: './admin-orders.html',
  styleUrl: './admin-orders.scss',
})
export class AdminOrders {
  private tickets = inject(TicketService);
  private notify = inject(NotificationService);

  readonly loading = signal(true);
  readonly items = signal<TicketOrder[]>([]);
  readonly busyId = signal<string | null>(null);
  readonly confirmId = signal<string | null>(null);

  constructor() {
    this.load();
  }

  qty(o: TicketOrder): number {
    return o.lines.reduce((a, l) => a + l.quantity, 0);
  }

  askCancel(o: TicketOrder): void {
    this.confirmId.set(o.id);
  }

  cancelAsk(): void {
    this.confirmId.set(null);
  }

  confirmCancel(o: TicketOrder): void {
    this.busyId.set(o.id);
    this.tickets.setStatus(o.id, 'CANCELADA').subscribe({
      next: () => {
        this.items.update((list) =>
          list.map((x) => (x.id === o.id ? { ...x, status: 'CANCELADA' } : x)),
        );
        this.busyId.set(null);
        this.confirmId.set(null);
        this.notify.success(`Compra ${o.code} cancelada.`);
      },
      error: (err) => {
        this.busyId.set(null);
        this.confirmId.set(null);
        this.notify.error(err?.message ?? 'No se pudo cancelar la compra.');
      },
    });
  }

  private load(): void {
    this.loading.set(true);
    this.tickets.listAll().subscribe({
      next: (list) => {
        this.items.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.notify.error('No se pudieron cargar las compras.');
      },
    });
  }
}
