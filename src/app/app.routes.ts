import { Routes } from '@angular/router';
import {
  authGuard,
  clientGuard,
  guestGuard,
  roleGuard,
} from './core/auth/auth.guards';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./layout/main-layout/main-layout').then((m) => m.MainLayout),
    children: [
      { path: '', redirectTo: 'eventos', pathMatch: 'full' },
      {
        path: 'eventos',
        loadComponent: () =>
          import('./features/events/event-list/event-list').then(
            (m) => m.EventList,
          ),
        title: 'Eventos · Aforo',
      },
      {
        path: 'eventos/:id',
        loadComponent: () =>
          import('./features/events/event-detail/event-detail').then(
            (m) => m.EventDetail,
          ),
        title: 'Detalle del evento · Aforo',
      },
      {
        path: 'comprar/:eventId',
        canActivate: [authGuard, clientGuard],
        loadComponent: () =>
          import('./features/checkout/checkout').then((m) => m.Checkout),
        title: 'Comprar entradas · Aforo',
      },
      {
        path: 'mis-entradas',
        canActivate: [authGuard, clientGuard],
        loadComponent: () =>
          import('./features/account/my-tickets/my-tickets').then(
            (m) => m.MyTickets,
          ),
        title: 'Mis entradas · Aforo',
      },
      {
        path: 'organizador',
        canActivate: [roleGuard('ORGANIZER')],
        children: [
          { path: '', redirectTo: 'panel', pathMatch: 'full' },
          {
            path: 'panel',
            loadComponent: () =>
              import('./features/organizer/dashboard/dashboard').then(
                (m) => m.OrganizerDashboard,
              ),
            title: 'Panel del organizador · Aforo',
          },
          {
            path: 'eventos',
            loadComponent: () =>
              import(
                './features/organizer/event-manage/event-manage'
              ).then((m) => m.EventManage),
            title: 'Mis eventos · Aforo',
          },
          {
            path: 'eventos/nuevo',
            loadComponent: () =>
              import('./features/organizer/event-form/event-form').then(
                (m) => m.EventForm,
              ),
            title: 'Nuevo evento · Aforo',
          },
          {
            path: 'eventos/:id/editar',
            loadComponent: () =>
              import('./features/organizer/event-form/event-form').then(
                (m) => m.EventForm,
              ),
            title: 'Editar evento · Aforo',
          },
        ],
      },
      {
        path: 'admin',
        canActivate: [roleGuard('ADMIN')],
        loadComponent: () =>
          import('./features/admin/admin-layout/admin-layout').then(
            (m) => m.AdminLayout,
          ),
        children: [
          { path: '', redirectTo: 'resumen', pathMatch: 'full' },
          {
            path: 'resumen',
            loadComponent: () =>
              import('./features/admin/admin-overview/admin-overview').then(
                (m) => m.AdminOverview,
              ),
            title: 'Administración · Aforo',
          },
          {
            path: 'usuarios',
            loadComponent: () =>
              import('./features/admin/admin-users/admin-users').then(
                (m) => m.AdminUsers,
              ),
            title: 'Usuarios · Administración',
          },
          {
            path: 'eventos',
            loadComponent: () =>
              import('./features/admin/admin-events/admin-events').then(
                (m) => m.AdminEvents,
              ),
            title: 'Eventos · Administración',
          },
          {
            path: 'compras',
            loadComponent: () =>
              import('./features/admin/admin-orders/admin-orders').then(
                (m) => m.AdminOrders,
              ),
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
            loadComponent: () =>
              import('./features/auth/login/login').then((m) => m.Login),
            title: 'Ingresar · Aforo',
          },
          {
            path: 'registro',
            loadComponent: () =>
              import('./features/auth/register/register').then(
                (m) => m.Register,
              ),
            title: 'Crear cuenta · Aforo',
          },
        ],
      },
    ],
  },
  {
    // Puerta de validación (se abre al escanear el QR de una entrada).
    // Sin layout ni guard: la escanea el personal de acceso, no el comprador.
    path: 'validar',
    loadComponent: () =>
      import('./features/validate/validate').then((m) => m.ValidatePage),
    title: 'Validar entrada · Aforo',
  },
  { path: '**', redirectTo: '' },
];
