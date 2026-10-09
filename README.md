# Demo 2 · Frontend de AlpaTeck

Frontend Angular de la Demo 2 para autenticación, control de sesión y navegación inicial del catálogo de eventos.

## Alcance implementado

- Inicio de sesión y registro para asistentes y organizadores; el formulario exige aceptar los términos y condiciones.
- Cierre de sesión que elimina el token y el usuario del almacenamiento del navegador.
- Expiración de sesión a los 60 minutos, alineada con el JWT del backend. Las respuestas `401` en rutas protegidas cierran la sesión y llevan al login; `403` conserva la sesión y muestra una página segura.
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

Para presentar este frontend sin backend, también puedes iniciarlo con `docker compose up -d --build` y abrir [http://localhost:8082](http://localhost:8082). Usa autenticación y catálogo simulados, por lo que funciona aunque Laravel no esté disponible. Para detenerlo: `docker compose down`.

## Integración con backend

La Demo 2 standalone usa autenticación mock (`useMockAuth: true`) y el resto de módulos conserva datos mock (`useMock: true`). La configuración del backend se mantiene en la copia de `Full stack`, separada de esta rama.

Contratos que el frontend espera al conectar el backend:

- `POST /auth/login`: `{ email, password }` → `{ token, user }`.
- `POST /auth/register`: `{ fullName, email, password, role, acceptedTerms, ...profile }` → `{ token, user }`. `role` es `CLIENT` u `ORGANIZER`; el formulario no permite autorregistro de `ADMIN`.
- `GET /events`: arreglo de eventos (`id`, `name`, `category`, `status`, `venue`, `city`, `startsAt`, `imageUrl`, `zones`, entre otros). Acepta `search`, `category` y `available=true`.
- Las llamadas a la API incluyen `Authorization: Bearer <token>` cuando hay sesión. Un `401` fuera de `/auth/*` expira la sesión; un `403` redirige a `/bienvenida?reason=forbidden`.

El backend debe validar token, vencimiento, rol, permisos y datos de registro en el servidor. Los guards del navegador solo controlan la experiencia de usuario. Los favoritos se guardan en `localStorage` bajo `aforo.favorites.v1`; no requieren endpoint y por ahora son propios del navegador.

`FRONTEND_HANDOFF.md` conserva la guía de contratos extendidos para las próximas épicas. Los flujos de compra, detalle del evento y paneles no forman parte de la pantalla actual de esta demo.
