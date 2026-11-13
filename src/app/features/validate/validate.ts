import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { catchError, map, of, switchMap } from 'rxjs';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MockStore } from '../../core/mock/mock-store';
import { IssuedTicket, TicketOrder, ticketsForOrder } from '../../core/models/ticket.model';
import { downloadTicketPdf } from '../../shared/ticket-pdf';
import { environment } from '../../../enviroments/enviroment';

/** Respuesta pública de `GET /v1/tickets/{code}/validacion`. */
interface PublicValidation {
  ticket: {
    code: string;
    unitPrice: number;
    totalPrice: number;
    event: { title: string; venueName: string; startsAt: string };
    zone: { id?: string; name: string };
  };
}

interface ValidationEntry { order: TicketOrder; ticket: IssuedTicket }

@Component({
  selector: 'tkt-validate',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, RouterLink, MatButtonModule, MatIconModule],
  templateUrl: './validate.html',
  styleUrl: './validate.scss',
})
export class ValidatePage {
  private readonly store = inject(MockStore);
  private readonly http = inject(HttpClient);
  readonly code = input('');
  private readonly remote = toSignal(
    toObservable(this.code).pipe(
      switchMap(code => environment.useMock || !code
        ? of(null)
        : this.http.get<PublicValidation>(`${environment.apiBackendUrl}/v1/tickets/${encodeURIComponent(code)}/validacion`).pipe(
          map(res => this.fromApi(res)),
          catchError(() => of(null)),
        )),
    ),
    { initialValue: null },
  );
  readonly entry = computed<ValidationEntry | null>(() => {
    if (!environment.useMock) return this.remote();
    for (const order of this.store.orders) {
      if (order.status !== 'CONFIRMADA') continue;
      const ticket = ticketsForOrder(order).find(item => item.code === this.code());
      if (ticket) return { order, ticket };
    }
    return null;
  });

  private fromApi({ ticket }: PublicValidation): ValidationEntry {
    const issued: IssuedTicket = {
      code: ticket.code,
      zoneId: ticket.zone.id ?? '',
      zoneName: ticket.zone.name,
      unitPrice: ticket.unitPrice,
      serviceFee: Math.round((ticket.totalPrice - ticket.unitPrice) * 100) / 100,
      total: ticket.totalPrice,
    };
    const order = {
      id: '', code: ticket.code, eventId: '', eventName: ticket.event.title,
      eventStartsAt: ticket.event.startsAt, eventVenue: ticket.event.venueName,
      buyerId: '', buyerName: '', createdAt: '', status: 'CONFIRMADA',
      lines: [], tickets: [issued], subtotal: ticket.unitPrice, fee: issued.serviceFee, total: ticket.totalPrice,
    } satisfies TicketOrder;
    return { order, ticket: issued };
  }

  downloadPdf(): void {
    const entry = this.entry();
    if (entry) downloadTicketPdf(entry.order, entry.ticket);
  }
}
