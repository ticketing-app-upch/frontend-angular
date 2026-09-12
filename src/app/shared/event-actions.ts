import { EventItem } from '../core/models/event.model';
export function downloadFile(content: string, filename: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const escapeIcs = (value: string) => value.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');
export function calendarContent(event: Pick<EventItem, 'id' | 'name' | 'startsAt' | 'venue' | 'city'>): string {
  const date = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Aforo//Agenda//ES', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT', 'UID:' + escapeIcs(event.id) + '@aforo.local', 'DTSTAMP:' + date(new Date()),
    'DTSTART:' + date(new Date(event.startsAt)), 'SUMMARY:' + escapeIcs(event.name),
    'LOCATION:' + escapeIcs(event.venue + ', ' + event.city),
    'DESCRIPTION:Consulta tu entrada en Aforo. La duración no ha sido confirmada.',
    'BEGIN:VALARM', 'TRIGGER:-PT2H', 'ACTION:DISPLAY', 'DESCRIPTION:Tu evento comienza en dos horas',
    'END:VALARM', 'END:VEVENT', 'END:VCALENDAR', '',
  ].join('\r\n');
}
export function addToCalendar(event: Pick<EventItem, 'id' | 'name' | 'startsAt' | 'venue' | 'city'>): void {
  downloadFile(calendarContent(event), 'aforo-evento.ics', 'text/calendar;charset=utf-8');
}
export function csvCell(value: unknown): string {
  let text = String(value ?? '');
  if (/^[=+\-@\t\r]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}
