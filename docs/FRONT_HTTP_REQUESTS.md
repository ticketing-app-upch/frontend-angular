# Peticiones HTTP del front (Angular) — Demo 4

Rama: `demo3`. Base: `environment.apiBackendUrl` (`http://localhost:8080/api` en local, `/api` en producción).
Hoy el front corre con datos de maqueta (`useMock: true`); cada petición de este documento solo se ejecuta cuando esa bandera se apaga.
El login usa además `useMockAuth`.

Todas las peticiones a `apiBackendUrl` llevan `Authorization: Bearer <token>` cuando hay sesión (`auth.interceptor.ts`).
Los errores se leen como `{ message }` con el código HTTP.

## 1. Auth — `core/auth/auth.service.ts`

### `POST /auth/login`
```json
{ "email": "string", "password": "string", "remember": true }
```
Respuesta esperada: `{ "token": "jwt", "user": User }`.

### `POST /auth/register`
```json
{
  "fullName": "string",
  "email": "string",
  "password": "string",
  "role": "CLIENT | ORGANIZER",
  "acceptedTerms": true,
  "marketingOptIn": false,
  "profile": {
    "country": "PE", "city": "Lima", "district": "string",
    "hasPeruvianNationality": false,
    "docType": "DNI | CE | PASAPORTE", "docNumber": "string",
    "gender": "F | M", "phoneCode": "+51", "phone": "string"
  },
  "organizer": {
    "orgType": "PERSONA | EMPRESA", "displayName": "string", "taxId": "string",
    "legalName": "string", "repName": "string", "phone": "string",
    "country": "PE", "city": "string", "website": "string"
  }
}
```
`profile` solo si `role = CLIENT`; `organizer` solo si `role = ORGANIZER`.
Respuesta esperada: `{ "token": "jwt", "user": User }`.

`User`: `{ id, fullName, email, role: CLIENT|ORGANIZER|ADMIN, profile?, organizer?, marketingOptIn?, active? }`
(`organizer` incluye además `verificationStatus: PENDING|VERIFIED|REJECTED`).

## 2. Eventos — `core/services/event.service.ts`

| Método y ruta | Uso | Notas |
|---|---|---|
| `GET /events` | Catálogo | Query: `search`, `category` (CONCIERTO, TEATRO, DEPORTE, CONFERENCIA, FESTIVAL; omitido si es "TODAS"), `available=true` |
| `GET /events/{id}` | Detalle | 404 si no existe o no está publicado |
| `POST /events` | Crear evento (HU-10) | Hoy se envía el `EventItem` como JSON (ver abajo) |
| `PUT /events/{id}` | Editar | No se usa en Demo 3 (evento inmutable) |
| `DELETE /events/{id}` | Borrar | |
| `GET /organizers/{organizerId}/events` | Mis eventos (HU-11) | |
| `GET /admin/events` | Eventos para el admin | |

### `EventItem` (lo que el front lee y envía)
```json
{
  "id": "string",
  "name": "string",
  "description": "string",
  "category": "CONCIERTO | TEATRO | DEPORTE | CONFERENCIA | FESTIVAL",
  "status": "BORRADOR | PUBLICADO | AGOTADO | FINALIZADO",
  "venue": "nombre del recinto",
  "city": "string",
  "startsAt": "ISO 8601",
  "publishedAt": "ISO 8601",
  "venueCapacity": 0,
  "imageUrl": "string",
  "bannerUrl": "string",
  "secondaryBannerUrl": "string",
  "organizerId": "string",
  "maxPerOrder": 6,
  "zones": [
    { "id": "string", "name": "string", "price": 0, "capacity": 0, "sold": 0 }
  ]
}
```

## 3. Compras y tickets — `core/services/ticket.service.ts`

| Método y ruta | Uso |
|---|---|
| `POST /orders` | Comprar (HU-14) |
| `GET /orders/me` | Compras del cliente (HU-15) |
| `GET /orders/{id}` | Detalle de una compra |
| `PATCH /orders/{id}` | Cambiar estado: `{ "status": "CONFIRMADA | PENDIENTE | CANCELADA" }` |
| `GET /admin/orders` | Compras para el admin |

### `POST /orders` — cuerpo
```json
{
  "eventId": "string",
  "items": [{ "zoneId": "string", "quantity": 2 }],
  "expectedTotal": 0,
  "paymentMethod": "CARD | WALLET",
  "paymentResult": "APPROVED | DECLINED",
  "idempotencyKey": "string"
}
```
El formulario de pago (número de tarjeta, CVV, vencimiento) se valida en pantalla y **no se envía** en esta petición.

