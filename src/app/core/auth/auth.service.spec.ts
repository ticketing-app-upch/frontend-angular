import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../enviroments/enviroment';
import { AuthService, sessionTokenValid } from './auth.service';

describe('Selección del modo de autenticación', () => {
  const originalUseMock = environment.useMock;
  const originalUseMockAuth = environment.useMockAuth;

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    environment.useMock = originalUseMock;
    environment.useMockAuth = originalUseMockAuth;
    localStorage.clear();
    sessionStorage.clear();
  });

  it('registra contra Laravel aunque el catálogo continúe en modo mock', async () => {
    environment.useMock = true;
    environment.useMockAuth = false;
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });

    const payload = {
      fullName: 'Cliente Demo',
      email: 'cliente@example.com',
      password: 'Clave123!',
      role: 'CLIENT' as const,
      acceptedTerms: true,
      marketingOptIn: false,
      profile: {
        country: 'PE', city: 'Lima', district: 'Lima', hasPeruvianNationality: true,
        docType: 'DNI' as const, docNumber: '12345678', gender: 'F' as const,
        phoneCode: '+51', phone: '',
      },
    };
    const auth = TestBed.inject(AuthService);
    const pending = firstValueFrom(auth.register(payload));
    const request = TestBed.inject(HttpTestingController)
      .expectOne(`${environment.apiBackendUrl}/auth/register`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);

    const issuedAt = Math.floor(Date.now() / 1000);
    const token = `header.${btoa(JSON.stringify({ iat: issuedAt, exp: issuedAt + 8 * 60 * 60 }))}.sig`;
    request.flush({
      token,
      user: { id: '42', fullName: payload.fullName, email: payload.email, role: payload.role },
    });
    expect((await pending).token).toBe(token);
    expect(auth.isAuthenticated()).toBe(true);
  });

  it.each(['CLIENT', 'ORGANIZER', 'ADMIN'] as const)('revoca el JWT de %s al cerrar sesión', async role => {
    environment.useMockAuth = false;
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    const auth = TestBed.inject(AuthService);
    const http = TestBed.inject(HttpTestingController);
    const login = firstValueFrom(auth.login({ email: 'usuario@example.com', password: 'Clave123!' }));
    http.expectOne(`${environment.apiBackendUrl}/auth/login`).flush({
      token: `header.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 900 }))}.sig`,
      user: { id: '42', fullName: 'Usuario Demo', email: 'usuario@example.com', role },
    });
    const token = (await login).token;

    const logout = firstValueFrom(auth.logout());
    expect(auth.isAuthenticated()).toBe(false);
    expect(localStorage.getItem('tkt.token')).toBeNull();
    expect(localStorage.getItem('tkt.user')).toBeNull();
    const request = http.expectOne(`${environment.apiBackendUrl}/auth/logout`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({});
    expect(request.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
    request.flush({ message: 'Sesión cerrada correctamente.' });
    expect(await logout).toBe(true);
  });

  it('limpia el navegador e informa si no se pudo confirmar la revocación', async () => {
    environment.useMockAuth = false;
    const token = `header.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 900 }))}.sig`;
    localStorage.setItem('tkt.token', token);
    localStorage.setItem('tkt.user', JSON.stringify({ id: '42', fullName: 'Usuario Demo', role: 'CLIENT' }));
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    const auth = TestBed.inject(AuthService);
    const logout = firstValueFrom(auth.logout());
    TestBed.inject(HttpTestingController).expectOne(`${environment.apiBackendUrl}/auth/logout`)
      .flush({}, { status: 503, statusText: 'Service Unavailable' });
    expect(await logout).toBe(false);
    expect(auth.isAuthenticated()).toBe(false);
    expect(localStorage.getItem('tkt.token')).toBeNull();
    expect(localStorage.getItem('tkt.user')).toBeNull();
  });

  it('en modo mock cierra la sesión sin llamar al backend', async () => {
    environment.useMockAuth = true;
    localStorage.setItem('tkt.token', `mock.${btoa('u-1:CLIENT')}.${Date.now()}`);
    localStorage.setItem('tkt.user', JSON.stringify({ id: 'u-1', fullName: 'Usuario Demo', role: 'CLIENT' }));
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    const auth = TestBed.inject(AuthService);
    expect(await firstValueFrom(auth.logout())).toBe(true);
    expect(auth.isAuthenticated()).toBe(false);
    TestBed.inject(HttpTestingController).expectNone(`${environment.apiBackendUrl}/auth/logout`);
  });

  it('admite tokens mock solo cuando la autenticación mock está activa', () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    const token = `mock.${btoa('u-1:CLIENT')}.${Date.now()}`;
    environment.useMock = false;
    environment.useMockAuth = true;
    expect(sessionTokenValid(token)).toBe(true);
    environment.useMock = true;
    environment.useMockAuth = false;
    expect(sessionTokenValid(token)).toBe(false);
  });
});
