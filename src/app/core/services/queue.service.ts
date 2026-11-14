import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../enviroments/enviroment';
import { AuthService } from '../auth/auth.service';
import { mockError, mockResponse } from '../mock/mock-latency';
import { MockStore } from '../mock/mock-store';

export type QueueStatus = 'WAITING' | 'ADMITTED' | 'COMPLETED' | 'EXPIRED' | 'CANCELLED' | 'CLOSED';
export interface QueueState {
  eventId: string;
  status: QueueStatus;
  position: number;
  initialPosition: number;
  etaSeconds: number;
  joinedAt: string;
  passToken?: string;
  passExpiresAt?: string;
  salesEnabled: boolean;
}
interface Entry {
  id: string;
  userId: string;
  eventId: string;
  joinedAt: number;
  sequence: number;
  initialPosition: number;
  status: QueueStatus;
  admittedAt?: number;
  passToken?: string;
}
const KEY = 'tkt.queue.demo4.v1';
const PASS_PREFIX = 'tkt.queue.pass.';
const EXPIRY_PREFIX = 'tkt.queue.expiry.';
const BATCH_SIZE = 3;
const BATCH_SECONDS = 5;
const ACTIVE_LIMIT = 3;
const terminal = (status: QueueStatus) => ['COMPLETED', 'EXPIRED', 'CANCELLED', 'CLOSED'].includes(status);

