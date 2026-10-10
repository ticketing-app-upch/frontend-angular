import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { firstValueFrom } from 'rxjs';
import { authGuard, roleGuard, clientGuard, guestGuard } from './auth.guards';
import { AuthService, sessionTokenValid } from './auth.service';
import { DEMO_CREDENTIALS } from '../mock/mock-data';
import { environment } from '../../../enviroments/enviroment';

/**
 * Los guards deciden quién entra a cada pantalla — son la última línea de
 * defensa del lado del cliente. Se prueban a través del router real (no
 * llamándolos como funciones sueltas) para verificar lo que de verdad le
 * llega al usuario: a qué URL termina la navegación.
 */
describe('Guards de ruta', () => {
  let router: Router;
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    environment.useMockAuth = true;
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideRouter([
          { path: 'protegida', canActivate: [authGuard], children: [] },
          { path: 'solo-organizador', canActivate: [roleGuard('ORGANIZER')], children: [] },
          { path: 'solo-cliente', canActivate: [authGuard, clientGuard], children: [] },
          { path: 'auth/login', canActivate: [guestGuard], children: [] },
          { path: 'bienvenida', children: [] },
          { path: 'eventos', children: [] },
          { path: 'admin', children: [] },
          { path: 'organizador/panel', children: [] },
        ]),
      ],
    });
    router = TestBed.inject(Router);
    harness = await RouterTestingHarness.create();
  });
  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  async function loginAs(kind: keyof typeof DEMO_CREDENTIALS): Promise<void> {
    await firstValueFrom(TestBed.inject(AuthService).login(DEMO_CREDENTIALS[kind]));
  }

  describe('authGuard', () => {
    it('sin sesión, redirige a login con el destino como query param', async () => {
      await harness.navigateByUrl('/protegida');
      expect(router.url).toBe('/auth/login?redirect=%2Fprotegida');
    });

    it('con sesión válida, deja pasar', async () => {
      await loginAs('CLIENT');
      await harness.navigateByUrl('/protegida');
      expect(router.url).toBe('/protegida');
    });
  });

  describe('roleGuard', () => {
    it('rechaza a un rol que no coincide antes de mostrar la pantalla', async () => {
      await loginAs('CLIENT');
      await harness.navigateByUrl('/solo-organizador');
      expect(router.url).toBe('/bienvenida?reason=forbidden');
    });

    it('el rol correcto entra', async () => {
      await loginAs('ORGANIZER');
      await harness.navigateByUrl('/solo-organizador');
      expect(router.url).toBe('/solo-organizador');
    });

    it('ADMIN tampoco entra en una ruta exclusiva del organizador', async () => {
      await loginAs('ADMIN');
      await harness.navigateByUrl('/solo-organizador');
      expect(router.url).toBe('/bienvenida?reason=forbidden');
    });
  });

  describe('clientGuard', () => {
    it('un organizador autenticado no puede entrar a una ruta de cliente', async () => {
      await loginAs('ORGANIZER');
      await harness.navigateByUrl('/solo-cliente');
      expect(router.url).toBe('/bienvenida?reason=forbidden');
    });

    it('un admin tampoco, lo manda a su panel', async () => {
      await loginAs('ADMIN');
      await harness.navigateByUrl('/solo-cliente');
      expect(router.url).toBe('/bienvenida?reason=forbidden');
    });

    it('un cliente sí entra', async () => {
      await loginAs('CLIENT');
      await harness.navigateByUrl('/solo-cliente');
      expect(router.url).toBe('/solo-cliente');
    });
  });

  describe('guestGuard', () => {
    it('un usuario ya logueado no puede volver a ver el login', async () => {
      await loginAs('CLIENT');
      await harness.navigateByUrl('/auth/login');
      expect(router.url).toBe('/bienvenida');
    });

    it('sin sesión, puede ver el login', async () => {
      await harness.navigateByUrl('/auth/login');
      expect(router.url).toBe('/auth/login');
    });
  });

  it('un token mock vence a las 8 horas', () => {
    const issuedAt = Date.now();
    const token = `mock.${btoa('u-1:CLIENT')}.${issuedAt}`;
    expect(sessionTokenValid(token, issuedAt + 8 * 60 * 60 * 1000 - 1)).toBe(true);
    expect(sessionTokenValid(token, issuedAt + 8 * 60 * 60 * 1000)).toBe(false);
  });

  it('un JWT del backend sigue vigente después de una hora y vence a las ocho', () => {
    const issuedAt = Math.floor(Date.now() / 1000);
    const token = `header.${btoa(JSON.stringify({ iat: issuedAt, exp: issuedAt + 8 * 60 * 60 }))}.sig`;
    expect(sessionTokenValid(token, (issuedAt + 2 * 60 * 60) * 1000)).toBe(true);
    expect(sessionTokenValid(token, (issuedAt + 8 * 60 * 60) * 1000)).toBe(false);
  });

  it('un token JWT vencido cuenta como no autenticado, aunque haya un usuario guardado', async () => {
    // Simula sesión real (no-mock) vieja: token JWT expirado + usuario cacheado,
    // como quedaría alguien que no abre la app en días y su token venció.
    const expired = 'header.' + btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) - 60 })) + '.sig';
    localStorage.setItem('tkt.token', expired);
    localStorage.setItem('tkt.user', JSON.stringify({ id: 'u-1', fullName: 'Vieja Sesión', role: 'CLIENT' }));
    await harness.navigateByUrl('/protegida');
    expect(router.url).toContain('/auth/login?');
    expect(router.parseUrl(router.url).queryParams).toEqual({ redirect: '/protegida', reason: 'expired' });
  });
});
