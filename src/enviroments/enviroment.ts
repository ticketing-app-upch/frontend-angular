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
  /** Latencia simulada (ms) para que la UI se sienta realista con mocks. */
  mockLatencyMs: 450,
  /**
   * DEMO: clave HMAC con la que se firman los QR de las entradas y con la
   * que la puerta (`/validar`) verifica su autenticidad. En un sistema real
   * esta clave vive SOLO en el backend / la app del escáner, nunca en el
   * cliente; aquí la exponemos para poder demostrar el flujo sin servidor.
   */
  ticketSecret: 'aforo-demo-clave-de-firma-2026-no-usar-en-produccion',
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
