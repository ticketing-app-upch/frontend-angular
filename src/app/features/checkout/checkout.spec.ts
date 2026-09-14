import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Checkout } from './checkout';
import { AuthService } from '../../core/auth/auth.service';
import { MockStore } from '../../core/mock/mock-store';
import { DEMO_CREDENTIALS } from '../../core/mock/mock-data';
import { NotificationService } from '../../core/services/notification.service';
import { environment } from '../../../enviroments/enviroment';
import { EventItem } from '../../core/models/event.model';

function seedEvent(store: MockStore, over: Partial<EventItem> = {}): EventItem {
  const ev: EventItem = {
    id: 'ev-checkout-test', organizerId: 'u-org-1', name: 'Evento de prueba',
    description: 'Descripción larga suficiente para pasar la validación.',
    category: 'CONCIERTO', status: 'PUBLICADO', venue: 'Arena', city: 'Lima',
    venueCapacity: 200, startsAt: new Date(Date.now() + 10 * 86400000).toISOString(),
    publishedAt: new Date().toISOString(), imageUrl: '', maxPerOrder: 4,
    zones: [{ id: 'z1', name: 'General', price: 100, capacity: 100, sold: 0 }],
    ...over,
  };
  store.upsertEvent(ev);
  return ev;
}

describe('Checkout', () => {
  let auth: AuthService;
  let store: MockStore;
  let notify: NotificationService;

  beforeEach(() => {
    localStorage.clear(); sessionStorage.clear();
    environment.mockLatencyMs = 0;
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideRouter([])] });
    auth = TestBed.inject(AuthService);
    store = TestBed.inject(MockStore);
    notify = TestBed.inject(NotificationService);
  });
  afterEach(() => { localStorage.clear(); sessionStorage.clear(); });

  /**
   * `mockResponse`/`mockError` usan `delay()`/`timer()` de RxJS, que agendan
   * un macrotask real aunque `mockLatencyMs` sea 0 — `whenStable()` (pensado
   * para microtasks/efectos) no alcanza a esperarlo. Cedemos el control al
   * event loop unas cuantas vueltas: `confirm()` encadena hasta dos llamadas
   * mock (buscar el evento y cotizar) antes de resolver, cada una con su
   * propio macrotask.
   */
  async function flush(fixture: ComponentFixture<Checkout>): Promise<void> {
    for (let i = 0; i < 4; i++) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    fixture.detectChanges();
    await fixture.whenStable();
  }

  async function open(eventId: string): Promise<ComponentFixture<Checkout>> {
    const fixture = TestBed.createComponent(Checkout);
    fixture.componentRef.setInput('eventId', eventId);
    fixture.detectChanges();
    await fixture.whenStable();
    await flush(fixture);
    return fixture;
  }

  it('carga el evento y arranca las cantidades en cero', async () => {
    const ev = seedEvent(store);
    const fixture = await open(ev.id);
    const cmp = fixture.componentInstance;
    expect(cmp.loading()).toBe(false);
    expect(cmp.event()?.id).toBe(ev.id);
    expect(cmp.currentQty('z1')).toBe(0);
  });

  it('un evento inexistente marca notFound', async () => {
    const fixture = await open('no-existe');
    expect(fixture.componentInstance.notFound()).toBe(true);
    expect(fixture.componentInstance.loading()).toBe(false);
  });

  it('no permite superar el máximo de entradas por compra', async () => {
    const ev = seedEvent(store); // maxPerOrder: 4
    const fixture = await open(ev.id);
    const cmp = fixture.componentInstance;
    for (let i = 0; i < 5; i++) cmp.change('z1', 1); // el quinto debe ignorarse
    expect(cmp.totalQty()).toBe(4);
  });

  it('no deja bajar de cero entradas', async () => {
    const ev = seedEvent(store);
    const fixture = await open(ev.id);
    fixture.componentInstance.change('z1', -1);
    expect(fixture.componentInstance.currentQty('z1')).toBe(0);
  });

  it('no permite elegir más de lo que hay disponible en la zona', async () => {
    const ev = seedEvent(store, {
      maxPerOrder: 6,
      zones: [{ id: 'z1', name: 'General', price: 100, capacity: 2, sold: 0 }],
    });
    const fixture = await open(ev.id);
    const cmp = fixture.componentInstance;
    cmp.change('z1', 1); cmp.change('z1', 1); cmp.change('z1', 1); // el tercero excede el aforo
    expect(cmp.currentQty('z1')).toBe(2);
  });

  it('la cotización calcula subtotal, comisión del 6% y total, y arranca el contador en 120s', async () => {
    const ev = seedEvent(store);
    const fixture = await open(ev.id);
    const cmp = fixture.componentInstance;
    cmp.change('z1', 1);
    cmp.startReview();
    await flush(fixture);
    expect(cmp.quote()?.subtotal).toBe(100);
    expect(cmp.quote()?.fee).toBe(6);
    expect(cmp.quote()?.total).toBe(106);
    expect(cmp.secondsLeft()).toBe(120);
  });

  it('sin sesión de cliente, confirmar falla y no genera orden', async () => {
    const ev = seedEvent(store);
    const fixture = await open(ev.id);
    const cmp = fixture.componentInstance;
    cmp.change('z1', 1);
    cmp.startReview();
    await flush(fixture);
    cmp.confirm();
    await flush(fixture);
    expect(cmp.order()).toBeNull();
  });

  it('confirmar una compra válida genera la orden y descuenta el aforo', async () => {
    await firstValueFrom(auth.login(DEMO_CREDENTIALS.CLIENT));
    const ev = seedEvent(store);
    const fixture = await open(ev.id);
    const cmp = fixture.componentInstance;
    cmp.change('z1', 2);
    cmp.startReview();
    await flush(fixture);
    cmp.confirm();
    await flush(fixture);
    expect(cmp.order()?.status).toBe('CONFIRMADA');
    expect(store.events.find(e => e.id === ev.id)?.zones[0].sold).toBe(2);
  });

  it('una cotización vencida bloquea la confirmación con un aviso, sin descontar aforo', async () => {
    await firstValueFrom(auth.login(DEMO_CREDENTIALS.CLIENT));
    const ev = seedEvent(store);
    const fixture = await open(ev.id);
    const cmp = fixture.componentInstance;
    cmp.change('z1', 1);
    cmp.startReview();
    await flush(fixture);
    // Fuerza el vencimiento sin esperar los 120s reales.
    (cmp as unknown as { expiresAt: number }).expiresAt = Date.now() - 1000;
    cmp.confirm();
    await flush(fixture);
    expect(cmp.order()).toBeNull();
    expect(store.events.find(e => e.id === ev.id)?.zones[0].sold).toBe(0);
    expect(notify.toasts().some(t => t.kind === 'error' && /venció/.test(t.message))).toBe(true);
  });

  it('un conflicto de stock (409) vuelve a la selección y refresca el evento', async () => {
    await firstValueFrom(auth.login(DEMO_CREDENTIALS.CLIENT));
    const ev = seedEvent(store);
    const fixture = await open(ev.id);
    const cmp = fixture.componentInstance;
    cmp.change('z1', 1);
    cmp.startReview();
    await flush(fixture);
    // Otra compra agota la zona justo antes de que este confirme.
    store.upsertEvent({ ...ev, zones: [{ ...ev.zones[0], sold: 100 }] });
    cmp.confirm();
    await flush(fixture);
    expect(cmp.order()).toBeNull();
    expect(cmp.reviewing()).toBe(false);
  });

  it('no se puede abrir la pasarela de pago sin cotización vigente', async () => {
    const ev = seedEvent(store);
    const fixture = await open(ev.id);
    const cmp = fixture.componentInstance;
    cmp.openPaymentGateway();
    expect(cmp.paymentGateway()).toBe(false);
  });
});
