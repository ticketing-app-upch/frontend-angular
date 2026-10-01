import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { environment } from '../../../enviroments/enviroment';

export function isBackendRequest(url: string, base = environment.apiBackendUrl): boolean {
  const target = new URL(url, location.origin);
  const api = new URL(base, location.origin);
  return target.origin === api.origin && (target.pathname === api.pathname || target.pathname.startsWith(api.pathname.replace(/\/$/, '') + '/'));
}
/** No enviar credenciales a imágenes, servicios externos ni al motor de pricing. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!isBackendRequest(req.url)) return next(req);
  const token = auth.token;
  if (!token && auth.sessionExpired() && !req.url.includes('/auth/')) auth.expireSession();
  return next(token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req).pipe(
    catchError(error => {
      if (error.status === 401 && token && !req.url.includes('/auth/')) {
        auth.expireSession();
      }
      if (error.status === 403 && token && !req.url.includes('/auth/')) {
        void router.navigate(['/bienvenida'], {
          queryParams: { reason: 'forbidden' },
          replaceUrl: true,
        });
      }
      return throwError(() => error);
    })
  );
};
