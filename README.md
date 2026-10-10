# Demo 2 integrada · AlpaTeck

Este repositorio contiene **solo Angular**. Laravel permanece en el repositorio independiente [`backend-php`](https://github.com/ticketing-app-upch/backend-php). Docker Compose construye ambos proyectos desde carpetas locales separadas; no se copia el código del backend a Git.

## Preparación

Clona ambos repositorios al mismo nivel y selecciona las ramas de la demo:

```powershell
git clone -b integracion-back-front https://github.com/ticketing-app-upch/frontend-angular.git
git clone -b main https://github.com/ticketing-app-upch/backend-php.git
cd frontend-angular
docker compose up -d --build
```

Abre [http://localhost:8081](http://localhost:8081). La API está en [http://localhost:8080/api](http://localhost:8080/api) y MySQL usa el puerto `3307`. El primer arranque genera las claves locales de Laravel, ejecuta migraciones y siembra roles automáticamente. Las claves se guardan en un volumen de Docker para sobrevivir a recreaciones del contenedor; no se versionan.

Si el backend está en otra carpeta, crea un archivo `.env` **local** en esta carpeta con `BACKEND_DIR=C:/ruta/al/backend-php`. Ese archivo está ignorado por Git. También puedes configurar `FRONTEND_PORT`, `API_PORT` y `MYSQL_PORT` allí si los puertos predeterminados están ocupados.

```powershell
docker compose ps
docker compose logs -f app
docker compose down
```

`down` conserva los datos de MySQL. El frontend usa `/api` a través del proxy Nginx. Registro e inicio de sesión usan Laravel/JWT con sesión de 8 horas; el catálogo y favoritos de esta demo siguen con datos de muestra locales. La versión independiente del frontend está fusionada en `main` y puede iniciarse por separado con autenticación simulada.

## Guion de verificación

1. Abre `/auth/register`, acepta los términos y registra un cliente con DNI de ocho dígitos o un organizador con RUC de once dígitos.
2. En DevTools, comprueba que `POST /api/auth/register` devuelve `201` y un token JWT.
3. Cierra sesión e inicia sesión con la cuenta creada (`POST /api/auth/login`).
4. Muestra la navegación por rol, el catálogo y favoritos. Aclara que estas últimas pantallas todavía usan datos locales.
