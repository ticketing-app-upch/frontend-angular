import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, switchMap } from 'rxjs';
import { environment } from '../../../enviroments/enviroment';
import { mockError, mockResponse } from '../mock/mock-latency';
import { MockStore } from '../mock/mock-store';
import { computeCapacity } from '../models/event.model';
import {
  CreateOrderPayload,
  OrderLine,
  TicketOrder,
} from '../models/ticket.model';
import { AuthService } from '../auth/auth.service';
import { EventService } from './event.service';
import { PricingService } from './pricing.service';

@Injectable({ providedIn: 'root' })
export class TicketService {
  private http = inject(HttpClient);
  private store = inject(MockStore);
  private auth = inject(AuthService);
  private events = inject(EventService);
  private pricing = inject(PricingService);
  private base = environment.apiBackendUrl;

  myOrders(): Observable<TicketOrder[]> {
    const buyerId = this.auth.user()?.id;
    if (environment.useMock) {
      return mockResponse(
        this.store.orders
          .filter((o) => o.buyerId === buyerId)
          .map((o) => structuredClone(o)),
      );
    }
    return this.http.get<TicketOrder[]>(`${this.base}/orders/me`);
  }

  createOrder(payload: CreateOrderPayload): Observable<TicketOrder> {
    if (!environment.useMock) {
      return this.http.post<TicketOrder>(`${this.base}/orders`, payload);
    }
    return this.events.getById(payload.eventId).pipe(
      switchMap((event) =>
        this.pricing.quote(event, payload.items).pipe(
          map((quote) => {
            const user = this.auth.user();
            if (!user) {
              throw { status: 401, message: 'Debes iniciar sesión.' };
            }
            // Validaciones de negocio contra la data mock.
            const totalQty = payload.items.reduce((a, i) => a + i.quantity, 0);
            if (totalQty <= 0) {
              throw { status: 400, message: 'Selecciona al menos una entrada.' };
            }
            if (totalQty > event.maxPerOrder) {
              throw {
                status: 400,
                message: `Máximo ${event.maxPerOrder} entradas por compra.`,
              };
            }
            for (const item of payload.items) {
              const zone = event.zones.find((z) => z.id === item.zoneId);
              if (!zone) {
                throw { status: 400, message: 'Zona inválida.' };
              }
              if (zone.sold + item.quantity > zone.capacity) {
                throw {
                  status: 409,
                  message: `No hay cupos suficientes en "${zone.name}".`,
                };
              }
            }

            // Persistimos: descontamos aforo y guardamos la orden.
            const stored = this.store.events.find((e) => e.id === event.id);
            if (stored) {
              for (const item of payload.items) {
                const zone = stored.zones.find((z) => z.id === item.zoneId);
                if (zone) zone.sold += item.quantity;
              }
              if (computeCapacity(stored).available === 0) {
                stored.status = 'AGOTADO';
              }
              this.store.upsertEvent(stored);
            }

            const lines: OrderLine[] = quote.items.map((qi) => ({
              zoneId: qi.zoneId,
              zoneName: qi.zoneName,
              unitPrice: qi.unitPrice,
              quantity: qi.quantity,
            }));

            const order: TicketOrder = {
              id: `ord-${crypto.randomUUID().slice(0, 8)}`,
              code: `TKT-${crypto.randomUUID().slice(0, 6).toUpperCase()}`,
              eventId: event.id,
              eventName: event.name,
              eventStartsAt: event.startsAt,
              eventVenue: `${event.venue}, ${event.city}`,
              buyerId: user.id,
              buyerName: user.fullName,
              createdAt: new Date().toISOString(),
              status: 'CONFIRMADA',
              lines,
              subtotal: quote.subtotal,
              fee: quote.fee,
              total: quote.total,
            };
            this.store.addOrder(order);
            return order;
          }),
        ),
      ),
    );
  }

  getOrder(id: string): Observable<TicketOrder> {
    if (environment.useMock) {
      const found = this.store.orders.find((o) => o.id === id);
      return found
        ? mockResponse(structuredClone(found))
        : mockError<TicketOrder>('Orden no encontrada.', 404);
    }
    return this.http.get<TicketOrder>(`${this.base}/orders/${id}`);
  }
}
