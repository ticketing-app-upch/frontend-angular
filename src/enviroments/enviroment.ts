export const environment = {
  production: false,
  /** API de autenticación y eventos para integrar el backend. */
  apiBackendUrl: 'http://localhost:8080/api',
  /** Servicio de precios, previsto para una demo posterior. */
  apiPricingUrl: 'http://localhost:8000/api',
  /** Mock local activo hasta conectar y validar el backend de esta demo. */
  useMock: true,
  /** Autenticación mock para la revisión frontend de Demo 3. */
  useMockAuth: true,
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
