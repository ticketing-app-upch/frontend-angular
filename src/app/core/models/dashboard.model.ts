import { EventCategory } from './event.model';

export interface EventPerformance {
  eventId: string;
  eventName: string;
  venue: string;
  category: EventCategory;
  startsAt: string;
  capacity: number;
  sold: number;
  occupancy: number; // 0..1
  revenue: number;
}

/** Filtros del buscador del panel: todos opcionales, se combinan con Y. */
export interface DashboardFilters {
  /** Distrito de Lima Metropolitana (ver `districtForVenue`). */
  district?: string;
  category?: EventCategory;
  /** Substring del nombre de zona/sector (p.ej. "VIP"), sin distinguir mayúsculas. */
  sector?: string;
}

/** Valores disponibles para armar los selectores del buscador, sin filtrar. */
export interface DashboardFilterOptions {
  districts: string[];
  categories: EventCategory[];
  sectors: string[];
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
