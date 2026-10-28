# Demo 3 · AlpaTeck (solo frontend)

Esta rama presenta las épicas 2 y 3 con datos de prueba locales. Parte de la base de autenticación y administración de Demo 2. El alcance está contrastado con el backlog específico de Demo 3.

[Revisión de cobertura HU y límites del frontend](REVISION_HU_DEMO3.md).

## Fuentes de alcance

- [Backlog específico de Demo 3](https://docs.google.com/spreadsheets/d/1OVCKw5iUykEIbMcC_lXoJPvdsiNQK0slApaCRojbNAk/edit): HU-09 a HU-16 y HU-21.
- [Documento del proyecto](https://docs.google.com/document/d/1aYndYjXIGhOfS65gEhUG8tgTSAvvXf6YjlAaRVTzvl4/edit): Demo 2 corresponde a la épica 1; Demo 3, a las épicas 2 y 3.
- [Recintos compartidos del grupo](https://drive.google.com/drive/folders/1aXdDs-vaDtalNcmsiOck67E8RABK8fCK): los originales de Monumental, Nacional y San Marcos se conservan junto con los nuevos planos en `public/recintos/`.

## Funciones listas para revisar

| HU | Pantalla o comportamiento |
| --- | --- |
| 07–08 | `/admin/usuarios`: asistentes y organizadores, filtros de rol/estado, confirmación antes de desactivar, reactivación inmediata y bloqueo de login de cuentas inactivas. El administrador no puede desactivar a otro administrador. |
| 09 | `/eventos`: catálogo de eventos publicados y futuros, filtros por categoría, fecha y recinto. |
| 10–11 | `/organizador/eventos` y `/organizador/eventos/nuevo`: eventos propios, creación con uno de 15 recintos predefinidos, aforos fijos, mapa y precios positivos por zona. |
| 12–13 | Corazones y `/attendee/favorites`: favoritos persistidos por cuenta en este navegador. |
| 21 | Copiar enlace desde catálogo o detalle; la ruta compartida conserva el destino tras iniciar sesión. |
| 14 | `/comprar/:id`: zonas seleccionables directamente sobre el plano, límite de seis entradas, resumen, disponibilidad y pasarela **simulada** con datos ficticios. |
| 15–16 | `/mis-entradas` y `/validar/:code`: una tarjeta, código y QR estático por cada entrada; vista pública y PDF local. |

Los recintos nuevos se pueden elegir al crear un evento y ya tienen eventos de ejemplo para probar la compra: `ev-16` (Estadio Nacional), `ev-7` (Estadio San Marcos) y `ev-2` (Estadio Monumental). Los aforos y zonas son **valores de maqueta**, no capacidades oficiales certificadas.

## Banners del organizador

Los dos archivos son obligatorios y deben ser distintos. El navegador valida para ambos: extensión `.jpg` o `.jpeg`, tipo y contenido JPEG, tamaño máximo de 2 MiB, dimensiones mínimas 1920 × 480 px y proporción exacta 4:1. El formulario muestra el motivo del rechazo y no permite publicar sin las dos imágenes válidas. La portada aparece arriba del detalle; la imagen secundaria cierra la ficha después del plano y los precios.

## Ejecutar junto con el MVP

En `C:\Users\jessz\OneDrive\Escritorio\Ticketing-frontend`, con las dependencias ya instaladas, levanta el MVP:

```powershell
npm.cmd run start -- --port 4200
```

En otra terminal, desde esta carpeta `Plataforma de Ticketing\Demo 3`, levanta Demo 3:

```powershell
npm.cmd run start -- --port 4201
```

Abre [MVP](http://localhost:4200) y [Demo 3](http://localhost:4201). En el login hay botones para completar las credenciales de prueba de cliente, organizador y administrador.

## Límites de esta maqueta

- Los usuarios, eventos y tickets de Demo 3 se guardan en `localStorage` de `localhost:4201`. La compra no cobra dinero ni envía números de tarjeta a un servicio.
- Para probar HU-04, el vencimiento local se configura en minutos mediante `sessionDurationMinutes` en los archivos de `src/enviroments/` (15 minutos en esta maqueta).
- El QR enlaza a `/validar/:code`; la consulta de compras creadas localmente funciona en el navegador que las registró. Para validar el mismo ticket en otro dispositivo se necesita el backend.
- El reporte de ventas completo de HU-20, la cola virtual, antiscalping y la aprobación administrativa pertenecen a Demo 4.
- Seguridad de sesión, inventario concurrente, cola y riesgo de fraude deben ser verificados por backend cuando se integre. Las comprobaciones de esta carpeta son solo de interfaz.

Cambiar los datos semilla en `src/app/core/mock/mock-data.ts` restablece automáticamente la base local de prueba al recargar, para evitar mezclar eventos nuevos con una semilla anterior.
