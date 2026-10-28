import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TicketService } from '../../../core/services/ticket.service';
import { IssuedTicket, TicketOrder, ticketsForOrder } from '../../../core/models/ticket.model';
import { EmptyState } from '../../../shared/empty-state/empty-state';
import { TicketQr } from '../../../shared/ticket-qr/ticket-qr';
import { downloadTicketPdf } from '../../../shared/ticket-pdf';

@Component({
  selector: 'tkt-my-tickets',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, FormsModule, CurrencyPipe, DatePipe, MatButtonModule, MatIconModule, MatProgressSpinnerModule, EmptyState, TicketQr],
  templateUrl: './my-tickets-v3.html',
  styleUrl: './my-tickets.scss',
})
export class MyTicketsV3 {
  private readonly service = inject(TicketService);
  readonly filter = signal('all');
  readonly search = signal('');
  readonly error = signal(false);
  readonly loading = signal(true);
  readonly orders = signal<TicketOrder[]>([]);
  readonly entries = computed(() => this.orders().flatMap(order => ticketsForOrder(order).map(ticket => ({ order, ticket }))));
  readonly filtered = computed(() => this.entries().filter(({ order, ticket }) =>
    (this.filter() === 'all' || (this.filter() === 'cancelled' ? order.status === 'CANCELADA' : order.status === 'CONFIRMADA' && this.isPast(order.eventStartsAt) === (this.filter() === 'past'))) &&
    `${order.eventName} ${ticket.code} ${ticket.zoneName}`.toLowerCase().includes(this.search().trim().toLowerCase())));
  constructor() { this.load(); }
  load(): void {
    this.loading.set(true); this.error.set(false);
    this.service.myOrders().subscribe({
      next: list => { this.orders.set(list.sort((a, b) => b.createdAt.localeCompare(a.createdAt))); this.loading.set(false); },
      error: () => { this.loading.set(false); this.error.set(true); },
    });
  }
  download(order: TicketOrder, ticket: IssuedTicket): void { downloadTicketPdf(order, ticket); }
  isPast(iso: string): boolean { return new Date(iso).getTime() < Date.now(); }
}
