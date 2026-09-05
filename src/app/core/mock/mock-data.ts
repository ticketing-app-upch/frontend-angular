import { EventItem } from '../models/event.model';
import { TicketOrder } from '../models/ticket.model';
import { User } from '../models/user.model';

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
];

function daysFromNow(days: number, hour = 20): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

export const SEED_EVENTS: EventItem[] = [
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
    imageUrl: 'https://picsum.photos/seed/tkt-sinfonia/960/540',
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
    name: 'Clásico del Sur — Fútbol',
    description:
      'El derbi más esperado de la temporada. Dos hinchadas, un estadio lleno y noventa minutos de tensión. Incluye acceso a la fan zone dos horas antes del pitazo inicial.',
    category: 'DEPORTE',
    status: 'PUBLICADO',
    venue: 'Estadio Monumental',
    city: 'Lima',
    startsAt: daysFromNow(5, 15),
    imageUrl: 'https://picsum.photos/seed/tkt-futbol/960/540',
    organizerId: 'u-org-1',
    maxPerOrder: 4,
    zones: [
      { id: 'z-2a', name: 'Occidente', price: 150, capacity: 5000, sold: 4820 },
      { id: 'z-2b', name: 'Oriente', price: 120, capacity: 5000, sold: 4510 },
      { id: 'z-2c', name: 'Norte', price: 60, capacity: 8000, sold: 7990 },
      { id: 'z-2d', name: 'Sur', price: 60, capacity: 8000, sold: 6100 },
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
    imageUrl: 'https://picsum.photos/seed/tkt-devcon/960/540',
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
    imageUrl: 'https://picsum.photos/seed/tkt-hamlet/960/540',
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
    name: 'Festival Sonidos de la Tierra',
    description:
      'Dos escenarios, dieciocho artistas y doce horas de música que cruza cumbia amazónica, electrónica y rock en español. Zona gastronómica con food trucks.',
    category: 'FESTIVAL',
    status: 'PUBLICADO',
    venue: 'Explanada Costa Verde',
    city: 'Lima',
    startsAt: daysFromNow(45, 14),
    imageUrl: 'https://picsum.photos/seed/tkt-festival/960/540',
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
    imageUrl: 'https://picsum.photos/seed/tkt-jazz/960/540',
    organizerId: 'u-org-1',
    maxPerOrder: 4,
    zones: [
      { id: 'z-6a', name: 'Mesa', price: 140, capacity: 60, sold: 0 },
      { id: 'z-6b', name: 'Barra', price: 95, capacity: 40, sold: 0 },
    ],
  },
];

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
