import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import {
  CurrencyPipe,
  DatePipe,
  DecimalPipe,
  TitleCasePipe,
} from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { EventService } from '../../../core/services/event.service';
import {
  computeCapacity,
  EventItem,
} from '../../../core/models/event.model';
import { AuthService } from '../../../core/auth/auth.service';
import { CapacityBar } from '../../../shared/capacity-bar/capacity-bar';
import { EmptyState } from '../../../shared/empty-state/empty-state';
import { DiscoveryService } from '../../../core/services/discovery.service';
import { NotificationService } from '../../../core/services/notification.service';
import { zonePrice } from '../../../core/models/ticketing-rules';
import { copyEventLink } from '../../../shared/event-share';
import { matchArt } from '../../../shared/event-image';
import { venueMap } from '../../../shared/event-image';
import { zoneColor } from '../../../shared/zone-map/zone-map';
import { BannerPalette, DEFAULT_BANNER_PALETTE, paletteFromImage } from '../../../shared/banner-palette';

@Component({
  selector: 'tkt-event-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    CurrencyPipe,
    DatePipe,
    DecimalPipe,
    TitleCasePipe,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    CapacityBar,
    EmptyState,
  ],
  templateUrl: './event-detail.html',
  styleUrl: './event-detail.scss',
})
export class EventDetail {
  readonly discovery = inject(DiscoveryService);
  private notify = inject(NotificationService);
  readonly price = zonePrice;
  private events = inject(EventService);
  private auth = inject(AuthService);
  private router = inject(Router);

  toggleFavorite(id: string): void {
    if (!this.auth.isClient()) {
      void this.router.navigate(['/auth/login'], { queryParams: { redirect: this.router.url } });
      return;
    }
    this.discovery.toggle(id);
  }

  /** Ligado desde la ruta `eventos/:id` (withComponentInputBinding). */
  readonly id = input.required<string>();

  readonly loading = signal(true);
  readonly intro = signal(true);
  readonly notFound = signal(false);
  readonly event = signal<EventItem | null>(null);
  readonly palette = signal<BannerPalette>(DEFAULT_BANNER_PALETTE);
  readonly venueMap = venueMap;
  readonly zoneColor = zoneColor;

  onBannerLoad(event: Event): void {
    this.palette.set(paletteFromImage(event.target as HTMLImageElement));
  }

  readonly isAuthenticated = this.auth.isAuthenticated;
  readonly isOrganizer = computed(() => this.auth.isOrganizer() || this.auth.isAdmin());

  readonly capacity = computed(() => {
    const e = this.event();
    return e ? computeCapacity(e) : null;
  });

  readonly soldOut = computed(() => !this.capacity()?.available);
  readonly ended = computed(() => Date.parse(this.event()?.startsAt ?? '') <= Date.now() || this.event()?.status !== 'PUBLICADO');

  readonly match = computed(() => {
    const e = this.event();
    return e ? matchArt(e.name, e.category) : null;
  });

  onCrestError(event: Event, fallback: string): void {
    const img = event.target as HTMLImageElement;
    if (img.src !== fallback) img.src = fallback;
  }

  readonly minPrice = computed(() => {
    const e = this.event();
    const available = e?.zones.filter(z => z.capacity > z.sold) ?? [];
    return e && available.length ? Math.min(...available.map(z => zonePrice(e, z).unitPrice)) : 0;
  });

  constructor() {
    effect((onCleanup) => {
      const id = this.id();
      this.loading.set(true);
      this.intro.set(true);
      this.palette.set(DEFAULT_BANNER_PALETTE);
      this.notFound.set(false);
      const started = performance.now();
      let introTimer: ReturnType<typeof setTimeout> | undefined;
      const request = this.events.getById(id).subscribe({
        next: (ev) => {
          this.event.set(ev);
          this.loading.set(false);
          introTimer = setTimeout(() => this.intro.set(false), Math.max(0, 750 - (performance.now() - started)));
        },
        error: () => {
          this.notFound.set(true);
          this.loading.set(false);
          this.intro.set(false);
        },
      });
      onCleanup(() => { request.unsubscribe(); if (introTimer) clearTimeout(introTimer); });
    });
  }

  async share(): Promise<void> {
    const event = this.event();
    if (!event) return;
    try { await copyEventLink(event.id); this.notify.success('Enlace copiado'); }
    catch { this.notify.error('No se pudo copiar el enlace.'); }
  }

  zoneAvailable(sold: number, capacity: number): number {
    return Math.max(0, capacity - sold);
  }
}
