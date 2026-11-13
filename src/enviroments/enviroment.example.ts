export const environment = {
  production: false,
  apiBackendUrl: 'http://localhost:8080/api',
  apiPricingUrl: 'http://localhost:8000/api',
  useMock: true,
  useMockAuth: true,
  mockLatencyMs: 450,
  sessionDurationMinutes: 15,
  /** Épicas habilitadas en este build — ver `core/demo-scope.ts`. */
  enabledEpics: [1, 2, 3, 4, 5],
  /** Precio dinámico: fuera del cronograma de épicas, apagado hasta que exista el servicio. */
  dynamicPricing: false,
  /** Cola virtual: minutos que dura el turno para completar la compra. */
  queuePassMinutes: 3,
  /** Reservada para el prototipo previo de QR. */
  ticketSecret: 'cambia-esta-clave-en-tu-entorno-local',
  /** Base absoluta para el QR; vacío = origen actual. IP LAN o túnel para escanear con el móvil. */
  publicBaseUrl: '',
};
