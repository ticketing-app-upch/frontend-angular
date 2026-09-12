import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, map, throwError, timeout } from 'rxjs';
import { environment } from '../../../enviroments/enviroment';
import { mockResponse } from '../mock/mock-latency';
import { EventItem, Zone } from '../models/event.model';
import { SERVICE_FEE_RATE, zonePrice } from '../models/ticketing-rules';

export interface PriceQuoteItem {
  zoneId: string;
  zoneName: string;
  basePrice: number;
  /** Precio final por unidad tras aplicar reglas dinámicas. */
  unitPrice: number;
  quantity: number;
  /** Motivo del ajuste, para mostrarlo en el resumen. */
  note?: string;
}

export interface PriceQuote {
  eventId: string;
  currency: 'PEN';
  items: PriceQuoteItem[];
  subtotal: number;
  /** Comisión de servicio (6%). */
  fee: number;
  total: number;
}


/**
 * Puente hacia el microservicio de pricing (`apiPricingUrl`). En mock aplica
 * las reglas académicas de demanda, proximidad y baja venta.
 */
@Injectable({ providedIn: 'root' })
export class PricingService {
  private http = inject(HttpClient);
  private base = environment.apiPricingUrl;

  quote(
    event: EventItem,
    items: { zoneId: string; quantity: number }[],
  ): Observable<PriceQuote> {
    if (environment.useMock) {
      return mockResponse(this.buildLocalQuote(event, items));
    }
    if (!items.length) return throwError(() => new Error('Selecciona al menos una zona.'));
    return forkJoin(items.map(item => {
      const zone = event.zones.find(z => z.id === item.zoneId);
      if (!zone) return throwError(() => new Error('Zona no encontrada.'));
      return this.http.post<{ precio_ajustado: number; motivo?: string }>(`${this.base}/v1/dynamic-price`, {
        id_zona: zone.id, aforo_total: zone.capacity, aforo_disponible: zone.capacity - zone.sold,
        fecha_evento: event.startsAt, fecha_publicacion: event.publishedAt, precio_base: zone.price,
      }).pipe(map(response => {
        if (typeof response.precio_ajustado !== 'number' || !Number.isFinite(response.precio_ajustado) || response.precio_ajustado < 0) throw new Error('Respuesta de precios inválida.');
        return { zoneId: zone.id, zoneName: zone.name, basePrice: zone.price, quantity: item.quantity,
          unitPrice: round2(response.precio_ajustado), note: response.motivo };
      }));
    })).pipe(timeout(10000), map(lines => {
      const subtotal = round2(lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0));
      const fee = round2(subtotal * SERVICE_FEE_RATE);
      return { eventId: event.id, currency: 'PEN' as const, items: lines, subtotal, fee, total: round2(subtotal + fee) };
    }));
  }

  buildLocalQuote(
    event: EventItem,
    items: { zoneId: string; quantity: number }[],
  ): PriceQuote {
    const lines: PriceQuoteItem[] = items
      .map(({ zoneId, quantity }) => {
        const zone = event.zones.find((z) => z.id === zoneId);
        if (!zone || quantity <= 0) return null;
        return this.priceZone(event, zone, quantity);
      })
      .filter((l): l is PriceQuoteItem => l !== null);

    const subtotal = lines.reduce((acc, l) => acc + l.unitPrice * l.quantity, 0);
    const fee = round2(subtotal * SERVICE_FEE_RATE);
    return {
      eventId: event.id,
      currency: 'PEN',
      items: lines,
      subtotal: round2(subtotal),
      fee,
      total: round2(subtotal + fee),
    };
  }

  private priceZone(event: EventItem, zone: Zone, quantity: number): PriceQuoteItem {
    const { unitPrice, note } = zonePrice(event, zone);
    return {
      zoneId: zone.id,
      zoneName: zone.name,
      basePrice: zone.price,
      unitPrice,
      quantity,
      note,
    };
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
