import { eventIssues, purchaseIssue, zonePrice } from './ticketing-rules';
import { EventItem, Zone } from './event.model';

const now = Date.now();
const day = 86400000;
const zone: Zone = { id: 'z1', name: 'General', price: 100, capacity: 100, sold: 20 };
const event: EventItem = { id: 'e1', name: 'Evento de prueba', description: 'Una descripción suficientemente extensa.',
  category: 'CONCIERTO', status: 'PUBLICADO', venue: 'Arena', city: 'Lima', venueCapacity: 100,
  startsAt: new Date(now + 10 * day).toISOString(), publishedAt: new Date(now - 10 * day).toISOString(),
  imageUrl: '', organizerId: 'org', maxPerOrder: 6, zones: [zone] };

describe('Reglas de ticketing del proyecto', () => {
  it('conserva precio base', () => expect(zonePrice(event, zone, now).unitPrice).toBe(100));
  it('recarga 20% con menos de 15% disponible', () => expect(zonePrice(event, { ...zone, sold: 86 }, now).unitPrice).toBe(120));
  it('no recarga exactamente al 15% disponible', () => expect(zonePrice(event, { ...zone, sold: 85 }, now).unitPrice).toBe(100));
  it('recarga cuando faltan menos de tres días', () => expect(zonePrice({ ...event, startsAt: new Date(now + 2 * day).toISOString() }, zone, now).unitPrice).toBe(120));
  it('no recarga exactamente a tres días', () => expect(zonePrice({ ...event, startsAt: new Date(now + 3 * day).toISOString() }, zone, now).unitPrice).toBe(100));
  it('descuenta 10% después de 30 días con menos de 10% vendido', () => expect(zonePrice({ ...event, publishedAt: new Date(now - 31 * day).toISOString() }, { ...zone, sold: 9 }, now).unitPrice).toBe(90));
  it('no descuenta exactamente a 30 días', () => expect(zonePrice({ ...event, publishedAt: new Date(now - 30 * day).toISOString() }, { ...zone, sold: 9 }, now).unitPrice).toBe(100));
  it('no descuenta exactamente con 10% vendido', () => expect(zonePrice({ ...event, publishedAt: new Date(now - 31 * day).toISOString() }, { ...zone, sold: 10 }, now).unitPrice).toBe(100));
  it('prioriza recargo sin acumular descuento', () => expect(zonePrice({ ...event, startsAt: new Date(now + day).toISOString(), publishedAt: new Date(now - 31 * day).toISOString() }, { ...zone, sold: 0 }, now).unitPrice).toBe(120));
  it('admite evento válido', () => expect(eventIssues(event)).toEqual([]));
  it.each([0, 7, 1.5])('rechaza límite inválido %s', maxPerOrder => expect(eventIssues({ ...event, maxPerOrder }).length).toBeGreaterThan(0));
  it('rechaza suma mayor al recinto', () => expect(eventIssues({ ...event, venueCapacity: 99 }).length).toBeGreaterThan(0));
  it('rechaza zonas repetidas por nombre', () => expect(eventIssues({ ...event, venueCapacity: 200, zones: [zone, { ...zone, id: 'z2', name: ' general ' }] }).length).toBeGreaterThan(0));
  it('protege una zona vendida de eliminación', () => expect(eventIssues({ ...event, zones: [] }, event).join()).toContain('No puedes eliminar'));
  it('protege el conteo vendido', () => expect(eventIssues({ ...event, zones: [{ ...zone, sold: 0 }] }, event).join()).toContain('no son editables'));
  it('permite exactamente seis entradas', () => expect(purchaseIssue(event, [{ zoneId: zone.id, quantity: 6 }])).toBeNull());
  it.each([0, -1, 7, 1.5, NaN])('rechaza cantidad inválida %s', quantity => expect(purchaseIssue(event, [{ zoneId: zone.id, quantity }])).not.toBeNull());
  it('suma el límite entre zonas', () => expect(purchaseIssue({ ...event, zones: [zone, { ...zone, id: 'z2' }] }, [{ zoneId: 'z1', quantity: 4 }, { zoneId: 'z2', quantity: 3 }])).not.toBeNull());
  it('rechaza la misma zona duplicada', () => expect(purchaseIssue(event, [{ zoneId: 'z1', quantity: 1 }, { zoneId: 'z1', quantity: 1 }])).not.toBeNull());
  it('rechaza evento pasado y borrador', () => {
    expect(purchaseIssue({ ...event, startsAt: new Date(now - day).toISOString() }, [{ zoneId: 'z1', quantity: 1 }])).not.toBeNull();
    expect(purchaseIssue({ ...event, status: 'BORRADOR' }, [{ zoneId: 'z1', quantity: 1 }])).not.toBeNull();
  });
  it('rechaza stock insuficiente', () => expect(purchaseIssue({ ...event, zones: [{ ...zone, sold: 99 }] }, [{ zoneId: 'z1', quantity: 2 }])).not.toBeNull());
});

