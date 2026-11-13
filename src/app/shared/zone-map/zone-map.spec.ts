import { TestBed } from '@angular/core/testing';
import { DEMO_VENUES } from '../../core/models/venue-catalog';
import { venueShape } from '../event-image';
import { ZoneMap } from './zone-map';
import { traceFor, VENUE_TRACES } from './venue-traces';
import { ZONE_LABEL_AREAS } from './zone-label-areas';

const zones = [
  { id: 'z1', name: 'General', price: 100, capacity: 100, sold: 10 },
  { id: 'z2', name: 'VIP', price: 200, capacity: 20, sold: 20 },
];

function polygons(path: string): [number, number][][] {
  return path.match(/M[^M]*Z/g)?.map(part =>
    [...part.matchAll(/(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g)]
      .map(([, x, y]) => [Number(x), Number(y)] as [number, number])
  ) ?? [];
}

function contains(polygon: [number, number][], x: number, y: number): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

describe('Planos interactivos por recinto', () => {
  it('tiene un trazado interactivo para cada recinto ilustrado y una zona para el recinto de prueba', () => {
    expect(Object.keys(VENUE_TRACES)).toHaveLength(16);
    expect(DEMO_VENUES).toHaveLength(16);
    expect(ZONE_LABEL_AREAS['recinto-prueba.svg']['General']).toBeDefined();
    for (const venue of DEMO_VENUES.filter(venue => venue.id !== 'recinto-prueba')) {
      const layout = traceFor(venue.map);
      expect(layout, venue.name).not.toBeNull();
      expect(layout!.regions.map(region => region.priceZone).sort()).toEqual(venue.zones.map(zone => zone.name).sort());
    }
    for (const layout of Object.values(VENUE_TRACES)) {
      expect(layout.image).toMatch(/-realista\.png$/);
      expect(layout.regions.length).toBeGreaterThan(0);
      expect(layout.regions.every(region => region.path.length > 12)).toBe(true);
    }
  });

  it('mantiene todas las zonas dentro de la imagen y sin áreas clicables superpuestas', () => {
    for (const [image, layout] of Object.entries(VENUE_TRACES)) {
      const shapes = layout.regions.map(region => ({ name: region.name, parts: polygons(region.path) }));
      for (const shape of shapes) {
        expect(shape.parts.length, `${image}: ${shape.name}`).toBeGreaterThan(0);
        for (const part of shape.parts) {
          expect(part.length, `${image}: ${shape.name}`).toBeGreaterThanOrEqual(3);
          for (const [x, y] of part) {
            expect(x, `${image}: ${shape.name}`).toBeGreaterThanOrEqual(0);
            expect(x, `${image}: ${shape.name}`).toBeLessThanOrEqual(1000);
            expect(y, `${image}: ${shape.name}`).toBeGreaterThanOrEqual(0);
            expect(y, `${image}: ${shape.name}`).toBeLessThanOrEqual(layout.height);
          }
        }
      }
      for (let y = 3; y < layout.height; y += 6) {
        for (let x = 3; x < 1000; x += 6) {
          const hits = shapes.filter(shape => shape.parts.some(part => contains(part, x, y)));
          expect(hits.length, `${image} en ${x},${y}: ${hits.map(hit => hit.name).join(' / ')}`).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it('sincroniza las zonas trazadas, respeta agotados y confirma el segundo toque', async () => {
    await TestBed.configureTestingModule({ imports: [ZoneMap] }).compileComponents();
    const fixture = TestBed.createComponent(ZoneMap);
    fixture.componentRef.setInput('zones', zones);
    fixture.componentRef.setInput('venue', 'Arena 1 — Costa Verde');
    fixture.componentRef.setInput('image', '/recintos/demo3/arena-1-costa-verde.png');
    fixture.componentRef.setInput('prices', { z1: 123, z2: 234 });
    fixture.detectChanges();

    const paths = fixture.nativeElement.querySelectorAll('path.traced-zone');
    expect(paths).toHaveLength(2);
    expect(paths[0].getAttribute('aria-label')).toContain('VIP, S/ 234.00, agotado');
    expect(paths[0].getAttribute('aria-disabled')).toBe('true');
    expect(fixture.nativeElement.querySelector('.image-zone')).toBeNull();

    const picked: string[] = [];
    fixture.componentInstance.pick.subscribe(id => picked.push(id));
    paths[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(picked).toEqual([]);

    fixture.componentInstance.pointerType = 'touch';
    paths[1].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();
    expect(picked).toEqual([]);
    expect(fixture.nativeElement.querySelector('.zone-tooltip')?.textContent).toContain('General');
    paths[1].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(picked).toEqual(['z1']);

    fixture.componentInstance.pointerType = 'mouse';
    paths[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    expect(picked).toEqual(['z1', 'z1']);
    fixture.componentRef.setInput('quantities', { z1: 1 });
    fixture.detectChanges();
    expect(paths[1].getAttribute('aria-pressed')).toBe('true');
  });

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
