# Revisión frontend de Demo 3

Fuente de alcance: [Backlog Demo 3](https://docs.google.com/spreadsheets/d/1OVCKw5iUykEIbMcC_lXoJPvdsiNQK0slApaCRojbNAk/edit). La rama cubre las épicas 2 y 3 sobre la base de autenticación y administración de Demo 2. Los datos y pagos son simulados en este navegador.

| HU | Cobertura de frontend |
| --- | --- |
| 09 | Catálogo de eventos publicados y futuros, filtros de categoría, fecha y recinto, disponibilidad, precio, favorito y compartir. |
| 10 | Organizador crea eventos con título, descripción, fecha futura, categoría, recinto fijo, zonas, precios positivos y dos banners válidos. Se comprueba el solapamiento local y el evento publicado no se edita. |
| 11 | Listado de eventos del organizador autenticado y estado vacío. |
| 12–13 | Corazón y vista de favoritos por cuenta local. |
| 21 | Copiar enlace de evento desde catálogo y detalle, con retorno a la página tras iniciar sesión. |
| 14 | Plano interactivo al comprar, zonas, disponibilidad, máximo seis entradas, resumen y pago simulado con tarjeta. |
| 15 | Una entrada, código y QR distintos por boleto comprado, con datos de zona, fecha y precio. |
| 16 | Ruta pública de validación por código y descarga local de PDF por entrada. |

## Validación de banners

El banner principal y el secundario son obligatorios y diferentes. Para ambos se comprueban extensión `.jpg`/`.jpeg`, tipo MIME JPEG, firma real del archivo, máximo 2 MiB, ancho mínimo 1920 px, alto mínimo 480 px y proporción exacta 4:1. Se compara la huella del contenido para rechazar la misma foto aunque se cambie el nombre. La portada encabeza el detalle; la foto secundaria aparece al final, después del plano referencial y las zonas.

## Límites de la maqueta

La persistencia usa `localStorage`. La validación QR entre dispositivos, autorización real, inventario concurrente y cobros requieren backend. La cola, antiscalping, aprobación administrativa y reporte de ventas completo pertenecen al alcance de Demo 4. Los planos y aforos de los 15 recintos son referenciales para esta maqueta.

Verificación técnica: compilación Angular y `npm.cmd test -- --watch=false` satisfactorios (136 pruebas, 16 archivos).
