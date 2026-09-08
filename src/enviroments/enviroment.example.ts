export const environment = {
  production: false,
  apiBackendUrl: 'http://localhost:8080/api',
  apiPricingUrl: 'http://localhost:8000/api',
  useMock: true,
  mockLatencyMs: 450,
  /** Clave HMAC para firmar/verificar los QR en modo demo (sin backend). */
  ticketSecret: 'cambia-esta-clave-en-tu-entorno-local',
  /** Base absoluta para el QR; vacío = origen actual. IP LAN o túnel para escanear con el móvil. */
  publicBaseUrl: '',
};