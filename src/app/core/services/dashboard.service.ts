import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../enviroments/enviroment';
import { mockResponse } from '../mock/mock-latency';
import { MockStore } from '../mock/mock-store';
import { roundMoney, zonePrice } from '../models/ticketing-rules';
import {
  DashboardFilterOptions,
  DashboardFilters,
  DashboardStats,
  EventPerformance,
  RevenuePoint,
} from '../models/dashboard.model';
import { TicketOrder } from '../models/ticket.model';
import { AuthService } from '../auth/auth.service';
import { mockError } from '../mock/mock-latency';
import { districtForVenue } from '../../shared/lima-map/venue-district';

const MONTHS_ES = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
];

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private store = inject(MockStore);
  private base = environment.apiBackendUrl;

  stats(organizerId: string, filters?: DashboardFilters): Observable<DashboardStats> {
    if (!environment.useMock) {
      return this.http.get<DashboardStats>(
        `${this.base}/organizers/${organizerId}/dashboard`,
        { params: toHttpParams(filters) },
      );
    }
    if (!this.auth.isAdmin() && !(this.auth.isOrganizer() && this.auth.user()?.id === organizerId)) {
      return mockError('No tienes acceso a este panel.', 403);
    }
    return mockResponse(this.buildLocalStats(organizerId, filters));
  }

  /** Valores disponibles para el buscador del panel, sin aplicar ningún filtro. */
  filterOptions(organizerId: string): Observable<DashboardFilterOptions> {
    if (!environment.useMock) {
      return this.http.get<DashboardFilterOptions>(
        `${this.base}/organizers/${organizerId}/dashboard/filters`,
      );
    }
    const events = this.store.events.filter((e) => e.organizerId === organizerId);
    const districts = new Set<string>();
    const categories = new Set<string>();
    const sectors = new Set<string>();
    for (const e of events) {
      const district = districtForVenue(e.venue);
      if (district) districts.add(district);
      categories.add(e.category);
      for (const z of e.zones) sectors.add(z.name);
    }
    return mockResponse({
      districts: [...districts].sort(),
      categories: [...categories].sort() as DashboardFilterOptions['categories'],
      sectors: [...sectors].sort(),
    });
  }

  private buildLocalStats(organizerId: string, filters?: DashboardFilters): DashboardStats {
    let events = this.store.events.filter(
      (e) => e.organizerId === organizerId,
    );
    if (filters?.category) events = events.filter((e) => e.category === filters.category);
    if (filters?.district) events = events.filter((e) => districtForVenue(e.venue) === filters.district);

    const eventIds = new Set(events.map((e) => e.id));
    const orders = this.store.orders.filter(
      (o) => eventIds.has(o.eventId) && o.status === 'CONFIRMADA',
    );

    const sector = filters?.sector?.trim().toLowerCase();
    const matchesSector = (name: string) => !sector || name.toLowerCase().includes(sector);

    const byEvent: EventPerformance[] = events
      .map((e) => {
        const zones = sector ? e.zones.filter((z) => matchesSector(z.name)) : e.zones;
        const capacity = zones.reduce((s, z) => s + z.capacity, 0);
        const sold = zones.reduce((s, z) => s + z.sold, 0);
        const openingRevenue = zones.reduce((s, z) => s + (z.openingRevenue ?? 0), 0);
        const revenue =
          orders
            .filter((o) => o.eventId === e.id)
            .flatMap((o) => o.lines)
            .filter((l) => matchesSector(l.zoneName))
            .reduce((acc, l) => acc + l.unitPrice * l.quantity, 0) + openingRevenue;
        return {
          eventId: e.id,
          eventName: e.name,
          venue: e.venue,
          category: e.category,
          startsAt: e.startsAt,
          capacity,
          sold,
          occupancy: capacity === 0 ? 0 : sold / capacity,
          revenue: round2(revenue),
        };
      })
      .filter((e) => !sector || e.capacity > 0)
      .sort((a, b) => b.revenue - a.revenue);

    const totalRevenue = round2(
      byEvent.reduce((acc, e) => acc + e.revenue, 0),
    );
    const totalTicketsSold = byEvent.reduce((acc, e) => acc + e.sold, 0);
    const totalCapacity = byEvent.reduce((acc, e) => acc + e.capacity, 0);
    const filteredEventIds = new Set(byEvent.map((e) => e.eventId));

    return {
      totalRevenue,
      totalTicketsSold,
      totalCapacity,
      averageOccupancy:
        totalCapacity === 0 ? 0 : totalTicketsSold / totalCapacity,
      publishedEvents: events.filter(
        (e) => e.status === 'PUBLICADO' && filteredEventIds.has(e.id),
      ).length,
      revenueSeries: this.buildRevenueSeries(orders, matchesSector),
      byEvent,
      byZone: events.flatMap(event => event.zones.filter((zone) => matchesSector(zone.name)).map(zone => {
        const price = zonePrice(event, zone);
        const revenue = (zone.openingRevenue ?? 0) + orders.filter(o => o.eventId === event.id)
          .flatMap(o => o.lines).filter(l => l.zoneId === zone.id).reduce((s, l) => s + l.unitPrice * l.quantity, 0);
        return { eventId: event.id, eventName: event.name, zoneId: zone.id, zoneName: zone.name,
          capacity: zone.capacity, sold: zone.sold, revenue: roundMoney(revenue), basePrice: zone.price,
          currentPrice: price.unitPrice, priceReason: price.note, startsAt: event.startsAt, publishedAt: event.publishedAt };
      })),
    };
  }

  /** Serie de los últimos 6 meses a partir de las órdenes (sólo las líneas que calzan con el sector filtrado, si hay). */
  private buildRevenueSeries(
    orders: TicketOrder[],
    matchesSector: (zoneName: string) => boolean,
  ): RevenuePoint[] {
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
      if (!bucket) continue;
      const lines = order.lines.filter((l) => matchesSector(l.zoneName));
      if (!lines.length) continue;
      bucket.revenue = round2(
        bucket.revenue + lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0),
      );
      bucket.tickets += lines.reduce((a, l) => a + l.quantity, 0);
    }
    return buckets;
  }
}

function toHttpParams(filters?: DashboardFilters): Record<string, string> {
  const params: Record<string, string> = {};
  if (filters?.district) params['district'] = filters.district;
  if (filters?.category) params['category'] = filters.category;
  if (filters?.sector) params['sector'] = filters.sector;
  return params;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
