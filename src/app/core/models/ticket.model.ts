export type OrderStatus = 'CONFIRMADA' | 'PENDIENTE' | 'CANCELADA';

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
  items: { zoneId: string; quantity: number }[];
  expectedTotal?: number;
  paymentMethod?: 'CARD' | 'WALLET';
  paymentResult?: 'APPROVED' | 'DECLINED';
  idempotencyKey?: string;
}
