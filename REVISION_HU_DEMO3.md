# Revisión frontend de Demo 3

Fuentes de alcance: [Backlog Demo 3 actualizado](https://docs.google.com/spreadsheets/d/1EvVr2ACe9Zcp_dczvkdu9nm8dPITjiUH5947llLaPOg/edit) y [backlog general v6](https://docs.google.com/spreadsheets/d/1vFJs0DhiYnh_0VnqXLpORdrWNigUvX52EjCOFp0FEvg/edit). La rama cubre las épicas 2 y 3 sobre la base de autenticación y administración de Demo 2. Los datos y pagos son simulados en este navegador.

## Épica 1, base de Demo 2

| HU | Comprobación en frontend | Depende de backend |
| --- | --- | --- |
| 01 Registro | Roles asistente y organizador, campos de Demo 2, correo válido, contraseña con política requerida, términos obligatorios y comprobación local de duplicados. | Unicidad definitiva y bcrypt. |
| 02 Login | Misma pantalla para los tres roles, redirección por rol, 401 para credenciales incorrectas y 403 para cuenta inactiva en mock. | JWT real y verificación de cuenta. |
| 03 Logout | Borra token y usuario de ambos almacenamientos; guards impiden volver con «atrás». | Revocación de sesión en servidor. |
| 04 Timeout | Duración parametrizable en minutos, temporizador local e interceptor que distingue el 401 de login del 401 de sesión. | Rechazo de JWT vencidos en todas las API. |
| 05 Roles | Guards antes de mostrar pantallas, retorno a la ruta solicitada tras login. | Autorización 401/403 de cada endpoint. |
| 06 Términos | Checkbox obligatorio y enlace al texto legal. | Validación de aceptación en API. |
| 07 Admin listado | Solo gestión de usuarios visible para admin; asistentes y organizadores, filtros, nombre, correo, rol, estado; sin botones de alta ni borrado. | Excluir administradores y no exponer endpoints de alta/baja ajenos al alcance. |
| 08 Admin estado | Confirmación al desactivar, actualización inmediata, sin borrado histórico ni desactivar administradores. | Estado real de cuenta y caducidad de tokens previos. |

## Épicas 2 y 3, alcance exclusivo de Demo 3

| HU | Cobertura de frontend |
| --- | --- |
| 09 | Catálogo de eventos publicados y futuros, filtros de categoría, fecha y recinto, disponibilidad, precio, favorito y compartir. También se filtran respuestas HTTP no publicables. |
| 10 | Organizador activo crea eventos con título, descripción, fecha futura, categoría, recinto fijo, mapa de zonas, precios positivos y dos banners válidos. Se comprueba el solapamiento local y el evento creado no se edita. |
| 11 | Listado de eventos del organizador autenticado y estado vacío. |
| 12–13 | Corazón y vista de favoritos por cuenta local. |
| 21 | Copiar enlace de evento desde catálogo y detalle, con retorno a la página tras iniciar sesión. |
| 14 | Plano interactivo al comprar, zonas, disponibilidad, máximo seis entradas sumadas, resumen, mensaje de aforo insuficiente y pago simulado con tarjeta (13–19 dígitos, CVV 3–4, vencimiento posterior al mes actual). |
| 15 | Una entrada, código y QR distintos por boleto comprado, con datos de zona, fecha y precio. |
| 16 | Ruta pública de validación por código y descarga local de PDF por entrada. |

El precio de cada zona permanece fijo durante Demo 3. La compra no agrega el 6 % de servicio y el total equivale a la suma de las entradas seleccionadas, tanto en el resumen como en la confirmación y el ticket. El pricing dinámico queda reservado para una épica posterior.

## Validación de banners

El banner principal y el secundario son obligatorios y diferentes. Para ambos se comprueban extensión `.jpg`/`.jpeg`, tipo MIME JPEG, firma real del archivo, máximo **2 MB (2 000 000 bytes)**, ancho mínimo 1920 px, alto mínimo 480 px y proporción exacta 4:1. Se compara la huella del contenido para rechazar la misma foto aunque se cambie el nombre. La portada encabeza el detalle; la foto secundaria aparece al final, después del plano referencial y las zonas.

## Límites de la maqueta

La persistencia usa `localStorage`. La validación QR entre dispositivos, autorización real, inventario concurrente, unicidad global, transacción de compra y cobros requieren backend. HU-17 a HU-19 (riesgo y cola), HU-20 (reporte), HU-22 (habilitar compras), HU-23 a HU-25 (aprobación y reenvío) y HU-26 (correo) pertenecen al alcance de Demo 4 según el backlog específico. Los planos y aforos de los 15 recintos son referenciales para esta maqueta.

Verificación técnica (29 de octubre de 2026): `npm.cmd test -- --watch=false` satisfactorio (142 pruebas, 16 archivos), `npm.cmd run build` satisfactorio y `git diff --check` sin errores.

## Corrección del flujo del 30 de octubre de 2026

- El registro entra directamente al catálogo del asistente o al listado del organizador. Se retiró el componente antiguo «¡Sesión iniciada!»; su URL anterior redirige al destino del rol. Un usuario autenticado que intenta abrir login, otra sección de rol o el catálogo público vuelve a su panel. El logo y la navegación móvil respetan ese destino. Los accesos con credenciales de prueba solo se muestran cuando la autenticación mock está activa.
- La compra mock ya no hace una cotización adicional antes de comparar el total. Ante un 409 conserva las cantidades disponibles; cuando el motivo es cambio de precio, muestra una nueva cotización antes de permitir reintentar. No se elimina `expectedTotal`, porque protege al asistente de pagar un importe distinto del mostrado.
- La producción de esta rama todavía tiene `useMock: true`. El texto «El precio cambió. Solicita una nueva cotización antes de confirmar» proviene también de `TicketService` en modo mock; el código HTTP 409 por sí solo no identifica si lo emitió el navegador o el servidor en otro despliegue.
- **Contrato pendiente para una integración real:** el frontend de Demo 3 envía `POST /api/orders` con varias zonas, `expectedTotal` e `idempotencyKey`, y consulta `GET /api/orders/me`. El `backend-php` principal publicado el 30 de octubre ofrece `POST /api/events/{id}/tickets` con una sola zona y no expone esos endpoints de órdenes. Para cumplir HU-14 a HU-16 entre dispositivos, backend y frontend deben acordar un contrato de compra atómica de varias zonas, tickets individuales y consulta pública por código. No se debe omitir la validación de precio para ocultar un 409 persistente.

Verificación de esta corrección: `npm.cmd test -- --watch=false` (145 pruebas, 16 archivos) y `npm.cmd run build`, ambos satisfactorios.
