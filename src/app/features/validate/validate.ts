import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MockStore } from '../../core/mock/mock-store';
import { ticketsForOrder } from '../../core/models/ticket.model';
import { downloadTicketPdf } from '../../shared/ticket-pdf';

@Component({
  selector: 'tkt-validate',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, RouterLink, MatButtonModule, MatIconModule],
  templateUrl: './validate.html',
  styleUrl: './validate.scss',
})
export class ValidatePage {
  private readonly store = inject(MockStore);
  readonly code = input('');
  readonly entry = computed(() => {
    for (const order of this.store.orders) {
      if (order.status !== 'CONFIRMADA') continue;
      const ticket = ticketsForOrder(order).find(item => item.code === this.code());
      if (ticket) return { order, ticket };
    }
    return null;
  });

  downloadPdf(): void {
    const entry = this.entry();
    if (entry) downloadTicketPdf(entry.order, entry.ticket);
  }
}
