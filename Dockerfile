# ---------- Etapa 1: build de Angular ----------
FROM node:22-alpine AS build

WORKDIR /app

# Instala dependencias con cache eficiente
COPY package*.json ./
RUN npm ci

# Copia el código y genera el build de producción
COPY . .
RUN npm run build

# ---------- Etapa 2: servir con nginx ----------
FROM nginx:alpine AS runtime

# Config para SPA (fallback a index.html en rutas de Angular)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# El builder de Angular 21 deja los estáticos en dist/tkt/browser
COPY --from=build /app/dist/tkt/browser /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost/ >/dev/null 2>&1 || exit 1

CMD ["nginx", "-g", "daemon off;"]
