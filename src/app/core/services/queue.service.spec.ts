import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { environment } from '../../../enviroments/enviroment';
import { AuthService } from '../auth/auth.service';
import { DEMO_CREDENTIALS } from '../mock/mock-data';
import { MockStore } from '../mock/mock-store';
import { EventItem } from '../models/event.model';
import { MAX_JOINS_PER_MINUTE, QUEUE_TICK_SECONDS, QueueService } from './queue.service';
import { TicketService } from './ticket.service';

const makeEvent = (id: string): EventItem => ({
  id, organizerId: 'u-org-1', name: 'Evento con cola', description: 'Descripción de prueba para la cola virtual.',
  startsAt: new Date(Date.now() + 20 * 86400000).toISOString(), publishedAt: new Date().toISOString(),
  category: 'CONCIERTO', status: 'PUBLICADO', venue: 'Arena', city: 'Lima', venueCapacity: 500, imageUrl: '', maxPerOrder: 6,
  zones: [{ id: 'z1', name: 'General', price: 100, capacity: 200, sold: 0 }, { id: 'z2', name: 'VIP', price: 200, capacity: 50, sold: 0 }],
});

describe('Cola virtual y anti-scalping (Épica 4)', () => {
  const original = { mock: environment.useMock, auth: environment.useMockAuth, latency: environment.mockLatencyMs, epics: environment.enabledEpics };
  let queue: QueueService;
  let store: MockStore;
  let tickets: TicketService;

  beforeEach(async () => {
    localStorage.clear(); sessionStorage.clear();
    environment.useMock = true; environment.useMockAuth = true; environment.mockLatencyMs = 0; environment.enabledEpics = [1, 2, 3, 4];
    TestBed.configureTestingModule({ providers: [provideHttpClient()] });
    await firstValueFrom(TestBed.inject(AuthService).login(DEMO_CREDENTIALS.CLIENT));
    queue = TestBed.inject(QueueService); store = TestBed.inject(MockStore); tickets = TestBed.inject(TicketService);
    for (const id of ['ev-q1', 'ev-q2', 'ev-q3', 'ev-q4', 'ev-q5', 'ev-q6']) store.upsertEvent(makeEvent(id));
  });
  afterEach(() => {
    vi.useRealTimers(); vi.restoreAllMocks();
    environment.useMock = original.mock; environment.useMockAuth = original.auth; environment.mockLatencyMs = original.latency; environment.enabledEpics = original.epics;
    localStorage.clear(); sessionStorage.clear();
  });

  const waitTurn = (state: { initialPosition: number }) => {
    const base = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(base + state.initialPosition * QUEUE_TICK_SECONDS * 1000 + 1);
  };

  it('al unirse queda en espera con posición y sin pase', async () => {
    const state = await firstValueFrom(queue.join('ev-q1'));
    expect(state.status).toBe('WAITING');
    expect(state.position).toBeGreaterThan(0);
    expect(state.passToken).toBeUndefined();
    expect(queue.hasValidPass('ev-q1')).toBe(false);
  });

  it('unirse dos veces no duplica la fila ni cambia la posición', async () => {
    const a = await firstValueFrom(queue.join('ev-q1'));
    const b = await firstValueFrom(queue.join('ev-q1'));
    expect(b.initialPosition).toBe(a.initialPosition);
    expect(b.joinedAt).toBe(a.joinedAt);
  });

  it('la posición avanza con el tiempo y al llegar a 0 entrega un pase', async () => {
    const state = await firstValueFrom(queue.join('ev-q1'));
    waitTurn(state);
    const ready = await firstValueFrom(queue.status('ev-q1'));
    expect(ready?.status).toBe('READY');
    expect(ready?.passToken).toBeTruthy();
    expect(queue.hasValidPass('ev-q1')).toBe(true);
  });

  it('el pase vence después del plazo configurado', async () => {
    const state = await firstValueFrom(queue.join('ev-q1'));
    const base = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(base + (state.initialPosition * QUEUE_TICK_SECONDS + environment.queuePassMinutes * 60) * 1000 + 1);
    expect((await firstValueFrom(queue.status('ev-q1')))?.status).toBe('EXPIRED');
    expect(queue.hasValidPass('ev-q1')).toBe(false);
  });

  it('bloquea ráfagas de ingresos (posible bot)', async () => {
    const results = [];
    for (let i = 1; i <= MAX_JOINS_PER_MINUTE + 1; i++) results.push(await firstValueFrom(queue.join(`ev-q${i}`)));
    expect(results.slice(0, MAX_JOINS_PER_MINUTE).every(r => r.status === 'WAITING')).toBe(true);
    const last = results[MAX_JOINS_PER_MINUTE];
    expect(last.status).toBe('BLOCKED');
    expect(last.risk.reasons.length).toBeGreaterThan(0);
  });

  it('no deja comprar sin pase ni mientras sigue en espera', async () => {
    const payload = { eventId: 'ev-q1', items: [{ zoneId: 'z1', quantity: 1 }] };
    await expect(firstValueFrom(tickets.createOrder(payload))).rejects.toMatchObject({ status: 403 });
    const state = await firstValueFrom(queue.join('ev-q1'));
    await expect(firstValueFrom(tickets.createOrder({ ...payload, queuePass: 'pass-inventado' }))).rejects.toMatchObject({ status: 403 });
    expect(state.status).toBe('WAITING');
    expect(store.events.find(e => e.id === 'ev-q1')?.zones[0].sold).toBe(0);
  });

  it('con turno vigente permite comprar y el pase se agota', async () => {
    const state = await firstValueFrom(queue.join('ev-q1'));
    waitTurn(state);
    const pass = queue.passToken('ev-q1')!;
    const order = await firstValueFrom(tickets.createOrder({ eventId: 'ev-q1', items: [{ zoneId: 'z1', quantity: 2 }], queuePass: pass }));
    expect(order.status).toBe('CONFIRMADA');
    await expect(firstValueFrom(tickets.createOrder({ eventId: 'ev-q1', items: [{ zoneId: 'z1', quantity: 1 }], queuePass: pass }))).rejects.toMatchObject({ status: 403 });
  });

  it('aplica el límite de entradas por persona entre compras', async () => {
    let state = await firstValueFrom(queue.join('ev-q1'));
    waitTurn(state);
    await firstValueFrom(tickets.createOrder({ eventId: 'ev-q1', items: [{ zoneId: 'z1', quantity: 6 }], queuePass: queue.passToken('ev-q1') }));
    vi.restoreAllMocks();
    state = await firstValueFrom(queue.join('ev-q1'));
    expect(state.status).toBe('BLOCKED');
    expect(state.risk.reasons[0]).toContain('límite');
  });

  it('salir de la cola borra el turno', async () => {
    await firstValueFrom(queue.join('ev-q1'));
    await firstValueFrom(queue.leave('ev-q1'));
    expect(await firstValueFrom(queue.status('ev-q1'))).toBeNull();
  });
});
