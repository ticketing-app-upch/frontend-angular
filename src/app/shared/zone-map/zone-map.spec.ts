import { TestBed } from '@angular/core/testing';
import { venueShape } from '../event-image';
import { ZoneMap } from './zone-map';

const zones = [
  { id: 'z1', name: 'General', price: 100, capacity: 100, sold: 10 },
  { id: 'z2', name: 'VIP', price: 200, capacity: 20, sold: 20 },
];

describe('Planos interactivos por recinto', () => {
  it.each([
    ['Estadio Monumental', 'octagon'],
    ['Estadio Nacional', 'oval'],
    ['Estadio San Marcos', 'rectangle'],
    ['Gran Teatro Nacional', 'theater'],
    ['Teatro Municipal', 'theater'],
    ['Teatro La Plaza', 'theater'],
    ['Arena 1 — Costa Verde', 'arena'],
    ['Coliseo Eduardo Dibós', 'arena'],
    ['Parque de la Exposición', 'outdoor'],
    ['Explanada Costa Verde', 'outdoor'],
    ['Plaza de Armas de Lima', 'outdoor'],
    ['Centro de Convenciones de Lima', 'conference'],
    ['The Westin Lima', 'conference'],
    ['Circuito Costa Verde', 'route'],
    ['Jazz Zone, Miraflores', 'club'],
  ])('clasifica %s como %s', (venue, shape) => expect(venueShape(venue)).toBe(shape));

  it('renderiza regiones radiales y bloquea una zona agotada', async () => {
    await TestBed.configureTestingModule({ imports: [ZoneMap] }).compileComponents();
    const fixture = TestBed.createComponent(ZoneMap);
    fixture.componentRef.setInput('zones', zones);
    fixture.componentRef.setInput('venue', 'Arena 1 — Costa Verde');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('path').length).toBeGreaterThanOrEqual(2);
    expect(fixture.nativeElement.querySelectorAll('g.gone').length).toBe(1);
  });

  it('refleja cantidad seleccionada en el plano', async () => {
    await TestBed.configureTestingModule({ imports: [ZoneMap] }).compileComponents();
    const fixture = TestBed.createComponent(ZoneMap);
    fixture.componentRef.setInput('zones', zones);
    fixture.componentRef.setInput('venue', 'Estadio Nacional');
    fixture.componentRef.setInput('quantities', { z1: 2 });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('2');
    expect(fixture.nativeElement.querySelector('[aria-label="Plano interactivo de Estadio Nacional"]')).toBeTruthy();
  });

  it.each([
    ['Parque de la Exposición', 'polygon'],
    ['Centro de Convenciones de Lima', 'rect'],
    ['Circuito Costa Verde', 'path'],
    ['Jazz Zone, Miraflores', 'circle'],
  ])('renderiza un plano especializado para %s', async (venue, selector) => {
    await TestBed.configureTestingModule({ imports: [ZoneMap] }).compileComponents();
    const fixture = TestBed.createComponent(ZoneMap);
    fixture.componentRef.setInput('zones', zones);
    fixture.componentRef.setInput('venue', venue);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector(`[aria-label="Plano interactivo de ${venue}"]`)).toBeTruthy();
    expect(fixture.nativeElement.querySelector(selector)).toBeTruthy();
  });
});
