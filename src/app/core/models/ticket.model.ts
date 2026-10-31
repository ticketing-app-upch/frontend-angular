export type OrderStatus = 'CONFIRMADA' | 'PENDIENTE' | 'CANCELADA';

export interface OrderLine {
  zoneId: string;
  zoneName: string;
  unitPrice: number;
  quantity: number;
}

/** Una entrada física y su QR: nunca se comparte entre dos asistentes. */
export interface IssuedTicket {
  code: string;
  zoneId: string;
  zoneName: string;
  unitPrice: number;
  serviceFee: number;
  total: number;
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
  /** Entradas emitidas individualmente dentro de la compra. */
  tickets?: IssuedTicket[];
  subtotal: number;
  fee: number;
  total: number;
}

/** Compatibilidad con compras de prueba guardadas antes de HU-15. */
export function ticketsForOrder(order: TicketOrder): IssuedTicket[] {
  if (order.tickets?.length) return order.tickets;
  let index = 0;
  return order.lines.flatMap(line => Array.from({ length: line.quantity }, () => {
    index += 1;
    // Conserva el importe de compras antiguas que ya tenían un recargo.
    const serviceFee = order.subtotal > 0 ? Math.round(line.unitPrice * order.fee / order.subtotal * 100) / 100 : 0;
    return {
      code: `${order.code}-${String(index).padStart(2, '0')}`,
      zoneId: line.zoneId,
      zoneName: line.zoneName,
      unitPrice: line.unitPrice,
      serviceFee,
      total: Math.round((line.unitPrice + serviceFee) * 100) / 100,
    };
  }));
}

export interface CreateOrderPayload {
  eventId: string;
  items: { zoneId: string; quantity: number }[];
  expectedTotal?: number;
  paymentMethod?: 'CARD' | 'WALLET';
  paymentResult?: 'APPROVED' | 'DECLINED';
  idempotencyKey?: string;
}