/** Angular solo recibe el pase. En integración real PHP delega el orden y firma a Python. */
@Injectable({ providedIn: 'root' })
export class QueueService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private store = inject(MockStore);
  private base = environment.apiBackendUrl;
  private entries = this.load();

  join(eventId: string): Observable<QueueState> {
    if (!environment.useMock) return this.http.post<QueueState>(`${this.base}/v1/eventos/${eventId}/cola`, {}).pipe(map(s => this.remember(s)));
    const user = this.auth.user();
    if (!user || !this.auth.isClient()) return mockError('Debes iniciar sesión como asistente.', 401);
    const event = this.store.events.find(e => e.id === eventId);
    if (!event || event.status !== 'PUBLICADO' || !event.queueEnabled) return mockError('Este evento no tiene cola virtual disponible.', 404);
    if (Date.parse(event.startsAt) <= Date.now() || event.zones.every(z => z.sold >= z.capacity)) return mockError('La venta de este evento ha finalizado.', 409);
    this.advance(eventId);
    let entry = this.entries.find(e => e.userId === user.id && e.eventId === eventId && !terminal(e.status));
    if (!entry) {
      const sequence = Math.max(0, ...this.entries.filter(e => e.eventId === eventId).map(e => e.sequence)) + 1;
      const initialPosition = this.entries.filter(e => e.eventId === eventId && e.status === 'WAITING').length + 1;
      entry = { id: crypto.randomUUID(), userId: user.id, eventId, joinedAt: Date.now(), sequence, initialPosition, status: 'WAITING' };
      this.entries.push(entry);
      this.persist();
    }
    return mockResponse(this.snapshot(entry));
  }

  status(eventId: string): Observable<QueueState | null> {
    if (!environment.useMock) return this.http.get<QueueState>(`${this.base}/v1/eventos/${eventId}/cola/estado`).pipe(map(s => this.remember(s)));
    this.advance(eventId);
    const entry = [...this.entries].reverse().find(e => e.userId === this.auth.user()?.id && e.eventId === eventId);
    return mockResponse(entry ? this.snapshot(entry) : null);
  }

  /** Cancelación explícita desde el formulario; cerrar la pestaña deja vencer el pase. */
  leave(eventId: string): Observable<void> {
    sessionStorage.removeItem(PASS_PREFIX + eventId);
    if (!environment.useMock) return this.http.post<void>(`${this.base}/v1/eventos/${eventId}/cola/cancelar`, {});
    this.advance(eventId);
    const entry = [...this.entries].reverse().find(e => e.userId === this.auth.user()?.id && e.eventId === eventId && e.status === 'ADMITTED');
    if (entry) { entry.status = 'CANCELLED'; this.persist(); this.advance(eventId); }
    return mockResponse(undefined);
  }

  passToken(eventId: string): string | undefined {
    if (!environment.useMock) {
      const expires = Number(sessionStorage.getItem(EXPIRY_PREFIX + eventId));
      return expires > Date.now() ? sessionStorage.getItem(PASS_PREFIX + eventId) ?? undefined : undefined;
    }
    this.advance(eventId);
    const entry = this.entries.find(e => e.userId === this.auth.user()?.id && e.eventId === eventId && e.status === 'ADMITTED');
    return entry?.passToken;
  }

  hasValidPass(eventId: string): boolean { return !!this.passToken(eventId); }

  aggregateStates(eventIds: Set<string>): { completed: number; expired: number; cancelled: number } {
    const entries = this.load().filter(e => eventIds.has(e.eventId));
    return { completed: entries.filter(e => e.status === 'COMPLETED').length,
      expired: entries.filter(e => e.status === 'EXPIRED').length,
      cancelled: entries.filter(e => e.status === 'CANCELLED').length };
  }

  passExpiresAt(eventId: string): number | null {
    if (!environment.useMock) {
      const value = Number(sessionStorage.getItem(EXPIRY_PREFIX + eventId));
      return value > 0 ? value : null;
    }
    this.advance(eventId);
    const entry = this.entries.find(e => e.userId === this.auth.user()?.id && e.eventId === eventId && e.status === 'ADMITTED');
    return entry?.admittedAt ? entry.admittedAt + environment.queuePassMinutes * 60_000 : null;
  }

  validatePass(eventId: string, token?: string): string | null {
    const event = this.store.events.find(e => e.id === eventId);
    if (!event?.queueEnabled) return null;
    if (!event.purchasesEnabled) return 'Las compras de este evento aún no han sido habilitadas';
    this.advance(eventId);
    const entry = this.entries.find(e => e.userId === this.auth.user()?.id && e.eventId === eventId && e.status === 'ADMITTED');
    return entry && token && token === entry.passToken ? null : 'Tu pase de compra no es válido o ha vencido.';
  }

  consume(eventId: string): void {
    sessionStorage.removeItem(PASS_PREFIX + eventId);
    this.advance(eventId);
    const entry = this.entries.find(e => e.userId === this.auth.user()?.id && e.eventId === eventId && e.status === 'ADMITTED');
    if (entry) { entry.status = 'COMPLETED'; this.persist(); this.advance(eventId); }
  }

  private advance(eventId: string): void {
    this.entries = this.load();
    const event = this.store.events.find(e => e.id === eventId);
    if (!event) return;
    const now = Date.now();
    let changed = false;
    for (const e of this.entries.filter(e => e.eventId === eventId && e.status === 'ADMITTED')) {
      if (now >= (e.admittedAt ?? 0) + environment.queuePassMinutes * 60_000) { e.status = 'EXPIRED'; changed = true; }
    }
    if (Date.parse(event.startsAt) <= now || event.zones.every(z => z.sold >= z.capacity)) {
      for (const e of this.entries.filter(e => e.eventId === eventId && (e.status === 'WAITING' || e.status === 'ADMITTED'))) { e.status = 'CLOSED'; changed = true; }
    } else if (event.purchasesEnabled) {
      const enabledAt = Date.parse(event.purchasesEnabledAt ?? new Date(now).toISOString());
      const maxAdmitted = BATCH_SIZE * (Math.floor(Math.max(0, now - enabledAt) / (BATCH_SECONDS * 1000)) + 1);
      const admittedEver = this.entries.filter(e => e.eventId === eventId && e.admittedAt !== undefined).length;
      const active = this.entries.filter(e => e.eventId === eventId && e.status === 'ADMITTED').length;
      const count = Math.min(maxAdmitted - admittedEver, ACTIVE_LIMIT - active, BATCH_SIZE);
      const waiting = this.entries.filter(e => e.eventId === eventId && e.status === 'WAITING').sort((a, b) => a.sequence - b.sequence);
      for (const e of waiting.slice(0, Math.max(0, count))) {
        e.status = 'ADMITTED'; e.admittedAt = now; e.passToken = `mock-pass-${crypto.randomUUID()}`; changed = true;
      }
    }
    if (changed) this.persist();
  }

  private snapshot(entry: Entry): QueueState {
    const event = this.store.events.find(e => e.id === entry.eventId);
    const position = entry.status === 'WAITING' ? this.entries.filter(e => e.eventId === entry.eventId && e.status === 'WAITING' && e.sequence <= entry.sequence).length : 0;
    return { eventId: entry.eventId, status: entry.status, position, initialPosition: entry.initialPosition,
      etaSeconds: position * BATCH_SECONDS, joinedAt: new Date(entry.joinedAt).toISOString(),
      salesEnabled: !!event?.purchasesEnabled,
      ...(entry.status === 'ADMITTED' ? { passToken: entry.passToken,
        passExpiresAt: new Date((entry.admittedAt ?? 0) + environment.queuePassMinutes * 60_000).toISOString() } : {}) };
  }

  private remember(state: QueueState): QueueState {
    if (state.status === 'ADMITTED' && state.passToken) sessionStorage.setItem(PASS_PREFIX + state.eventId, state.passToken);
    else sessionStorage.removeItem(PASS_PREFIX + state.eventId);
    if (state.status === 'ADMITTED' && state.passExpiresAt) sessionStorage.setItem(EXPIRY_PREFIX + state.eventId, String(Date.parse(state.passExpiresAt)));
    else sessionStorage.removeItem(EXPIRY_PREFIX + state.eventId);
    return state;
  }
  private load(): Entry[] { try { const entries = JSON.parse(localStorage.getItem(KEY) ?? '[]'); return Array.isArray(entries) ? entries : []; } catch { return []; } }
  private persist(): void { try { localStorage.setItem(KEY, JSON.stringify(this.entries)); } catch { /* modo sin persistencia */ } }
}
