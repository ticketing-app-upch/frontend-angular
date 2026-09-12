import { EventItem, Zone } from './event.model';

export const MAX_TICKETS = 6;
export const SERVICE_FEE_RATE = 0.06;
export const roundMoney = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;
const DAY = 86_400_000;

/** Simulación académica. El servidor debe recalcular y autorizar el precio final. */
export function zonePrice(event: Pick<EventItem, 'startsAt' | 'publishedAt'>, zone: Zone, now = Date.now()) {
  const available = Math.max(0, zone.capacity - zone.sold);
  const days = (Date.parse(event.startsAt) - now) / DAY;
  const age = event.publishedAt ? (now - Date.parse(event.publishedAt)) / DAY : 0;
  const scarce = zone.capacity > 0 && available / zone.capacity < 0.15;
  const soon = days >= 0 && days < 3;
  // El recargo tiene precedencia cuando ambas reglas coinciden.
  const multiplier = scarce || soon ? 1.2 : age > 30 && zone.capacity > 0 && zone.sold / zone.capacity < 0.1 ? 0.9 : 1;
  const note = scarce ? 'Últimos cupos · +20%' : soon ? 'Evento próximo · +20%' : multiplier < 1 ? 'Descubrimiento · −10%' : 'Precio base';
  return { unitPrice: roundMoney(zone.price * multiplier), multiplier, note, available };
}

export function eventIssues(event: EventItem, previous?: EventItem): string[] {
  const issues: string[] = [];
  if (event.name.trim().length < 4 || event.description.trim().length < 20) issues.push('Completa el nombre y la descripción.');
  if (!Number.isFinite(Date.parse(event.startsAt)) || Date.parse(event.startsAt) <= Date.now()) issues.push('La fecha debe estar en el futuro.');
  if (!Number.isInteger(event.maxPerOrder) || event.maxPerOrder < 1 || event.maxPerOrder > MAX_TICKETS) issues.push('El límite por compra debe ser de 1 a 6 entradas.');
  if (!event.venue.trim() || !event.city.trim()) issues.push('Indica el recinto y la ciudad.');
  if (!Number.isInteger(event.venueCapacity) || (event.venueCapacity ?? 0) < 1) issues.push('Declara la capacidad física del recinto.');
  if (!event.zones.length) issues.push('Agrega al menos una zona.');
  if (event.zones.reduce((sum, zone) => sum + zone.capacity, 0) > (event.venueCapacity ?? 0)) issues.push('Las zonas superan la capacidad física del recinto.');
  const names = new Set<string>();
  for (const zone of event.zones) {
    const name = zone.name.trim().toLocaleLowerCase();
    if (!name || names.has(name)) issues.push('Cada zona debe tener un nombre único.');
    names.add(name);
    if (!Number.isInteger(zone.capacity) || zone.capacity < 1 || !Number.isInteger(zone.sold) || zone.sold < 0 || zone.sold > zone.capacity) issues.push('El aforo debe ser entero y no puede ser menor que las entradas vendidas.');
    if (!Number.isFinite(zone.price) || zone.price < 0) issues.push('El precio debe ser un número positivo o cero.');
  }
  for (const old of previous?.zones ?? []) {
    const next = event.zones.find(zone => zone.id === old.id);
    if (old.sold > 0 && (!next || next.capacity < old.sold || next.name !== old.name)) issues.push('No puedes eliminar o renombrar una zona con ventas ni reducirla por debajo de las entradas vendidas.');
    if (next && next.sold !== old.sold) issues.push('Las ventas se calculan desde las compras y no son editables.');
  }
  return [...new Set(issues)];
}

export function purchaseIssue(event: EventItem, items: {zoneId: string; quantity: number}[]): string | null {
  if (event.status !== 'PUBLICADO' || Date.parse(event.startsAt) <= Date.now()) return 'Este evento no está disponible para comprar.';
  const total = items.reduce((sum, item) => sum + item.quantity, 0);
  if (!items.length || items.some(item => !Number.isInteger(item.quantity) || item.quantity < 1) || total > Math.min(MAX_TICKETS, event.maxPerOrder)) return 'Selecciona cantidades enteras de 1 a 6 entradas, respetando el límite del evento.';
  if (new Set(items.map(item => item.zoneId)).size !== items.length) return 'La selección contiene zonas duplicadas.';
  for (const item of items) {
    const zone = event.zones.find(zone => zone.id === item.zoneId);
    if (!zone || item.quantity > zone.capacity - zone.sold) return 'La disponibilidad cambió. Actualiza tu selección.';
  }
  return null;
}
