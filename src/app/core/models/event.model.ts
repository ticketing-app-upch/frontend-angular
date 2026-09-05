export type EventCategory =
  | 'CONCIERTO'
  | 'TEATRO'
  | 'DEPORTE'
  | 'CONFERENCIA'
  | 'FESTIVAL';

export type EventStatus = 'BORRADOR' | 'PUBLICADO' | 'AGOTADO' | 'FINALIZADO';

export interface Zone {
  id: string;
  name: string;
  /** Precio base en soles (PEN). El servicio de pricing puede ajustarlo. */
  price: number;
  capacity: number;
  sold: number;
}

export interface EventItem {
  id: string;
  name: string;
  description: string;
  category: EventCategory;
  status: EventStatus;
  venue: string;
  city: string;
  /** ISO string. */
  startsAt: string;
  imageUrl: string;
  organizerId: string;
  /** Máximo de entradas por transacción. */
  maxPerOrder: number;
  zones: Zone[];
}

export interface EventCapacity {
  total: number;
  sold: number;
  available: number;
  /** 0..1 */
  ratio: number;
}

export function computeCapacity(event: Pick<EventItem, 'zones'>): EventCapacity {
  const total = event.zones.reduce((acc, z) => acc + z.capacity, 0);
  const sold = event.zones.reduce((acc, z) => acc + z.sold, 0);
  const available = Math.max(0, total - sold);
  return { total, sold, available, ratio: total === 0 ? 0 : sold / total };
}
