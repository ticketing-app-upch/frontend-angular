import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatExpansionModule } from '@angular/material/expansion';
import { TicketService } from '../../../core/services/ticket.service';
import { TicketOrder } from '../../../core/models/ticket.model';
import { EmptyState } from '../../../shared/empty-state/empty-state';

@Component({
  selector: 'tkt-my-tickets',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    CurrencyPipe,
    DatePipe,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatExpansionModule,
    EmptyState,
  ],
  templateUrl: './my-tickets.html',
  styleUrl: './my-tickets.scss',
})
export class MyTickets {
  private tickets = inject(TicketService);

  readonly loading = signal(true);
  readonly orders = signal<TicketOrder[]>([]);

  constructor() {
    this.tickets.myOrders().subscribe({
      next: (list) => {
        this.orders.set(list);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  ticketCount(order: TicketOrder): number {
    return order.lines.reduce((a, l) => a + l.quantity, 0);
  }

  /** Matriz pseudo-aleatoria y determinista para dibujar un "QR" decorativo. */
  qrCells(code: string): boolean[] {
    const cells: boolean[] = [];
    let seed = 0;
    for (let i = 0; i < code.length; i++) seed = (seed * 31 + code.charCodeAt(i)) >>> 0;
    for (let i = 0; i < 49; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      cells.push((seed >> 8) % 2 === 0);
    }
    return cells;
  }

  isPast(iso: string): boolean {
    return new Date(iso).getTime() < Date.now();
  }
}
