import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatExpansionModule } from '@angular/material/expansion';
import { TicketService } from '../../../core/services/ticket.service';
import { RedemptionService } from '../../../core/services/redemption.service';
import { NotificationService } from '../../../core/services/notification.service';
import { TicketOrder } from '../../../core/models/ticket.model';
import { EmptyState } from '../../../shared/empty-state/empty-state';
import { FormsModule } from '@angular/forms';
import { addToCalendar, downloadFile } from '../../../shared/event-actions';
import { TicketQr } from '../../../shared/ticket-qr/ticket-qr';

@Component({
  selector: 'tkt-my-tickets',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    FormsModule,
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
  private notify = inject(NotificationService);

  readonly filter = signal('all');
  readonly search = signal('');
  readonly error = signal(false);
  readonly filtered = computed(() => this.orders().filter(o => (this.filter() === 'all' || (this.filter() === 'cancelled' ? o.status === 'CANCELADA' : o.status === 'CONFIRMADA' && this.isPast(o.eventStartsAt) === (this.filter() === 'past'))) && `${o.eventName} ${o.code}`.toLowerCase().includes(this.search().trim().toLowerCase())));
  readonly loading = signal(true);
  readonly orders = signal<TicketOrder[]>([]);

  constructor() { this.load(); }

  load(): void {
    this.loading.set(true); this.error.set(false);
    this.tickets.myOrders().subscribe({
      next: (list) => {
        this.orders.set(list.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
        this.notify.error('No se pudieron cargar tus entradas.');
      },
    });
  }

  calendar(order: TicketOrder): void {
    addToCalendar({ id: order.eventId, name: order.eventName, startsAt: order.eventStartsAt, venue: order.eventVenue, city: '' });
  }
  printETicket(order: TicketOrder): void {
    const html = `
      <html>
        <head>
          <title>E-Ticket - ${order.code}</title>
          <style>
            body { font-family: 'Inter', sans-serif; padding: 40px; display: flex; justify-content: center; background: #f5f5f5; }
            .ticket { border: 2px dashed #888; padding: 30px; background: white; text-align: left; max-width: 400px; width: 100%; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
            .header { border-bottom: 2px solid #f0f0f0; padding-bottom: 20px; margin-bottom: 20px; text-align: center; }
            h1 { margin: 0 0 10px; font-size: 24px; color: #111; }
            p { margin: 5px 0; color: #555; font-size: 14px; }
            .lines { margin: 20px 0; background: #fafafa; padding: 15px; border-radius: 8px; }
            .code { font-weight: 800; font-size: 22px; text-align: center; margin-top: 25px; letter-spacing: 2px; color: #111; border-top: 2px solid #f0f0f0; padding-top: 20px;}
            .disclaimer { text-align: center; font-size: 11px; margin-top: 20px; color: #888; text-transform: uppercase; letter-spacing: 1px;}
          </style>
        </head>
        <body>
          <div class="ticket">
            <div class="header">
              <p style="font-weight: bold; color: #f43f5e; margin-bottom: 15px;">AFORO TICKETING</p>
              <h1>${order.eventName}</h1>
              <p>${new DatePipe('en-US').transform(order.eventStartsAt, "EEE d 'de' MMM, y · HH:mm")}</p>
              <p>${order.eventVenue}</p>
            </div>
            <div class="lines">
              <p style="font-weight: bold; margin-bottom: 10px; color: #111;">TUS ENTRADAS:</p>
              ${order.lines.map(l => `<p style="display:flex; justify-content:space-between;"><span>${l.zoneName}</span> <b>x ${l.quantity}</b></p>`).join('')}
            </div>
            <div class="code">
              ${order.code}
            </div>
            <p class="disclaimer">E-Ticket / No es comprobante fiscal</p>
          </div>
          <script>window.onload = () => { window.print(); setTimeout(() => window.close(), 500); }</script>
        </body>
      </html>
    `;
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
    } else {
      this.notify.error('Habilita las ventanas emergentes para imprimir tu entrada.');
    }
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
