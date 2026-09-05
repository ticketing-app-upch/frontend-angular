import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../enviroments/enviroment';
import { mockResponse } from '../mock/mock-latency';
import { MockStore } from '../mock/mock-store';
import { computeCapacity } from '../models/event.model';
import {
  DashboardStats,
  EventPerformance,
  RevenuePoint,
} from '../models/dashboard.model';
import { TicketOrder } from '../models/ticket.model';

const MONTHS_ES = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
];

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private http = inject(HttpClient);
  private store = inject(MockStore);
  private base = environment.apiBackendUrl;

  stats(organizerId: string): Observable<DashboardStats> {
    if (!environment.useMock) {
      return this.http.get<DashboardStats>(
        `${this.base}/organizers/${organizerId}/dashboard`,
      );
    }
    return mockResponse(this.buildLocalStats(organizerId));
  }

  private buildLocalStats(organizerId: string): DashboardStats {
    const events = this.store.events.filter(
      (e) => e.organizerId === organizerId,
    );
    const eventIds = new Set(events.map((e) => e.id));
    const orders = this.store.orders.filter(
      (o) => eventIds.has(o.eventId) && o.status === 'CONFIRMADA',
    );

    const byEvent: EventPerformance[] = events
      .map((e) => {
        const cap = computeCapacity(e);
        const revenue = orders
          .filter((o) => o.eventId === e.id)
          .reduce((acc, o) => acc + o.total, 0);
        return {
          eventId: e.id,
          eventName: e.name,
          startsAt: e.startsAt,
          capacity: cap.total,
          sold: cap.sold,
          occupancy: cap.ratio,
          revenue: round2(revenue),
        };
      })
      .sort((a, b) => b.revenue - a.revenue);

    const totalRevenue = round2(
      byEvent.reduce((acc, e) => acc + e.revenue, 0),
    );
    const totalTicketsSold = byEvent.reduce((acc, e) => acc + e.sold, 0);
    const totalCapacity = byEvent.reduce((acc, e) => acc + e.capacity, 0);

    return {
      totalRevenue,
      totalTicketsSold,
      totalCapacity,
      averageOccupancy:
        totalCapacity === 0 ? 0 : totalTicketsSold / totalCapacity,
      publishedEvents: events.filter((e) => e.status === 'PUBLICADO').length,
      revenueSeries: this.buildRevenueSeries(orders),
      byEvent,
    };
  }

  /** Serie de los últimos 6 meses a partir de las órdenes. */
  private buildRevenueSeries(orders: TicketOrder[]): RevenuePoint[] {
    const now = new Date();
    const buckets: RevenuePoint[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({ label: MONTHS_ES[d.getMonth()], revenue: 0, tickets: 0 });
    }
    const oldest = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    for (const order of orders) {
      const created = new Date(order.createdAt);
      if (created < oldest) continue;
      const idx =
        (created.getFullYear() - oldest.getFullYear()) * 12 +
        (created.getMonth() - oldest.getMonth());
      const bucket = buckets[idx];
      if (bucket) {
        bucket.revenue = round2(bucket.revenue + order.total);
        bucket.tickets += order.lines.reduce((a, l) => a + l.quantity, 0);
      }
    }
    return buckets;
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
