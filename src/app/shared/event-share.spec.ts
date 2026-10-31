import { eventShareUrl } from './event-share';

describe('enlace público de un evento', () => {
  it('abre el detalle sin pasar por la ruta de asistente protegida', () => {
    expect(eventShareUrl('ev 1')).toBe(`${window.location.origin}/eventos/ev%201`);
  });
});
