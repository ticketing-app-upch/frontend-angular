export const environment = {
  production: true,
  apiBackendUrl: '/api',
  apiPricingUrl: '/pricing/api',
  /**
   * El backend todavía no existe: el build desplegado corre con datos en
   * memoria (semilla en `core/mock`), igual que en desarrollo. Cuando el
   * backend esté listo, poner `useMock: false` y los servicios pegarán a
   * `apiBackendUrl` / `apiPricingUrl`.
   */
  useMock: true,
  mockLatencyMs: 200,
  /**
   * DEMO: clave HMAC con la que la puerta `/validar` firma y verifica los QR
   * en el propio navegador. En un sistema real esto vive en el backend del
   * escáner y nunca llega al cliente.
   */
  ticketSecret: 'aforo-demo-clave-de-firma-2026-no-usar-en-produccion',
  /**
   * Base absoluta que se incrusta en el QR. Vacío = usa el origen público
   * desde el que se sirvió la app (la URL de Pages/Netlify), que es lo que
   * queremos: un enlace fijo que funciona para cualquiera.
   */
  publicBaseUrl: '',
};
