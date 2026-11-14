import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { environment } from '../../../enviroments/enviroment';
import { AuthService } from '../auth/auth.service';
import { DEMO_CREDENTIALS } from '../mock/mock-data';
import { MockStore } from '../mock/mock-store';
import { EventItem } from '../models/event.model';
import { EventService } from './event.service';
import { QueueService } from './queue.service';
import { TicketService } from './ticket.service';

const event = (): EventItem => ({
  id: 'ev-queue-demo4', organizerId: 'u-org-1', name: 'Evento con cola', description: 'Descripción de prueba para la cola virtual.',
  startsAt: new Date(Date.now() + 20 * 86400000).toISOString(), category: 'CONCIERTO', status: 'PUBLICADO',
  venue: 'Arena', city: 'Lima', venueCapacity: 250, imageUrl: '', maxPerOrder: 6, queueEnabled: true, purchasesEnabled: false,
  zones: [{ id: 'z1', name: 'General', price: 100, capacity: 200, sold: 0 }, { id: 'z2', name: 'VIP', price: 200, capacity: 50, sold: 0 }],
});

describe('Cola virtual de Demo4', () => {
  const original = { mock: environment.useMock, auth: environment.useMockAuth, latency: environment.mockLatencyMs, epics: environment.enabledEpics };
  let auth: AuthService, queue: QueueService, store: MockStore, events: EventService, tickets: TicketService;
  beforeEach(async () => {
    localStorage.clear(); sessionStorage.clear();
    environment.useMock = true; environment.useMockAuth = true; environment.mockLatencyMs = 0; environment.enabledEpics = [1, 2, 3, 4, 5];
    TestBed.configureTestingModule({ providers: [provideHttpClient()] });
    auth = TestBed.inject(AuthService); queue = TestBed.inject(QueueService); store = TestBed.inject(MockStore);
    events = TestBed.inject(EventService); tickets = TestBed.inject(TicketService);
    store.upsertEvent(event());
    await firstValueFrom(auth.login(DEMO_CREDENTIALS.CLIENT));
  });
  afterEach(() => {
    vi.restoreAllMocks(); environment.useMock = original.mock; environment.useMockAuth = original.auth;
    environment.mockLatencyMs = original.latency; environment.enabledEpics = original.epics;
    localStorage.clear(); sessionStorage.clear();
  });
  async function enable(): Promise<void> {
    await firstValueFrom(auth.login(DEMO_CREDENTIALS.ORGANIZER));
    await firstValueFrom(events.enablePurchases('ev-queue-demo4'));
    await firstValueFrom(auth.login(DEMO_CREDENTIALS.CLIENT));
  }

  it('permite esperar antes de abrir ventas, sin pase ni pago', async () => {
    const waiting = await firstValueFrom(queue.join('ev-queue-demo4'));
    expect(waiting).toMatchObject({ status: 'WAITING', position: 1, salesEnabled: false });
    expect(waiting.passToken).toBeUndefined();
    await expect(firstValueFrom(tickets.createOrder({ eventId: event().id, items: [{ zoneId: 'z1', quantity: 1 }] })))
      .rejects.toMatchObject({ status: 403, message: 'Las compras de este evento aún no han sido habilitadas' });
  });

  it('admite al habilitar, conserva turno al consultar y vence a los tres minutos', async () => {
    const waiting = await firstValueFrom(queue.join('ev-queue-demo4'));
    await enable();
    const admitted = await firstValueFrom(queue.status(event().id));
    expect(admitted).toMatchObject({ status: 'ADMITTED', initialPosition: waiting.initialPosition });
    expect(admitted?.passToken).toBeTruthy();
    const expires = Date.parse(admitted!.passExpiresAt!);
    vi.spyOn(Date, 'now').mockReturnValue(expires + 1);
    expect((await firstValueFrom(queue.status(event().id)))?.status).toBe('EXPIRED');
    expect(queue.passToken(event().id)).toBeUndefined();
    expect((await firstValueFrom(queue.join(event().id))).status).toBe('WAITING');
  });

  it('cancela desde el formulario y permite un turno nuevo al final', async () => {
    await firstValueFrom(queue.join(event().id)); await enable();
    expect((await firstValueFrom(queue.status(event().id)))?.status).toBe('ADMITTED');
    await firstValueFrom(queue.leave(event().id));
    expect((await firstValueFrom(queue.status(event().id)))?.status).toBe('CANCELLED');
    expect(queue.passToken(event().id)).toBeUndefined();
    expect((await firstValueFrom(queue.join(event().id))).status).toBe('WAITING');
  });

  it('completa el turno tras compra confirmada y rechaza reutilizar el pase', async () => {
    await firstValueFrom(queue.join(event().id)); await enable();
    const pass = (await firstValueFrom(queue.status(event().id)))!.passToken!;
    await firstValueFrom(tickets.openPayment(event().id));
    const order = await firstValueFrom(tickets.createOrder({ eventId: event().id, items: [{ zoneId: 'z1', quantity: 1 }], queuePass: pass }));
    expect(order.status).toBe('CONFIRMADA');
    expect((await firstValueFrom(queue.status(event().id)))?.status).toBe('COMPLETED');
    await expect(firstValueFrom(tickets.createOrder({ eventId: event().id, items: [{ zoneId: 'z1', quantity: 1 }], queuePass: pass })))
      .rejects.toMatchObject({ status: 403 });
  });
});
