import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { Zone } from '../../core/models/event.model';
import { VenueShape, venueShape as resolveVenueShape } from '../event-image';


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

interface RadialRegion {
  id: string;
  name: string;
  color: string;
  qty: number;
  gone: boolean;
  path: string;
  labelX: number;
  labelY: number;
}

interface PlanRegion {
  id: string;
  name: string;
  color: string;
  qty: number;
  gone: boolean;
  points: string;
  labelX: number;
  labelY: number;
}

interface GridRegion extends Omit<PlanRegion, 'points' | 'labelX' | 'labelY'> {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface RouteRegion extends Omit<PlanRegion, 'points'> {
  path: string;
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
                [class.selected]="h.qty > 0"
                [class.sold]="h.gone"
                [attr.points]="h.points"
                [attr.fill]="h.color"
                [attr.stroke]="h.qty > 0 ? '#fff' : h.color"
                [attr.stroke-width]="h.qty > 0 ? 0.7 : 0.25"
                [style.cursor]="h.gone ? 'not-allowed' : 'pointer'"
                pointer-events="all"
                (click)="!h.gone && pick.emit(h.id)"
              />
            }
          </svg>
        }
      </div>
    } @else if (asVenuePlan()) {

      <!-- ===== OVAL: Estadio Nacional y estadios clásicos ===== -->
      @if (shape() === 'oval') {
        <svg viewBox="0 0 320 250" role="img" [attr.aria-label]="'Plano interactivo de ' + venue()">
          <!-- Anillo exterior ovalado -->
          <ellipse cx="160" cy="125" rx="152" ry="117" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.16" stroke-width="2"/>
          <ellipse cx="160" cy="125" rx="137" ry="103" fill="none" stroke="#d97706" stroke-opacity="0.5" stroke-width="5" stroke-dasharray="2 3"/>
          <!-- Cancha ovalada -->
          <rect x="98" y="80" width="124" height="90" rx="7" fill="#1f8f4d"/>
          <rect x="98" y="80" width="124" height="90" rx="7" fill="none" stroke="#fff" stroke-opacity="0.85" stroke-width="1.5"/>
          <line x1="160" y1="80" x2="160" y2="170" stroke="#fff" stroke-opacity="0.85" stroke-width="1.5"/>
          <circle cx="160" cy="125" r="13" fill="none" stroke="#fff" stroke-opacity="0.85" stroke-width="1.5"/>
          <text x="160" y="159" text-anchor="middle" font-family="Inter,sans-serif" font-size="6.5" font-weight="900" letter-spacing="0.9" fill="#fff" fill-opacity="0.9">{{ venueTitle() }}</text>
          <!-- Tribunas del estadio oval: Norte, Sur, Oriente, Occidente -->
          @for (s of stands(); track s.id) {
            <g [class.gone]="s.gone" [style.cursor]="s.gone ? 'not-allowed' : 'pointer'" (click)="!s.gone && pick.emit(s.id)">
              <polygon [attr.points]="s.points" [attr.fill]="s.color" [attr.fill-opacity]="s.qty > 0 ? 0.92 : 0.26" [attr.stroke]="s.qty > 0 ? '#fff' : s.color" [attr.stroke-opacity]="s.qty > 0 ? 0.9 : 0.5" stroke-width="2" stroke-linejoin="round"/>
              <text [attr.x]="s.labelX" [attr.y]="s.labelY" [attr.transform]="s.rotate ? 'rotate(' + s.rotate + ' ' + s.labelX + ' ' + s.labelY + ')' : null" text-anchor="middle" font-family="Inter, sans-serif" [attr.font-size]="s.fontSize" font-weight="800" letter-spacing="0.5" [attr.fill]="s.qty > 0 ? '#fff' : 'currentColor'">{{ s.name }}</text>
              @if (s.qty > 0) {
                <g [attr.transform]="'translate(' + s.labelX + ' ' + (s.labelY + (s.rotate ? 0 : 14)) + ')'">
                  <circle r="10" fill="#fff"/>
                  <text text-anchor="middle" y="4" font-family="Inter,sans-serif" font-size="11" font-weight="800" [attr.fill]="s.color">{{ s.qty }}</text>
                </g>
              }
            </g>
          }
        </svg>

      <!-- ===== RECTANGLE: Estadio San Marcos ===== -->
      } @else if (shape() === 'rectangle') {
        <svg viewBox="0 0 320 250" role="img" [attr.aria-label]="'Plano interactivo de ' + venue()">
          <!-- Anillo exterior rectangular con esquinas curvas -->
          <rect x="8" y="8" width="304" height="234" rx="28" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.16" stroke-width="2"/>
          <!-- Cancha -->
          <rect x="98" y="80" width="124" height="90" rx="6" fill="#1f8f4d"/>
          <rect x="98" y="80" width="124" height="90" rx="6" fill="none" stroke="#fff" stroke-opacity="0.85" stroke-width="1.5"/>
          <line x1="160" y1="80" x2="160" y2="170" stroke="#fff" stroke-opacity="0.85" stroke-width="1.5"/>
          <circle cx="160" cy="125" r="13" fill="none" stroke="#fff" stroke-opacity="0.85" stroke-width="1.5"/>
          <path d="M99 90h123M99 160h123" stroke="#94a3b8" stroke-opacity=".45" stroke-dasharray="2 3"/>
          <text x="160" y="159" text-anchor="middle" font-family="Inter,sans-serif" font-size="6.5" font-weight="900" letter-spacing="0.9" fill="#fff">{{ venueTitle() }}</text>
          <!-- Tribunas rectangulares -->
          @for (s of stands(); track s.id) {
            <g [class.gone]="s.gone" [style.cursor]="s.gone ? 'not-allowed' : 'pointer'" (click)="!s.gone && pick.emit(s.id)">
              <polygon [attr.points]="s.points" [attr.fill]="s.color" [attr.fill-opacity]="s.qty > 0 ? 0.92 : 0.26" [attr.stroke]="s.qty > 0 ? '#fff' : s.color" [attr.stroke-opacity]="s.qty > 0 ? 0.9 : 0.5" stroke-width="2" stroke-linejoin="round"/>
              <text [attr.x]="s.labelX" [attr.y]="s.labelY" [attr.transform]="s.rotate ? 'rotate(' + s.rotate + ' ' + s.labelX + ' ' + s.labelY + ')' : null" text-anchor="middle" font-family="Inter, sans-serif" [attr.font-size]="s.fontSize" font-weight="800" letter-spacing="0.5" [attr.fill]="s.qty > 0 ? '#fff' : 'currentColor'">{{ s.name }}</text>
              @if (s.qty > 0) {
                <g [attr.transform]="'translate(' + s.labelX + ' ' + (s.labelY + (s.rotate ? 0 : 14)) + ')'">
                  <circle r="10" fill="#fff"/>
                  <text text-anchor="middle" y="4" font-family="Inter,sans-serif" font-size="11" font-weight="800" [attr.fill]="s.color">{{ s.qty }}</text>
                </g>
              }
            </g>
          }
        </svg>

      <!-- ===== THEATER: Teatro Nacional, Teatro Municipal, Teatro La Plaza ===== -->
      } @else if (shape() === 'theater') {
        <svg viewBox="0 0 320 270" role="img" [attr.aria-label]="'Plano interactivo de ' + venue()">
          <path d="M45 18 Q160 -2 275 18 L260 64 Q160 48 60 64 Z" fill="#7c1932" stroke="#fca5a5" stroke-opacity=".55"/>
          <!-- Escenario -->
          <ellipse cx="160" cy="40" rx="100" ry="28" fill="#e2e8f0"/>
          <text x="160" y="45" text-anchor="middle" font-family="Inter,sans-serif" font-size="13" font-weight="800" letter-spacing="2" fill="#0f172a">ESCENARIO</text>
          <!-- Patio de butacas (arcos de butacas) -->
          <path d="M 40 80 Q 160 60 280 80 L 300 240 Q 160 255 20 240 Z" fill="currentColor" fill-opacity="0.04" stroke="currentColor" stroke-opacity="0.12" stroke-width="1.5"/>
          <!-- Sectores en arcos -->
          @for (b of bands(); track b.id) {
            <g [class.gone]="b.gone" [style.cursor]="b.gone ? 'not-allowed' : 'pointer'" (click)="!b.gone && pick.emit(b.id)">
              <rect x="22" [attr.y]="b.y" width="276" [attr.height]="b.h" rx="10" [attr.fill]="b.color" [attr.fill-opacity]="b.qty > 0 ? 0.88 : 0.22" [attr.stroke]="b.qty > 0 ? '#fff' : b.color" [attr.stroke-opacity]="b.qty > 0 ? 0.9 : 0.5" stroke-width="1.5"/>
              <text x="160" [attr.y]="b.y + b.h / 2 + 5" text-anchor="middle" font-family="Inter,sans-serif" font-size="13" font-weight="700" [attr.fill]="b.qty > 0 ? '#fff' : 'currentColor'">{{ b.name }}</text>
              @if (b.qty > 0) {
                <g [attr.transform]="'translate(278 ' + (b.y + b.h / 2) + ')'">
                  <circle r="12" fill="#fff"/>
                  <text text-anchor="middle" y="4" font-family="Inter,sans-serif" font-size="12" font-weight="800" [attr.fill]="b.color">{{ b.qty }}</text>
                </g>
              }
            </g>
          }
          <text x="160" y="263" text-anchor="middle" font-family="Inter,sans-serif" font-size="8" font-weight="900" letter-spacing="1.1" fill="currentColor" fill-opacity=".7">{{ venueTitle() }}</text>
        </svg>

      <!-- ===== ARENA / COLISEO: Dibós, Arena 1 ===== -->
      } @else if (shape() === 'arena') {
        <svg viewBox="0 0 320 280" role="img" [attr.aria-label]="'Plano interactivo de ' + venue()">
          <!-- Anillo exterior circular -->
          <circle cx="160" cy="140" r="128" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.16" stroke-width="2"/>
          <!-- Piso central (escenario / cancha) -->
          <ellipse cx="160" cy="140" rx="66" ry="54" fill="#e2e8f0"/>
          <rect x="112" y="108" width="96" height="64" rx="14" fill="none" stroke="#64748b" stroke-width="1.5" stroke-dasharray="4 3"/>
          <text x="160" y="138" text-anchor="middle" font-family="Inter,sans-serif" font-size="12" font-weight="800" letter-spacing="1" fill="#0f172a">{{ centerLabel() }}</text>
          <text x="160" y="153" text-anchor="middle" font-family="Inter,sans-serif" font-size="6.5" font-weight="800" letter-spacing=".6" fill="#334155">{{ venueTitle() }}</text>
          <!-- Graderías radiales, una región interactiva por zona. -->
          @for (region of radialRegions(); track region.id) {
            <g [class.gone]="region.gone" [style.cursor]="region.gone ? 'not-allowed' : 'pointer'" (click)="!region.gone && pick.emit(region.id)">
              <path [attr.d]="region.path" [attr.fill]="region.color" [attr.fill-opacity]="region.qty ? 0.9 : 0.28" [attr.stroke]="region.qty ? '#fff' : region.color" stroke-width="2"/>
              <text [attr.x]="region.labelX" [attr.y]="region.labelY" text-anchor="middle" font-family="Inter,sans-serif" font-size="11" font-weight="800" [attr.fill]="region.qty ? '#fff' : 'currentColor'">{{ shortName(region.name) }}</text>
              @if (region.qty) { <circle [attr.cx]="region.labelX" [attr.cy]="region.labelY + 15" r="10" fill="#fff"/><text [attr.x]="region.labelX" [attr.y]="region.labelY + 19" text-anchor="middle" font-size="11" font-weight="800" [attr.fill]="region.color">{{ region.qty }}</text> }
            </g>
          }
        </svg>

      <!-- ===== ESPACIO ABIERTO: parques, explanadas y plazas ===== -->
      } @else if (shape() === 'outdoor') {
        <svg viewBox="0 0 320 270" role="img" [attr.aria-label]="'Plano interactivo de ' + venue()">
          <rect x="8" y="8" width="304" height="252" rx="26" fill="#0f766e" fill-opacity=".08" stroke="#2dd4bf" stroke-opacity=".25"/>
          @if (isCoastal()) {
            <path d="M6 232 Q45 215 82 232 T158 232 T234 232 T310 232" fill="none" stroke="#38bdf8" stroke-width="5" stroke-opacity=".5"/>
            <path d="M6 246 Q45 229 82 246 T158 246 T234 246 T310 246" fill="none" stroke="#7dd3fc" stroke-width="3" stroke-opacity=".35"/>
          } @else {
            <g fill="#22c55e" fill-opacity=".45">
              <circle cx="23" cy="52" r="10"/><circle cx="297" cy="52" r="10"/><circle cx="24" cy="221" r="11"/><circle cx="296" cy="221" r="11"/>
            </g>
          }
          <path d="M78 22 H242 L263 61 H57 Z" fill="#111827" stroke="#f8fafc" stroke-opacity=".5"/>
          <text x="160" y="48" text-anchor="middle" font-family="Inter,sans-serif" font-size="12" font-weight="900" letter-spacing="1.6" fill="#fff">ESCENARIO PRINCIPAL</text>
          <path d="M160 64 L160 235" stroke="currentColor" stroke-opacity=".12" stroke-dasharray="4 5"/>
          @for (region of fanRegions(); track region.id) {
            <g [class.gone]="region.gone" [style.cursor]="region.gone ? 'not-allowed' : 'pointer'" (click)="!region.gone && pick.emit(region.id)">
              <polygon [attr.points]="region.points" [attr.fill]="region.color" [attr.fill-opacity]="region.qty ? .9 : .25" [attr.stroke]="region.qty ? '#fff' : region.color" stroke-width="2" stroke-linejoin="round"/>
              <text [attr.x]="region.labelX" [attr.y]="region.labelY" text-anchor="middle" font-family="Inter,sans-serif" font-size="12" font-weight="800" [attr.fill]="region.qty ? '#fff' : 'currentColor'">{{ shortName(region.name) }}</text>
              @if (region.qty) { <circle [attr.cx]="region.labelX + 88" [attr.cy]="region.labelY - 4" r="10" fill="#fff"/><text [attr.x]="region.labelX + 88" [attr.y]="region.labelY" text-anchor="middle" font-size="11" font-weight="900" [attr.fill]="region.color">{{ region.qty }}</text> }
            </g>
          }
          <text x="160" y="258" text-anchor="middle" font-family="Inter,sans-serif" font-size="8" font-weight="900" letter-spacing="1.1" fill="currentColor" fill-opacity=".7">{{ venueTitle() }}</text>
        </svg>

      <!-- ===== AUDITORIO: Centro de Convenciones y Westin ===== -->
      } @else if (shape() === 'conference') {
        <svg viewBox="0 0 320 270" role="img" [attr.aria-label]="'Plano interactivo de ' + venue()">
          <rect x="8" y="8" width="304" height="252" rx="20" fill="#2563eb" fill-opacity=".06" stroke="#60a5fa" stroke-opacity=".25"/>
          <rect x="42" y="20" width="236" height="45" rx="8" fill="#0f172a" stroke="#93c5fd" stroke-opacity=".6"/>
          <rect x="64" y="28" width="132" height="27" rx="3" fill="#dbeafe"/>
          <path d="M208 55v-18h25v18m-34 0h43" fill="none" stroke="#f8fafc" stroke-width="2"/>
          <text x="130" y="46" text-anchor="middle" font-family="Inter,sans-serif" font-size="9" font-weight="900" letter-spacing="1" fill="#1e3a8a">PANTALLA</text>
          <path d="M160 70 V235" stroke="#94a3b8" stroke-opacity=".55" stroke-width="8" stroke-dasharray="4 5"/>
          @for (region of gridRegions(); track region.id) {
            <g [class.gone]="region.gone" [style.cursor]="region.gone ? 'not-allowed' : 'pointer'" (click)="!region.gone && pick.emit(region.id)">
              <rect [attr.x]="region.x" [attr.y]="region.y" [attr.width]="region.width" [attr.height]="region.height" rx="12" [attr.fill]="region.color" [attr.fill-opacity]="region.qty ? .88 : .25" [attr.stroke]="region.qty ? '#fff' : region.color" stroke-width="2"/>
              <path [attr.d]="'M ' + (region.x + 14) + ' ' + (region.y + region.height - 16) + ' H ' + (region.x + region.width - 14)" stroke="#fff" stroke-opacity=".35" stroke-width="4" stroke-dasharray="2 7"/>
              <text [attr.x]="region.x + region.width / 2" [attr.y]="region.y + region.height / 2" text-anchor="middle" font-family="Inter,sans-serif" font-size="11" font-weight="800" [attr.fill]="region.qty ? '#fff' : 'currentColor'">{{ shortName(region.name) }}</text>
              @if (region.qty) { <circle [attr.cx]="region.x + region.width - 16" [attr.cy]="region.y + 16" r="10" fill="#fff"/><text [attr.x]="region.x + region.width - 16" [attr.y]="region.y + 20" text-anchor="middle" font-size="11" font-weight="900" [attr.fill]="region.color">{{ region.qty }}</text> }
            </g>
          }
          <text x="160" y="258" text-anchor="middle" font-family="Inter,sans-serif" font-size="8" font-weight="900" letter-spacing="1.1" fill="currentColor" fill-opacity=".7">{{ venueTitle() }}</text>
        </svg>

      <!-- ===== CIRCUITO: carreras en Costa Verde ===== -->
      } @else if (shape() === 'route') {
        <svg viewBox="0 0 320 270" role="img" [attr.aria-label]="'Plano interactivo de ' + venue()">
          <path d="M5 226 Q52 205 93 226 T176 226 T259 226 T335 226" fill="none" stroke="#38bdf8" stroke-width="34" stroke-opacity=".15"/>
          <path d="M12 243 Q52 222 93 243 T176 243 T259 243 T330 243" fill="none" stroke="#7dd3fc" stroke-width="3" stroke-opacity=".5"/>
          <path d="M42 32 H278" stroke="#f8fafc" stroke-width="2" stroke-dasharray="5 4" stroke-opacity=".7"/>
          <text x="44" y="24" font-family="Inter,sans-serif" font-size="8" font-weight="900" fill="#22c55e">SALIDA</text>
          <text x="274" y="24" text-anchor="end" font-family="Inter,sans-serif" font-size="8" font-weight="900" fill="#f43f5e">META</text>
          @for (region of routeRegions(); track region.id) {
            <g [class.gone]="region.gone" [style.cursor]="region.gone ? 'not-allowed' : 'pointer'" (click)="!region.gone && pick.emit(region.id)">
              <path [attr.d]="region.path" fill="none" [attr.stroke]="region.qty ? '#fff' : region.color" stroke-width="24" stroke-linecap="round" [attr.stroke-opacity]="region.qty ? .95 : .32"/>
              <path [attr.d]="region.path" fill="none" [attr.stroke]="region.color" stroke-width="3" stroke-linecap="round" stroke-dasharray="6 4"/>
              <text [attr.x]="region.labelX" [attr.y]="region.labelY" text-anchor="middle" font-family="Inter,sans-serif" font-size="11" font-weight="900" [attr.fill]="region.qty ? region.color : 'currentColor'">{{ shortName(region.name) }}</text>
              @if (region.qty) { <circle [attr.cx]="region.labelX + 55" [attr.cy]="region.labelY - 4" r="10" fill="#fff"/><text [attr.x]="region.labelX + 55" [attr.y]="region.labelY" text-anchor="middle" font-size="11" font-weight="900" [attr.fill]="region.color">{{ region.qty }}</text> }
            </g>
          }
          <text x="160" y="260" text-anchor="middle" font-family="Inter,sans-serif" font-size="8" font-weight="900" letter-spacing="1.1" fill="currentColor" fill-opacity=".7">{{ venueTitle() }}</text>
        </svg>

      <!-- ===== CLUB: formato íntimo con mesas y barra ===== -->
      } @else if (shape() === 'club') {
        <svg viewBox="0 0 320 270" role="img" [attr.aria-label]="'Plano interactivo de ' + venue()">
          <rect x="12" y="10" width="296" height="248" rx="28" fill="#7c3aed" fill-opacity=".08" stroke="#c084fc" stroke-opacity=".3"/>
          <path d="M88 24 H232 L250 66 H70 Z" fill="#111827" stroke="#e9d5ff" stroke-opacity=".6"/>
          <text x="160" y="49" text-anchor="middle" font-family="Inter,sans-serif" font-size="11" font-weight="900" letter-spacing="1.3" fill="#fff">LIVE STAGE</text>
          @for (region of clubRegions(); track region.id) {
            <g [class.gone]="region.gone" [style.cursor]="region.gone ? 'not-allowed' : 'pointer'" (click)="!region.gone && pick.emit(region.id)">
              <rect [attr.x]="region.x" [attr.y]="region.y" [attr.width]="region.width" [attr.height]="region.height" rx="14" [attr.fill]="region.color" [attr.fill-opacity]="region.qty ? .88 : .24" [attr.stroke]="region.qty ? '#fff' : region.color" stroke-width="2"/>
              <text [attr.x]="region.x + region.width / 2" [attr.y]="region.y + 23" text-anchor="middle" font-family="Inter,sans-serif" font-size="11" font-weight="900" [attr.fill]="region.qty ? '#fff' : 'currentColor'">{{ shortName(region.name) }}</text>
              @if ($index === 0) {
                <g fill="#fff" fill-opacity=".55"><circle [attr.cx]="region.x + 36" [attr.cy]="region.y + 65" r="12"/><circle [attr.cx]="region.x + 86" [attr.cy]="region.y + 65" r="12"/><circle [attr.cx]="region.x + 136" [attr.cy]="region.y + 65" r="12"/><circle [attr.cx]="region.x + 60" [attr.cy]="region.y + 112" r="12"/><circle [attr.cx]="region.x + 112" [attr.cy]="region.y + 112" r="12"/></g>
              } @else {
                <path [attr.d]="'M ' + (region.x + 14) + ' ' + (region.y + 48) + ' V ' + (region.y + region.height - 14)" stroke="#fff" stroke-opacity=".55" stroke-width="8" stroke-dasharray="3 8"/>
              }
              @if (region.qty) { <circle [attr.cx]="region.x + region.width - 16" [attr.cy]="region.y + 17" r="10" fill="#fff"/><text [attr.x]="region.x + region.width - 16" [attr.y]="region.y + 21" text-anchor="middle" font-size="11" font-weight="900" [attr.fill]="region.color">{{ region.qty }}</text> }
            </g>
          }
          <text x="160" y="258" text-anchor="middle" font-family="Inter,sans-serif" font-size="8" font-weight="900" letter-spacing="1.1" fill="currentColor" fill-opacity=".7">{{ venueTitle() }}</text>
        </svg>

      <!-- ===== OCTAGON: Estadio Monumental y default ===== -->
      } @else {
      <svg viewBox="0 0 320 250" role="img" [attr.aria-label]="'Plano interactivo de ' + venue()">
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
          <rect x="98" y="80" width="124" height="90" rx="7" fill="none" stroke="#ffffff" stroke-opacity="0.85" stroke-width="2"/>
          <line x1="160" y1="80" x2="160" y2="170" stroke="#ffffff" stroke-opacity="0.85" stroke-width="2"/>
          <circle cx="160" cy="125" r="13" fill="none" stroke="#ffffff" stroke-opacity="0.85" stroke-width="2"/>
          <rect x="98" y="108" width="14" height="34" fill="none" stroke="#ffffff" stroke-opacity="0.8" stroke-width="2" />
          <rect x="208" y="108" width="14" height="34" fill="none" stroke="#ffffff" stroke-opacity="0.8" stroke-width="2" />
          <text x="160" y="159" text-anchor="middle" font-family="Inter,sans-serif" font-size="6.5" font-weight="900" letter-spacing=".9" fill="#fff">{{ venueTitle() }}</text>
        </g>
      </svg>
      }

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
    :host-context(.map-modal-body) { height: 100%; min-height: 0; }
    :host-context(.map-modal-body) svg { width: 100%; height: 100%; max-height: 100%; }
    :host-context(.map-modal-body) .img-map,
    :host-context(.map-modal-body) .img-map img { width: 100%; height: 100%; object-fit: contain; }
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
    .img-map .hot .spot.selected { fill-opacity: 0.5; }
    .img-map .hot .spot.sold { fill-opacity: 0.08; cursor: not-allowed !important; }
  `,
})
export class ZoneMap {
  readonly zones = input.required<Zone[]>();
  /** zoneId -> cantidad seleccionada */
  readonly quantities = input<Record<string, number>>({});
  /** Fuerza el modo estadio (gradería alrededor de la cancha). */
  readonly stadium = input(false);
  /** Nombre del recinto para escoger una geometría referencial. */
  readonly venue = input('');
  /** Plano-imagen del recinto; si carga, reemplaza al plano generado. */
  readonly image = input<string | null>(null);
  /** Polígonos clicables sobre el plano-imagen (coords 0..100). */
  readonly hotspots = input<MapHotspot[]>([]);
  readonly pick = output<string>();

  readonly imgFailed = signal(false);
  readonly shape = computed<VenueShape>(() => resolveVenueShape(this.venue()));
  readonly venueTitle = computed(() => {
    const name = this.venue().trim() || 'Recinto';
    return (name.length > 34 ? `${name.slice(0, 32)}…` : name).toUpperCase();
  });
  readonly centerLabel = computed(() =>
    /coliseo|dibos|estadio/i.test(this.venue()) ? 'CANCHA' : 'ESCENARIO',
  );
  readonly isCoastal = computed(() => /costa verde|explanada/i.test(this.venue()));

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

  readonly asVenuePlan = computed(() => {
    const venue = this.venue().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    return (this.stadium() || this.shape() !== 'octagon' || /estadio/.test(venue)) &&
      this.zones().length >= 2 && this.zones().length <= 12;
  });

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

  readonly radialRegions = computed<RadialRegion[]>(() => {
    const zones = this.zones();
    const quantities = this.quantities();
    return zones.map((zone, index) => {
      const start = -90 + index * 360 / zones.length + 2;
      const end = -90 + (index + 1) * 360 / zones.length - 2;
      const mid = (start + end) / 2;
      return {
        id: zone.id,
        name: zone.name,
        color: zoneColor(index),
        qty: quantities[zone.id] ?? 0,
        gone: zone.capacity <= zone.sold,
        path: annularSector(160, 140, 78, 124, start, end),
        labelX: 160 + Math.cos(mid * Math.PI / 180) * 101,
        labelY: 144 + Math.sin(mid * Math.PI / 180) * 101,
      };
    });
  });

  readonly fanRegions = computed<PlanRegion[]>(() => {
    const zones = this.zones();
    const quantities = this.quantities();
    const height = Math.min(46, 138 / Math.max(1, zones.length));
    return zones.map((zone, index) => {
      const y = 72 + index * (height + 4);
      const inset = Math.min(16, index * 5);
      return {
        id: zone.id,
        name: zone.name,
        color: zoneColor(index),
        qty: quantities[zone.id] ?? 0,
        gone: zone.capacity <= zone.sold,
        points: `${46 + inset},${y} ${274 - inset},${y} ${285 - inset},${y + height} ${35 + inset},${y + height}`,
        labelX: 160,
        labelY: y + height / 2 + 4,
      };
    });
  });

  readonly gridRegions = computed<GridRegion[]>(() => {
    const zones = this.zones();
    const quantities = this.quantities();
    const columns = zones.length === 1 ? 1 : 2;
    const rows = Math.ceil(zones.length / columns);
    const gap = 12;
    const width = columns === 1 ? 270 : (270 - gap) / 2;
    const height = Math.min(70, (158 - (rows - 1) * gap) / rows);
    return zones.map((zone, index) => ({
      id: zone.id,
      name: zone.name,
      color: zoneColor(index),
      qty: quantities[zone.id] ?? 0,
      gone: zone.capacity <= zone.sold,
      x: 25 + (index % columns) * (width + gap),
      y: 78 + Math.floor(index / columns) * (height + gap),
      width,
      height,
    }));
  });

  readonly clubRegions = computed<GridRegion[]>(() => {
    const zones = this.zones();
    const quantities = this.quantities();
    return zones.map((zone, index) => ({
      id: zone.id,
      name: zone.name,
      color: zoneColor(index),
      qty: quantities[zone.id] ?? 0,
      gone: zone.capacity <= zone.sold,
      x: index === 0 ? 24 : 220,
      y: index === 0 ? 78 : 78 + (index - 1) * (152 / Math.max(1, zones.length - 1)),
      width: index === 0 ? 184 : 76,
      height: index === 0 ? 152 : 142 / Math.max(1, zones.length - 1),
    }));
  });

  readonly routeRegions = computed<RouteRegion[]>(() => {
    const zones = this.zones();
    const quantities = this.quantities();
    const paths = [
      'M45 72 C100 48 220 48 275 72',
      'M38 124 C92 94 228 94 282 124',
      'M30 180 C88 144 232 144 290 180',
      'M26 216 C90 184 230 184 294 216',
    ];
    return zones.map((zone, index) => ({
      id: zone.id,
      name: zone.name,
      color: zoneColor(index),
      qty: quantities[zone.id] ?? 0,
      gone: zone.capacity <= zone.sold,
      path: paths[index] ?? `M30 ${72 + index * 36} H290`,
      labelX: 160,
      labelY: 70 + index * 54,
    }));
  });

  shortName(name: string): string {
    return name.length > 14 ? `${name.slice(0, 12)}…` : name;
  }

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

function annularSector(cx: number, cy: number, inner: number, outer: number, start: number, end: number): string {
  const point = (radius: number, angle: number) => {
    const radians = angle * Math.PI / 180;
    return `${cx + radius * Math.cos(radians)},${cy + radius * Math.sin(radians)}`;
  };
  const large = end - start > 180 ? 1 : 0;
  return `M ${point(outer, start)} A ${outer} ${outer} 0 ${large} 1 ${point(outer, end)} L ${point(inner, end)} A ${inner} ${inner} 0 ${large} 0 ${point(inner, start)} Z`;
}
