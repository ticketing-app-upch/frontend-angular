import { TestBed } from '@angular/core/testing';
import { DEMO_VENUES } from '../../core/models/venue-catalog';
import { venueShape } from '../event-image';
import { ZoneMap } from './zone-map';
import { traceFor, VENUE_TRACES } from './venue-traces';

const zones = [
  { id: 'z1', name: 'General', price: 100, capacity: 100, sold: 10 },
  { id: 'z2', name: 'VIP', price: 200, capacity: 20, sold: 20 },
];

describe('Planos interactivos por recinto', () => {
  it('tiene un trazado interactivo para cada plano del catálogo', () => {
    expect(Object.keys(VENUE_TRACES)).toHaveLength(16);
    expect(DEMO_VENUES).toHaveLength(15);
    for (const venue of DEMO_VENUES) {
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
