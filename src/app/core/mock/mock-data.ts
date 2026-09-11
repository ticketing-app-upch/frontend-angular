import { EventItem } from '../models/event.model';
import { TicketOrder } from '../models/ticket.model';
import { User } from '../models/user.model';
import { eventImage } from '../../shared/event-image';

/**
 * Semilla de datos de prueba. NO es data real: sirve para desarrollar y
 * testear el frontend mientras el backend está en construcción.
 */

export interface SeedUser extends User {
  password: string;
}

export const SEED_USERS: SeedUser[] = [
  {
    id: 'u-org-1',
    fullName: 'José Manuel Ames',
    email: 'organizador@tkt.pe',
    password: 'organizador',
    role: 'ORGANIZER',
  },
  {
    id: 'u-cli-1',
    fullName: 'Jesús Morales',
    email: 'cliente@tkt.pe',
    password: 'cliente',
    role: 'CLIENT',
  },
  {
    // Cuenta de administrador: se crea aquí, nunca desde el registro público.
    id: 'u-adm-1',
    fullName: 'Admin Aforo',
    email: 'admin@tkt.pe',
    password: 'admin',
    role: 'ADMIN',
  },
];

function daysFromNow(days: number, hour = 20): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

const RAW_EVENTS: (Omit<EventItem, 'imageUrl'> & { imageUrl?: string })[] = [
  {
    id: 'ev-1',
    name: 'Sinfonía bajo las estrellas',
    description:
      'La Orquesta Sinfónica Nacional interpreta a Beethoven y Dvořák en un concierto al aire libre. Una noche de cuerdas, vientos y percusión bajo el cielo de Lima.',
    category: 'CONCIERTO',
    status: 'PUBLICADO',
    venue: 'Parque de la Exposición',
    city: 'Lima',
    startsAt: daysFromNow(12),
    organizerId: 'u-org-1',
    maxPerOrder: 6,
    zones: [
      { id: 'z-1a', name: 'Platea', price: 180, capacity: 300, sold: 214 },
      { id: 'z-1b', name: 'Palco', price: 260, capacity: 120, sold: 96 },
      { id: 'z-1c', name: 'Campo', price: 90, capacity: 800, sold: 421 },
    ],
  },
  {
    id: 'ev-2',
    name: 'Sporting Cristal vs Universitario — Fútbol',
    description:
      'El derbi más esperado de la temporada. Dos hinchadas, un estadio lleno y noventa minutos de tensión. Incluye acceso a la fan zone dos horas antes del pitazo inicial.',
    category: 'DEPORTE',
    status: 'PUBLICADO',
    venue: 'Estadio Monumental',
    city: 'Lima',
    startsAt: daysFromNow(5, 15),
    organizerId: 'u-org-1',
    maxPerOrder: 4,
    zones: [
      { id: 'z-2wa', name: 'Occidente Lateral A', price: 190, capacity: 900, sold: 780 },
      { id: 'z-2wb', name: 'Occidente Central B', price: 250, capacity: 800, sold: 720 },
      { id: 'z-2wc', name: 'Occidente Central C', price: 260, capacity: 800, sold: 700 },
      { id: 'z-2bn', name: 'Butaca Negra', price: 560, capacity: 150, sold: 128 },
      { id: 'z-2wd', name: 'Occidente Central D', price: 260, capacity: 800, sold: 690 },
      { id: 'z-2we', name: 'Occidente Central E', price: 250, capacity: 800, sold: 640 },
      { id: 'z-2wf', name: 'Occidente Lateral F', price: 190, capacity: 900, sold: 810 },
      { id: 'z-2b', name: 'Oriente', price: 150, capacity: 5000, sold: 4510 },
      { id: 'z-2c', name: 'Norte', price: 70, capacity: 8000, sold: 7990 },
      { id: 'z-2d', name: 'Tribuna Familiar Sur', price: 120, capacity: 8000, sold: 6100 },
    ],
  },
  {
    id: 'ev-3',
    name: 'DevconLima 2026',
    description:
      'La conferencia de desarrollo de software más grande del país: tres tracks simultáneos, talleres prácticos y un after de networking. Charlas sobre arquitectura, IA aplicada y plataformas cloud.',
    category: 'CONFERENCIA',
    status: 'PUBLICADO',
    venue: 'Centro de Convenciones de Lima',
    city: 'Lima',
    startsAt: daysFromNow(30, 9),
    organizerId: 'u-org-1',
    maxPerOrder: 3,
    zones: [
      { id: 'z-3a', name: 'General', price: 220, capacity: 900, sold: 640 },
      { id: 'z-3b', name: 'Pro (incluye talleres)', price: 420, capacity: 200, sold: 155 },
    ],
  },
  {
    id: 'ev-4',
    name: 'Hamlet — Temporada 2026',
    description:
      'Una puesta en escena contemporánea del clásico de Shakespeare, dirigida por Alonso Alegría. Función única con elenco invitado.',
    category: 'TEATRO',
    status: 'PUBLICADO',
    venue: 'Teatro Municipal',
    city: 'Lima',
    startsAt: daysFromNow(18, 19),
    organizerId: 'u-org-1',
    maxPerOrder: 6,
    zones: [
      { id: 'z-4a', name: 'Platea baja', price: 130, capacity: 240, sold: 88 },
      { id: 'z-4b', name: 'Platea alta', price: 90, capacity: 180, sold: 40 },
      { id: 'z-4c', name: 'Galería', price: 55, capacity: 160, sold: 12 },
    ],
  },
  {
    id: 'ev-5',
    name: 'Festival Andahuaylas 2026',
    description:
      'Dos escenarios, dieciocho artistas y doce horas de música que cruza cumbia amazónica, electrónica y rock en español. Zona gastronómica con food trucks.',
    category: 'FESTIVAL',
    status: 'PUBLICADO',
    venue: 'Explanada Costa Verde',
    city: 'Lima',
    startsAt: daysFromNow(45, 14),
    organizerId: 'u-org-1',
    maxPerOrder: 8,
    zones: [
      { id: 'z-5a', name: 'General', price: 160, capacity: 6000, sold: 2380 },
      { id: 'z-5b', name: 'VIP', price: 380, capacity: 800, sold: 410 },
      { id: 'z-5c', name: 'Palco Premium', price: 720, capacity: 120, sold: 45 },
    ],
  },
  {
    id: 'ev-6',
    name: 'Noche de Jazz — Trío Callao',
    description:
      'Formato íntimo, aforo reducido. El Trío Callao presenta su nuevo material con arreglos de standards y composiciones propias.',
    category: 'CONCIERTO',
    status: 'BORRADOR',
    venue: 'Jazz Zone, Miraflores',
    city: 'Lima',
    startsAt: daysFromNow(9, 21),
    organizerId: 'u-org-1',
    maxPerOrder: 4,
    zones: [
      { id: 'z-6a', name: 'Mesa', price: 140, capacity: 60, sold: 0 },
      { id: 'z-6b', name: 'Barra', price: 95, capacity: 40, sold: 0 },
    ],
  },
  {
    id: 'ev-7',
    name: 'Rock en el Parque — Edición Lima',
    description:
      'Seis bandas nacionales e internacionales en un solo escenario. Rock en español, garage y algo de post-punk para cerrar la noche. Puertas abiertas desde las 5 p. m.',
    category: 'CONCIERTO',
    status: 'PUBLICADO',
    venue: 'Estadio San Marcos',
    city: 'Lima',
    startsAt: daysFromNow(22, 19),
    organizerId: 'u-org-1',
    maxPerOrder: 6,
    zones: [
      { id: 'z-7a', name: 'Cancha', price: 90, capacity: 12000, sold: 8400 },
      { id: 'z-7b', name: 'Tribuna', price: 140, capacity: 6000, sold: 3900 },
      { id: 'z-7c', name: 'VIP', price: 320, capacity: 900, sold: 610 },
    ],
  },
  {
    id: 'ev-8',
    name: 'Vóley: Perú vs Brasil',
    description:
      'Partido amistoso internacional de la selección peruana de vóley femenino rumbo al Sudamericano. Previa con la barra oficial y activaciones para toda la familia.',
    category: 'DEPORTE',
    status: 'AGOTADO',
    venue: 'Coliseo Eduardo Dibós',
    city: 'Lima',
    startsAt: daysFromNow(8, 20),
    organizerId: 'u-org-1',
    maxPerOrder: 4,
    zones: [
      { id: 'z-8a', name: 'Occidente', price: 150, capacity: 1800, sold: 1800 },
      { id: 'z-8b', name: 'Oriente', price: 120, capacity: 1800, sold: 1800 },
      { id: 'z-8c', name: 'Populares', price: 55, capacity: 2400, sold: 2400 },
    ],
  },
  {
    id: 'ev-9',
    name: 'Cumbre de Marketing Digital 2026',
    description:
      'Un día completo de charlas sobre performance, marca, IA generativa aplicada a contenido y medición. Speakers de LATAM y casos reales de e-commerce peruano.',
    category: 'CONFERENCIA',
    status: 'PUBLICADO',
    venue: 'The Westin Lima',
    city: 'Lima',
    startsAt: daysFromNow(37, 9),
    organizerId: 'u-org-1',
    maxPerOrder: 5,
    zones: [
      { id: 'z-9a', name: 'General', price: 260, capacity: 700, sold: 320 },
      { id: 'z-9b', name: 'Premium (networking)', price: 520, capacity: 180, sold: 90 },
    ],
  },
  {
    id: 'ev-10',
    name: 'La Casa de Bernarda Alba',
    description:
      'El drama de García Lorca en una versión sobria y contundente, con dirección de Chela De Ferrari. Temporada corta, aforo reducido.',
    category: 'TEATRO',
    status: 'PUBLICADO',
    venue: 'Teatro La Plaza',
    city: 'Lima',
    startsAt: daysFromNow(15, 20),
    organizerId: 'u-org-1',
    maxPerOrder: 6,
    zones: [
      { id: 'z-10a', name: 'Platea', price: 110, capacity: 200, sold: 130 },
      { id: 'z-10b', name: 'Mezzanine', price: 80, capacity: 120, sold: 45 },
    ],
  },
  {
    id: 'ev-11',
    name: 'Sabores del Perú — Feria Gastronómica',
    description:
      'Más de cien puestos de cocina regional, rueda de negocios para productores y un escenario con música criolla y fusión. Ingreso por horarios para evitar aglomeraciones.',
    category: 'FESTIVAL',
    status: 'PUBLICADO',
    venue: 'Explanada Costa Verde',
    city: 'Lima',
    startsAt: daysFromNow(52, 12),
    organizerId: 'u-org-1',
    maxPerOrder: 10,
    zones: [
      { id: 'z-11a', name: 'Entrada general', price: 45, capacity: 8000, sold: 2600 },
      { id: 'z-11b', name: 'Pase degustación', price: 130, capacity: 1500, sold: 720 },
    ],
  },
  {
    id: 'ev-12',
    name: 'Eva Ayllón Sinfónico',
    description:
      'La voz de la música criolla acompañada por orquesta sinfónica completa. Un repaso a cinco décadas de repertorio, con arreglos nuevos e invitados sorpresa.',
    category: 'CONCIERTO',
    status: 'PUBLICADO',
    venue: 'Gran Teatro Nacional',
    city: 'Lima',
    startsAt: daysFromNow(26, 20),
    organizerId: 'u-org-1',
    maxPerOrder: 6,
    zones: [
      { id: 'z-12a', name: 'Platea', price: 210, capacity: 900, sold: 640 },
      { id: 'z-12b', name: 'Balcón', price: 130, capacity: 500, sold: 300 },
      { id: 'z-12c', name: 'Galería', price: 80, capacity: 350, sold: 120 },
    ],
  },
  {
    id: 'ev-13',
    name: 'Maratón de Lima 42K',
    description:
      'Circuito por la Costa Verde con salida en Magdalena. Distancias de 10K, 21K y 42K, kit oficial, hidratación cada 2.5 km y medalla de finisher para todos.',
    category: 'DEPORTE',
    status: 'PUBLICADO',
    venue: 'Circuito Costa Verde',
    city: 'Lima',
    startsAt: daysFromNow(60, 6),
    organizerId: 'u-org-1',
    maxPerOrder: 4,
    zones: [
      { id: 'z-13a', name: 'Reto 10K', price: 120, capacity: 5000, sold: 3100 },
      { id: 'z-13b', name: 'Inscripción 21K', price: 180, capacity: 4000, sold: 2500 },
      { id: 'z-13c', name: 'Inscripción 42K', price: 240, capacity: 3000, sold: 1900 },
    ],
  },
  {
    id: 'ev-14',
    name: 'Noche Electrónica — Arena Perú',
    description:
      'Line-up de house y techno melódico con tres DJ internacionales y B2B de cierre al amanecer. Producción de luces y sonido a cargo del equipo de festivales europeos.',
    category: 'CONCIERTO',
    status: 'PUBLICADO',
    venue: 'Arena 1 — Costa Verde',
    city: 'Lima',
    startsAt: daysFromNow(19, 22),
    organizerId: 'u-org-1',
    maxPerOrder: 6,
    zones: [
      { id: 'z-14a', name: 'General', price: 170, capacity: 6000, sold: 5780 },
      { id: 'z-14b', name: 'VIP', price: 360, capacity: 1200, sold: 1180 },
    ],
  },
  {
    id: 'ev-15',
    name: 'Serenata Criolla — Aniversario de Lima',
    description:
      'Concierto por el aniversario de la ciudad con valses, polcas y festejo. Elenco de música criolla e invitados, al aire libre en el centro histórico.',
    category: 'CONCIERTO',
    status: 'PUBLICADO',
    venue: 'Plaza de Armas de Lima',
    city: 'Lima',
    startsAt: daysFromNow(40, 19),
    organizerId: 'u-org-1',
    maxPerOrder: 8,
    zones: [
      { id: 'z-15a', name: 'Platea', price: 120, capacity: 450, sold: 180 },
      { id: 'z-15b', name: 'General', price: 70, capacity: 700, sold: 210 },
    ],
  },
  {
    id: 'ev-16',
    name: 'Cienciano vs Melgar',
    description:
      'Evento de prueba para verificar que los escudos aparecen sin escribir "fútbol" en el nombre (ambos equipos tienen escudo registrado).',
    category: 'DEPORTE',
    status: 'PUBLICADO',
    venue: 'Estadio Nacional',
    city: 'Lima',
    startsAt: daysFromNow(9, 15),
    organizerId: 'u-org-1',
    maxPerOrder: 4,
    zones: [
      { id: 'z-16a', name: 'Occidente', price: 120, capacity: 8000, sold: 5200 },
      { id: 'z-16b', name: 'Oriente', price: 80, capacity: 12000, sold: 7400 },
      { id: 'z-16c', name: 'Norte', price: 45, capacity: 15000, sold: 9100 },
    ],
  },
];

/** Cada evento recibe un póster SVG temático generado a partir de su nombre. */
export const SEED_EVENTS: EventItem[] = RAW_EVENTS.map((e) => ({
  ...e,
  imageUrl: e.imageUrl ?? eventImage(e),
}));

export const SEED_ORDERS: TicketOrder[] = [
  {
    id: 'ord-seed-1',
    code: 'TKT-4F9A2C',
    eventId: 'ev-1',
    eventName: 'Sinfonía bajo las estrellas',
    eventStartsAt: SEED_EVENTS[0].startsAt,
    eventVenue: 'Parque de la Exposición',
    buyerId: 'u-cli-1',
    buyerName: 'Jesús Morales',
    createdAt: daysFromNow(-3, 11),
    status: 'CONFIRMADA',
    lines: [{ zoneId: 'z-1a', zoneName: 'Platea', unitPrice: 180, quantity: 2 }],
    subtotal: 360,
    fee: 21.6,
    total: 381.6,
  },
];
