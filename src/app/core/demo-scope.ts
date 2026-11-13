import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { QueueService } from './services/queue.service';
import { EventService } from './services/event.service';
import { map } from 'rxjs';
import { environment } from '../../enviroments/enviroment';

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
 *   4 = Cola virtual y anti-scalping (Python) (Demo 4)
 *   5 = Dashboard del organizador              (Demo 4, aún sin habilitar)
 */
export function epicEnabled(epic: number): boolean {
  return environment.enabledEpics.includes(epic);
}

/**
 * Bloquea una ruta si su épica todavía no está habilitada en este build y
 * manda a `/bienvenida`, la landing "segura" que solo muestra lo que ya
 * corresponde mostrar en la demo actual.
 */
export function epicGuard(epic: number): CanActivateFn {
  return () => (epicEnabled(epic) ? true : inject(Router).parseUrl('/bienvenida'));
}

/**
 * Épica 4: con la cola virtual activa, el checkout solo se abre con un turno
 * vigente; sin él, se manda a `/cola/:eventId`.
 */
export const queueGuard: CanActivateFn = route => {
  if (!epicEnabled(4)) return true;
  const eventId = route.paramMap.get('eventId') ?? '';
  const queue = inject(QueueService);
  const router = inject(Router);
  return inject(EventService).getById(eventId).pipe(map(event =>
    !event.queueEnabled || queue.hasValidPass(eventId) ? true : router.createUrlTree(['/cola', eventId])));
};
