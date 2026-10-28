import { create } from 'qrcode';
import { IssuedTicket, TicketOrder } from '../core/models/ticket.model';
import { environment } from '../../enviroments/enviroment';

/** PDF local de una entrada. El QR apunta a su confirmación pública. */
export function downloadTicketPdf(order: TicketOrder, ticket: IssuedTicket): void {
  const base = environment.publicBaseUrl || window.location.origin;
  const url = `${base.replace(/\/$/, '')}/validar/${encodeURIComponent(ticket.code)}`;
  const qr = create(url, { errorCorrectionLevel: 'M' });
  const escape = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7e]/g, '?').replace(/[\\()]/g, '\\$&');
  const rows = [
    'ALPATECK - CONFIRMACION DE COMPRA',
    `Evento: ${order.eventName}`,
    `Fecha: ${new Date(order.eventStartsAt).toLocaleString('es-PE')}`,
    `Lugar: ${order.eventVenue}`,
    `Zona: ${ticket.zoneName}`,
    `Codigo: ${ticket.code}`,
    `Monto pagado: S/ ${ticket.total.toFixed(2)}`,
  ];
  const content = rows.map((row, index) => `BT /F1 ${index === 0 ? 18 : 12} Tf 52 ${780 - index * 34} Td (${escape(row)}) Tj ET`).join('\n');
  const size = qr.modules.size;
  const cell = Math.min(6, 258 / size);
  const x0 = 306 - (size * cell) / 2;
  const y0 = 170;
  const squares: string[] = ['0 0 0 rg'];
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (qr.modules.get(row, col)) squares.push(`${(x0 + col * cell).toFixed(2)} ${(y0 + (size - row - 1) * cell).toFixed(2)} ${cell.toFixed(2)} ${cell.toFixed(2)} re f`);
    }
  }
  const stream = `${content}\n${squares.join('\n')}\nBT /F1 9 Tf 52 54 Td (${escape(url)}) Tj ET`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (const [index, object] of objects.entries()) {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  const objectUrl = URL.createObjectURL(new Blob([pdf], { type: 'application/pdf' }));
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = `entrada-${ticket.code}.pdf`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}
