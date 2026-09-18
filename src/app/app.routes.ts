import { Routes } from '@angular/router';

const bienvenida = () => import('./features/bienvenida/bienvenida').then((m) => m.Bienvenida);
const login = () => import('./features/auth/login/login').then((m) => m.Login);

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./layout/main-layout/main-layout').then((m) => m.MainLayout),
    children: [
      { path: '', redirectTo: 'auth/login', pathMatch: 'full' },
      {
        path: 'bienvenida',
        loadComponent: bienvenida,
        title: 'Bienvenida · AlpaTeck',
      },
      {
        path: 'ayuda',
        loadComponent: bienvenida,
        title: 'Ayuda · AlpaTeck',
      },
      {
        path: 'eventos',
        loadComponent: bienvenida,
        title: 'Eventos · AlpaTeck',
      },
      {
        path: 'eventos/:id',
        loadComponent: bienvenida,
        title: 'Detalle del evento · AlpaTeck',
      },
      {
        path: 'comprar/:eventId',
        loadComponent: bienvenida,
        title: 'Comprar entradas · AlpaTeck',
      },
      {
        path: 'mis-entradas',
        loadComponent: bienvenida,
        title: 'Mis entradas · AlpaTeck',
      },
      {
        path: 'organizador',
        children: [
          { path: '', redirectTo: 'panel', pathMatch: 'full' },
          {
            path: 'panel',
            loadComponent: bienvenida,
            title: 'Panel del organizador · AlpaTeck',
          },
          {
            path: 'eventos',
            loadComponent: bienvenida,
            title: 'Mis eventos · AlpaTeck',
          },
          {
            path: 'eventos/nuevo',
            loadComponent: bienvenida,
            title: 'Nuevo evento · AlpaTeck',
          },
          {
            path: 'eventos/:id/editar',
            loadComponent: bienvenida,
            title: 'Editar evento · AlpaTeck',
          },
        ],
      },
      {
        path: 'admin',
        children: [
          { path: '', redirectTo: 'resumen', pathMatch: 'full' },
          {
            path: 'resumen',
            loadComponent: bienvenida,
            title: 'Administración · AlpaTeck',
          },
          {
            path: 'usuarios',
            loadComponent: bienvenida,
            title: 'Usuarios · Administración',
          },
          {
            path: 'eventos',
            loadComponent: bienvenida,
            title: 'Eventos · Administración',
          },
          {
            path: 'compras',
            loadComponent: bienvenida,
            title: 'Compras · Administración',
          },
        ],
      },
      {
        path: 'auth',
        children: [
          { path: '', redirectTo: 'login', pathMatch: 'full' },
          {
            path: 'login',
            loadComponent: login,
            title: 'Ingresar · AlpaTeck',
          },
          {
            path: 'registro',
            loadComponent: login,
            title: 'Crear cuenta · AlpaTeck',
          },
        ],
      },
    ],
  },
  {
    path: 'validar',
    loadComponent: bienvenida,
    title: 'Validar entrada · AlpaTeck',
  },
  { path: '**', redirectTo: '' },
];
