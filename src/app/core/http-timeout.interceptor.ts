import { HttpInterceptorFn } from '@angular/common/http';
import { timeout } from 'rxjs';
import { environment } from '../../enviroments/enviroment';
import { isBackendRequest } from './auth/auth.interceptor';

/**
 * Mientras el backend recién se está integrando (o falla), es fácil que una
 * petición se quede colgada sin responder ni error. Sin un límite, el
 * spinner de carga de la pantalla gira para siempre y el usuario no tiene
 * ninguna señal de que algo salió mal. Cortamos la espera acá, en un único
 * lugar, para no depender de que cada servicio recuerde agregar su propio
 * `timeout()`.
 *
 * `pricing.service.ts` ya trae su propio `timeout(10000)` más estricto (es
 * una regla de negocio documentada en FRONTEND_HANDOFF.md); como es más
 * corto que este, sigue siendo el que gana ahí.
 */
const REQUEST_TIMEOUT_MS = 15000;

export const httpTimeoutInterceptor: HttpInterceptorFn = (req, next) => {
  const targetsOurApis =
    isBackendRequest(req.url) || isBackendRequest(req.url, environment.apiPricingUrl);
  return targetsOurApis ? next(req).pipe(timeout(REQUEST_TIMEOUT_MS)) : next(req);
};
