export const environment = {
  production: true,
  apiBackendUrl: 'https://alpateck-backend.onrender.com/api',
  apiPricingUrl: 'https://alpateck-backend.onrender.com/api',
  /**
   * El backend todavía no existe: el build desplegado corre con datos en
   * memoria (semilla en `core/mock`), igual que en desarrollo. Cuando el
   * backend esté listo, poner `useMock: false
   * `apiBackendUrl` / `apiPricingUrl`.
   */
  useMock: true,
  /** Producción conserva auth mock hasta configurar el proxy de Full stack. */
  useMockAuth: false,
  mockLatencyMs: 200,
  /** HU-04: ajustar junto con el vencimiento real que emita el backend. */
  sessionDurationMinutes: 15,
  /** Épicas habilitadas en este build — ver `core/demo-scope.ts`. */
  enabledEpics: [1, 2, 3],
  /**
   * Reservada para el prototipo previo de QR. La Demo 3 enlaza al código
   * estático de `/validar/:code`; su verificación real requiere backend.
   */
  ticketSecret: 'aforo-clave-local-de-firma-2026-no-usar-en-produccion',
  /**
   * Base absoluta que se incrusta en el QR. Vacío = origen actual de la app.
   * La consulta de compras entre dispositivos necesita integración backend.
   */
  publicBaseUrl: '',
};
