import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../enviroments/enviroment';
import { AuthService } from '../auth/auth.service';
import { mockError, mockResponse } from '../mock/mock-latency';
import { MockStore } from '../mock/mock-store';

export type QueueStatus = 'WAITING' | 'READY' | 'EXPIRED' | 'BLOCKED';

/** Resultado de la validación anti-scalping hecha por el microservicio. */
export interface RiskAssessment {
  decision: 'ALLOW' | 'BLOCK';
  /** 0 = sin riesgo, 100 = riesgo máximo. */
  score: number;
  reasons: string[];
}

export interface QueueState {
  eventId: string;
  status: QueueStatus;
  /** Lugar actual en la fila (0 cuando ya es tu turno). */
  position: number;
  /** Lugar con el que entraste, para dibujar el avance. */
  initialPosition: number;
  etaSeconds: number;
  joinedAt: string;
  /** Solo cuando `status === 'READY'`: pase que el checkout envía al comprar. */
  passToken?: string;
  passExpiresAt?: string;
  risk: RiskAssessment;
}

/** Segundos que tarda cada lugar en avanzar en la simulación local. */
export const QUEUE_TICK_SECONDS = 2;
/** Intentos de ingreso a colas permitidos por minuto antes de marcar al usuario como bot. */
export const MAX_JOINS_PER_MINUTE = 4;
const STORAGE_KEY = 'tkt.queue.v1';
const JOIN_LOG_KEY = 'tkt.queue.joins.v1';

interface MockEntry {
  joinedAt: number;
  initialPosition: number;
  passToken: string;
  consumed?: boolean;
}

/**
 * Cola virtual y validación anti-scalping (Épica 4). En producción habla con
 * el microservicio Python (`apiPricingUrl`); en mock simula la fila con el
 * reloj local y aplica reglas de riesgo equivalentes.
 */