### `TicketOrder` (respuesta esperada)
```json
{
  "id": "string", "code": "string",
  "eventId": "string", "eventName": "string", "eventStartsAt": "ISO 8601", "eventVenue": "string",
  "buyerId": "string", "buyerName": "string", "createdAt": "ISO 8601",
  "status": "CONFIRMADA | PENDIENTE | CANCELADA",
  "lines": [{ "zoneId": "string", "zoneName": "string", "unitPrice": 0, "quantity": 0 }],
  "tickets": [{ "code": "string", "zoneId": "string", "zoneName": "string", "unitPrice": 0, "serviceFee": 0, "total": 0 }],
  "subtotal": 0, "fee": 0, "total": 0
}
```
`tickets` trae una fila por entrada (código propio). El front calcula una comisión de servicio del 6% sobre cada entrada.

## 4. Admin — `core/services/admin.service.ts` (Demo 2)

| Método y ruta | Cuerpo |
|---|---|
| `POST /admin/users` | `{ ...datos del usuario, "role": "ADMIN" }` |
| `GET /admin/users` | — |
| `PATCH /admin/users/{id}` | `{ "role": "..." }` o `{ "active": true | false }` |
| `DELETE /admin/users/{id}` | — |
| `GET /admin/metrics` | — |

## 5. Cola virtual y anti-scalping — Épica 4 — `core/services/queue.service.ts`

Microservicio Python en `{apiPricingUrl}`. El front envía `Authorization: Bearer <JWT>` (el mismo que emite el backend); el servicio debe validarlo y no confiar en ninguna identidad enviada en el cuerpo.

| Método y ruta | Cuerpo | Respuesta |
|---|---|---|
| `POST /v1/queue/join` | `{ "eventId": "ev-1" }` | `QueueState` (200 también cuando el riesgo es `BLOCK`) |
| `GET /v1/queue/{eventId}/status` | — | `QueueState` |
| `DELETE /v1/queue/{eventId}` | — | 204 |

`QueueState`: `{ eventId, status: "WAITING"|"READY"|"EXPIRED"|"BLOCKED", position, initialPosition, etaSeconds, joinedAt, passToken?, passExpiresAt?, risk: { decision: "ALLOW"|"BLOCK", score: 0-100, reasons: string[] } }`. `passToken` solo viaja con `READY`.

`POST /orders` ahora incluye `queuePass` (el `passToken`). El backend debe validarlo con el microservicio, rechazar con `403` si falta, no es de ese usuario/evento o venció, y consumirlo al confirmar. Reglas anti-scalping que simula el front: ráfaga de ingresos (>4 por minuto), tope de 6 entradas por persona y evento (sumando compras previas no canceladas) y cuenta desactivada.

## 6. Fuera de Demo 4

- Épica 5: `GET /organizers/{id}/dashboard` (`dashboard.service.ts`); código listo pero apagado (`enabledEpics`).
- Precio dinámico `POST {apiPricingUrl}/v1/dynamic-price`: no está en el cronograma; apagado con `dynamicPricing: false`.

## 7. Lo que el front hoy resuelve sin HTTP (el back de Demo 3 ya lo tiene)

| Función | Hoy en el front | Endpoint del back |
|---|---|---|
| Favoritos (HU-12, HU-13) | `localStorage` por usuario | `GET/POST/DELETE /v1/favoritos` |
| Recintos (HU-10) | `core/models/venue-catalog.ts` (15 recintos) | `GET /v1/recintos` |
| Validación pública (HU-16) | Busca el código en el navegador | `GET /v1/tickets/{code}/validacion` |
| Banner del evento (HU-10) | Imagen validada en pantalla, sin subir | `POST /events` como `multipart/form-data` |

## 8. Diferencias conocidas con el back de Demo 3

- **Compra:** el front llama `POST /orders` y `GET /orders/me`; el back expone `POST /events/{id}/tickets` y `GET /v1/tickets`.
- **Pago:** el back exige `payment: { cardNumber, cvv, expiresAt: "YYYY-MM-DD" }`; el front no lo envía todavía.
- **Nombres de campos:** el front usa `name`, `venue`, `price`; el back usa `title`, `venueName`, `basePrice`.
- **Mis eventos:** el front usa `/organizers/{id}/events`; el back expone `/v1/eventos/mios`.
- **Comisión de servicio (6%):** el front la suma al total; el back hoy devuelve el total sin ella.
- **Registro:** el front envía más campos de perfil de los que el back valida (por ejemplo país, ciudad, género, teléfono).
- **Recintos:** el front trabaja con 15 recintos y el back tiene 3 (ver `recintos-demo3.json`, aparte).
- **Token:** `JWT_TTL=5` minutos en el back; el front muestra "sesión vencida" cuando expira.
