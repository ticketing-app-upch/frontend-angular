# Entrega técnica del frontend Aforo

Este documento separa lo que ya funciona en Angular de lo que necesariamente debe autorizar el backend. Para producción, el backend debe autorizar y registrar cada operación.

## Cobertura de los lineamientos

| Requisito del proyecto | Implementación frontend | Responsabilidad pendiente |
| --- | --- | --- |
| Usuarios Admin / Organizador / Asistente | Rutas por rol, sesión recordada o temporal, expiración de JWT y permisos también en servicios mock | PHP debe cifrar contraseñas, emitir/verificar JWT y aplicar permisos en cada endpoint |
| Eventos y zonas | Alta/edición, capacidad física, zonas únicas, ventas inmutables y máximo 6 | PHP debe validar nuevamente y conservar el historial |
| Consulta por categoría, fecha o lugar | Filtros combinados, búsqueda sin tildes, orden y URL compartible | `GET /events` debe aceptar filtros equivalentes |
| Compra sin sobreventa | UX de selección, cotización, límite 6, revalidación, idempotencia y error de stock | PHP/MySQL debe ejecutar `START TRANSACTION`, `SELECT ... FOR UPDATE`, validar stock, insertar ticket y `COMMIT/ROLLBACK` |
| Precio dinámico | Reglas exactas visibles y probadas; endpoint Python por zona | Python es la autoridad de precio; PHP debe volver a comprobar el total antes de confirmar |
| Ticket inmutable | La orden guarda zona, cantidad y precio pagado; la UI no edita tickets | API debe prohibir `PUT/PATCH/DELETE` de tickets confirmados |
| Dashboard por zona | Ocupación, entradas, recaudación sin comisión, precio vigente, CSV y laboratorio de precios | Endpoint debe retornar datos agregados desde MySQL |

## Mapa de contratos por demo

| Demo | Épicas | Contratos que necesita el backend |
| --- | --- | --- |
| Demo 2 (Semana 8) | 1 | Registro, Login |
| Demo 3 (Semana 11) | 1, 2, 3 | + Catálogo de eventos, Gestión de eventos, Compra transaccional |
| Demo 4 (Semana 14) | 1‑5 | + Precio dinámico, Dashboard del organizador |

## Contratos esperados

### Registro (HU-07A · Épica 1 / Demo 2)

`POST {apiBackendUrl}/auth/register`

El frontend usa internamente `CLIENT` / `ORGANIZER` / `ADMIN`; equivalen a `Asistente` / `Organizador` / `Administrador` en la historia de usuario. **El registro público nunca acepta `role: "ADMIN"`** — esa cuenta se crea solo por fuera (seed o panel de administración), así que el backend debe rechazar cualquier intento de registrarla por este endpoint.

```json
{
  "fullName": "Ana Torres",
  "email": "ana@correo.com",
  "password": "contraseña-en-texto-plano-solo-por-HTTPS",
  "role": "CLIENT",
  "acceptedTerms": true,
  "marketingOptIn": false,
  "profile": {
    "country": "PE", "city": "Lima", "district": "Miraflores",
    "hasPeruvianNationality": true, "docType": "DNI", "docNumber": "12345678",
    "gender": "F", "phoneCode": "+51", "phone": "987654321"
  }
}
```

- `profile` es obligatorio cuando `role: "CLIENT"`; se omite y en su lugar va `organizer` (mismos campos, sin `verificationStatus`) cuando `role: "ORGANIZER"`.
- Validaciones que el backend debe repetir (el frontend ya las aplica en UI, pero no son de fiar si vienen del cliente): correo único, `role` ∈ {`CLIENT`, `ORGANIZER`}, `acceptedTerms === true`, contraseña con el mínimo de complejidad que se defina.
- Respuesta `201`: mismo cuerpo que login (ver abajo). Errores: `409` correo ya registrado, `422` rol/datos inválidos.
- El backend debe hashear la contraseña (p. ej. bcrypt/argon2) antes de guardar; nunca se persiste ni se retorna en texto plano.

