import { Injectable } from '@angular/core';
import { EventItem } from '../models/event.model';
import { TicketOrder } from '../models/ticket.model';
import { SEED_EVENTS, SEED_ORDERS, SEED_USERS, SeedUser } from './mock-data';

interface StoreShape {
  users: SeedUser[];
  events: EventItem[];
  orders: TicketOrder[];
}

const STORAGE_KEY = 'tkt.mock.v1';

/**
 * Base de datos falsa en memoria, persistida en localStorage para que las
 * compras y los eventos creados sobrevivan a un refresco durante las pruebas.
 * Se reemplaza por llamadas HTTP reales cuando `environment.useMock` sea false.
 */
@Injectable({ providedIn: 'root' })
export class MockStore {
  private data: StoreShape = this.load();

  private load(): StoreShape {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw) as StoreShape;
      }
    } catch {
      /* almacenamiento no disponible o corrupto: usamos la semilla */
    }
    return this.seed();
  }

  private seed(): StoreShape {
    return {
      users: structuredClone(SEED_USERS),
      events: structuredClone(SEED_EVENTS),
      orders: structuredClone(SEED_ORDERS),
    };
  }

  private persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch {
      /* modo incógnito / cuota llena: seguimos solo en memoria */
    }
  }

  /** Reinicia la data de prueba a la semilla original. */
  reset(): void {
    this.data = this.seed();
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

  // --- Orders --------------------------------------------------------
  get orders(): TicketOrder[] {
    return this.data.orders;
  }

  addOrder(order: TicketOrder): void {
    this.data.orders.unshift(order);
    this.persist();
  }

  commit(): void {
    this.persist();
  }
}
