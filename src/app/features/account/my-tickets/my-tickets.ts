import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatExpansionModule } from '@angular/material/expansion';
import { TicketService } from '../../../core/services/ticket.service';
import { RedemptionService } from '../../../core/services/redemption.service';
import { TicketOrder } from '../../../core/models/ticket.model';
import { EmptyState } from '../../../shared/empty-state/empty-state';
import { TicketQr } from '../../../shared/ticket-qr/ticket-qr';

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
    TicketQr,
  ],
  templateUrl: './my-tickets.html',
  styleUrl: './my-tickets.scss',
})
export class MyTickets {
  private tickets = inject(TicketService);
  private redemptions = inject(RedemptionService);

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

  /** Momento del primer ingreso registrado en la puerta, si ya se usó. */
  redeemedAt(order: TicketOrder): number | null {
    return this.redemptions.get(order.id)?.at ?? null;
  }

  isPast(iso: string): boolean {
    return new Date(iso).getTime() < Date.now();
  }
}