### Login (HU-07B · Épica 1 / Demo 2)

`POST {apiBackendUrl}/auth/login`

```json
{ "email": "ana@correo.com", "password": "contraseña-en-texto-plano-solo-por-HTTPS" }
```

Respuesta `200` (mismo shape para registro y login):

```json
{
  "token": "<JWT firmado por el backend>",
  "user": {
    "id": "u-123", "fullName": "Ana Torres", "email": "ana@correo.com",
    "role": "CLIENT", "marketingOptIn": false,
    "profile": { "...": "solo si role=CLIENT" },
    "organizer": { "...": "solo si role=ORGANIZER, incluye verificationStatus" }
  }
}
```

- El JWT debe incluir el rol (p. ej. claim `role`) y `exp` en segundos Unix — `sessionTokenValid()` en `auth.service.ts` valida la expiración en el cliente, pero la autenticidad y el rol efectivo siempre los decide el backend en cada request, nunca el token que el cliente dice tener.
- Toda request subsecuente al backend viaja con `Authorization: Bearer <token>` (ver `auth.interceptor.ts`); un `401` fuera de `/auth/*` cierra la sesión local y redirige a `/auth/login`.
- Errores: `401` credenciales inválidas (mismo mensaje genérico para correo inexistente o password incorrecta, para no filtrar qué correos existen).
- El rol determina qué rutas puede ver el usuario (`roleGuard(...)` en `auth.guards.ts`); el backend debe aplicar la misma restricción por rol en cada endpoint protegido, no confiar en que el frontend oculte los botones.

### Catálogo de eventos (Épica 2 / Demo 3)

`GET {apiBackendUrl}/events?search=&category=&available=true`

Público, sin autenticación. Devuelve solo eventos con `status` en `PUBLICADO` o `AGOTADO` (nunca `BORRADOR` de otro organizador). `search` filtra por nombre/recinto/ciudad, `category` es una de `CONCIERTO|TEATRO|DEPORTE|CONFERENCIA|FESTIVAL`, `available=true` excluye eventos sin cupos. Respuesta: arreglo de `EventItem` (ver forma abajo), ordenado por `startsAt` ascendente.

`GET {apiBackendUrl}/events/:id` — detalle público de un evento. `404` si no existe o si es `BORRADOR` y quien pregunta no es su organizador ni admin.

```json
{
  "id": "ev-1",
  "name": "Sporting Cristal vs Universitario — Fútbol",
  "description": "…",
  "category": "DEPORTE",
  "status": "PUBLICADO",
  "venue": "Estadio Monumental",
  "city": "Lima",
  "startsAt": "2026-09-19T15:00:00-05:00",
  "publishedAt": "2026-08-01T10:00:00-05:00",
  "venueCapacity": 5000,
  "imageUrl": "https://…",
  "organizerId": "u-org-1",
  "maxPerOrder": 4,
  "zones": [
    { "id": "z-1a", "name": "Occidente Lateral A", "price": 228, "capacity": 900, "sold": 120 }
  ]
}
```

### Gestión de eventos del organizador (Épica 2 / Demo 3)

- `GET {apiBackendUrl}/organizers/:organizerId/events` — incluye borradores; solo el propio organizador o un admin.
- `GET {apiBackendUrl}/admin/events` — todos los eventos de la plataforma, cualquier estado; solo admin.
- `POST {apiBackendUrl}/events` (crear) / `PUT {apiBackendUrl}/events/:id` (editar) — mismo cuerpo que el detalle de arriba, sin `id` en el `POST`. El backend debe repetir estas validaciones (ya aplicadas en frontend, `ticketing-rules.ts::eventIssues`, pero nunca confiar en que el cliente las cumplió):
  - Nombre ≥ 4 caracteres, descripción ≥ 20.
  - `startsAt` en el futuro.
  - `maxPerOrder` entero entre 1 y 6.
  - `venueCapacity` entero ≥ 1; **la suma de `capacity` de todas las zonas nunca puede superar `venueCapacity`**.
  - Nombres de zona únicos (case-insensitive) dentro del evento.
  - `capacity` entero ≥ 1 y ≥ `sold`; `price` numérico ≥ 0.
  - **Al editar**: no se puede eliminar ni renombrar una zona con `sold > 0`, ni reducir su `capacity` por debajo de `sold`; el campo `sold` no es editable por esta vía (solo lo mueve la compra).
  - Errores: `422` con el primer problema encontrado, `403` si el organizador no es dueño del evento.
