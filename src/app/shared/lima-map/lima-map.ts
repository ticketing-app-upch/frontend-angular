import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { EventPerformance } from '../../core/models/dashboard.model';
import { districtForVenue } from './venue-district';

interface DistrictFeature {
  name: string;
  path: string;
}

interface DistrictStat {
  name: string;
  events: number;
  revenue: number;
  sold: number;
}

/** GeoJSON crudo de `public/geo/lima-distritos.geojson` (sólo lo que usamos). */
interface LimaGeoJson {
  features: {
    properties: { distrito: string };
    geometry:
      | { type: 'Polygon'; coordinates: [number, number][][] }
      | { type: 'MultiPolygon'; coordinates: [number, number][][][] };
  }[];
}

const VIEWBOX = 640;

/**
 * Mapa de distritos de Lima Metropolitana + Callao, coloreado según la
 * recaudación de los eventos del organizador en cada uno (calculado a
 * partir de `venue` vía `districtForVenue`). Sólo dibuja: no depende de
 * ninguna librería de mapas, el GeoJSON se proyecta a mano (equirectangular
 * con corrección por latitud, suficiente para la escala de una ciudad).
 */
@Component({
  selector: 'tkt-lima-map',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatProgressSpinnerModule, MatIconModule],
  templateUrl: './lima-map.html',
  styleUrl: './lima-map.scss',
})
export class LimaMap {
  private http = inject(HttpClient);

  readonly events = input<EventPerformance[]>([]);
  /** Distrito elegido desde afuera (p.ej. el buscador del panel); se resalta como fijo, no sólo al pasar el mouse. */
  readonly selected = input<string | null>(null);
  /** Se emite al hacer clic en un distrito o en la lista, para que el buscador tome ese valor. */
  readonly districtClick = output<string | null>();

  readonly loading = signal(true);
  readonly failed = signal(false);
  readonly hovered = signal<string | null>(null);
  readonly features = signal<DistrictFeature[]>([]);
  readonly viewBox = `0 0 ${VIEWBOX} ${VIEWBOX}`;

  /** Sólo para el resalte visual del mapa (hover + selección persistente). */
  readonly focused = computed(() => this.hovered() ?? this.selected());

  readonly statsByDistrict = computed<Map<string, DistrictStat>>(() => {
    const map = new Map<string, DistrictStat>();
    for (const e of this.events()) {
      const district = districtForVenue(e.venue);
      if (!district) continue;
      const cur = map.get(district) ?? { name: district, events: 0, revenue: 0, sold: 0 };
      cur.events += 1;
      cur.revenue += e.revenue;
      cur.sold += e.sold;
      map.set(district, cur);
    }
    return map;
  });

  readonly maxRevenue = computed(() =>
    Math.max(1, ...[...this.statsByDistrict().values()].map((d) => d.revenue)),
  );

  /** Todos los distritos con al menos un evento, de mayor a menor recaudación. */
  readonly ranked = computed(() =>
    [...this.statsByDistrict().values()].sort((a, b) => b.revenue - a.revenue),
  );

  /**
   * Lo que se muestra en el panel lateral: sólo cuando hay una selección de
   * verdad (clic o filtro), no con pasar el mouse. Sin selección, siempre
   * se ve el ranking completo — "nada elegido" = "se ve todo".
   */
  readonly focusedStat = computed<DistrictStat | null>(() => {
    const name = this.selected();
    return name ? this.statsByDistrict().get(name) ?? null : null;
  });

  readonly unmatchedCount = computed(
    () => this.events().filter((e) => !districtForVenue(e.venue)).length,
  );

  /** Clic en el mapa o en la lista: alterna la selección (clic de nuevo = quitar filtro). */
  toggleSelected(name: string): void {
    this.districtClick.emit(this.selected() === name ? null : name);
  }

  constructor() {
    this.http.get<LimaGeoJson>('/geo/lima-distritos.geojson').subscribe({
      next: (geo) => {
        this.features.set(project(geo));
        this.loading.set(false);
      },
      error: () => {
        this.failed.set(true);
        this.loading.set(false);
      },
    });
  }

  fillFor(name: string): string {
    const stat = this.statsByDistrict().get(name);
    if (!stat) return 'var(--map-empty)';
    const t = Math.sqrt(stat.revenue / this.maxRevenue());
    return `color-mix(in srgb, var(--mat-sys-primary) ${Math.round(18 + t * 70)}%, var(--map-empty))`;
  }
}

function project(geo: LimaGeoJson): DistrictFeature[] {
  let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
  const visit = (lon: number, lat: number) => {
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  };
  for (const f of geo.features) {
    const rings = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
    for (const poly of rings) for (const ring of poly) for (const [lon, lat] of ring) visit(lon, lat);
  }

  const latRef = (minLat + maxLat) / 2;
  const cos = Math.cos((latRef * Math.PI) / 180);
  const padding = 14;
  const spanX = (maxLon - minLon) * cos;
  const spanY = maxLat - minLat;
  const scale = Math.min((VIEWBOX - 2 * padding) / spanX, (VIEWBOX - 2 * padding) / spanY);
  const offsetX = padding + ((VIEWBOX - 2 * padding) - spanX * scale) / 2;
  const offsetY = padding + ((VIEWBOX - 2 * padding) - spanY * scale) / 2;

  const toXY = (lon: number, lat: number): [number, number] => [
    offsetX + (lon - minLon) * cos * scale,
    offsetY + (maxLat - lat) * scale,
  ];

  const ringToPath = (ring: [number, number][]): string =>
    ring
      .map(([lon, lat], i) => {
        const [x, y] = toXY(lon, lat);
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ') + ' Z';

  const polygonToPath = (rings: [number, number][][]): string => rings.map(ringToPath).join(' ');

  return geo.features.map((f) => ({
    name: f.properties.distrito,
    path:
      f.geometry.type === 'Polygon'
        ? polygonToPath(f.geometry.coordinates)
        : f.geometry.coordinates.map(polygonToPath).join(' '),
  }));
}
