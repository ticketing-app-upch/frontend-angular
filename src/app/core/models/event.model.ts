export type EventCategory =
  | 'CONCIERTO'
  | 'TEATRO'
  | 'DEPORTE'
  | 'CONFERENCIA'
  | 'FESTIVAL';

export type EventStatus = 'BORRADOR' | 'PUBLICADO' | 'AGOTADO' | 'FINALIZADO';

export type BankName = 'BCP' | 'BBVA' | 'INTERBANK';

export interface BankDiscount {
  bank: BankName;
  /** Porcentaje de descuento: 10 o 20. */
  percent: 10 | 20;
  enabled: boolean;
}

export interface Zone {
  id: string;
  name: string;
  /** Precio base en soles (PEN). El servicio de pricing puede ajustarlo. */
  price: number;
  capacity: number;
  sold: number;
  /** Saldos históricos anteriores al registro de órdenes. */
  openingSold?: number;
  openingRevenue?: number;
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
  publishedAt?: string;
  /** Capacidad física declarada del recinto. */
  venueCapacity?: number;
  imageUrl: string;
  organizerId: string;
  /** Máximo de entradas por transacción. */
  maxPerOrder: number;
  zones: Zone[];
  /** Descuentos por banco (tarjeta), configurados por el organizador. Independientes del pricing dinámico. */
  bankDiscounts?: BankDiscount[];
  /** El organizador habilitó el descuento por discapacidad (Ley N.º 29973) para este evento. */
  accessibleDiscount?: boolean;
}

export const BANK_NAMES: BankName[] = ['BCP', 'BBVA', 'INTERBANK'];

export const BANK_LABELS: Record<BankName, string> = {
  BCP: 'BCP',
  BBVA: 'BBVA',
  INTERBANK: 'Interbank',
};

/** Arma la lista de descuentos por banco con un valor por omisión (desactivado, 10%) para los bancos ausentes. */
export function normalizeBankDiscounts(discounts?: BankDiscount[]): BankDiscount[] {
  return BANK_NAMES.map((bank) => discounts?.find((d) => d.bank === bank) ?? { bank, percent: 10, enabled: false });
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
