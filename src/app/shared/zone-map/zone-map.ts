import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { Zone } from '../../core/models/event.model';

/** Polígono clicable superpuesto sobre un plano-imagen (coords 0..100). */
export interface MapHotspot {
  id: string;
  points: string;
}

/** Colores por índice de zona (se reutiliza en la lista de sectores). */
export const ZONE_COLORS = [
  '#7c3aed',
  '#f43f5e',
  '#0ea5e9',
  '#f59e0b',
  '#10b981',
  '#6366f1',
  '#ec4899',
  '#14b8a6',
];

export function zoneColor(index: number): string {
  return ZONE_COLORS[index % ZONE_COLORS.length];
}

interface Band {
  id: string;
  name: string;
  color: string;
  qty: number;
  gone: boolean;
  y: number;
  h: number;
}

interface Stand {
  id: string;
  name: string;
  color: string;
  qty: number;
  gone: boolean;
  points: string;
  labelX: number;
  labelY: number;
  rotate: number;
  fontSize: number;
}

/**
 * Plano referencial de sectores.
 *  - modo `stadium`: gradería alrededor de la cancha (partidos de fútbol).
 *  - modo bandas: sectores apilados con el escenario arriba (conciertos, etc.).
 * Cada sector es clicable para sumar una entrada.
 */
