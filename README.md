# Integración frontend + backend · AlpaTeck

Rama de integración de Demo 2 organizada en carpetas independientes: `frontend/` contiene Angular y `backend/` contiene Laravel (PHP). El backend se incluye como código del repositorio, no como submódulo.

## Alcance de esta demo

- Registro, inicio y cierre de sesión conectados al API Laravel/JWT.
- Control de roles y expiración de sesión configurada a 60 minutos.
- Catálogo y favoritos con datos mock locales.
- Los endpoints de eventos, compra y reportes se habilitarán en sus respectivas épicas.

## Configurar el backend

El ejemplo de variables de entorno está en `backend/.env.example`. Crea la configuración local antes de levantar Compose:

```powershell
Copy-Item backend/.env.example backend/.env
```

En `backend/.env`, completa `INITIAL_ADMIN_NAME`, `INITIAL_ADMIN_EMAIL` e `INITIAL_ADMIN_PASSWORD`. Deja `APP_KEY` y `JWT_SECRET` vacíos; los comandos de abajo los generan. El archivo `.env` es local y no debe subirse a GitHub. Este repositorio público no publica la contraseña de administrador.

> Si tienes corriendo el stack de la carpeta `Full stack`, detenlo con `docker compose down` desde esa carpeta antes de usar esta configuración: ambas usan los puertos 8080, 8081 y 3307. Este comando conserva los datos de MySQL.

## Ejecutar

Desde la raíz del repositorio:

```bash
docker compose up -d --build
docker compose exec app php artisan key:generate
docker compose exec app php artisan jwt:secret
docker compose exec app php artisan migrate --seed
```

Abre <http://localhost:8081>. La API está disponible en <http://localhost:8080/api>; el frontend envía sus llamadas por `/api` a Laravel mediante Nginx. MySQL escucha en el puerto 3307 del equipo.

La cuenta ADMIN se crea desde los valores `INITIAL_ADMIN_*` de `backend/.env` al ejecutar `migrate --seed`. No reutilices credenciales publicadas para una instalación compartida.
