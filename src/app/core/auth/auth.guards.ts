import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { UserRole } from '../models/user.model';

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isAuthenticated()) {
    return true;
  }
  return router.createUrlTree(['/auth/login'], {
    queryParams: { redirect: state.url },
  });
};

/**
 * Restringe una ruta a uno o más roles. El rol `ADMIN` cumple siempre
 * (tiene acceso a todo el sistema).
 */
export function roleGuard(...roles: UserRole[]): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    if (!auth.isAuthenticated()) {
      return router.createUrlTree(['/auth/login']);
    }
    const role = auth.user()?.role;
    if (role === 'ADMIN' || (role && roles.includes(role))) {
      return true;
    }
    return router.createUrlTree(['/eventos']);
  };
}

/**
 * Restringe una ruta a clientes (comprar / ver entradas). Se usa DESPUÉS de
 * `authGuard`, así que aquí sólo hay que apartar a los organizadores.
 */
export const clientGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isOrganizer() ? router.createUrlTree(['/organizador/panel']) : true;
};

/** Evita que un usuario ya autenticado vea login/registro. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isAuthenticated() ? router.createUrlTree(['/eventos']) : true;
};
