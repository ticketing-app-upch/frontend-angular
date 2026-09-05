import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CurrencyPipe, DatePipe, TitleCasePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { computeCapacity, EventItem } from '../../core/models/event.model';
import { CapacityBar } from '../capacity-bar/capacity-bar';

@Component({
  selector: 'tkt-event-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    CurrencyPipe,
    DatePipe,
    TitleCasePipe,
    MatCardModule,
    MatChipsModule,
    MatIconModule,
    CapacityBar,
  ],
  template: `
    <a class="card" [routerLink]="['/eventos', event().id]">
      <div class="media">
        <img [src]="event().imageUrl" [alt]="event().name" loading="lazy" />
        <span class="chip">{{ event().category | titlecase }}</span>
        @if (capacity().available === 0) {
          <span class="chip sold">Agotado</span>
        }
      </div>
      <div class="body">
        <h3>{{ event().name }}</h3>
        <p class="meta">
          <mat-icon inline>event</mat-icon>
          {{ event().startsAt | date: "EEE d 'de' MMM, HH:mm" }}
        </p>
        <p class="meta">
          <mat-icon inline>place</mat-icon>
          {{ event().venue }}, {{ event().city }}
        </p>
        <tkt-capacity-bar
          [sold]="capacity().sold"
          [total]="capacity().total"
          [showLabel]="false"
        />
        <div class="foot">
          <span class="from">
            desde <strong>{{ minPrice() | currency: 'PEN' : 'symbol-narrow' : '1.0-0' }}</strong>
          </span>
          <span class="left">{{ capacity().available }} disponibles</span>
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
      border: 1px solid color-mix(in srgb, var(--mat-sys-on-surface) 8%, transparent);
      border-radius: var(--tkt-radius);
      overflow: hidden;
      transition: transform 0.18s ease, box-shadow 0.18s ease;
    }
    .card:hover {
      transform: translateY(-4px);
      box-shadow: var(--tkt-shadow);
    }
    .media { position: relative; aspect-ratio: 16 / 9; background: #ddd; }
    .media img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .chip {
      position: absolute;
      top: 10px;
      left: 10px;
      padding: 0.2rem 0.6rem;
      font-size: 0.72rem;
      font-weight: 600;
      border-radius: 999px;
      background: rgba(0, 0, 0, 0.62);
      color: #fff;
      backdrop-filter: blur(2px);
    }
    .chip.sold { left: auto; right: 10px; background: #b3261e; }
    .body { padding: 1rem 1.1rem 1.15rem; display: flex; flex-direction: column; gap: 0.5rem; flex: 1; }
    h3 { margin: 0; font-size: 1.05rem; font-weight: 700; letter-spacing: -0.01em; }
    .meta {
      margin: 0;
      display: flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.85rem;
      color: var(--mat-sys-on-surface-variant);
    }
    .meta mat-icon { font-size: 1rem; width: 1rem; height: 1rem; }
    .foot {
      margin-top: auto;
      padding-top: 0.5rem;
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      font-size: 0.85rem;
    }
    .from strong { font-size: 1rem; }
    .left { color: var(--mat-sys-on-surface-variant); }
  `,
})
export class EventCard {
  readonly event = input.required<EventItem>();

  readonly capacity = computed(() => computeCapacity(this.event()));
  readonly minPrice = computed(() =>
    Math.min(...this.event().zones.map((z) => z.price)),
  );
}
