import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { environment } from '../../enviroments/enviroment';
import { AuthService } from './auth/auth.service';
import { roleHome } from './auth/role-home';

/**
 * Controla qué épicas del proyecto están "encendidas" en este build, para
 * poder mostrar en cada demo exactamente lo que ya está sustentado por el
 * backend — ni más ni menos — sin borrar ni comentar código de las épicas
 * futuras (siguen ahí, listas para la próxima demo).
 *
 * Se configura en `enviroment.ts` con `enabledEpics: number[]`:
 *   1 = Gestión de usuarios y autenticación   (Demo 2)
 *   2 = Publicación de eventos y zonas        (Demo 3)
 *   3 = Compra con control de concurrencia    (Demo 3)
 *   4 = Precio dinámico (microservicio Python)(Demo 4)
 *   5 = Dashboard del organizador              (Demo 4)
 */
export function epicEnabled(epic: number): boolean {
  return environment.enabledEpics.includes(epic);
}

/**
 * Bloquea una ruta si su épica todavía no está habilitada en este build y
 * devuelve al usuario a la pantalla que corresponde a su rol.
 */
export function epicGuard(epic: number): CanActivateFn {
  return () => (epicEnabled(epic) ? true : inject(Router).parseUrl(roleHome(inject(AuthService).user()?.role)));
}
