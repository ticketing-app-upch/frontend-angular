import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../enviroments/enviroment';
import { AuthService } from '../auth/auth.service';
import { DEMO_CREDENTIALS } from '../mock/mock-data';
import { MarketService } from './market.service';

describe('Mercado agregado', () => {
  beforeEach(() => {
    environment.useMock = true; environment.useMockAuth = true; environment.mockLatencyMs = 0;
    localStorage.clear(); sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient()] });
  });
  afterEach(() => { localStorage.clear(); sessionStorage.clear(); });

  it('exige organizador y devuelve estado vacío con filtros sin coincidencias', async () => {
    const auth = TestBed.inject(AuthService), market = TestBed.inject(MarketService);
    await firstValueFrom(auth.login(DEMO_CREDENTIALS.CLIENT));
    await expect(firstValueFrom(market.report({}))).rejects.toMatchObject({ status: 403 });
    await firstValueFrom(auth.login(DEMO_CREDENTIALS.ORGANIZER));
    const report = await firstValueFrom(market.report({ venue: 'Recinto inexistente' }));
    expect(report).toMatchObject({ events: 0, tickets: 0, venues: [], categories: [] });
  });

  it('agrega eventos de todos los organizadores sin exponer personas', async () => {
    const auth = TestBed.inject(AuthService), market = TestBed.inject(MarketService);
    await firstValueFrom(auth.login(DEMO_CREDENTIALS.ORGANIZER));
    const report = await firstValueFrom(market.report({}));
    expect(report.events).toBeGreaterThan(0);
    expect(report.venues.reduce((n, v) => n + v.events, 0)).toBe(report.events);
    expect(JSON.stringify(report)).not.toContain('@tkt.pe');
  });
});