- `DELETE {apiBackendUrl}/events/:id` — `403` si no es el dueño ni admin; **`409` si el evento tiene ventas** (alguna zona con `sold > 0` o existe alguna orden) — un evento con historial de ventas no se borra, se mantiene para no perder el rastro de los tickets emitidos.

### Compra transaccional (Épica 3 / Demo 3)

`POST {apiBackendUrl}/orders`

```json
{
  "eventId": "ev-1",
  "items": [{ "zoneId": "z-1a", "quantity": 2 }],
  "expectedTotal": 381.6,
  "paymentMethod": "CARD",
  "paymentResult": "APPROVED",
  "idempotencyKey": "uuid-generado-en-frontend"
}
```

El backend debe asociar el comprador al JWT, ignorar cualquier identidad enviada por el cliente, recalcular precio, limitar la suma a 6 y garantizar que una clave idempotente no genere dos órdenes. Respuestas recomendadas: `401/403` por sesión/rol, `409` por stock o cotización cambiada, `422` por datos inválidos y `402` para rechazo de pago.

### Precio dinámico (Épica 4 / Demo 4)

`POST {apiPricingUrl}/v1/dynamic-price`

```json
{
  "id_zona": "z-1",
  "aforo_total": 1000,
  "aforo_disponible": 120,
  "fecha_evento": "2026-10-10T20:00:00-05:00",
  "fecha_publicacion": "2026-08-01T10:00:00-05:00",
  "precio_base": 120
}
```

Respuesta mínima: `{ "precio_ajustado": 144, "motivo": "Últimos cupos" }`. Angular rechaza precios negativos, no numéricos o respuestas que demoran más de 10 segundos.

Reglas implementadas: `+20%` cuando el disponible es estrictamente menor al 15% o faltan estrictamente menos de 3 días; `-10%` con más de 30 días publicado y menos del 10% vendido. El recargo tiene prioridad y no se acumulan ajustes.

### Dashboard del organizador (Épica 5 / Demo 4)

`GET {apiBackendUrl}/organizers/:organizerId/dashboard`

Solo el propio organizador o un admin (`403` para cualquier otro). Respuesta agregada, calculada por el backend desde MySQL (el frontend solo la muestra, no la recalcula):

```json
{
  "totalRevenue": 148200,
  "totalTicketsSold": 780,
  "totalCapacity": 900,
  "averageOccupancy": 0.867,
  "publishedEvents": 3,
  "revenueSeries": [{ "label": "Ago", "revenue": 42000, "tickets": 210 }],
  "byEvent": [
    { "eventId": "ev-1", "eventName": "…", "startsAt": "…", "capacity": 900, "sold": 780, "occupancy": 0.867, "revenue": 148200 }
  ],
  "byZone": [
    {
      "eventId": "ev-1", "eventName": "…", "zoneId": "z-1a", "zoneName": "Occidente Lateral A",
      "capacity": 900, "sold": 780, "revenue": 148200,
      "basePrice": 190, "currentPrice": 228, "priceReason": "Últimos cupos · +20%",
      "startsAt": "…", "publishedAt": "…"
    }
  ]
}
```

- `totalRevenue`/`revenue` son recaudación **sin la comisión de servicio** (esa comisión es del operador de pago, no del organizador).
- `averageOccupancy` y `occupancy` van en 0..1 (el frontend los formatea a `%`).
- `byZone` alimenta el "Price Lab" (simulador) y el CSV exportable — son solo lectura, ningún cambio ahí debe persistir en el backend.

