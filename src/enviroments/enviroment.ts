export const environment = {
  production: false,
  /** API de autenticación y eventos para integrar el backend. */
  apiBackendUrl: 'https://alpateck-backend.onrender.com/api',
  /** Servicio de precios, previsto para una demo posterior. */
  apiPricingUrl: 'https://alpateck-backend.onrender.com/api',
  /** Mock local activo hasta conectar y validar el backend de esta demo. */
  useMock: false,
  /** Autenticación mock para la revisión frontend de Demo 3. */
  useMockAuth: false,
  /** Latencia local (ms) para que la UI se sienta realista. */
  mockLatencyMs: 450,
  /** HU-04: plazo breve y configurable para probar la caducidad de sesión. */
  sessionDurationMinutes: 15,
  /** Demo 3: autenticación y épicas 2 y 3. */
  enabledEpics: [1, 2, 3],
  /** Reservada para el prototipo previo de QR. */
  ticketSecret: 'aforo-clave-local-de-firma-2026-no-usar-en-produccion',
  /** Origen público para QR; vacío usa el origen actual de la aplicación. */
  publicBaseUrl: '',
};
