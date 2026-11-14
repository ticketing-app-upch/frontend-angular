export const environment = {
  production: true,
  /** Backend publicado. API_BACKEND_URL (.env o env var) lo sobrescribe en cada build. */
  apiBackendUrl: 'https://alpateck-backend.onrender.com/api',
  /** Mismo backend; API_PRICING_URL lo sobrescribe. */
  apiPricingUrl: 'https://alpateck-backend.onrender.com/api',
  /**
   * Producción habla con el backend real por defecto: un build sin `.env` ni
   * variables de entorno (Vercel, Docker, Netlify) no debe caer en la semilla
   * local y dejar la app muda. Solo `USE_MOCK=true` explícito reactiva la maqueta.
   */
  useMock: false,
  /** Login contra el backend por defecto; `USE_MOCK_AUTH=true` solo para demos sin back. */
  useMockAuth: false,
  mockLatencyMs: 200,
  sessionDurationMinutes: 15,
  enabledEpics: [1, 2, 3, 4, 5],
  dynamicPricing: false,
  queuePassMinutes: 3,
  ticketSecret: 'aforo-clave-local-de-firma-2026-no-usar-en-produccion',
  publicBaseUrl: '',
};
