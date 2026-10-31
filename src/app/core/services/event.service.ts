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
    return this.http.get<EventItem[]>(`${this.base}/events`, { params }).pipe(
      map(events => this.filterLocally(events.filter(event => this.isPublic(event) && Date.parse(event.startsAt) > Date.now()), filter)),
    );
  }

  getById(id: string): Observable<EventItem> {
    if (environment.useMock) {
      const found = this.store.events.find(e => e.id === id && this.canView(e));
      return found
        ? mockResponse(structuredClone(found))
        : mockError<EventItem>('Evento no encontrado.', 404);
    }
    return this.http.get<EventItem>(`${this.base}/events/${id}`).pipe(map(event => {
      if (!this.canView(event)) throw { status: 404, message: 'Evento no disponible.' };
      return event;
    }));
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
    if (environment.useMock) {
      const account = this.store.users.find(user => user.id === this.auth.user()?.id);
      if (!account || account.active === false) return mockError('Tu cuenta está desactivada. Contacta al administrador.', 403);
    }
    if (environment.useMock && (!this.auth.isOrganizer() || event.organizerId !== this.auth.user()?.id)) return mockError('Solo un organizador activo puede crear eventos.', 403);
    if (event.id) {
      return mockError('El evento ya fue creado y no puede modificarse.', 403);
    }
    if (environment.useMock && this.store.events.some(other =>
      other.venue === event.venue &&
      other.status !== 'BORRADOR' &&
      Math.abs(Date.parse(other.startsAt) - Date.parse(event.startsAt)) < 86_400_000
    )) {
      return mockError('El recinto ya tiene un evento con menos de un día de diferencia.', 409);
    }
    const issues = eventIssues(event);
    if (issues.length) return mockError<EventItem>(issues[0], 422);
    if (environment.useMock) {
      const saved = { ...structuredClone(event), id: event.id || `ev-${crypto.randomUUID()}` };
      this.store.upsertEvent(saved);
      return mockResponse(saved);
    }
    return this.http.post<EventItem>(`${this.base}/events`, event);
  }

  private isPublic(event: EventItem): boolean {
    return event.status === 'PUBLICADO' || event.status === 'AGOTADO';
  }

  private canView(event: EventItem): boolean {
    return this.isPublic(event) || this.auth.isAdmin() || (this.auth.isOrganizer() && event.organizerId === this.auth.user()?.id);
  }

  private publicEvents(): EventItem[] {
    return this.store.events
      .filter(e => this.isPublic(e) && Date.parse(e.startsAt) > Date.now())
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
