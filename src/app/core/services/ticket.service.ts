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
  OrderStatus,
  TicketOrder,
} from '../models/ticket.model';
import { AuthService } from '../auth/auth.service';
import { EventService } from './event.service';
import { PricingService } from './pricing.service';
import { purchaseIssue } from '../models/ticketing-rules';
import { RedemptionService } from './redemption.service';

@Injectable({ providedIn: 'root' })
export class TicketService {
  private http = inject(HttpClient);
  private store = inject(MockStore);
  private auth = inject(AuthService);
  private events = inject(EventService);
  private pricing = inject(PricingService);
  private base = environment.apiBackendUrl;
  private redemptions = inject(RedemptionService);
  private completed = new Map<string, TicketOrder>();

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

  /** Todas las órdenes de la plataforma. Solo admin. */
  listAll(): Observable<TicketOrder[]> {
    if (environment.useMock) {
      if (!this.auth.isAdmin()) return mockError('Acceso exclusivo de administración.', 403);
      return mockResponse(
        [...this.store.orders]
          .map((o) => structuredClone(o))
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      );
    }
    return this.http.get<TicketOrder[]>(`${this.base}/admin/orders`);
  }

  /** Cambia el estado de una orden (p. ej. cancelar). Solo admin. */
  setStatus(id: string, status: OrderStatus): Observable<TicketOrder> {
    if (environment.useMock) {
      if (!this.auth.isAdmin()) return mockError('Acceso exclusivo de administración.', 403);
      const found = this.store.orders.find((o) => o.id === id);
      if (!found) {
        return mockError<TicketOrder>('Orden no encontrada.', 404);
      }
      if (status !== 'CANCELADA' || found.status !== 'CONFIRMADA' || this.redemptions.isRedeemed(id)) return mockError('Esta orden no puede cancelarse.', 409);
      const event = this.store.events.find(e => e.id === found.eventId);
      if (event) {
        for (const line of found.lines) { const zone = event.zones.find(z => z.id === line.zoneId); if (zone) zone.sold = Math.max(zone.openingSold ?? 0, zone.sold - line.quantity); }
        if (event.status === 'AGOTADO') event.status = 'PUBLICADO';
        this.store.upsertEvent(event);
      }
      this.store.updateOrder(id, { status });
      return mockResponse({ ...structuredClone(found), status });
    }
    return this.http.patch<TicketOrder>(`${this.base}/orders/${id}`, { status });
  }

  createOrder(payload: CreateOrderPayload): Observable<TicketOrder> {
    if (!environment.useMock) {
      return this.http.post<TicketOrder>(`${this.base}/orders`, payload);
    }
    const key = `${this.auth.user()?.id}:${payload.idempotencyKey ?? ''}`;
    if (payload.idempotencyKey && this.auth.isClient() && this.completed.has(key)) return mockResponse(structuredClone(this.completed.get(key)!));
    return this.events.getById(payload.eventId).pipe(
      switchMap((event) =>
        this.pricing.quote(event, payload.items).pipe(
          map(() => {
            const user = this.auth.user();
            if (!user || !this.auth.isClient()) {
              throw { status: 401, message: 'Debes iniciar sesión.' };
            }
            // Validaciones de negocio contra la data mock.
            const fresh = this.store.events.find(e => e.id === event.id);
            if (payload.idempotencyKey && this.completed.has(key)) return structuredClone(this.completed.get(key)!);
            const issue = fresh ? purchaseIssue(fresh, payload.items) : 'Evento no encontrado.';
            if (issue) throw { status: 409, message: issue };
            const quote = this.pricing.buildLocalQuote(fresh!, payload.items);
            if (payload.paymentResult === 'DECLINED') throw { status: 402, message: 'El pago fue rechazado. Verifica tu medio de pago e inténtalo nuevamente.' };
            if (payload.expectedTotal !== undefined && Math.abs(payload.expectedTotal - quote.total) > 0.009) throw { status: 409, message: 'El precio cambió. Solicita una nueva cotización antes de confirmar.' };
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
              id: `ord-${Math.random().toString(36).slice(2, 10)}`,
              code: `TKT-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
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
            if (payload.idempotencyKey) this.completed.set(key, structuredClone(order));
            return order;
          }),
        ),
      ),
    );
  }

  getOrder(id: string): Observable<TicketOrder> {
    if (environment.useMock) {
      const found = this.store.orders.find((o) => o.id === id && (o.buyerId === this.auth.user()?.id || this.auth.isAdmin()));
      return found
        ? mockResponse(structuredClone(found))
        : mockError<TicketOrder>('Orden no encontrada.', 404);
    }
    return this.http.get<TicketOrder>(`${this.base}/orders/${id}`);
  }
}
