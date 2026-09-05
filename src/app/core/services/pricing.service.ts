import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../enviroments/enviroment';
import { mockResponse } from '../mock/mock-latency';
import { EventItem, Zone } from '../models/event.model';

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

const SERVICE_FEE_RATE = 0.06;

/**
 * Puente hacia el microservicio de pricing (`apiPricingUrl`). En mock aplica
 * una regla simple de demanda: si la zona está > 85% vendida sube 12%.
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
    return this.http.post<PriceQuote>(`${this.base}/quotes`, {
      eventId: event.id,
      items,
    });
  }

  private buildLocalQuote(
    event: EventItem,
    items: { zoneId: string; quantity: number }[],
  ): PriceQuote {
    const lines: PriceQuoteItem[] = items
      .map(({ zoneId, quantity }) => {
        const zone = event.zones.find((z) => z.id === zoneId);
        if (!zone || quantity <= 0) return null;
        return this.priceZone(zone, quantity);
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

  private priceZone(zone: Zone, quantity: number): PriceQuoteItem {
    const demand = zone.capacity === 0 ? 0 : zone.sold / zone.capacity;
    const surge = demand > 0.85;
    const unitPrice = surge ? round2(zone.price * 1.12) : zone.price;
    return {
      zoneId: zone.id,
      zoneName: zone.name,
      basePrice: zone.price,
      unitPrice,
      quantity,
      note: surge ? 'Alta demanda (+12%)' : undefined,
    };
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