## Planos y selección

`venueShape()` clasifica el recinto y `tkt-zone-map` genera una vista de zonas, no asientos numerados: esa es la granularidad exigida por el proyecto. El Monumental utiliza `public/events/map-monumental.webp` con polígonos; Nacional usa óvalo; San Marcos, rectángulo; teatros, plateas frente al escenario; Arena 1 y Dibós, anillos. Los demás eventos usan bandas coloreadas frente a un escenario. Todos son referenciales y responden al stock de cada zona.

Para añadir un plano real con permiso de uso, registra el archivo en `VENUE_MAPS` y sus polígonos porcentuales en `VENUE_MAP_HOTSPOTS`, dentro de `src/app/shared/event-image.ts`. Nunca anuncies un asiento exacto mientras el modelo solo maneje zonas.

## Seguridad y límites conscientes

- Los favoritos, compras mock y redenciones viven en `localStorage`; no se sincronizan entre equipos.
- El HMAC del QR solo está activo en modo mock. Una clave dentro de Angular es visible para cualquier visitante y no es seguridad real.
- En producción, el backend debe emitir pases de corta duración y registrar el ingreso de forma atómica y centralizada; un QR por orden tampoco sustituye entradas individuales.
- El frontend no procesa dinero, no envía correos y no está conectado con Yape, Plin, tarjetas, Google Wallet o Apple Wallet.
- Las imágenes remotas requieren revisar licencias, política de privacidad, CSP y disponibilidad antes del despliegue final.

## Archivos clave

- `src/app/core/models/ticketing-rules.ts`: reglas puras de precio, aforo y compra.
- `src/app/core/demo-scope.ts`: qué épicas están encendidas en cada rama (`enabledEpics` en `enviroment.ts`).
- `src/app/features/events/event-list/`: catálogo, comparación, favoritos y Aforo Match.
- `src/app/shared/zone-map/zone-map.ts`: planos interactivos.
- `src/app/features/checkout/`: selección, cotización y pasarela de pago.
- `src/app/features/organizer/dashboard/zone-insights.ts`: reporte por zona, laboratorio de precios y CSV.
- `src/app/features/help/help.ts`: centro de ayuda y declaración de límites.

## Cómo conectar cada demo al backend

Cada rama de demo trae ya el número de épicas que le toca mostrar (`enabledEpics` en `enviroment.ts`/`enviroment.prod.ts`). Conectar el backend es el mismo paso en cualquiera de ellas — no hace falta tocar rutas ni componentes:

1. En `src/enviroments/enviroment.ts` (local) y `enviroment.prod.ts` (build de despliegue), poner `useMock: false` y apuntar `apiBackendUrl` / `apiPricingUrl` a la URL real.
2. Implementar en el backend únicamente los contratos que le tocan a esa demo (ver la tabla "Mapa de contratos por demo" arriba) — los de demos futuras pueden seguir sin existir, esas rutas siguen ocultas por `epicGuard`.
3. Repetir del lado servidor las validaciones marcadas arriba (aforo, unicidad de zona, límite de compra, etc.): el frontend las aplica para UX, pero no son de fiar si vienen del cliente.

## Verificación antes de entregar

1. Instalar Node 22 y ejecutar `npm ci`.
2. Ejecutar `npm run check`.
3. Probar los tres roles con las cuentas del README.
4. Probar al menos Nacional, San Marcos, Gran Teatro Nacional, Arena 1 y Monumental, incluyendo una zona agotada.
5. Repetir una compra con la misma `idempotencyKey`, intentar 7 entradas y simular un pago rechazado.
6. Con `useMock: false`, validar CORS, contratos PHP/Python, concurrencia desde dos clientes y redención desde dos dispositivos.

Referencias de patrones revisados: centros de ayuda y experiencias móviles de [Teleticket](https://ayuda.teleticket.com.pe/helpcenter) y [Ticketmaster](https://www.ticketmaster.com/mobile-tickets). Se usaron como inspiración de flujo, no se copiaron diseños ni políticas.
