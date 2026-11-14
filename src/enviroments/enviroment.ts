export const environment = {
  production: false,
  apiBackendUrl: 'http://localhost:8080/api',
  apiPricingUrl: 'http://localhost:8000/api',
  useMock: true,
  useMockAuth: true,
  mockLatencyMs: 450,
  sessionDurationMinutes: 15,
  enabledEpics: [1, 2, 3, 4, 5],
  dynamicPricing: false,
  queuePassMinutes: 3,
  ticketSecret: 'aforo-clave-local-de-firma-2026-no-usar-en-produccion',
  publicBaseUrl: '',
};
