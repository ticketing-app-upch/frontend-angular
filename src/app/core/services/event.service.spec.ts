import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { EventService } from './event.service';
import { AuthService } from '../auth/auth.service';
import { MockStore } from '../mock/mock-store';
import { DEMO_CREDENTIALS } from '../mock/mock-data';
import { EventItem } from '../models/event.model';

const draft = (over: Partial<EventItem> = {}): EventItem => ({
  id: '', organizerId: 'u-org-1', name: 'Evento de prueba',
  description: 'Descripción suficientemente larga para pasar la validación.',
  startsAt: new Date(Date.now() + 10 * 86400000).toISOString(),
  category: 'CONCIERTO', status: 'PUBLICADO', venue: 'Arena', city: 'Lima',
  venueCapacity: 200, imageUrl: '', maxPerOrder: 4,
  zones: [{ id: 'z1', name: 'General', price: 50, capacity: 200, sold: 0 }],
  ...over,
});

describe('EventService (modo mock)', () => {
  let events: EventService;
  let auth: AuthService;
  let store: MockStore;

  beforeEach(() => {
    localStorage.clear(); sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient()] });
    events = TestBed.inject(EventService);
    auth = TestBed.inject(AuthService);
    store = TestBed.inject(MockStore);
  });
  afterEach(() => { localStorage.clear(); sessionStorage.clear(); });

  describe('list()', () => {
    it('nunca devuelve eventos en BORRADOR al catálogo público', async () => {
      store.upsertEvent(draft({ id: 'ev-oculto', status: 'BORRADOR' }));
      const list = await firstValueFrom(events.list());
      expect(list.some(e => e.id === 'ev-oculto')).toBe(false);
    });

    it('filtra por categoría y por disponibilidad', async () => {
      store.upsertEvent(draft({ id: 'ev-teatro', category: 'TEATRO' }));
      store.upsertEvent(draft({ id: 'ev-agotado', category: 'CONCIERTO', zones: [{ id: 'z', name: 'G', price: 10, capacity: 5, sold: 5 }] }));
      const soloTeatro = await firstValueFrom(events.list({ category: 'TEATRO' }));
      expect(soloTeatro.every(e => e.category === 'TEATRO')).toBe(true);
      const disponibles = await firstValueFrom(events.list({ onlyAvailable: true }));
      expect(disponibles.some(e => e.id === 'ev-agotado')).toBe(false);
    });
  });

  describe('getById()', () => {
    it('un borrador ajeno no es visible para nadie sin permiso', async () => {
      store.upsertEvent(draft({ id: 'ev-priv', status: 'BORRADOR', organizerId: 'u-org-1' }));
      await firstValueFrom(auth.login(DEMO_CREDENTIALS.CLIENT));
      await expect(firstValueFrom(events.getById('ev-priv'))).rejects.toMatchObject({ status: 404 });
    });

    it('el propio organizador sí ve su borrador', async () => {
      store.upsertEvent(draft({ id: 'ev-priv', status: 'BORRADOR', organizerId: 'u-org-1' }));
      await firstValueFrom(auth.login(DEMO_CREDENTIALS.ORGANIZER));
      const found = await firstValueFrom(events.getById('ev-priv'));
      expect(found.id).toBe('ev-priv');
    });
  });

  describe('save() — validaciones de negocio', () => {
    beforeEach(async () => { await firstValueFrom(auth.login(DEMO_CREDENTIALS.ORGANIZER)); });

    it('rechaza que la suma de zonas supere el aforo físico del recinto', async () => {
      const bad = draft({ venueCapacity: 100, zones: [{ id: 'z', name: 'G', price: 10, capacity: 150, sold: 0 }] });
      await expect(firstValueFrom(events.save(bad))).rejects.toMatchObject({ status: 422 });
    });

    it('rechaza nombres de zona duplicados', async () => {
      const bad = draft({ zones: [
        { id: 'z1', name: 'General', price: 10, capacity: 50, sold: 0 },
        { id: 'z2', name: 'general', price: 20, capacity: 50, sold: 0 },
      ] });
      await expect(firstValueFrom(events.save(bad))).rejects.toMatchObject({ status: 422 });
    });

    it('rechaza una fecha en el pasado', async () => {
      const bad = draft({ startsAt: new Date(Date.now() - 86400000).toISOString() });
      await expect(firstValueFrom(events.save(bad))).rejects.toMatchObject({ status: 422 });
    });

    it('un organizador no puede editar el evento de otro organizador', async () => {
      store.upsertEvent(draft({ id: 'ev-ajeno', organizerId: 'otro-organizador' }));
      const mine = { ...draft({ id: 'ev-ajeno', organizerId: 'otro-organizador' }) };
      await expect(firstValueFrom(events.save(mine))).rejects.toMatchObject({ status: 403 });
    });

    it('no se puede reducir el aforo de una zona por debajo de lo ya vendido', async () => {
      store.upsertEvent(draft({ id: 'ev-vendido', zones: [{ id: 'z1', name: 'General', price: 10, capacity: 100, sold: 40 }] }));
      const shrink = draft({ id: 'ev-vendido', zones: [{ id: 'z1', name: 'General', price: 10, capacity: 30, sold: 40 }] });
      await expect(firstValueFrom(events.save(shrink))).rejects.toMatchObject({ status: 422 });
    });

    it('guarda un evento válido y le asigna id', async () => {
      const saved = await firstValueFrom(events.save(draft()));
      expect(saved.id).toBeTruthy();
    });
  });

  describe('remove()', () => {
    it('no borra un evento con ventas: preserva el historial', async () => {
      await firstValueFrom(auth.login(DEMO_CREDENTIALS.ADMIN));
      store.upsertEvent(draft({ id: 'ev-con-ventas', zones: [{ id: 'z', name: 'G', price: 10, capacity: 100, sold: 5 }] }));
      await expect(firstValueFrom(events.remove('ev-con-ventas'))).rejects.toMatchObject({ status: 409 });
    });

    it('un cliente no puede borrar eventos', async () => {
      await firstValueFrom(auth.login(DEMO_CREDENTIALS.CLIENT));
      store.upsertEvent(draft({ id: 'ev-x' }));
      await expect(firstValueFrom(events.remove('ev-x'))).rejects.toMatchObject({ status: 403 });
    });
  });
});
