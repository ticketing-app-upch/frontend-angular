import { Routes } from '@angular/router';

const bienvenida = () => import('./features/bienvenida/bienvenida').then((m) => m.Bienvenida);
const login = () => import('./features/auth/login/login').then((m) => m.Login);

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./layout/main-layout/main-layout').then((m) => m.MainLayout),
    children: [
      { path: '', redirectTo: 'auth/login', pathMatch: 'full' },
      { path: 'bienvenida', loadComponent: bienvenida, title: 'Bienvenida · AlpaTeck' },
      {
        path: 'attendee/catalog',
        loadComponent: bienvenida,
        title: 'Catálogo de eventos · AlpaTeck',
      },
      {
        path: 'attendee/event/:id',
        loadComponent: bienvenida,
        title: 'Detalle del evento · AlpaTeck',
      },
      {
        path: 'attendee/checkout/:id',
        loadComponent: bienvenida,
        title: 'Compra de entradas · AlpaTeck',
      },
      {
        path: 'attendee/tickets',
        loadComponent: bienvenida,
        title: 'Mis tickets · AlpaTeck',
      },
      {
        path: 'organizer/create-event',
        loadComponent: bienvenida,
        title: 'Crear evento · AlpaTeck',
      },
      {
        path: 'organizer/dashboard',
        loadComponent: bienvenida,
        title: 'Dashboard de ventas · AlpaTeck',
      },
      {
        path: 'auth',
        children: [
          { path: '', redirectTo: 'login', pathMatch: 'full' },
          { path: 'login', loadComponent: login, title: 'Ingresar · AlpaTeck' },
          { path: 'register', loadComponent: login, title: 'Crear cuenta · AlpaTeck' },
        ],
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
