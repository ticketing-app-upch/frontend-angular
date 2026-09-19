import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AdminService } from './admin.service';
import { AuthService } from '../auth/auth.service';
import { MockStore } from '../mock/mock-store';
import { DEMO_CREDENTIALS } from '../mock/mock-data';

describe('AdminService (modo mock)', () => {
  let admin: AdminService;
  let auth: AuthService;
  let store: MockStore;

  beforeEach(() => {
    localStorage.clear(); sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient()] });
    admin = TestBed.inject(AdminService);
    auth = TestBed.inject(AuthService);
    store = TestBed.inject(MockStore);
  });
  afterEach(() => { localStorage.clear(); sessionStorage.clear(); });

  it('un no-admin no puede listar usuarios', async () => {
    await firstValueFrom(auth.login(DEMO_CREDENTIALS.CLIENT));
    await expect(firstValueFrom(admin.users())).rejects.toMatchObject({ status: 403 });
  });

  it('un admin sí puede, y nunca ve contraseñas', async () => {
    await firstValueFrom(auth.login(DEMO_CREDENTIALS.ADMIN));
    const list = await firstValueFrom(admin.users());
    expect(list.length).toBeGreaterThan(0);
    expect(list.every(u => !('password' in u))).toBe(true);
  });

  it('un admin no puede quitarse a sí mismo el rol de administrador', async () => {
    await firstValueFrom(auth.login(DEMO_CREDENTIALS.ADMIN));
    const me = auth.user()!.id;
    await expect(firstValueFrom(admin.setUserRole(me, 'CLIENT'))).rejects.toMatchObject({ status: 409 });
  });

  it('un admin no puede borrar su propia cuenta', async () => {
    await firstValueFrom(auth.login(DEMO_CREDENTIALS.ADMIN));
    const me = auth.user()!.id;
    await expect(firstValueFrom(admin.deleteUser(me))).rejects.toMatchObject({ status: 409 });
  });

  it('no se puede borrar un usuario con historial transaccional', async () => {
    await firstValueFrom(auth.login(DEMO_CREDENTIALS.ADMIN));
    // El organizador de la semilla ya tiene eventos publicados asociados.
    await expect(firstValueFrom(admin.deleteUser('u-org-1'))).rejects.toMatchObject({ status: 409 });
  });

  it('borrar un usuario inexistente da 404', async () => {
    await firstValueFrom(auth.login(DEMO_CREDENTIALS.ADMIN));
    await expect(firstValueFrom(admin.deleteUser('no-existe'))).rejects.toMatchObject({ status: 404 });
  });

  it('no permite cambiar el rol de un cliente u organizador', async () => {
    await firstValueFrom(auth.login(DEMO_CREDENTIALS.ADMIN));
    await expect(firstValueFrom(admin.setUserRole('u-cli-1', 'ORGANIZER')))
      .rejects.toMatchObject({ status: 409 });
    const unchanged = store.users.find((u) => u.id === 'u-cli-1');
    expect(unchanged?.role).toBe('CLIENT');
  });

  it('las métricas cuadran con lo que hay en el store', async () => {
    await firstValueFrom(auth.login(DEMO_CREDENTIALS.ADMIN));
    const metrics = await firstValueFrom(admin.metrics());
    expect(metrics.users.total).toBe(store.users.length);
    expect(metrics.events.total).toBe(store.events.length);
    expect(metrics.orders.total).toBe(store.orders.length);
  });
});
