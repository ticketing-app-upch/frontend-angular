import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { environment } from '../../../enviroments/enviroment';
import { AuthService } from './auth.service';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;
  let router: Router;
  let auth: { token: string | null; sessionExpired: () => boolean; expireSession: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    auth = { token: 'jwt-de-prueba', sessionExpired: () => false, expireSession: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: auth },
      ],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => controller.verify());

  it('cierra la sesión al recibir 401 en una ruta protegida', () => {
    http.get(`${environment.apiBackendUrl}/orders`).subscribe({ error: () => undefined });
    const request = controller.expectOne(`${environment.apiBackendUrl}/orders`);
    expect(request.request.headers.get('Authorization')).toBe('Bearer jwt-de-prueba');
    request.flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(auth.expireSession).toHaveBeenCalledOnce();
  });

  it('no confunde un 401 de login con una sesión caducada', () => {
    auth.token = null;
    http.post(`${environment.apiBackendUrl}/auth/login`, {}).subscribe({ error: () => undefined });
    controller.expectOne(`${environment.apiBackendUrl}/auth/login`)
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(auth.expireSession).not.toHaveBeenCalled();
  });

  it('ante 403 conserva la sesión y redirige a una pantalla segura', () => {
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    http.get(`${environment.apiBackendUrl}/organizers/private`).subscribe({ error: () => undefined });
    controller.expectOne(`${environment.apiBackendUrl}/organizers/private`)
      .flush({}, { status: 403, statusText: 'Forbidden' });
    expect(auth.expireSession).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(['/bienvenida'], {
      queryParams: { reason: 'forbidden' },
      replaceUrl: true,
    });
  });
});
