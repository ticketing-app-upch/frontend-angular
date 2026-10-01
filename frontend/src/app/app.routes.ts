import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './core/auth/auth.guards';
import { epicGuard } from './core/demo-scope';

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
        canActivate: [authGuard, roleGuard('CLIENT'), epicGuard(3)],
        loadComponent: bienvenida,
        title: 'Compra de entradas · AlpaTeck',
      },
      {
        path: 'attendee/tickets',
        canActivate: [authGuard, roleGuard('CLIENT'), epicGuard(3)],
        loadComponent: bienvenida,
        title: 'Mis entradas · AlpaTeck',
      },
      {
        path: 'organizer/create-event',
        canActivate: [authGuard, roleGuard('ORGANIZER'), epicGuard(2)],
        loadComponent: bienvenida,
        title: 'Crear evento · AlpaTeck',
      },
      {
        path: 'organizer/home',
        canActivate: [authGuard, roleGuard('ORGANIZER')],
        loadComponent: bienvenida,
        title: 'Panel del organizador · AlpaTeck',
      },
      {
        path: 'admin/home',
        canActivate: [authGuard, roleGuard('ADMIN')],
        loadComponent: bienvenida,
        title: 'Panel de administración · AlpaTeck',
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
