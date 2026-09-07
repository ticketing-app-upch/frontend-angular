import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import {
  CurrencyPipe,
  DatePipe,
  DecimalPipe,
  TitleCasePipe,
} from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { computeCapacity, EventItem } from '../../core/models/event.model';
import { CapacityBar } from '../capacity-bar/capacity-bar';
import { matchArt } from '../event-image';

@Component({
  selector: 'tkt-event-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    CurrencyPipe,
    DatePipe,
    DecimalPipe,
    TitleCasePipe,
    MatIconModule,
    CapacityBar,
  ],
  template: `
    <a class="card" [routerLink]="['/eventos', event().id]">
      <div class="media">
        @if (match(); as m) {
          <span
            class="match-bg"
            [style.background-image]="'url(' + event().imageUrl + ')'"
          ></span>
          <span class="match-crests">
            <img
              [src]="m.crestA"
              [alt]="m.teamA"
              (error)="onCrestError($event, m.crestAAlt)"
            />
            <span class="vs">VS</span>
            <img
              [src]="m.crestB"
              [alt]="m.teamB"
              (error)="onCrestError($event, m.crestBAlt)"
            />
          </span>
        } @else {
          <img [src]="event().imageUrl" [alt]="event().name" loading="lazy" />
        }
        <span class="media-grad"></span>

        <span class="chip cat">{{ event().category | titlecase }}</span>

        <span class="date-badge">
          <span class="d">{{ event().startsAt | date: 'd' }}</span>
          <span class="m">{{ event().startsAt | date: 'MMM' }}</span>
        </span>

        @if (soldOut()) {
          <span class="chip status sold">Agotado</span>
        } @else if (lowStock()) {
          <span class="chip status low">¡Últimas!</span>
        }
      </div>

      <div class="body">
        <h3>{{ event().name }}</h3>

        <p class="meta">
          <mat-icon>place</mat-icon>
          {{ event().venue }} · {{ event().city }}
        </p>
        <p class="meta">
          <mat-icon>schedule</mat-icon>
          {{ event().startsAt | date: "EEE d 'de' MMM · HH:mm" }}
        </p>

        <div class="cap">
          <tkt-capacity-bar
            [sold]="capacity().sold"
            [total]="capacity().total"
            [showLabel]="false"
          />
          <span class="cap-label">
            {{ capacity().available | number }} disponibles
          </span>
        </div>

        <div class="foot">
          <span class="price">
            <span class="from">desde</span>
            <strong>{{ minPrice() | currency: 'PEN' : 'symbol-narrow' : '1.0-0' }}</strong>
          </span>
          <span class="go" aria-hidden="true">
            Ver <mat-icon>arrow_forward</mat-icon>
          </span>
        </div>
      </div>
    </a>
  `,
  styles: `
    :host { display: block; height: 100%; }

    .card {
      display: flex;
      flex-direction: column;
      height: 100%;
      text-decoration: none;
      color: inherit;
      background: var(--mat-sys-surface);
      border: 1px solid color-mix(in srgb, var(--mat-sys-on-surface) 9%, transparent);
      border-radius: 18px;
      overflow: hidden;
      transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
    }
    .card:hover {
      transform: translateY(-5px);
      border-color: color-mix(in srgb, var(--mat-sys-primary) 30%, transparent);
      box-shadow: 0 2px 4px rgba(16, 12, 40, 0.05), 0 22px 45px -20px rgba(76, 29, 149, 0.35);
    }

    .media {
      position: relative;
      aspect-ratio: 16 / 9;
      background: color-mix(in srgb, var(--mat-sys-on-surface) 8%, transparent);
      overflow: hidden;
    }
    .media img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center 42%;
      display: block;
      transition: transform 0.4s ease;
    }
    .card:hover .media img { transform: scale(1.06); }

    .match-bg {
      position: absolute;
      inset: -8%;
      background-size: cover;
      background-position: center;
      filter: blur(9px) brightness(0.42) saturate(1.1);
    }
    .match-crests {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8%;
      padding: 14% 12%;
    }
    .match-crests img {
      width: auto;
      height: 100%;
      max-height: 100%;
      max-width: 42%;
      object-fit: contain;
      filter: drop-shadow(0 8px 18px rgba(0, 0, 0, 0.55));
      transition: transform 0.3s ease;
    }
    .card:hover .match-crests img:first-of-type { transform: translateX(-4px) rotate(-3deg); }
    .card:hover .match-crests img:last-of-type { transform: translateX(4px) rotate(3deg); }
    .match-crests .vs {
      color: #fff;
      font-weight: 800;
      font-size: 1.15rem;
      letter-spacing: 0.06em;
      text-shadow: 0 2px 10px rgba(0, 0, 0, 0.6);
    }

    .media-grad {
      position: absolute;
      inset: 0;
      background: linear-gradient(
        180deg,
        rgba(0, 0, 0, 0.28) 0%,
        transparent 32%,
        transparent 68%,
        rgba(0, 0, 0, 0.32) 100%
      );
    }

    .chip {
      position: absolute;
      display: inline-flex;
      align-items: center;
      padding: 0.24rem 0.62rem;
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.02em;
      border-radius: 999px;
      color: #fff;
      backdrop-filter: blur(6px);
    }
    .chip.cat {
      top: 12px;
      left: 12px;
      background: rgba(15, 8, 25, 0.5);
      border: 1px solid rgba(255, 255, 255, 0.16);
    }
    .chip.status { top: 12px; right: 12px; }
    .chip.status.sold { background: #b3261e; }
    .chip.status.low {
      background: var(--tkt-accent);
      box-shadow: 0 6px 16px -6px color-mix(in srgb, var(--tkt-accent) 70%, transparent);
    }

    .date-badge {
      position: absolute;
      right: 12px;
      bottom: 12px;
      display: flex;
      flex-direction: column;
      align-items: center;
      min-width: 46px;
      padding: 0.3rem 0.4rem 0.35rem;
      border-radius: 12px;
      background: color-mix(in srgb, var(--mat-sys-surface) 92%, transparent);
      backdrop-filter: blur(6px);
      box-shadow: 0 6px 18px -8px rgba(0, 0, 0, 0.4);
      line-height: 1;
    }
    .date-badge .d {
      font-size: 1.15rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: var(--mat-sys-on-surface);
    }
    .date-badge .m {
      margin-top: 0.1rem;
      font-size: 0.62rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--tkt-accent-strong);
    }

    .body {
      padding: 1rem 1.15rem 1.2rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      flex: 1;
    }

    h3 {
      margin: 0;
      font-size: 1.05rem;
      font-weight: 700;
      letter-spacing: -0.01em;
      line-height: 1.3;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .meta {
      margin: 0;
      display: flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.84rem;
      color: var(--mat-sys-on-surface-variant);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .meta mat-icon {
      font-size: 1rem;
      width: 1rem;
      height: 1rem;
      flex: none;
    }

    .cap {
      margin-top: 0.15rem;
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
    }
    .cap-label {
      font-size: 0.76rem;
      color: var(--mat-sys-on-surface-variant);
    }

    .foot {
      margin-top: auto;
      padding-top: 0.7rem;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .price {
      display: flex;
      flex-direction: column;
      line-height: 1.1;
    }
    .price .from {
      font-size: 0.7rem;
      color: var(--mat-sys-on-surface-variant);
    }
    .price strong {
      font-size: 1.15rem;
      font-weight: 800;
      color: var(--tkt-accent-strong);
      letter-spacing: -0.01em;
    }

    .go {
      display: inline-flex;
      align-items: center;
      gap: 0.15rem;
      font-size: 0.82rem;
      font-weight: 700;
      color: var(--mat-sys-primary);
      opacity: 0;
      transform: translateX(-4px);
      transition: opacity 0.18s ease, transform 0.18s ease;
    }
    .go mat-icon { font-size: 1rem; width: 1rem; height: 1rem; }
    .card:hover .go { opacity: 1; transform: translateX(0); }

    @media (prefers-reduced-motion: reduce) {
      .card, .media img, .go { transition: none; }
      .card:hover { transform: none; }
      .card:hover .media img { transform: none; }
      .card:hover .go { opacity: 1; transform: none; }
    }
  `,
})
export class EventCard {
  readonly event = input.required<EventItem>();

  readonly capacity = computed(() => computeCapacity(this.event()));

  readonly minPrice = computed(() =>
    Math.min(...this.event().zones.map((z) => z.price)),
  );

  readonly soldOut = computed(() => this.capacity().available === 0);

  /** Escudos + "VS" para partidos de fútbol; null en el resto. */
  readonly match = computed(() =>
    matchArt(this.event().name, this.event().category),
  );

  /** Si el logo real no carga, cae al escudo generado. */
  onCrestError(event: Event, fallback: string): void {
    const img = event.target as HTMLImageElement;
    if (img.src !== fallback) img.src = fallback;
  }

  /** Menos del 8% del aforo disponible (pero aún quedan). */
  readonly lowStock = computed(() => {
    const cap = this.capacity();
    return cap.available > 0 && cap.total > 0 && cap.available / cap.total < 0.08;
  });
}
