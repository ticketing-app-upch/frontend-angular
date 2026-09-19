import { BankName } from './event.model';

export type OrderStatus = 'CONFIRMADA' | 'PENDIENTE' | 'CANCELADA';

export interface OrderItem {
  zoneId: string;
  quantity: number;
  /** Descuento para personas con discapacidad (Ley N.º 29973), válido solo para 1 entrada. */
  accessible?: boolean;
  /** Descuento por banco (tarjeta), si el evento lo tiene habilitado. Se ignora si `accessible` es true. */
  bank?: BankName;
}

export interface OrderLine {
  zoneId: string;
  zoneName: string;
  unitPrice: number;
  quantity: number;
}

export interface TicketOrder {
  id: string;
  code: string;
  eventId: string;
  eventName: string;
  eventStartsAt: string;
  eventVenue: string;
  buyerId: string;
  buyerName: string;
  createdAt: string;
  status: OrderStatus;
  lines: OrderLine[];
  subtotal: number;
  fee: number;
  total: number;
}

export interface CreateOrderPayload {
  eventId: string;
  items: OrderItem[];
  expectedTotal?: number;
  paymentMethod?: 'CARD' | 'WALLET';
  paymentResult?: 'APPROVED' | 'DECLINED';
  idempotencyKey?: string;
}
