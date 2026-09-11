# Ticketing Frontend Web App (Angular)

> Aplicación web Single Page Application (SPA) para clientes y organizadores de eventos.

![Angular](https://img.shields.io/badge/Angular-DD0031?style=for-the-badge&logo=angular&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![SCSS](https://img.shields.io/badge/SCSS-CC6699?style=for-the-badge&logo=sass&logoColor=white)

## 📌 Responsabilidades del Cliente Web

- Interfaz reactiva para registro, login y control de sesiones mediante JWT.
- Catálogo interactivo de eventos con visualización de aforo disponible en tiempo real.
- Flujo guiado de compra de tickets con selección de zonas y límite por transacción.
- Dashboard analítico con reportes de ocupación y recaudación para organizadores.

## 👥 Desarrolladores Responsables

- **Developer Frontend 1:** José Manuel Ames
- **Developer Frontend 2:** Jesus Morales

## 🛠️ Requisitos Previos

- Node.js 22 LTS (el repositorio incluye `.node-version`)
- npm 11 (`npm ci` respeta exactamente `package-lock.json`)

No necesitas instalar Angular CLI globalmente: los scripts usan la versión local.

## 🚀 Cómo correr

```bash
npm ci
npm start            # servidor de desarrollo en http://localhost:4200
npm run build        # build de producción (usa enviroment.prod.ts)
npm test             # pruebas unitarias (Vitest)
npm run check        # pruebas + build de producción
```

## 🧪 Datos de prueba (sin backend)

El backend todavía está en construcción. Mientras tanto, `src/enviroments/enviroment.ts`
trae `useMock: true`: todos los servicios responden con **datos falsos en memoria**
(semilla en `src/app/core/mock/`), persistidos en `localStorage` para que las compras
y los eventos creados sobrevivan a un refresco.

Cuando el backend esté listo, poner `useMock: false` y los mismos servicios pegarán a
`apiBackendUrl` / `apiPricingUrl`.

**Cuentas de prueba** (botones de acceso rápido en la pantalla de login):

| Rol         | Correo               | Contraseña    |
| ----------- | -------------------- | ------------- |
| Organizador | `organizador@tkt.pe` | `organizador` |
| Cliente     | `cliente@tkt.pe`     | `cliente`     |
| Admin       | `admin@tkt.pe`       | `admin`       |

Para reiniciar la data: borrar la clave `tkt.mock.v1` de `localStorage`.

## 🗺️ Estructura

```
src/app/
  core/
    auth/          AuthService (JWT + signals), guards, interceptor
    models/        User, EventItem/Zone, TicketOrder, DashboardStats
    services/      EventService, TicketService, PricingService, DashboardService
    mock/          semilla y store en memoria (localStorage)
  shared/          componentes reutilizables (event-card, capacity-bar, bar-chart, ...)
  layout/          main-layout (toolbar + footer)
  features/
    auth/          login, registro
    events/        catálogo + detalle de evento
    checkout/      flujo guiado de compra (stepper)
    account/       mis entradas
    organizer/     panel analítico, gestión y formulario de eventos
```

## 🧭 Rutas principales

| Ruta                         | Acceso      | Descripción                            |
| ---------------------------- | ----------- | -------------------------------------- |
| `/eventos`                   | público     | Catálogo con búsqueda y filtros        |
| `/eventos/:id`               | público     | Detalle, zonas y aforo en vivo         |
| `/comprar/:eventId`          | autenticado | Compra guiada (zonas → resumen → pago) |
| `/mis-entradas`              | autenticado | Órdenes y códigos de acceso            |
| `/organizador/panel`         | organizador | Ocupación y recaudación                |
| `/organizador/eventos`       | organizador | Gestión de eventos                     |
| `/organizador/eventos/nuevo` | organizador | Alta / edición de evento y zonas       |
| `/ayuda`                     | público     | Centro de ayuda                         |

## Funciones destacadas del frontend

- Catálogo responsive con favoritos locales, comparación, filtros combinados, orden y “Aforo Match” por presupuesto y tamaño de grupo.
- Planos interactivos distintos para Monumental, Estadio Nacional, San Marcos, teatros, arenas/coliseos y zonas generales. El modal ampliado permite selección múltiple.
- Precio dinámico visible con motivo, cotización de dos minutos, comisión desglosada, idempotencia y pago aprobado/rechazado de prueba.
- Panel por evento y por zona, laboratorio de escenarios de precio y exportación CSV protegida contra fórmulas.
- Entradas con filtros, calendario `.ics`, resumen descargable y QR rotativo.
- Tema claro/oscuro, navegación móvil, foco visible, reducción de movimiento y centro de ayuda.

Consulta [FRONTEND_HANDOFF.md](./FRONTEND_HANDOFF.md) antes de integrar PHP y Python.

## 🧱 Stack

- Angular 21 (standalone, zoneless, señales, control-flow `@if`/`@for`)
- Angular Material 3 + SCSS (tema violeta/cian, claro/oscuro)
- RxJS para los servicios HTTP; gráficos hechos a mano (sin librería de charts)
