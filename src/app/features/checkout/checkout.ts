import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { EventService } from '../../core/services/event.service';
import { PriceQuote, PricingService } from '../../core/services/pricing.service';
import { TicketService } from '../../core/services/ticket.service';
import { NotificationService } from '../../core/services/notification.service';
import { EventItem } from '../../core/models/event.model';
import { TicketOrder } from '../../core/models/ticket.model';
import { EmptyState } from '../../shared/empty-state/empty-state';
import { ZoneMap, zoneColor } from '../../shared/zone-map/zone-map';
import { matchArt, venueMap, venueHotspots } from '../../shared/event-image';

const SERVICE_FEE_RATE = 0.06;

@Component({
  selector: 'tkt-checkout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    CurrencyPipe,
    DatePipe,
    DecimalPipe,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    EmptyState,
    ZoneMap,
  ],
  templateUrl: './checkout.html',
  styleUrl: './checkout.scss',
})
export class Checkout {
  private events = inject(EventService);
  private pricing = inject(PricingService);
  private tickets = inject(TicketService);
  private notify = inject(NotificationService);
  private router = inject(Router);

  readonly eventId = input.required<string>();

  readonly loading = signal(true);
  readonly notFound = signal(false);
  readonly event = signal<EventItem | null>(null);

  /** zoneId -> cantidad elegida */
  readonly quantities = signal<Record<string, number>>({});

  readonly reviewing = signal(false);
  readonly quoting = signal(false);
  readonly quote = signal<PriceQuote | null>(null);

  readonly placing = signal(false);
  readonly order = signal<TicketOrder | null>(null);

  readonly zoneColor = zoneColor;

  readonly match = computed(() => {
    const e = this.event();
    return e ? matchArt(e.name, e.category) : null;
  });

  readonly venuePlan = computed(() => venueMap(this.event()?.venue));
  readonly venueSpots = computed(() => {
    const e = this.event();
    return e ? venueHotspots(e.venue, e.zones) : [];
  });

  readonly totalQty = computed(() =>
    Object.values(this.quantities()).reduce((a, n) => a + n, 0),
  );

  readonly maxPerOrder = computed(() => this.event()?.maxPerOrder ?? 0);
  readonly remaining = computed(() => this.maxPerOrder() - this.totalQty());
  readonly hasSelection = computed(() => this.totalQty() > 0);

  readonly selectedLines = computed(() => {
    const ev = this.event();
    if (!ev) return [];
    const q = this.quantities();
    return ev.zones
      .filter((z) => (q[z.id] ?? 0) > 0)
      .map((z) => ({ zone: z, qty: q[z.id] ?? 0 }));
  });

  /** Total provisional (antes de pedir la cotización oficial). */
  readonly provisional = computed(() => {
    const subtotal = this.selectedLines().reduce(
      (a, l) => a + l.zone.price * l.qty,
      0,
    );
    const fee = round2(subtotal * SERVICE_FEE_RATE);
    return { subtotal: round2(subtotal), fee, total: round2(subtotal + fee) };
  });

  constructor() {
    effect(() => {
      const id = this.eventId();
      this.loading.set(true);
      this.events.getById(id).subscribe({
        next: (ev) => {
          this.event.set(ev);
          this.quantities.set(
            Object.fromEntries(ev.zones.map((z) => [z.id, 0])),
          );
          this.loading.set(false);
        },
        error: () => {
          this.notFound.set(true);
          this.loading.set(false);
        },
      });
    });
  }

  zoneAvailable(zoneId: string): number {
    const zone = this.event()?.zones.find((z) => z.id === zoneId);
    return zone ? Math.max(0, zone.capacity - zone.sold) : 0;
  }

  canAdd(zoneId: string): boolean {
    return (
      this.remaining() > 0 && this.currentQty(zoneId) < this.zoneAvailable(zoneId)
    );
  }

  currentQty(zoneId: string): number {
    return this.quantities()[zoneId] ?? 0;
  }

  change(zoneId: string, delta: number): void {
    const next = { ...this.quantities() };
    const value = (next[zoneId] ?? 0) + delta;
    if (value < 0) return;
    if (delta > 0 && !this.canAdd(zoneId)) return;
    next[zoneId] = value;
    this.quantities.set(next);
    this.quote.set(null);
    this.reviewing.set(false);
  }

  startReview(): void {
    if (!this.hasSelection()) return;
    this.reviewing.set(true);
    this.requestQuote();
  }

  backToSelection(): void {
    this.reviewing.set(false);
    this.quote.set(null);
  }

  private requestQuote(): void {
    const ev = this.event();
    if (!ev || !this.hasSelection()) return;
    const items = this.selectedLines().map((l) => ({
      zoneId: l.zone.id,
      quantity: l.qty,
    }));
    this.quoting.set(true);
    this.pricing.quote(ev, items).subscribe({
      next: (q) => {
        this.quote.set(q);
        this.quoting.set(false);
      },
      error: () => {
        this.quoting.set(false);
        this.reviewing.set(false);
        this.notify.error('No se pudo calcular el precio.');
      },
    });
  }

  confirm(): void {
    const ev = this.event();
    if (!ev || this.placing()) return;
    const items = this.selectedLines().map((l) => ({
      zoneId: l.zone.id,
      quantity: l.qty,
    }));
    this.placing.set(true);
    this.tickets.createOrder({ eventId: ev.id, items }).subscribe({
      next: (ord) => {
        this.order.set(ord);
        this.placing.set(false);
        this.notify.success('¡Compra confirmada!');
      },
      error: (err) => {
        this.placing.set(false);
        this.notify.error(err?.message ?? 'No se pudo completar la compra.');
      },
    });
  }

  goToTickets(): void {
    this.router.navigate(['/mis-entradas']);
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
