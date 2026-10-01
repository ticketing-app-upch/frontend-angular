export const environment = {
  production: false,
  /** API de autenticación y eventos para integrar el backend. */
  apiBackendUrl: 'http://localhost:8080/api',
  /** Servicio de precios, previsto para una demo posterior. */
  apiPricingUrl: 'http://localhost:8000/api',
  /** Mock local activo hasta conectar y validar el backend de esta demo. */
  useMock: true,
  /** Auth de Épica 1 usa el backend local; el resto de Demo 2 sigue en mock. */
  useMockAuth: false,
  /** Latencia local (ms) para que la UI se sienta realista. */
  mockLatencyMs: 450,
  /** Épica 1 de autenticación; el catálogo de Demo 2 usa datos mock. */
  enabledEpics: [1],
  /** Clave local de QR para funciones fuera del alcance de Demo 2. */
  ticketSecret: 'aforo-clave-local-de-firma-2026-no-usar-en-produccion',
  /** Origen público para QR; vacío usa el origen actual de la aplicación. */
  publicBaseUrl: '',
};
