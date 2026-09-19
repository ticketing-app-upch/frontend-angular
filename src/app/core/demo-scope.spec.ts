import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { environment } from '../../enviroments/enviroment';
import { epicEnabled, epicGuard } from './demo-scope';

describe('demo-scope', () => {
  const original = environment.enabledEpics;
  afterEach(() => {
    environment.enabledEpics = original;
  });

  describe('epicEnabled', () => {
    it('refleja exactamente la lista configurada en enviroment', () => {
      environment.enabledEpics = [1, 3];
      expect(epicEnabled(1)).toBe(true);
      expect(epicEnabled(2)).toBe(false);
      expect(epicEnabled(3)).toBe(true);
    });
  });

  describe('epicGuard', () => {
    let router: Router;
    let harness: RouterTestingHarness;

    beforeEach(async () => {
      TestBed.configureTestingModule({
        providers: [
          provideHttpClient(),
          provideRouter([
            { path: 'catalogo', canActivate: [epicGuard(2)], children: [] },
            { path: 'bienvenida', children: [] },
          ]),
        ],
      });
      router = TestBed.inject(Router);
      harness = await RouterTestingHarness.create();
    });

    it('bloquea y manda a /bienvenida cuando la épica está apagada', async () => {
      environment.enabledEpics = [1];
      await harness.navigateByUrl('/catalogo');
      expect(router.url).toBe('/bienvenida');
    });

    it('deja pasar cuando la épica está prendida', async () => {
      environment.enabledEpics = [1, 2];
      await harness.navigateByUrl('/catalogo');
      expect(router.url).toBe('/catalogo');
    });
  });
});
