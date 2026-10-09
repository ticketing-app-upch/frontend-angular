import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './core/auth/auth.guards';

const bienvenida = () => import('./features/bienvenida/bienvenida').then((m) => m.Bienvenida);
const login = () => import('./features/auth/login/login').then((m) => m.Login);
const register = () => import('./features/auth/register/register').then((m) => m.Register);

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./layout/main-layout/main-layout').then((m) => m.MainLayout),
    children: [
      { path: '', redirectTo: 'auth/login', pathMatch: 'full' },
      { path: 'bienvenida', loadComponent: bienvenida, title: 'Bienvenida · AlpaTeck' },
      {
        path: 'attendee/catalog',
        canActivate: [authGuard, roleGuard('CLIENT')],
        loadComponent: () => import('./features/events/event-list/event-list').then(m => m.EventList),
        title: 'Explorar eventos · AlpaTeck',
      },
      {
        path: 'attendee/favorites',
        canActivate: [authGuard, roleGuard('CLIENT')],
        loadComponent: () => import('./features/events/event-list/event-list').then(m => m.EventList),
        data: { favorites: true },
        title: 'Mis favoritos · AlpaTeck',
      },
      {
        path: 'attendee/event/:id',
        canActivate: [authGuard, roleGuard('CLIENT')],
        loadComponent: bienvenida,
        title: 'Detalle del evento · AlpaTeck',
      },
      {
        path: 'attendee/checkout/:id',
        canActivate: [authGuard, roleGuard('CLIENT')],
        loadComponent: bienvenida,
        title: 'Compra de entradas · AlpaTeck',
      },
      {
        path: 'attendee/tickets',
        canActivate: [authGuard, roleGuard('CLIENT')],
        loadComponent: bienvenida,
        title: 'Mis entradas · AlpaTeck',
      },
      {
        path: 'organizer/create-event',
        canActivate: [authGuard, roleGuard('ORGANIZER')],
        loadComponent: bienvenida,
        title: 'Crear evento · AlpaTeck',
      },
      {
        path: 'organizer/dashboard',
        canActivate: [authGuard, roleGuard('ORGANIZER')],
        loadComponent: bienvenida,
        title: 'Dashboard de ventas · AlpaTeck',
      },
      {
        path: 'auth',
        children: [
          { path: '', redirectTo: 'login', pathMatch: 'full' },
          { path: 'login', loadComponent: login, title: 'Ingresar · AlpaTeck' },
          { path: 'register', loadComponent: register, title: 'Crear cuenta · AlpaTeck' },
        ],
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
