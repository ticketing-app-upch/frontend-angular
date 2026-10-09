import { TestBed } from '@angular/core/testing';
import { MockStore } from './mock-store';
import { DEMO_CREDENTIALS } from './mock-data';

const STORAGE_KEY = 'tkt.mock.v1';

describe('MockStore', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('descarta la data cacheada cuando la semilla cambió (rev distinto)', () => {
    // Simula una sesión vieja: mismo shape, pero con una contraseña que ya
    // no coincide con la semilla actual (p. ej. antes de fortalecer las
    // contraseñas de demo). Sin invalidar por rev, este usuario "fantasma"
    // ganaría por sobre la semilla nueva y el login fallaría en el navegador
    // aunque el código ya tenga la contraseña correcta.
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      rev: 'una-semilla-vieja-que-ya-no-existe',
      data: {
        users: [{ id: 'u-cli-1', fullName: 'Vieja', email: DEMO_CREDENTIALS.CLIENT.email, password: 'una-contraseña-vieja', role: 'CLIENT' }],
        events: [],
        orders: [],
      },
    }));
    const store = TestBed.inject(MockStore);
    const user = store.users.find(u => u.email === DEMO_CREDENTIALS.CLIENT.email);
    expect(user?.password).toBe(DEMO_CREDENTIALS.CLIENT.password);
  });

  it('conserva la data cacheada cuando la semilla no cambió', () => {
    const first = TestBed.inject(MockStore);
    first.addUser({ id: 'u-extra', fullName: 'Extra', email: 'extra@tkt.pe', password: 'Extra123$', role: 'CLIENT' });

    TestBed.resetTestingModule();
    const second = TestBed.inject(MockStore);
    expect(second.users.some(u => u.id === 'u-extra')).toBe(true);
  });
});
