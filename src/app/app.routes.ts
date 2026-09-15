import { Routes } from '@angular/router';
import { authGuard, clientGuard, guestGuard, roleGuard } from './core/auth/auth.guards';
import { epicGuard } from './core/demo-scope';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./layout/main-layout/main-layout').then((m) => m.MainLayout),
    children: [
      { path: '', redirectTo: 'eventos', pathMatch: 'full' },
      {
        // Landing "segura": no depende de ninguna épica encendida. Cuando el
        // catálogo (Épica 2) todavía no está habilitado, todo rebota acá.
        path: 'bienvenida',
        loadComponent: () => import('./features/bienvenida/bienvenida').then((m) => m.Bienvenida),
        title: 'Bienvenida · AlpaTeck',
      },
      {
        path: 'ayuda',
        loadComponent: () => import('./features/help/help').then((m) => m.Help),
        title: 'Ayuda · AlpaTeck',
      },
      {
        path: 'eventos',
        canActivate: [epicGuard(2)],
        loadComponent: () =>
          import('./features/events/event-list/event-list').then((m) => m.EventList),
        title: 'Eventos · AlpaTeck',
      },
      {
        path: 'eventos/:id',
        canActivate: [epicGuard(2)],
        loadComponent: () =>
          import('./features/events/event-detail/event-detail').then((m) => m.EventDetail),
        title: 'Detalle del evento · AlpaTeck',
      },
      {
        path: 'comprar/:eventId',
        canActivate: [authGuard, clientGuard, epicGuard(3)],
        loadComponent: () => import('./features/checkout/checkout').then((m) => m.Checkout),
        title: 'Comprar entradas · AlpaTeck',
      },
      {
        path: 'mis-entradas',
        canActivate: [authGuard, clientGuard, epicGuard(3)],
        loadComponent: () =>
          import('./features/account/my-tickets/my-tickets').then((m) => m.MyTickets),
        title: 'Mis entradas · AlpaTeck',
      },
      {
        path: 'organizador',
        canActivate: [roleGuard('ORGANIZER')],
        canActivateChild: [roleGuard('ORGANIZER')],
        children: [
          { path: '', redirectTo: 'panel', pathMatch: 'full' },
          {
            path: 'panel',
            canActivate: [epicGuard(5)],
            loadComponent: () =>
              import('./features/organizer/dashboard/dashboard').then((m) => m.OrganizerDashboard),
            title: 'Panel del organizador · AlpaTeck',
          },
          {
            path: 'eventos',
            canActivate: [epicGuard(2)],
            loadComponent: () =>
              import('./features/organizer/event-manage/event-manage').then((m) => m.EventManage),
            title: 'Mis eventos · AlpaTeck',
          },
          {
            path: 'eventos/nuevo',
            canActivate: [epicGuard(2)],
            loadComponent: () =>
              import('./features/organizer/event-form/event-form').then((m) => m.EventForm),
            title: 'Nuevo evento · AlpaTeck',
          },
          {
            path: 'eventos/:id/editar',
            canActivate: [epicGuard(2)],
            loadComponent: () =>
              import('./features/organizer/event-form/event-form').then((m) => m.EventForm),
            title: 'Editar evento · AlpaTeck',
          },
        ],
      },
      {
        path: 'admin',
        canActivate: [roleGuard('ADMIN')],
        canActivateChild: [roleGuard('ADMIN')],
        loadComponent: () =>
          import('./features/admin/admin-layout/admin-layout').then((m) => m.AdminLayout),
        children: [
          { path: '', redirectTo: 'resumen', pathMatch: 'full' },
          {
            path: 'resumen',
            loadComponent: () =>
              import('./features/admin/admin-overview/admin-overview').then((m) => m.AdminOverview),
            title: 'Administración · AlpaTeck',
          },
          {
            path: 'usuarios',
            loadComponent: () =>
              import('./features/admin/admin-users/admin-users').then((m) => m.AdminUsers),
            title: 'Usuarios · Administración',
          },
          {
            path: 'eventos',
            loadComponent: () =>
              import('./features/admin/admin-events/admin-events').then((m) => m.AdminEvents),
            title: 'Eventos · Administración',
          },
          {
            path: 'compras',
            loadComponent: () =>
              import('./features/admin/admin-orders/admin-orders').then((m) => m.AdminOrders),
            title: 'Compras · Administración',
          },
        ],
      },
      {
        path: 'auth',
        canActivate: [guestGuard],
        children: [
          { path: '', redirectTo: 'login', pathMatch: 'full' },
          {
            path: 'login',
            loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
            title: 'Ingresar · AlpaTeck',
          },
          {
            path: 'registro',
            loadComponent: () =>
              import('./features/auth/register/register').then((m) => m.Register),
            title: 'Crear cuenta · AlpaTeck',
          },
        ],
      },
    ],
  },
  {
    // Puerta de validación (se abre al escanear el QR de una entrada).
    // Sin layout ni guard: la escanea el personal de acceso, no el comprador.
    path: 'validar',
    loadComponent: () => import('./features/validate/validate').then((m) => m.ValidatePage),
    title: 'Validar entrada · AlpaTeck',
  },
  { path: '**', redirectTo: '' },
];
