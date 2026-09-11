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

## Contratos esperados

### Precio dinámico

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

### Compra transaccional

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
- `src/app/features/events/event-list/`: catálogo, comparación, favoritos y Aforo Match.
- `src/app/shared/zone-map/zone-map.ts`: planos interactivos.
- `src/app/features/checkout/`: selección, cotización y pasarela de pago.
- `src/app/features/organizer/dashboard/zone-insights.ts`: reporte por zona, laboratorio de precios y CSV.
- `src/app/features/help/help.ts`: centro de ayuda y declaración de límites.

## Verificación antes de entregar

1. Instalar Node 22 y ejecutar `npm ci`.
2. Ejecutar `npm run check`.
3. Probar los tres roles con las cuentas del README.
4. Probar al menos Nacional, San Marcos, Gran Teatro Nacional, Arena 1 y Monumental, incluyendo una zona agotada.
5. Repetir una compra con la misma `idempotencyKey`, intentar 7 entradas y simular un pago rechazado.
6. Con `useMock: false`, validar CORS, contratos PHP/Python, concurrencia desde dos clientes y redención desde dos dispositivos.

Referencias de patrones revisados: centros de ayuda y experiencias móviles de [Teleticket](https://ayuda.teleticket.com.pe/helpcenter) y [Ticketmaster](https://www.ticketmaster.com/mobile-tickets). Se usaron como inspiración de flujo, no se copiaron diseños ni políticas.
