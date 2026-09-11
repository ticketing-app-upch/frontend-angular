import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../enviroments/enviroment';
import { EventService } from './event.service';
import { PricingService } from './pricing.service';
import { TicketService } from './ticket.service';
import { DashboardService } from './dashboard.service';
import { AuthService } from '../auth/auth.service';
import { MockStore } from '../mock/mock-store';
import { EventItem } from '../models/event.model';

const makeEvent = (): EventItem => ({ id: '', organizerId: 'u-org', name: 'Evento contractual', description: 'Descripción de prueba para el contrato.',
  startsAt: new Date(Date.now() + 10 * 86400000).toISOString(), publishedAt: new Date().toISOString(), category: 'CONCIERTO',
  status: 'PUBLICADO', venue: 'Arena', city: 'Lima', venueCapacity: 100, imageUrl: '', maxPerOrder: 6,
  zones: [{ id: 'z-test', name: 'General', price: 100, capacity: 100, sold: 0 }] });

describe('Contratos HTTP del frontend', () => {
  beforeEach(() => {
    environment.useMock = false;
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  });
  afterEach(() => { TestBed.inject(HttpTestingController).verify(); environment.useMock = true; });
  it('usa POST para evento nuevo y PUT para existente', async () => {
    const service = TestBed.inject(EventService), http = TestBed.inject(HttpTestingController);
    const event = makeEvent(), pending = firstValueFrom(service.save(event));
    const request = http.expectOne(environment.apiBackendUrl + '/events');
    expect(request.request.method).toBe('POST'); request.flush({ ...event, id: 'new' }); await pending;
    const updating = firstValueFrom(service.save({ ...event, id: 'new' }));
    const put = http.expectOne(environment.apiBackendUrl + '/events/new'); expect(put.request.method).toBe('PUT');
    put.flush({ ...event, id: 'new' }); await updating;
  });
  it('consulta endpoint Python y calcula comisión una sola vez', async () => {
    const pending = firstValueFrom(TestBed.inject(PricingService).quote(makeEvent(), [{ zoneId: 'z-test', quantity: 2 }]));
    const request = TestBed.inject(HttpTestingController).expectOne(environment.apiPricingUrl + '/v1/dynamic-price');
    expect(request.request.body.aforo_disponible).toBe(100);
    expect(request.request.body.fecha_publicacion).toBeTruthy();
    request.flush({ precio_ajustado: 120, motivo: 'Demanda' });
    expect(await pending).toMatchObject({ subtotal: 240, fee: 14.4, total: 254.4 });
  });
  it('rechaza respuesta inválida de precios', async () => {
    const pending = firstValueFrom(TestBed.inject(PricingService).quote(makeEvent(), [{ zoneId: 'z-test', quantity: 1 }]));
    const assertion = expect(pending).rejects.toThrow('Respuesta de precios inválida');
    TestBed.inject(HttpTestingController).expectOne(environment.apiPricingUrl + '/v1/dynamic-price').flush({ precio_ajustado: -1 });
    await assertion;
  });
});

describe('Transacciones locales en una instancia (no reemplazan SQL)', () => {
  const originalLatency = environment.mockLatencyMs;
  let auth: AuthService, store: MockStore, tickets: TicketService, event: EventItem;
  beforeEach(async () => {
    localStorage.clear(); sessionStorage.clear(); environment.useMock = true; environment.mockLatencyMs = 0;
    TestBed.configureTestingModule({ providers: [provideHttpClient()] });
    auth = TestBed.inject(AuthService); store = TestBed.inject(MockStore); tickets = TestBed.inject(TicketService);
    await firstValueFrom(auth.login({ email: 'cliente@tkt.pe', password: 'cliente' }));
    event = { ...makeEvent(), id: 'test-event', organizerId: 'u-org-1' }; store.upsertEvent(event);
  });
  afterEach(() => { environment.mockLatencyMs = originalLatency; localStorage.clear(); sessionStorage.clear(); });
  const payload = () => ({ eventId: 'test-event', items: [{ zoneId: 'z-test', quantity: 1 }], expectedTotal: 106 });
  it('rechazo no descuenta aforo ni crea orden', async () => {
    const count = store.orders.length;
    await expect(firstValueFrom(tickets.createOrder({ ...payload(), paymentResult: 'DECLINED' }))).rejects.toMatchObject({ status: 402 });
    expect(event.zones[0].sold).toBe(0); expect(store.orders.length).toBe(count);
  });
  it('no acepta precio esperado obsoleto', async () => {
    await expect(firstValueFrom(tickets.createOrder({ ...payload(), expectedTotal: 1 }))).rejects.toMatchObject({ status: 409 });
    expect(event.zones[0].sold).toBe(0);
  });
  it('repetir una petición idempotente solo vende una vez', async () => {
    const request = { ...payload(), idempotencyKey: 'same' };
    const [a, b] = await Promise.all([firstValueFrom(tickets.createOrder(request)), firstValueFrom(tickets.createOrder(request))]);
    expect(a.id).toBe(b.id); expect(event.zones[0].sold).toBe(1);
  });
  it('dos compras simultáneas no consumen la misma última entrada local', async () => {
    event.zones[0].sold = 99;
    const request = { ...payload(), expectedTotal: 127.2 };
    const results = await Promise.allSettled([firstValueFrom(tickets.createOrder(request)), firstValueFrom(tickets.createOrder(request))]);
    expect(results.filter(r => r.status === 'fulfilled').length).toBe(1);
    expect(event.zones[0].sold).toBe(100);
  });
  it('el ticket conserva precio después de editar precio base', async () => {
    const order = await firstValueFrom(tickets.createOrder(payload()));
    event.zones[0].price = 300; store.upsertEvent(event);
    expect(store.orders.find(o => o.id === order.id)?.lines[0].unitPrice).toBe(100);
  });
  it('cancelación admin libera stock una sola vez', async () => {
    const order = await firstValueFrom(tickets.createOrder(payload()));
    await firstValueFrom(auth.login({ email: 'admin@tkt.pe', password: 'admin' }));
    await firstValueFrom(tickets.setStatus(order.id, 'CANCELADA'));
    expect(event.zones[0].sold).toBe(0);
    await expect(firstValueFrom(tickets.setStatus(order.id, 'CANCELADA'))).rejects.toMatchObject({ status: 409 });
    expect(store.orders.find(o => o.id === order.id)?.total).toBe(106);
  });
  it('un cliente no puede publicar', async () => {
    await expect(firstValueFrom(TestBed.inject(EventService).save(makeEvent()))).rejects.toMatchObject({ status: 403 });
  });
  it('el dashboard por zona coincide con el total sin comisión', async () => {
    await firstValueFrom(tickets.createOrder(payload()));
    await firstValueFrom(auth.login({ email: 'organizador@tkt.pe', password: 'organizador' }));
    const stats = await firstValueFrom(TestBed.inject(DashboardService).stats(event.organizerId));
    expect(stats.byZone?.reduce((sum, row) => sum + row.revenue, 0)).toBeCloseTo(stats.totalRevenue, 2);
  });
  it('sesión sin recordar usa sessionStorage', async () => {
    await firstValueFrom(auth.login({ email: 'cliente@tkt.pe', password: 'cliente', remember: false }));
    expect(localStorage.getItem('tkt.token')).toBeNull(); expect(sessionStorage.getItem('tkt.token')).toBeTruthy();
    auth.logout(); expect(sessionStorage.getItem('tkt.token')).toBeNull();
  });
});
