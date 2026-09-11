import { Injectable } from '@angular/core';
import { EventItem } from '../models/event.model';
import { TicketOrder } from '../models/ticket.model';
import { SEED_EVENTS, SEED_ORDERS, SEED_USERS, SeedUser } from './mock-data';

interface StoreShape {
  users: SeedUser[];
  events: EventItem[];
  orders: TicketOrder[];
}

interface PersistedShape {
  /** Huella de la semilla con la que se guardó esta data. */
  rev: string;
  data: StoreShape;
}

const STORAGE_KEY = 'tkt.mock.v1';

/** Huella corta y determinista de la semilla actual (mock-data.ts). */
function seedRevision(): string {
  const raw = JSON.stringify([SEED_USERS, SEED_EVENTS, SEED_ORDERS]);
  let h = 0;
  for (let i = 0; i < raw.length; i++) {
    h = (Math.imul(31, h) + raw.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(36);
}

/**
 * Base de datos falsa en memoria, persistida en localStorage para que las
 * compras y los eventos creados sobrevivan a un refresco durante las pruebas.
 *
 * Si editas `mock-data.ts`, la huella (`rev`) cambia y la data guardada se
 * descarta automáticamente: al recargar verás la semilla nueva (se pierden las
 * compras hechas en runtime, que es lo esperado al cambiar los datos base).
 *
 * Se reemplaza por llamadas HTTP reales cuando `environment.useMock` sea false.
 */
@Injectable({ providedIn: 'root' })
export class MockStore {
  private readonly rev = 'aforo-v2';
  private data: StoreShape = this.load();

  private load(): StoreShape {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as PersistedShape;
        if (parsed?.data && Array.isArray(parsed.data.events) && Array.isArray(parsed.data.orders) && Array.isArray(parsed.data.users)) {
          return this.upgrade(parsed.data);
        }
      }
    } catch {
      /* almacenamiento no disponible o corrupto: usamos la semilla */
    }
    const fresh = this.upgrade(this.seed());
    this.persistData(fresh);
    return fresh;
  }

  private seed(): StoreShape {
    return {
      users: structuredClone(SEED_USERS),
      events: structuredClone(SEED_EVENTS),
      orders: structuredClone(SEED_ORDERS),
    };
  }

  private persistData(data: StoreShape): void {
    try {
      const payload: PersistedShape = { rev: this.rev, data };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      /* modo incógnito / cuota llena: seguimos solo en memoria */
    }
  }

  /** Migra sin borrar compras ni eventos; las fechas dejan de resetear la semilla. */
  private upgrade(data: StoreShape): StoreShape {
    for (const event of data.events) {
      event.maxPerOrder = Math.min(6, Math.max(1, event.maxPerOrder));
      event.venueCapacity ??= event.zones.reduce((sum, zone) => sum + zone.capacity, 0);
      event.publishedAt ??= new Date(Date.parse(event.startsAt) - 45 * 86400000).toISOString();
      for (const zone of event.zones) {
        const recorded = data.orders.filter(o => o.eventId === event.id && o.status === 'CONFIRMADA').flatMap(o => o.lines).filter(l => l.zoneId === zone.id).reduce((s, l) => s + l.quantity, 0);
        zone.openingSold ??= Math.max(0, zone.sold - recorded);
        zone.openingRevenue ??= Math.round(zone.openingSold * zone.price * 100) / 100;
      }
    }
    this.persistData(data);
    return data;
  }

  private persist(): void {
    this.persistData(this.data);
  }

  /** Reinicia la data de prueba a la semilla original. */
  reset(): void {
    this.data = this.upgrade(this.seed());
    this.persist();
  }

  // --- Users -------------------------------------------------------------
  get users(): SeedUser[] {
    return this.data.users;
  }

  addUser(user: SeedUser): void {
    this.data.users.push(user);
    this.persist();
  }

  updateUser(id: string, patch: Partial<SeedUser>): void {
    const idx = this.data.users.findIndex((u) => u.id === id);
    if (idx >= 0) {
      this.data.users[idx] = { ...this.data.users[idx], ...patch, id };
      this.persist();
    }
  }

  removeUser(id: string): void {
    this.data.users = this.data.users.filter((u) => u.id !== id);
    this.persist();
  }

  // --- Events ----------------------------------------------------------
  get events(): EventItem[] {
    return this.data.events;
  }

  upsertEvent(event: EventItem): void {
    const idx = this.data.events.findIndex((e) => e.id === event.id);
    if (idx >= 0) {
      this.data.events[idx] = event;
    } else {
      this.data.events.unshift(event);
    }
    this.persist();
  }

  removeEvent(id: string): void {
    this.data.events = this.data.events.filter((e) => e.id !== id);
    this.persist();
  }

  // --- Orders --------------------------------------------------------
  get orders(): TicketOrder[] {
    return this.data.orders;
  }

  addOrder(order: TicketOrder): void {
    this.data.orders.unshift(order);
    this.persist();
  }

  updateOrder(id: string, patch: Partial<TicketOrder>): void {
    const idx = this.data.orders.findIndex((o) => o.id === id);
    if (idx >= 0) {
      this.data.orders[idx] = { ...this.data.orders[idx], ...patch, id };
      this.persist();
    }
  }

  removeOrder(id: string): void {
    this.data.orders = this.data.orders.filter((o) => o.id !== id);
    this.persist();
  }

  commit(): void {
    this.persist();
  }
}