@Injectable({ providedIn: 'root' })
export class QueueService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private store = inject(MockStore);
  private base = environment.apiPricingUrl;
  private entries: Record<string, MockEntry> = this.load();
  private realPasses = new Map<string, string>();

  join(eventId: string): Observable<QueueState> {
    if (!environment.useMock) {
      return this.http
        .post<QueueState>(`${this.base}/v1/queue/join`, { eventId }, { headers: this.headers() })
        .pipe(map(state => this.remember(state)));
    }
    const user = this.auth.user();
    if (!user || !this.auth.isClient()) return mockError('Debes iniciar sesión como cliente.', 401);
    const event = this.store.events.find(e => e.id === eventId);
    if (!event || event.status !== 'PUBLICADO') return mockError('Este evento no está disponible.', 404);

    const existing = this.entries[this.key(eventId)];
    if (existing && !existing.consumed) return mockResponse(this.snapshot(eventId, existing));

    const risk = this.assess(eventId);
    if (risk.decision === 'BLOCK') return mockResponse(this.blocked(eventId, risk));

    const entry: MockEntry = {
      joinedAt: Date.now(),
      initialPosition: 6 + (hash(`${eventId}:${user.id}`) % 15),
      passToken: `pass-${crypto.randomUUID()}`,
    };
    this.entries[this.key(eventId)] = entry;
    this.persist();
    return mockResponse(this.snapshot(eventId, entry, risk));
  }

  /** Estado actual de tu turno; `null` si no estás en la cola de ese evento. */
  status(eventId: string): Observable<QueueState | null> {
    if (!environment.useMock) {
      return this.http
        .get<QueueState>(`${this.base}/v1/queue/${eventId}/status`, { headers: this.headers() })
        .pipe(map(state => this.remember(state)));
    }
    const entry = this.entries[this.key(eventId)];
    return mockResponse(entry && !entry.consumed ? this.snapshot(eventId, entry) : null);
  }

  leave(eventId: string): Observable<void> {
    this.realPasses.delete(eventId);
    if (!environment.useMock) {
      return this.http.delete<void>(`${this.base}/v1/queue/${eventId}`, { headers: this.headers() });
    }
    delete this.entries[this.key(eventId)];
    this.persist();
    return mockResponse(undefined);
  }

  /** ¿Tienes un turno vigente para comprar este evento? */
  hasValidPass(eventId: string): boolean {
    return this.passToken(eventId) !== undefined;
  }

  /** Pase vigente que el checkout envía como `queuePass`. */
  passToken(eventId: string): string | undefined {
    if (!environment.useMock) return this.realPasses.get(eventId);
    const entry = this.entries[this.key(eventId)];
    if (!entry || entry.consumed) return undefined;
    return this.snapshot(eventId, entry).status === 'READY' ? entry.passToken : undefined;
  }

  /** Mock: el pase se agota al confirmar la compra. En real lo consume el backend. */
  consume(eventId: string): void {
    this.realPasses.delete(eventId);
    const entry = this.entries[this.key(eventId)];
    if (entry) {
      entry.consumed = true;
      this.persist();
    }
  }

  /** Mock: valida el pase recibido al crear la orden. */
  validatePass(eventId: string, token?: string): string | null {
    const entry = this.entries[this.key(eventId)];
    if (!entry || entry.consumed || !token || token !== entry.passToken) {
      return 'Necesitas un turno en la cola virtual para comprar este evento.';
    }
    const state = this.snapshot(eventId, entry);
    if (state.status === 'WAITING') return 'Todavía no es tu turno en la cola virtual.';
    if (state.status === 'EXPIRED') return 'Tu turno en la cola virtual venció. Vuelve a ingresar a la cola.';
    return null;
  }

  /** Reglas anti-scalping: velocidad de ingreso, límite por persona y cuenta activa. */
  private assess(eventId: string): RiskAssessment {
    const reasons: string[] = [];
    let score = 0;
    const now = Date.now();
    // Compartido entre pestañas (localStorage): abrir otra pestaña no reinicia el conteo.
    const joinLog = this.readJoinLog().filter(t => now - t < 60_000);
    joinLog.push(now);
    this.writeJoinLog(joinLog);
    if (joinLog.length > MAX_JOINS_PER_MINUTE) {
      reasons.push('Demasiados intentos de ingreso en poco tiempo (posible actividad automatizada).');
      score += 70;
    }
    const user = this.auth.user();
    const event = this.store.events.find(e => e.id === eventId);
    const limit = Math.min(6, event?.maxPerOrder ?? 6);
    const owned = this.store.orders
      .filter(o => o.buyerId === user?.id && o.eventId === eventId && o.status !== 'CANCELADA')
      .reduce((sum, o) => sum + o.lines.reduce((n, l) => n + l.quantity, 0), 0);
    if (owned >= limit) {
      reasons.push(`Ya alcanzaste el límite de ${limit} entradas por persona para este evento.`);
      score += 80;
    }
    if (this.store.users.find(u => u.id === user?.id)?.active === false) {
      reasons.push('Tu cuenta está desactivada.');
      score += 100;
    }
    return { decision: reasons.length ? 'BLOCK' : 'ALLOW', score: Math.min(100, score), reasons };
  }

  private blocked(eventId: string, risk: RiskAssessment): QueueState {
    return {
      eventId, status: 'BLOCKED', position: 0, initialPosition: 0, etaSeconds: 0,
      joinedAt: new Date().toISOString(), risk,
    };
  }

  private snapshot(eventId: string, entry: MockEntry, risk?: RiskAssessment): QueueState {
    const now = Date.now();
    const elapsed = Math.floor((now - entry.joinedAt) / 1000 / QUEUE_TICK_SECONDS);
    const position = Math.max(0, entry.initialPosition - elapsed);
    const readyAt = entry.joinedAt + entry.initialPosition * QUEUE_TICK_SECONDS * 1000;
    const expiresAt = readyAt + environment.queuePassMinutes * 60_000;
    const status: QueueStatus = position > 0 ? 'WAITING' : now >= expiresAt ? 'EXPIRED' : 'READY';
    return {
      eventId, status, position, initialPosition: entry.initialPosition,
      etaSeconds: position * QUEUE_TICK_SECONDS,
      joinedAt: new Date(entry.joinedAt).toISOString(),
      ...(status === 'READY' ? { passToken: entry.passToken, passExpiresAt: new Date(expiresAt).toISOString() } : {}),
      risk: risk ?? { decision: 'ALLOW', score: 0, reasons: [] },
    };
  }

  private remember(state: QueueState): QueueState {
    if (state.status === 'READY' && state.passToken) this.realPasses.set(state.eventId, state.passToken);
    else this.realPasses.delete(state.eventId);
    return state;
  }

  /** El microservicio Python valida el mismo JWT que emite el backend. */
  private headers(): HttpHeaders {
    const token = this.auth.token;
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }

  private key(eventId: string): string {
    return `${this.auth.user()?.id}:${eventId}`;
  }

  private load(): Record<string, MockEntry> {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Record<string, MockEntry>;
    } catch {
      return {};
    }
  }

  private readJoinLog(): number[] {
    try {
      const parsed = JSON.parse(localStorage.getItem(JOIN_LOG_KEY) ?? '[]');
      return Array.isArray(parsed) ? parsed.filter((t): t is number => typeof t === 'number') : [];
    } catch {
      return [];
    }
  }

  private writeJoinLog(log: number[]): void {
    try {
      localStorage.setItem(JOIN_LOG_KEY, JSON.stringify(log));
    } catch {
      /* sin almacenamiento: el conteo queda solo en esta pestaña */
    }
  }

  private persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.entries));
    } catch {
      /* sin almacenamiento: la fila vive solo en memoria */
    }
  }
}

function hash(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (Math.imul(31, h) + text.charCodeAt(i)) | 0;
  return h >>> 0;
}
