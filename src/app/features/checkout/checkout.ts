import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  HostListener,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { SERVICE_FEE_RATE, zonePrice } from '../../core/models/ticketing-rules';
import { Zone } from '../../core/models/event.model';
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
import { matchArt, venueMap, venueHotspots, venueShape, VenueShape } from '../../shared/event-image';


@Component({
  selector: 'tkt-checkout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    FormsModule,
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

  private quoteRequest?: Subscription;
  private attemptKey = crypto.randomUUID();
  readonly secondsLeft = signal(0);
  private expiresAt = 0;
  paymentMethod: 'CARD' | 'WALLET' = 'CARD';
  readonly paymentGateway = signal(false);
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
  readonly mapZoom = signal(false);
  readonly legendHeight = signal(178);
  readonly legendCollapsed = signal(false);
  readonly legendPanelHeight = computed(() => this.legendCollapsed() ? 44 : this.legendHeight());
  private resizingLegend = false;
  private legendStartY = 0;
  private legendStartHeight = 0;

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
  readonly venueShapeKind = computed<VenueShape>(() => venueShape(this.event()?.venue));
  readonly venueShapeLabel = computed(() => ({
    oval: 'ovalado', rectangle: 'rectangular', octagon: 'de estadio',
    theater: 'de teatro', arena: 'circular', outdoor: 'al aire libre',
    conference: 'de auditorio', route: 'de circuito', club: 'de club',
  })[this.venueShapeKind()]);

  openMap(): void {
    this.mapZoom.set(true);
  }

  @HostListener('document:keydown.escape')
  closeMap(): void {
    this.resizingLegend = false;
    this.mapZoom.set(false);
  }

  toggleLegend(): void {
    this.legendCollapsed.update((collapsed) => !collapsed);
  }

  startLegendResize(event: PointerEvent): void {
    if (this.legendCollapsed()) this.legendCollapsed.set(false);
    this.resizingLegend = true;
    this.legendStartY = event.clientY;
    this.legendStartHeight = this.legendHeight();
    event.preventDefault();
  }

  @HostListener('document:pointermove', ['$event'])
  resizeLegend(event: PointerEvent): void {
    if (!this.resizingLegend) return;
    const maxHeight = Math.min(340, window.innerHeight * 0.46);
    const nextHeight = this.legendStartHeight + this.legendStartY - event.clientY;
    this.legendHeight.set(Math.max(96, Math.min(maxHeight, nextHeight)));
    event.preventDefault();
  }

  @HostListener('document:pointerup')
  stopLegendResize(): void {
    this.resizingLegend = false;
  }

  readonly totalQty = computed(() =>
    Object.values(this.quantities()).reduce((a, n) => a + n, 0),
  );

  readonly maxPerOrder = computed(() => Math.min(6, this.event()?.maxPerOrder ?? 0));
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
      (a, l) => a + this.unitPrice(l.zone) * l.qty,
      0,
    );
    const fee = round2(subtotal * SERVICE_FEE_RATE);
    return { subtotal: round2(subtotal), fee, total: round2(subtotal + fee) };
  });

  constructor() {
    const timer = setInterval(() => this.secondsLeft.set(Math.max(0, Math.ceil((this.expiresAt - Date.now()) / 1000))), 1000);
    inject(DestroyRef).onDestroy(() => { clearInterval(timer); this.quoteRequest?.unsubscribe(); });
    effect((onCleanup) => {
      const id = this.eventId();
      this.loading.set(true);
      this.notFound.set(false);
      this.order.set(null);
      this.backToSelection();
      const request = this.events.getById(id).subscribe({
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
      onCleanup(() => request.unsubscribe());
    });
  }

  unitPrice(zone: Zone): number { return this.event() ? zonePrice(this.event()!, zone).unitPrice : zone.price; }

  zoneAvailable(zoneId: string): number {
    const zone = this.event()?.zones.find((z) => z.id === zoneId);
    return zone ? Math.max(0, zone.capacity - zone.sold) : 0;
  }

  canAdd(zoneId: string): boolean {
    return (
      !this.placing() && this.remaining() > 0 && this.currentQty(zoneId) < this.zoneAvailable(zoneId)
    );
  }

  currentQty(zoneId: string): number {
    return this.quantities()[zoneId] ?? 0;
  }

  change(zoneId: string, delta: number): void {
    if (this.placing()) return;
    this.quoteRequest?.unsubscribe();
    this.quoting.set(false);
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
    if (this.placing()) return;
    this.quoteRequest?.unsubscribe();
    this.quoting.set(false);
    this.reviewing.set(false);
    this.paymentGateway.set(false);
    this.quote.set(null);
  }

  openPaymentGateway(): void {
    if (!this.quote() || this.quoting() || this.secondsLeft() === 0) return;
    this.paymentGateway.set(true);
  }

  closePaymentGateway(): void {
    if (!this.placing()) this.paymentGateway.set(false);
  }

  requestQuote(): void {
    if (this.placing()) return;
    this.quoteRequest?.unsubscribe();
    this.quote.set(null);
    const ev = this.event();
    if (!ev || !this.hasSelection()) return;
    const items = this.selectedLines().map((l) => ({
      zoneId: l.zone.id,
      quantity: l.qty,
    }));
    this.quoting.set(true);
    this.quoteRequest = this.pricing.quote(ev, items).subscribe({
      next: (q) => {
        this.quote.set(q);
        this.attemptKey = crypto.randomUUID();
        this.expiresAt = Date.now() + 120000;
        this.secondsLeft.set(120);
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
    const quote = this.quote();
    if (!ev || this.placing() || !quote || this.quoting()) return;
    if (Date.now() >= this.expiresAt) { this.notify.error('La cotización venció. Actualízala antes de pagar.'); return; }
    const items = this.selectedLines().map((l) => ({
      zoneId: l.zone.id,
      quantity: l.qty,
    }));
    this.placing.set(true);
    this.tickets.createOrder({ eventId: ev.id, items, expectedTotal: quote.total, paymentMethod: this.paymentMethod, paymentResult: 'APPROVED', idempotencyKey: this.attemptKey }).subscribe({
      next: (ord) => {
        this.order.set(ord);
        this.paymentGateway.set(false);
        this.placing.set(false);
        this.notify.success('¡Compra confirmada!');
      },
      error: (err) => {
        this.placing.set(false);
        this.notify.error(err?.error?.message ?? err?.message ?? 'No se pudo completar la compra.');
        if (err?.status === 409) {
          this.backToSelection();
          this.events.getById(ev.id).subscribe({ next: fresh => { this.event.set(fresh); this.quantities.set({}); }, error: () => this.notFound.set(true) });
        }
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
