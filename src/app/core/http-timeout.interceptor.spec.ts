import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { vi } from 'vitest';
import { environment } from '../../enviroments/enviroment';
import { httpTimeoutInterceptor } from './http-timeout.interceptor';

describe('httpTimeoutInterceptor', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([httpTimeoutInterceptor])),
        provideHttpClientTesting(),
      ],
    });
  });
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    vi.useRealTimers();
  });

  it('corta una petición a nuestra API que nunca responde', async () => {
    const http = TestBed.inject(HttpClient);
    const pending = firstValueFrom(http.get(`${environment.apiBackendUrl}/events`));
    const assertion = expect(pending).rejects.toThrow();
    TestBed.inject(HttpTestingController).expectOne(`${environment.apiBackendUrl}/events`);
    await vi.advanceTimersByTimeAsync(15000);
    await assertion;
  });

  it('no toca peticiones a otros orígenes (p. ej. imágenes remotas)', async () => {
    const http = TestBed.inject(HttpClient);
    const pending = firstValueFrom(http.get('https://cdn.ejemplo.com/foto.webp'));
    const req = TestBed.inject(HttpTestingController).expectOne('https://cdn.ejemplo.com/foto.webp');
    // Si el interceptor tocara esta request, adelantar el reloj la cortaría
    // igual sin necesidad de responder — acá la dejamos "colgada" a propósito
    // y confirmamos que sigue viva pasado el límite de tiempo.
    await vi.advanceTimersByTimeAsync(20000);
    req.flush({ ok: true });
    await expect(pending).resolves.toEqual({ ok: true });
  });
});
