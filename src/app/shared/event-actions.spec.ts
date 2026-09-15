import { calendarContent, csvCell, downloadFile } from './event-actions';
import { vi } from 'vitest';
import { sessionTokenValid } from '../core/auth/auth.service';
import { isBackendRequest } from '../core/auth/auth.interceptor';

describe('Exportación y sesión', () => {
  it('genera calendario UTC y escapa texto', () => {
    const output = calendarContent({ id: 'event', name: 'Rock, jazz; Lima\nEvento', startsAt: '2026-10-10T20:00:00-05:00', venue: 'Arena', city: 'Lima' });
    expect(output).toContain('DTSTART:20261011T010000Z');
    expect(output).toContain('SUMMARY:Rock\\, jazz\\; Lima\\nEvento');
    expect(output).toContain('TRIGGER:-PT2H');
  });
  it('escapa fórmulas y comillas CSV', () => {
    expect(csvCell('=SUM(A1)')).toBe('"\'=SUM(A1)"'); expect(csvCell('a"b')).toBe('"a""b"');
  });
  it('descarga con contenido y nombre correctos', () => {
    vi.useFakeTimers();
    const create = vi.fn((_blob: Blob) => 'blob:test'), revoke = vi.fn();
    vi.stubGlobal('URL', class extends URL { static override createObjectURL = create; static override revokeObjectURL = revoke; });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { expect(this.download).toBe('report.csv'); });
    downloadFile('contenido', 'report.csv', 'text/csv');
    expect(create.mock.calls[0][0]).toBeInstanceOf(Blob); vi.runAllTimers(); click.mockRestore(); vi.unstubAllGlobals(); vi.useRealTimers();
  });
  it('nunca envía token a dominios o rutas parecidas', () => {
    expect(isBackendRequest('https://api.example/api/events', 'https://api.example/api')).toBe(true);
    expect(isBackendRequest('https://api.example.evil/api', 'https://api.example/api')).toBe(false);
    expect(isBackendRequest('https://api.example/apievil', 'https://api.example/api')).toBe(false);
  });
  it('rechaza JWT vencido, inválido o sin expiración', () => {
    const jwt = (data: object) => 'header.' + btoa(JSON.stringify(data)) + '.signature';
    expect(sessionTokenValid(jwt({ exp: Date.now() / 1000 + 60 }))).toBe(true);
    expect(sessionTokenValid(jwt({ exp: 1 }))).toBe(false);
    expect(sessionTokenValid(jwt({}))).toBe(false);
    expect(sessionTokenValid('broken')).toBe(false);
  });
});
