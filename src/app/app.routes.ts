import { Routes } from '@angular/router';
import { authGuard, clientGuard, guestGuard, roleGuard } from './core/auth/auth.guards';
import { epicGuard } from './core/demo-scope';

const catalog = () => import('./features/events/event-list/event-list').then(m => m.EventList);
const detail = () => import('./features/events/event-detail/event-detail').then(m => m.EventDetail);
const tickets = () => import('./features/account/my-tickets/my-tickets-v3').then(m => m.MyTicketsV3);

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./layout/main-layout/main-layout').then(m => m.MainLayout),
    children: [
      { path: '', redirectTo: 'eventos', pathMatch: 'full' },
      { path: 'bienvenida', loadComponent: () => import('./features/bienvenida/bienvenida').then(m => m.Bienvenida) },
      { path: 'eventos', loadComponent: catalog, title: 'Eventos · AlpaTeck' },
      { path: 'eventos/:id', loadComponent: detail, title: 'Detalle del evento · AlpaTeck' },
      { path: 'attendee/event/:id', canActivate: [authGuard, clientGuard], loadComponent: detail, title: 'Detalle del evento · AlpaTeck' },
      { path: 'attendee/catalog', canActivate: [authGuard, clientGuard], loadComponent: catalog },
      { path: 'attendee/favorites', canActivate: [authGuard, clientGuard], loadComponent: catalog, data: { favorites: true } },
      { path: 'attendee/tickets', canActivate: [authGuard, clientGuard], loadComponent: tickets },
      { path: 'mis-entradas', canActivate: [authGuard, clientGuard], loadComponent: tickets },
      { path: 'comprar/:eventId', canActivate: [authGuard, clientGuard], loadComponent: () => import('./features/checkout/checkout').then(m => m.Checkout) },
      {
        path: 'organizador',
        canActivate: [roleGuard('ORGANIZER')],
        canActivateChild: [roleGuard('ORGANIZER')],
        children: [
          { path: '', redirectTo: 'eventos', pathMatch: 'full' },
          { path: 'eventos', loadComponent: () => import('./features/organizer/event-manage/event-manage').then(m => m.EventManage), title: 'Mis eventos · AlpaTeck' },
          { path: 'eventos/nuevo', loadComponent: () => import('./features/organizer/event-form/event-form').then(m => m.EventForm), title: 'Publicar evento · AlpaTeck' },
          { path: 'eventos/:id/ventas', canActivate: [epicGuard(5)], loadComponent: () => import('./features/organizer/event-sales/event-sales').then(m => m.EventSales), title: 'Ventas por evento · AlpaTeck' },
        ],
      },
      { path: 'organizer/create-event', redirectTo: 'organizador/eventos/nuevo' },
      { path: 'organizer/dashboard', redirectTo: 'organizador/eventos' },
      {
        path: 'admin',
        canActivate: [roleGuard('ADMIN')],
        canActivateChild: [roleGuard('ADMIN')],
        children: [
          { path: '', redirectTo: 'usuarios', pathMatch: 'full' },
          { path: 'usuarios', loadComponent: () => import('./features/admin/admin-users/admin-users').then(m => m.AdminUsers), title: 'Gestión de usuarios · AlpaTeck' },
        ],
      },
      {
        path: 'auth',
        canActivate: [guestGuard],
        children: [
          { path: '', redirectTo: 'login', pathMatch: 'full' },
          { path: 'login', loadComponent: () => import('./features/auth/login/login').then(m => m.Login) },
          { path: 'register', loadComponent: () => import('./features/auth/register/register').then(m => m.Register) },
        ],
      },
    ],
  },
  { path: 'validar/:code', loadComponent: () => import('./features/validate/validate').then(m => m.ValidatePage) },
  { path: '**', redirectTo: '' },
];
