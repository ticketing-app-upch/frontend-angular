import { TestBed } from '@angular/core/testing';
import { STEP_MS, TicketTokenService } from './ticket-token.service';
import { RedemptionService } from './redemption.service';
import { TicketOrder } from '../models/ticket.model';
import { environment } from '../../../enviroments/enviroment';

const order: TicketOrder = {
  id: 'ord-1', code: 'TKT-ABC123', eventId: 'ev-1', eventName: 'Evento de prueba',
  eventVenue: 'Arena', eventStartsAt: new Date(Date.now() + 3 * 86400000).toISOString(),
  buyerId: 'u-cli-1', buyerName: 'Jesús Morales', status: 'CONFIRMADA',
  createdAt: new Date().toISOString(), subtotal: 100, fee: 6, total: 106,
  lines: [{ zoneId: 'z1', zoneName: 'General', quantity: 2, unitPrice: 50 }],
};

describe('TicketTokenService — firma y verificación de QR', () => {
  let svc: TicketTokenService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    svc = TestBed.inject(TicketTokenService);
  });

  it('un token recién emitido verifica válido', () => {
    const token = svc.issueUrl(order).split('#')[1];
    const check = svc.verify(token);
    expect(check.valid).toBe(true);
    expect(check.claims?.oid).toBe('ord-1');
    expect(check.claims?.cod).toBe('TKT-ABC123');
  });

  it('alterar un solo carácter del payload invalida la firma', () => {
    const token = svc.issueUrl(order).split('#')[1];
    const [payload, mac] = token.split('.');
    const tampered = payload.slice(0, -1) + (payload.at(-1) === 'a' ? 'b' : 'a') + '.' + mac;
    expect(svc.verify(tampered).reason).toBe('bad-signature');
  });

  it('un token con formato inválido se marca "malformed"', () => {
    expect(svc.verify('esto-no-es-un-token').reason).toBe('malformed');
    expect(svc.verify('').reason).toBe('malformed');
  });

  it('un token de una compra ya pasada la fecha del evento + gracia expira', () => {
    const past: TicketOrder = { ...order, eventStartsAt: new Date(Date.now() - 30 * 86400000).toISOString() };
    const token = svc.issueUrl(past).split('#')[1];
    expect(svc.verify(token).reason).toBe('expired');
  });

  it('un token de un intervalo muy alejado del actual se marca "stale" (posible captura vieja)', () => {
    const token = svc.issueUrl(order).split('#')[1];
    const future = Date.now() + (STEP_MS * 5); // 5 pasos de diferencia, fuera de tolerancia
    expect(svc.verify(token, future).reason).toBe('stale');
  });

  it('sin ticketSecret configurado, no firma ni verifica (backend real debe emitirlo)', () => {
    // El servicio lee la clave una sola vez, en el constructor: hay que forzar
    // una instancia nueva después de cambiar environment para que la vea.
    const original = environment.ticketSecret;
    environment.ticketSecret = '';
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    try {
      const fresh = TestBed.inject(TicketTokenService);
      expect(() => fresh.sign(fresh.claimsForOrder(order))).toThrow();
      expect(fresh.verify('cualquier.cosa').reason).toBe('not-configured');
    } finally {
      environment.ticketSecret = original;
    }
  });
});

describe('RedemptionService — evita el doble canje', () => {
  let redemptions: RedemptionService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    redemptions = TestBed.inject(RedemptionService);
  });
  afterEach(() => localStorage.clear());

  it('la primera vez que se canjea una orden, se marca como usada', () => {
    const result = redemptions.redeem('ord-1', 'TKT-ABC123', 42);
    expect(result.firstTime).toBe(true);
    expect(redemptions.isRedeemed('ord-1')).toBe(true);
  });

  it('un segundo intento sobre la misma orden se rechaza y conserva el registro original', () => {
    const first = redemptions.redeem('ord-1', 'TKT-ABC123', 42);
    const second = redemptions.redeem('ord-1', 'TKT-ABC123', 99);
    expect(second.firstTime).toBe(false);
    expect(second.record.at).toBe(first.record.at);
    expect(second.record.stp).toBe(42); // conserva el intervalo del primer canje, no el del reintento
  });

  it('reset() limpia el registro completo', () => {
    redemptions.redeem('ord-1', 'TKT-ABC123', 1);
    redemptions.reset();
    expect(redemptions.isRedeemed('ord-1')).toBe(false);
  });
});
