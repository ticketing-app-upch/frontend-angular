# Demo 2 · Frontend de AlpaTeck

Frontend Angular de la Demo 2 para autenticación, control de sesión y navegación inicial del catálogo de eventos.

## Alcance implementado

- Inicio de sesión y registro para asistentes y organizadores; el formulario exige aceptar los términos y condiciones.
- Cierre de sesión que elimina el token y el usuario del almacenamiento del navegador.
- Expiración de sesión a las 8 horas. Las respuestas `401` en rutas protegidas cierran la sesión y llevan al login; `403` conserva la sesión y muestra una página segura.
- Guards de autenticación y rol para impedir la navegación a rutas de otro perfil desde el frontend. El backend debe repetir estas autorizaciones.
- Catálogo de eventos para asistentes, con favoritos guardados localmente. El corazón permite añadir y quitar cada evento de “Mis favoritos”. La pantalla de detalle y compra siguen fuera del alcance de esta demo.

## Rutas principales

| Ruta | Acceso | Uso |
| --- | --- | --- |
| `/auth/login` | Público | Inicio de sesión |
| `/auth/register` | Público | Registro y aceptación de términos |
| `/attendee/catalog` | Cliente autenticado | Catálogo de eventos |
| `/attendee/favorites` | Cliente autenticado | Eventos favoritos |
| `/attendee/tickets` | Cliente autenticado | Pendiente de implementación |
| `/attendee/event/:id` | Cliente autenticado | Detalle pendiente; no se abre desde las tarjetas |

## Ejecutar localmente

Requisitos: Node.js 22 y npm 11.

```bash
npm ci
npm start
```

La aplicación queda en [http://localhost:4200](http://localhost:4200). Para comprobar cambios:

```bash
npm test -- --watch=false
npm run build
```

## Integración con backend

La base de API de desarrollo está en `src/enviroments/enviroment.ts` (`http://localhost:8080/api`) y `useMock` está en `true`. Por eso login, registro y catálogo utilizan datos locales; el repositorio de Demo 2 no contiene una implementación de backend para ejecutar una prueba extremo a extremo. Cambiar `useMock` a `false` activa las llamadas HTTP.

Contratos que el frontend espera al conectar el backend:

- `POST /auth/login`: `{ email, password }` → `{ token, user }`.
- `POST /auth/register`: `{ fullName, email, password, role, acceptedTerms, ...profile }` → `{ token, user }`. `role` es `CLIENT` u `ORGANIZER`; el formulario no permite autorregistro de `ADMIN`.
- `GET /events`: arreglo de eventos (`id`, `name`, `category`, `status`, `venue`, `city`, `startsAt`, `imageUrl`, `zones`, entre otros). Acepta `search`, `category` y `available=true`.
- Las llamadas a la API incluyen `Authorization: Bearer <token>` cuando hay sesión. Un `401` fuera de `/auth/*` expira la sesión; un `403` redirige a `/bienvenida?reason=forbidden`.

El backend debe validar token, vencimiento, rol, permisos y datos de registro en el servidor. Los guards del navegador solo controlan la experiencia de usuario. Los favoritos se guardan en `localStorage` bajo `aforo.favorites.v1`; no requieren endpoint y por ahora son propios del navegador.

`FRONTEND_HANDOFF.md` conserva la guía de contratos extendidos para las próximas épicas. Los flujos de compra, detalle del evento y paneles no forman parte de la pantalla actual de esta demo.
