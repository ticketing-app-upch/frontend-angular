# Revisión de HU Demo4 (frontend)

Fuente funcional: pestaña **Demo4** del [backlog compartido](https://docs.google.com/spreadsheets/d/1KgIOY-oBjhQYZ95cQ1MF38y0gRYZh_M3-ZDld1CXTPQ/edit?gid=1554963193). Se tomó el último `demo3`, la rama `demo4-cola-virtual` y la rama `demo4` como bases de código. Las capturas y el README del Drive sirven de contexto; la pestaña Demo4 define los criterios funcionales aquí revisados.

## Hallazgos al revisar la cola virtual recibida

- El turno usaba `READY` y `BLOCKED` en lugar del ciclo `WAITING`, `ADMITTED`, `COMPLETED`, `EXPIRED`, `CANCELLED`, `CLOSED` (HU-27).
- El pase duraba 10 minutos y se simulaba con una posición aleatoria independiente por usuario; las HU exigen 3 minutos, orden de ingreso consistente y admisión posterior a habilitar compras.
- El riesgo se evaluaba al entrar a la cola. HU-14/HU-17 lo sitúan al pulsar **Pagar**. La compra también exigía pase incluso en eventos sin cola.
- Angular hablaba directamente con Python para la cola. La HU-18 define Angular → PHP → Python. La integración real queda condicionada a los endpoints PHP/Python.

## Estado por historia

| HU | Frontend y modo de demostración | Pendiente de servicios reales |
| --- | --- | --- |
| 01 | Registro conserva `createdAt` en el usuario mock. | Persistir fecha en MySQL para usuarios nuevos y sembrados; bcrypt y unicidad son responsabilidad de PHP. |
| 07 | Menú admin con usuarios y eventos; listado con filtros y sin cuentas admin. | Autorización de `GET /api/v1/admin/usuarios`. |
| 09 | Catálogo y detalle exponen eventos publicados vigentes; los pendientes y rechazados no son públicos. | El catálogo PHP debe filtrar por aprobación. |
| 10 | Formulario de recintos y dos banners, confirmación de cola, validaciones y evento nuevo pendiente. | Inserción atómica, no solapamiento transaccional y bloqueo de cuenta inactiva en PHP. |
| 11 | Mis eventos muestra Pendiente, Publicado, Rechazado y Vencido; motivo y edición del rechazado; ventas solo en publicados. | Contrato de listado y estado desde PHP. |
| 14 | Checkout de zonas, tarjeta, pase y temporizador; mock calcula score al pagar y valida aforo y límite. | PHP debe registrar apertura, invocar Python, verificar el pase firmado, bloquear stock, pagar e insertar tickets de forma atómica. |
| 17 | El mock aplica `R = 0.4 Sv + 0.3 Sa + 0.3 Sn` como aproximación académica. | Endpoint Python con JWT de servicio, lectura MySQL, normalizaciones acordadas y 503 ante dependencia caída. |
| 18 | Espera visible con posición, aviso de venta no habilitada y consulta cada 5 segundos. | Turnos concurrentes y posición autoritativa gestionados por Python a través de PHP. |
| 19 | El mock admite hasta tres por tanda de 5 segundos y limita tres admitidos activos; guarda el pase recibido en `sessionStorage` en modo real. | Emisión JWT por Python, firma/verificación PHP, máximo activo acordado. |
| 20 | Reporte por evento publicado con entradas, aforo e ingresos estimados; allí se habilitan compras. | Métricas oficiales calculadas por backend. |
| 22 | Confirmación irreversible para habilitar compras de eventos publicados con cola; antes de ello la cola acepta espera sin pase. | `PATCH /api/v1/eventos/{id}/habilitar-compras` y control de permisos/códigos HTTP. |
| 23 | Lista de pendientes no vencidos con detalles, banners, mapa, zonas y precios; estado vacío. | `GET /api/v1/admin/eventos?estado=pendiente`. |
| 24 | Admin aprueba o rechaza con confirmación y motivo obligatorio; el catálogo se actualiza en mock. | `PATCH /api/v1/admin/eventos/{id}/estado` y validación de vencimiento/estado en PHP. |
| 25 | Formulario carga un rechazado, permite corregirlo y reenviarlo a pendiente; otros estados no se editan en mock. | `PUT /api/v1/eventos/{id}` con permisos y validaciones en PHP. |
| 26 | La vista de compra confirmada ya presenta orden y tickets. | Envío de correo después del commit, con manejo de fallos, íntegramente en backend. |
| 27 | Mock conserva los seis estados finales y transiciones de pago, cancelación y vencimiento. | Estado autoritativo de turno en Python y notificación de compra/cancelación desde PHP. |
| 28 | Checkout muestra cuenta regresiva de tres minutos y bloquea el pago al vencer. | PHP rechaza el pase vencido sin descontar stock. |
| 29 | “Cancelar compra” invalida el pase mock y vuelve al detalle; cerrar pestaña no cancela. | PHP/Python deben confirmar la cancelación y liberar cupo. |
| 30 | Ruta **Mercado** del organizador: filtros, KPI, top 5, dona, tendencia, mapa de calor y estado vacío con datos agregados mock. | `GET /api/v1/dashboard/mercado` debe entregar agregados completos y protegidos. |

## Límites de integración

`useMock: true` permanece activo en los entornos del repositorio. El mock usa almacenamiento del navegador para mostrar los flujos: no garantiza orden global concurrente, JWT firmado, pago, correo, transacciones SQL ni seguridad contra clientes que alteren JavaScript. Los endpoints de cola y apertura de pago empleados por el cliente requieren acordar el contrato exacto con PHP antes de activar `useMock: false`. No se ha verificado un despliegue conjunto con PHP y Python.

La HU-30 necesita marcas reales de agotamiento y estados de cola para calcular tiempo medio y conversión; con la semilla actual esos indicadores muestran cero o “Sin datos” cuando no existe historial suficiente. La pregunta de abandonar estando en `WAITING` sigue abierta en el backlog; el botón de cancelación está limitado al formulario de un turno `ADMITTED`.