@Component({
  selector: 'tkt-zone-map',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (image() && !imgFailed()) {
      <div class="img-map">
        <img [src]="image()" alt="Plano del recinto" (error)="imgFailed.set(true)" />
        @if (spotViews().length) {
          <svg class="hot" viewBox="0 0 100 100" preserveAspectRatio="none">
            @for (h of spotViews(); track h.id) {
              <polygon
                class="spot"
                [attr.points]="h.points"
                [attr.fill]="h.color"
                [style.cursor]="h.gone ? 'not-allowed' : 'pointer'"
                pointer-events="all"
                (click)="!h.gone && pick.emit(h.id)"
              />
            }
          </svg>
        }
      </div>
    } @else if (asStadium()) {
      <svg viewBox="0 0 320 250" role="img" aria-label="Plano del estadio">
        <!-- anillo exterior -->
        <polygon
          points="56,8 264,8 312,56 312,194 264,242 56,242 8,194 8,56"
          fill="currentColor"
          fill-opacity="0.05"
          stroke="currentColor"
          stroke-opacity="0.16"
          stroke-width="2"
        />

        <!-- esquinas neutras -->
        @for (c of CORNERS; track c) {
          <polygon [attr.points]="c" fill="currentColor" fill-opacity="0.09" />
        }

        <!-- tribunas -->
        @for (s of stands(); track s.id) {
          <g
            [class.gone]="s.gone"
            [style.cursor]="s.gone ? 'not-allowed' : 'pointer'"
            (click)="!s.gone && pick.emit(s.id)"
          >
            <polygon
              [attr.points]="s.points"
              [attr.fill]="s.color"
              [attr.fill-opacity]="s.qty > 0 ? 0.92 : 0.26"
              [attr.stroke]="s.qty > 0 ? '#ffffff' : s.color"
              [attr.stroke-opacity]="s.qty > 0 ? 0.9 : 0.5"
              stroke-width="2"
              stroke-linejoin="round"
            />
            <text
              [attr.x]="s.labelX"
              [attr.y]="s.labelY"
              [attr.transform]="
                s.rotate ? 'rotate(' + s.rotate + ' ' + s.labelX + ' ' + s.labelY + ')' : null
              "
              text-anchor="middle"
              font-family="Inter, sans-serif"
              [attr.font-size]="s.fontSize"
              font-weight="800"
              letter-spacing="0.5"
              [attr.fill]="s.qty > 0 ? '#ffffff' : 'currentColor'"
            >
              {{ s.name }}
            </text>
            @if (s.qty > 0) {
              <g
                [attr.transform]="
                  'translate(' + s.labelX + ' ' + (s.labelY + (s.rotate ? 0 : 14)) + ')'
                "
              >
                <circle r="10" fill="#ffffff" />
                <text
                  text-anchor="middle"
                  y="4"
                  font-family="Inter, sans-serif"
                  font-size="11"
                  font-weight="800"
                  [attr.fill]="s.color"
                >
                  {{ s.qty }}
                </text>
              </g>
            }
          </g>
        }

        <!-- cancha -->
        <g>
          <rect x="98" y="80" width="124" height="90" rx="7" fill="#1f8f4d" />
          <rect
            x="98"
            y="80"
            width="124"
            height="90"
            rx="7"
            fill="none"
            stroke="#ffffff"
            stroke-opacity="0.85"
            stroke-width="2"
          />
          <line
            x1="160"
            y1="80"
            x2="160"
            y2="170"
            stroke="#ffffff"
            stroke-opacity="0.85"
            stroke-width="2"
          />
          <circle
            cx="160"
            cy="125"
            r="13"
            fill="none"
            stroke="#ffffff"
            stroke-opacity="0.85"
            stroke-width="2"
          />
          <rect x="98" y="108" width="14" height="34" fill="none" stroke="#ffffff" stroke-opacity="0.8" stroke-width="2" />
          <rect x="208" y="108" width="14" height="34" fill="none" stroke="#ffffff" stroke-opacity="0.8" stroke-width="2" />
        </g>
      </svg>
    } @else {
      <svg [attr.viewBox]="'0 0 300 ' + bandsHeight()" role="img" aria-label="Plano de sectores">
        <rect x="46" y="14" width="208" height="30" rx="7" fill="#e2e8f0" />
        <text
          x="150"
          y="34"
          text-anchor="middle"
          font-family="Inter, sans-serif"
          font-size="13"
          font-weight="800"
          letter-spacing="2"
          fill="#0f172a"
        >
          ESCENARIO
        </text>

        @for (b of bands(); track b.id) {
          <g
            [class.gone]="b.gone"
            [style.cursor]="b.gone ? 'not-allowed' : 'pointer'"
            (click)="!b.gone && pick.emit(b.id)"
          >
            <rect
              x="18"
              [attr.y]="b.y"
              width="264"
              [attr.height]="b.h"
              rx="11"
              [attr.fill]="b.color"
              [attr.fill-opacity]="b.qty > 0 ? 0.92 : 0.24"
              [attr.stroke]="b.qty > 0 ? '#ffffff' : b.color"
              [attr.stroke-opacity]="b.qty > 0 ? 0.9 : 0.5"
              stroke-width="2"
            />
            <text
              x="150"
              [attr.y]="b.y + b.h / 2 + 5"
              text-anchor="middle"
              font-family="Inter, sans-serif"
              font-size="13"
              font-weight="700"
              [attr.fill]="b.qty > 0 ? '#ffffff' : 'currentColor'"
            >
              {{ b.name }}
            </text>
            @if (b.qty > 0) {
              <g [attr.transform]="'translate(262 ' + (b.y + b.h / 2) + ')'">
                <circle r="12" fill="#ffffff" />
                <text
                  text-anchor="middle"
                  y="4"
                  font-family="Inter, sans-serif"
                  font-size="12"
                  font-weight="800"
                  [attr.fill]="b.color"
                >
                  {{ b.qty }}
                </text>
              </g>
            }
          </g>
        }
      </svg>
    }
  `,
  styles: `
    :host {
      display: block;
      color: var(--mat-sys-on-surface);
    }
    svg { width: 100%; height: auto; display: block; }
    g.gone { opacity: 0.4; }

    .img-map { position: relative; line-height: 0; }
    .img-map img {
      width: 100%;
      height: auto;
      display: block;
      border-radius: 10px;
    }
    .img-map .hot {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
    }
    /* el plano se ve tal cual: los sectores son transparentes,
       sólo un tinte muy leve al pasar el cursor para saber que son clicables */
    .img-map .hot .spot {
      fill-opacity: 0;
      transition: fill-opacity 0.15s ease;
    }
    .img-map .hot .spot:hover {
      fill-opacity: 0.12;
    }
  `,
})
export class ZoneMap {
  readonly zones = input.required<Zone[]>();
  /** zoneId -> cantidad seleccionada */
  readonly quantities = input<Record<string, number>>({});
  /** Fuerza el modo estadio (gradería alrededor de la cancha). */
  readonly stadium = input(false);
  /** Plano-imagen del recinto; si carga, reemplaza al plano generado. */
  readonly image = input<string | null>(null);
  /** Polígonos clicables sobre el plano-imagen (coords 0..100). */
  readonly hotspots = input<MapHotspot[]>([]);
  readonly pick = output<string>();

  readonly imgFailed = signal(false);

  qtyOf(zoneId: string): number {
    return this.quantities()[zoneId] ?? 0;
  }

  /** Hotspots enriquecidos con nombre, color, cantidad y centroide. */
  readonly spotViews = computed(() => {
    const zs = this.zones();
    const q = this.quantities();
    return this.hotspots().map((h) => {
      const idx = zs.findIndex((z) => z.id === h.id);
      const zone = idx >= 0 ? zs[idx] : undefined;
      const nums = h.points.trim().split(/[\s,]+/).map(Number);
      let cx = 0;
      let cy = 0;
      const n = Math.floor(nums.length / 2);
      for (let i = 0; i < n; i++) {
        cx += nums[i * 2];
        cy += nums[i * 2 + 1];
      }
      return {
        id: h.id,
        points: h.points,
        name: zone?.name ?? '',
        color: zoneColor(Math.max(0, idx)),
        qty: q[h.id] ?? 0,
        gone: zone ? zone.capacity - zone.sold <= 0 : false,
        cx: n ? cx / n : 50,
        cy: n ? cy / n : 50,
      };
    });
  });

  protected readonly CORNERS = [
    '56,8 86,66 8,56',
    '264,8 234,66 312,56',
    '56,242 86,184 8,194',
    '264,242 234,184 312,194',
  ];

  private readonly bandH = 46;
  private readonly gap = 10;
  private readonly top = 58;

  readonly asStadium = computed(
    () =>
      this.stadium() && this.zones().length >= 2 && this.zones().length <= 12,
  );

  readonly bandsHeight = computed(
    () => this.top + this.zones().length * (this.bandH + this.gap),
  );

  readonly bands = computed<Band[]>(() => {
    const q = this.quantities();
    return this.zones().map((z, i) => ({
      id: z.id,
      name: z.name,
      color: zoneColor(i),
      qty: q[z.id] ?? 0,
      gone: z.capacity - z.sold <= 0,
      y: this.top + i * (this.bandH + this.gap),
      h: this.bandH,
    }));
  });

  /**
   * Tribunas alrededor de la cancha. Arriba/izquierda/derecha se asignan por
   * nombre; el resto se reparte a lo ancho de la tribuna inferior.
   */
  readonly stands = computed<Stand[]>(() => {
    const zs = this.zones();
    const q = this.quantities();
    const used = new Set<string>();

    const take = (re: RegExp): Zone | undefined => {
      const z = zs.find((z) => !used.has(z.id) && re.test(z.name.toLowerCase()));
      if (z) used.add(z.id);
      return z;
    };

    let top = take(/oriente|este\b|east/);
    let left = take(/norte|north/);
    let right = take(/\bsur\b|south|familiar|visitante/);
    const rest = zs.filter((z) => !used.has(z.id));
    if (!top && rest.length) top = rest.shift();
    if (!left && rest.length) left = rest.shift();
    if (!right && rest.length) right = rest.shift();
    const bottom = rest;

    const color = (z: Zone) => zoneColor(zs.indexOf(z));
    const mk = (
      z: Zone,
      points: string,
      labelX: number,
      labelY: number,
      rotate = 0,
      fontSize = 12,
    ): Stand => ({
      id: z.id,
      name: z.name,
      color: color(z),
      qty: q[z.id] ?? 0,
      gone: z.capacity - z.sold <= 0,
      points,
      labelX,
      labelY,
      rotate,
      fontSize,
    });

    const out: Stand[] = [];
    if (top) out.push(mk(top, '86,66 234,66 264,8 56,8', 160, 40));
    if (left) out.push(mk(left, '86,66 86,184 8,194 8,56', 40, 125, -90));
    if (right) out.push(mk(right, '234,66 234,184 312,194 312,56', 280, 125, 90));

    const k = bottom.length;
    bottom.forEach((z, i) => {
      const tL = 86 + ((234 - 86) * i) / k;
      const tR = 86 + ((234 - 86) * (i + 1)) / k;
      const bL = 56 + ((264 - 56) * i) / k;
      const bR = 56 + ((264 - 56) * (i + 1)) / k;
      const fs = k >= 4 ? 8 : k === 3 ? 9 : k === 2 ? 11 : 12;
      out.push(
        mk(
          z,
          `${tL},184 ${tR},184 ${bR},242 ${bL},242`,
          (tL + tR) / 2,
          213,
          0,
          fs,
        ),
      );
    });

    return out;
  });
}
