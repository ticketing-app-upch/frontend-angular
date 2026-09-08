import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../enviroments/enviroment';
import { mockError, mockResponse } from '../mock/mock-latency';
import { MockStore } from '../mock/mock-store';
import { EventCategory, EventItem } from '../models/event.model';

export interface EventFilter {
  search?: string;
  category?: EventCategory | 'TODAS';
  onlyAvailable?: boolean;
}

@Injectable({ providedIn: 'root' })
export class EventService {
  private http = inject(HttpClient);
  private store = inject(MockStore);
  private base = environment.apiBackendUrl;

  list(filter: EventFilter = {}): Observable<EventItem[]> {
    if (environment.useMock) {
      return mockResponse(this.filterLocally(this.publicEvents(), filter));
    }
    let params = new HttpParams();
    if (filter.search) params = params.set('search', filter.search);
    if (filter.category && filter.category !== 'TODAS') {
      params = params.set('category', filter.category);
    }
    if (filter.onlyAvailable) params = params.set('available', 'true');
    return this.http.get<EventItem[]>(`${this.base}/events`, { params });
  }

  getById(id: string): Observable<EventItem> {
    if (environment.useMock) {
      const found = this.store.events.find((e) => e.id === id);
      return found
        ? mockResponse(structuredClone(found))
        : mockError<EventItem>('Evento no encontrado.', 404);
    }
    return this.http.get<EventItem>(`${this.base}/events/${id}`);
  }

  /** Todos los eventos de la plataforma (cualquier organizador, cualquier estado). Solo admin. */
  listAll(): Observable<EventItem[]> {
    if (environment.useMock) {
      return mockResponse(
        [...this.store.events]
          .map((e) => structuredClone(e))
          .sort((a, b) => b.startsAt.localeCompare(a.startsAt)),
      );
    }
    return this.http.get<EventItem[]>(`${this.base}/admin/events`);
  }

  remove(id: string): Observable<void> {
    if (environment.useMock) {
      this.store.removeEvent(id);
      return mockResponse<void>(undefined);
    }
    return this.http.delete<void>(`${this.base}/events/${id}`);
  }

  /** Eventos que pertenecen a un organizador (incluye borradores). */
  listByOrganizer(organizerId: string): Observable<EventItem[]> {
    if (environment.useMock) {
      return mockResponse(
        this.store.events
          .filter((e) => e.organizerId === organizerId)
          .map((e) => structuredClone(e)),
      );
    }
    return this.http.get<EventItem[]>(
      `${this.base}/organizers/${organizerId}/events`,
    );
  }

  save(event: EventItem): Observable<EventItem> {
    if (environment.useMock) {
      this.store.upsertEvent(structuredClone(event));
      return mockResponse(structuredClone(event));
    }
    const isNew = !event.id;
    return isNew
      ? this.http.post<EventItem>(`${this.base}/events`, event)
      : this.http.put<EventItem>(`${this.base}/events/${event.id}`, event);
  }

  private publicEvents(): EventItem[] {
    return this.store.events
      .filter((e) => e.status === 'PUBLICADO' || e.status === 'AGOTADO')
      .map((e) => structuredClone(e));
  }

  private filterLocally(events: EventItem[], filter: EventFilter): EventItem[] {
    const term = filter.search?.trim().toLowerCase();
    return events
      .filter((e) => {
        if (
          filter.category &&
          filter.category !== 'TODAS' &&
          e.category !== filter.category
        ) {
          return false;
        }
        if (term) {
          const haystack = `${e.name} ${e.venue} ${e.city}`.toLowerCase();
          if (!haystack.includes(term)) return false;
        }
        if (filter.onlyAvailable) {
          const available = e.zones.reduce(
            (acc, z) => acc + (z.capacity - z.sold),
            0,
          );
          if (available <= 0) return false;
        }
        return true;
      })
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  }
}
