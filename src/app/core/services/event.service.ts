import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../enviroments/enviroment';
import { mockError, mockResponse } from '../mock/mock-latency';
import { MockStore } from '../mock/mock-store';
import { EventCategory, EventItem } from '../models/event.model';
import { AuthService } from '../auth/auth.service';
import { eventIssues } from '../models/ticketing-rules';

export interface EventFilter {
  search?: string;
  category?: EventCategory | 'TODAS';
  onlyAvailable?: boolean;
}

@Injectable({ providedIn: 'root' })
export class EventService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
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
      const found = this.store.events.find((e) => e.id === id && (e.status !== 'BORRADOR' || this.auth.isAdmin() || e.organizerId === this.auth.user()?.id));
      return found
        ? mockResponse(structuredClone(found))
        : mockError<EventItem>('Evento no encontrado.', 404);
    }
    return this.http.get<EventItem>(`${this.base}/events/${id}`);
  }

  /** Todos los eventos de la plataforma (cualquier organizador, cualquier estado). Solo admin. */
  listAll(): Observable<EventItem[]> {
    if (environment.useMock) {
      if (!this.auth.isAdmin()) return mockError('Acceso exclusivo de administración.', 403);
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
      const event = this.store.events.find(e => e.id === id);
      if (!this.auth.isAdmin() && !(this.auth.isOrganizer() && event?.organizerId === this.auth.user()?.id)) return mockError('No tienes permisos para eliminar este evento.', 403);
      if (this.store.events.find(e => e.id === id)?.zones.some(z => z.sold > 0) || this.store.orders.some(o => o.eventId === id)) return mockError('Un evento con ventas debe conservarse para proteger el historial de entradas.', 409);
      this.store.removeEvent(id);
      return mockResponse<void>(undefined);
    }
    return this.http.delete<void>(`${this.base}/events/${id}`);
  }

  /** Eventos que pertenecen a un organizador (incluye borradores). */
  listByOrganizer(organizerId: string): Observable<EventItem[]> {
    if (environment.useMock) {
      if (!this.auth.isAdmin() && !(this.auth.isOrganizer() && this.auth.user()?.id === organizerId)) return mockError('No tienes acceso a estos eventos.', 403);
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
    const previous = this.store.events.find(e => e.id === event.id);
    if (environment.useMock && !this.auth.isAdmin() && !(this.auth.isOrganizer() && event.organizerId === this.auth.user()?.id && (!previous || previous.organizerId === this.auth.user()?.id))) return mockError('No tienes permisos para editar este evento.', 403);
    const issues = eventIssues(event, environment.useMock ? previous : undefined);
    if (issues.length) return mockError<EventItem>(issues[0], 422);
    if (environment.useMock) {
      const saved = { ...structuredClone(event), id: event.id || `ev-${crypto.randomUUID()}` };
      this.store.upsertEvent(saved);
      return mockResponse(saved);
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
