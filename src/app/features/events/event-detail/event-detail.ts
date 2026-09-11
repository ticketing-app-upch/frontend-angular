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
import { RouterLink } from '@angular/router';
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
import { addToCalendar } from '../../../shared/event-actions';
import { matchArt } from '../../../shared/event-image';

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
  readonly calendar = addToCalendar;
  readonly price = zonePrice;
  private events = inject(EventService);
  private auth = inject(AuthService);

  /** Ligado desde la ruta `eventos/:id` (withComponentInputBinding). */
  readonly id = input.required<string>();

  readonly loading = signal(true);
  readonly notFound = signal(false);
  readonly event = signal<EventItem | null>(null);

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
      this.notFound.set(false);
      const request = this.events.getById(id).subscribe({
        next: (ev) => {
          this.event.set(ev);
          this.loading.set(false);
        },
        error: () => {
          this.notFound.set(true);
          this.loading.set(false);
        },
      });
      onCleanup(() => request.unsubscribe());
    });
  }

  async share(): Promise<void> {
    try { await navigator.clipboard.writeText(location.href); this.notify.success('Enlace del evento copiado.'); }
    catch { this.notify.info('Copia la dirección del evento desde la barra del navegador.'); }
  }

  zoneAvailable(sold: number, capacity: number): number {
    return Math.max(0, capacity - sold);
  }
}
