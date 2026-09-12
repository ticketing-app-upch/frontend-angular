export interface EventPerformance {
  eventId: string;
  eventName: string;
  startsAt: string;
  capacity: number;
  sold: number;
  occupancy: number; // 0..1
  revenue: number;
}

export interface RevenuePoint {
  /** Etiqueta corta, p.ej. "Ago" o "S32". */
  label: string;
  revenue: number;
  tickets: number;
}

export interface DashboardStats {
  byZone?: ZonePerformance[];
  totalRevenue: number;
  totalTicketsSold: number;
  totalCapacity: number;
  averageOccupancy: number; // 0..1
  publishedEvents: number;
  revenueSeries: RevenuePoint[];
  byEvent: EventPerformance[];
}

export interface ZonePerformance {
  eventId: string;
  eventName: string;
  zoneId: string;
  zoneName: string;
  capacity: number;
  sold: number;
  revenue: number;
  basePrice: number;
  currentPrice: number;
  priceReason: string;
  startsAt: string;
  publishedAt?: string;
}
