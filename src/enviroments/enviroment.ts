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
};
