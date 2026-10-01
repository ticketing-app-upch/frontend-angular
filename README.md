# Integración frontend + backend · AlpaTeck

Rama de integración de Demo 2 en el repositorio `frontend-angular`. El backend se incluye como submódulo desde `backend-php` (`feat/demo2`); no se duplica su código.

## Alcance de esta demo

- Registro, inicio y cierre de sesión conectados al API Laravel/JWT.
- Control de roles y expiración de sesión configurada a 60 minutos.
- Catálogo y favoritos con datos mock locales.
- Los endpoints de eventos, compra y reportes se habilitarán en sus respectivas épicas.

## Obtener el proyecto

Clona esta rama incluyendo el backend:

```bash
git clone --branch integracion-back-front --recurse-submodules https://github.com/ticketing-app-upch/frontend-angular.git
cd frontend-angular
```

Si ya clonaste la rama sin submódulos:

```bash
git submodule update --init --recursive
```

## Configurar el backend

El único ejemplo de entorno está dentro del submódulo: `backend/.env.example`. Crea la configuración local antes de levantar Compose:

```powershell
Copy-Item backend/.env.example backend/.env
```

En `backend/.env`, completa los tres valores `INITIAL_ADMIN_NAME`, `INITIAL_ADMIN_EMAIL` e `INITIAL_ADMIN_PASSWORD`. Deja `APP_KEY` y `JWT_SECRET` vacíos: los comandos de abajo los generan dentro del volumen local del backend. Ninguno de estos valores se sube a GitHub. El README público no incluye una contraseña de administrador.

> Si tienes corriendo el stack de la carpeta `Full stack`, detenlo con `docker compose down` desde esa carpeta antes de usar esta configuración: ambas usan los puertos 8080, 8081 y 3307. Este comando conserva los datos de MySQL.

## Ejecutar

```bash
docker compose up -d --build
docker compose exec app php artisan key:generate
docker compose exec app php artisan jwt:secret
docker compose exec app php artisan migrate --seed
```

Abre <http://localhost:8081>. La API está disponible en <http://localhost:8080/api>; el frontend envía sus llamadas por `/api` a Laravel mediante Nginx. MySQL escucha en el puerto 3307 del equipo.

La cuenta ADMIN se crea desde los valores `INITIAL_ADMIN_*` de `backend/.env` al ejecutar `migrate --seed`. No reutilices credenciales publicadas para una instalación compartida.