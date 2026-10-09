import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { UserRole } from '../models/user.model';

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.token && auth.isAuthenticated()) {
    return true;
  }
  return router.createUrlTree(['/auth/login'], {
    queryParams: { redirect: state.url, ...(auth.sessionExpired() ? { reason: 'expired' } : {}) },
  });
};

/** Restringe una ruta al rol indicado, antes de mostrar su componente. */
export function roleGuard(...roles: UserRole[]): CanActivateFn {
  return (_route, state) => {
    const auth = inject(AuthService);
    const router = inject(Router);
    if (!auth.token || !auth.isAuthenticated()) {
      return router.createUrlTree(['/auth/login'], {
        queryParams: { redirect: state.url, ...(auth.sessionExpired() ? { reason: 'expired' } : {}) },
      });
    }
    const role = auth.user()?.role;
    if (role && roles.includes(role)) {
      return true;
    }
    return router.createUrlTree(['/bienvenida'], { queryParams: { reason: 'forbidden' } });
  };
}

/**
 * Restringe una ruta a clientes (comprar / ver entradas). Se usa DESPUÉS de
 * `authGuard`, así que aquí sólo hay que apartar a los organizadores.
 */
export const clientGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isClient() ? true : router.createUrlTree(['/bienvenida'], { queryParams: { reason: 'forbidden' } });
};

/** Evita que un usuario ya autenticado vea login/registro. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isAuthenticated() ? router.createUrlTree(['/bienvenida']) : true;
};
