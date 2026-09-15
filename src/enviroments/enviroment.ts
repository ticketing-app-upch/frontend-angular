export const environment = {
  production: false,
  /** Núcleo de negocio: auth, eventos, tickets, aforo. */
  apiBackendUrl: 'http://localhost:8080/api',
  /** Servicio de precios / tarifas dinámicas. */
  apiPricingUrl: 'http://localhost:8000/api',
  /**
   * Mientras el backend no esté disponible, los servicios responden con
   * datos falsos en memoria (semilla en `core/mock`). Ponlo en `false`
   * cuando quieras pegarle a las APIs reales.
   */
  useMock: true,
  /** Latencia local (ms) para que la UI se sienta realista. */
  mockLatencyMs: 450,
  /**
   * Épicas habilitadas en este build (ver `core/demo-scope.ts`). Esta es
   * feat/frontend-mvp: la rama de desarrollo sin restricciones, con las 5
   * épicas prendidas. Las ramas feat/demo-N-* recortan esta lista para
   * mostrar solo lo que corresponde a cada demo puntual.
   */
  enabledEpics: [1, 2, 3, 4, 5],
  /**
   * Clave HMAC con la que se firman los QR de las entradas y con la
   * que la puerta (`/validar`) verifica su autenticidad. En un sistema real
   * esta clave vive SOLO en el backend / la app del escáner, nunca en el
   * cliente; el backend debe reemplazarla por una clave privada.
   */
  ticketSecret: 'aforo-clave-local-de-firma-2026-no-usar-en-produccion',
  /**
   * Base absoluta que se incrusta en el QR de la entrada (la puerta abre
   * `<publicBaseUrl>/validar#<token>`). Déjalo vacío para usar el origen
   * desde el que se abrió la app.
   *
   * Ponlo cuando abres la app en `localhost` pero el QR lo escanea un
   * teléfono: usa la IP de tu PC en la red local o una URL de túnel, p. ej.
   *   'http://192.168.1.40:4200'   (mismo Wi-Fi)
   *   'https://aforo.tu-tunel.dev' (ngrok / cloudflared)
   */
  publicBaseUrl: '',
};
