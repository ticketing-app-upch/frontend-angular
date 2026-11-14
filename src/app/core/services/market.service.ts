import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../enviroments/enviroment';
import { AuthService } from '../auth/auth.service';
import { MockStore } from '../mock/mock-store';
import { mockError, mockResponse } from '../mock/mock-latency';
import { QueueService } from './queue.service';
import { EventItem } from '../models/event.model';

export interface MarketFilters {
  from?: string; to?: string; category?: string; venue?: string; queue?: 'all' | 'with' | 'without';
}
export interface MarketGroup { name: string; events: number; tickets: number; revenue: number; occupancy: number; averageTicket: number; }
export interface MarketReport {
  events: number; tickets: number; revenue: number; occupancy: number;
  venues: MarketGroup[]; categories: MarketGroup[];
  monthly: { label: string; tickets: number }[];
  heatmap: { category: string; days: number[] }[];
  averageSelloutHours: number | null;
  queue: { completed: number; expired: number; cancelled: number };
}

@Injectable({ providedIn: 'root' })
export class MarketService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private store = inject(MockStore);
  private queue = inject(QueueService);

  report(filters: MarketFilters): Observable<MarketReport> {
    if (!environment.useMock) {
      let params = new HttpParams();
      for (const [key, value] of Object.entries(filters)) if (value && value !== 'all') params = params.set(key, value);
      return this.http.get<MarketReport>(`${environment.apiBackendUrl}/v1/dashboard/mercado`, { params });
    }
    if (!this.auth.isOrganizer()) return mockError('Acceso exclusivo de organizadores.', 403);
    const events = this.store.events.filter(e =>
      ['PUBLICADO', 'AGOTADO', 'FINALIZADO'].includes(e.status) &&
      (!filters.from || e.startsAt.slice(0, 10) >= filters.from) &&
      (!filters.to || e.startsAt.slice(0, 10) <= filters.to) &&
      (!filters.category || e.category === filters.category) &&
      (!filters.venue || e.venue === filters.venue) &&
      (filters.queue === 'with' ? !!e.queueEnabled : filters.queue === 'without' ? !e.queueEnabled : true));
    const ids = new Set(events.map(e => e.id));
    const orders = this.store.orders.filter(o => ids.has(o.eventId) && o.status === 'CONFIRMADA');
    const groups = (field: 'venue' | 'category'): MarketGroup[] => {
      const names = [...new Set(events.map(e => e[field]))];
      return names.map(name => {
        const subset = events.filter(e => e[field] === name);
        const subIds = new Set(subset.map(e => e.id));
        const sold = subset.flatMap(e => e.zones).reduce((n, z) => n + z.sold, 0);
        const capacity = subset.flatMap(e => e.zones).reduce((n, z) => n + z.capacity, 0);
        const opening = subset.flatMap(e => e.zones).reduce((n, z) => n + (z.openingRevenue ?? 0), 0);
        const revenue = opening + orders.filter(o => subIds.has(o.eventId)).reduce((n, o) => n + o.subtotal, 0);
        return { name, events: subset.length, tickets: sold, revenue: Math.round(revenue * 100) / 100,
          occupancy: capacity ? sold / capacity : 0, averageTicket: sold ? revenue / sold : 0 };
      });
    };
    const venues = groups('venue');
    const categories = groups('category');
    const capacity = events.flatMap(e => e.zones).reduce((n, z) => n + z.capacity, 0);
    const tickets = venues.reduce((n, g) => n + g.tickets, 0);
    const revenue = venues.reduce((n, g) => n + g.revenue, 0);
    const monthly = Array.from({ length: 6 }, (_, i) => {
      const date = new Date(); date.setDate(1); date.setMonth(date.getMonth() - 5 + i);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      return { label: key, tickets: orders.filter(o => o.createdAt.startsWith(key)).reduce((n, o) => n + o.lines.reduce((s, l) => s + l.quantity, 0), 0) };
    });
    const heatmap = categories.map(category => ({ category: category.name,
      days: Array.from({ length: 7 }, (_, day) => orders.filter(o => {
        const event = events.find(e => e.id === o.eventId);
        return event?.category === category.name && new Date(event.startsAt).getDay() === day;
      }).reduce((n, o) => n + o.lines.reduce((s, l) => s + l.quantity, 0), 0)) }));
    const sellout = events.filter((e): e is EventItem & { soldOutAt: string; publishedAt: string } => !!e.soldOutAt && !!e.publishedAt)
      .map(e => (Date.parse(e.soldOutAt) - Date.parse(e.publishedAt)) / 3_600_000).filter(n => n >= 0);
    return mockResponse({ events: events.length, tickets, revenue: Math.round(revenue * 100) / 100,
      occupancy: capacity ? tickets / capacity : 0, venues, categories, monthly, heatmap,
      averageSelloutHours: sellout.length ? sellout.reduce((a, b) => a + b, 0) / sellout.length : null,
      queue: this.queue.aggregateStates(ids) });
  }
}
