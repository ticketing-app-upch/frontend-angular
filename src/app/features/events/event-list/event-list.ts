import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { EventService } from '../../../core/services/event.service';
import { DiscoveryService } from '../../../core/services/discovery.service';
import { EventItem, computeCapacity } from '../../../core/models/event.model';
import { zonePrice } from '../../../core/models/ticketing-rules';
import { matchArt } from '../../../shared/event-image';

export function lowestPrice(event: EventItem): number {
  const zones = event.zones.filter(z => z.capacity > z.sold);
  return zones.length ? Math.min(...zones.map(z => zonePrice(event, z).unitPrice)) : 0;
}
@Component({
  selector: 'tkt-event-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, FormsModule, CurrencyPipe, DatePipe, DecimalPipe, MatIconModule],
  templateUrl: './event-list.html',
  styleUrl: './event-list.scss',
})
export class EventList {
  private events = inject(EventService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  readonly discovery = inject(DiscoveryService);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly allEvents = signal<EventItem[]>([]);
  readonly search = signal('');
  readonly category = signal('TODAS');
  readonly date = signal('any');
  readonly venue = signal('');
  readonly sort = signal('date');
  readonly onlyAvailable = signal(false);
  readonly savedOnly = signal(this.route.snapshot.data['favorites'] === true);
  readonly page = signal(1);
  readonly categories = [
    { value: 'TODAS', label: 'Todo', icon: 'explore' }, { value: 'CONCIERTO', label: 'Música', icon: 'music_note' },
    { value: 'DEPORTE', label: 'Deportes', icon: 'sports_soccer' }, { value: 'TEATRO', label: 'Teatro', icon: 'theater_comedy' },
    { value: 'FESTIVAL', label: 'Festivales', icon: 'festival' }, { value: 'CONFERENCIA', label: 'Conferencias', icon: 'hub' },
  ];
  readonly capacity = computeCapacity;
  readonly price = lowestPrice;
  readonly matchArt = matchArt;
  readonly venues = computed(() => [...new Set(this.allEvents().map(e => e.venue))].sort());
  readonly featuredEvents = computed(() => this.allEvents().filter(e => this.capacity(e).available > 0).slice(0, 5));
  readonly featuredIndex = signal(0);
  readonly featured = computed(() => this.featuredEvents()[this.featuredIndex()]);
  readonly publicCount = computed(() => this.allEvents().length);
  /** El carrusel del destacado se pausa mientras el mouse está encima. */
  readonly featuredPaused = signal(false);
  private autoplayTimer: ReturnType<typeof setInterval> | null = null;
  private readonly AUTOPLAY_MS = 6000;

  private advanceFeatured(): void {
    const total = this.featuredEvents().length;
    if (total > 1) this.featuredIndex.update(i => (i + 1) % total);
  }
  private startAutoplay(): void {
    this.stopAutoplay();
    if (this.featuredEvents().length <= 1) return;
    this.autoplayTimer = setInterval(() => {
      if (!this.featuredPaused()) this.advanceFeatured();
    }, this.AUTOPLAY_MS);
  }
  private stopAutoplay(): void {
    if (this.autoplayTimer !== null) {
      clearInterval(this.autoplayTimer);
      this.autoplayTimer = null;
    }
  }
  nextFeatured(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.advanceFeatured();
    this.startAutoplay();
  }
  readonly filtered = computed(() => {
    const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const search = normalize(this.search());
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return this.allEvents().filter(e => {
      const days = (Date.parse(e.startsAt) - today.getTime()) / 86400000;
      if (search && !normalize(e.name + ' ' + e.venue + ' ' + e.city).includes(search)) return false;
      if (this.category() !== 'TODAS' && e.category !== this.category()) return false;
      if (this.venue() && e.venue !== this.venue()) return false;
      if (this.date() === 'week' && days >= 7 || this.date() === 'month' && days >= 30) return false;
      if (this.savedOnly() && !this.discovery.favorites().includes(e.id)) return false;
      if (this.onlyAvailable() && !this.capacity(e).available) return false;
      return true;
    }).sort((a, b) => this.sort() === 'price' ? this.price(a) - this.price(b) : this.sort() === 'availability' ? this.capacity(b).available - this.capacity(a).available : a.startsAt.localeCompare(b.startsAt));
  });
  readonly shown = computed(() => this.filtered().slice(0, this.page() * 9));
  constructor() {
    const sub = this.route.queryParamMap.subscribe(p => {
      this.search.set(p.get('q') ?? ''); this.category.set(this.categories.some(c => c.value === p.get('category')) ? p.get('category')! : 'TODAS');
      this.savedOnly.set(this.route.snapshot.data['favorites'] === true || p.get('saved') === '1'); this.date.set(['week', 'month'].includes(p.get('when') ?? '') ? p.get('when')! : 'any');
    });
    inject(DestroyRef).onDestroy(() => {
      sub.unsubscribe();
      this.stopAutoplay();
    });
    effect(() => {
      this.featuredEvents();
      this.startAutoplay();
    });
    this.load();
  }
  load(): void {
    this.loading.set(true); this.error.set('');
    this.events.list().subscribe({
      next: events => { this.allEvents.set(events.filter(e => Date.parse(e.startsAt) > Date.now())); this.loading.set(false); },
      error: () => { this.loading.set(false); this.error.set('No pudimos cargar la cartelera. Revisa tu conexión y vuelve a intentar.'); },
    });
  }
  sync(): void {
    this.page.set(1);
    void this.router.navigate([], { queryParams: { q: this.search() || null, category: this.category() === 'TODAS' ? null : this.category(), saved: this.savedOnly() ? '1' : null, when: this.date() === 'any' ? null : this.date() }, replaceUrl: true });
  }
  reset(): void {
    this.search.set(''); this.category.set('TODAS'); this.date.set('any'); this.venue.set(''); this.onlyAvailable.set(false); this.sync();
  }
  more(): void { this.page.update(p => p + 1); }
}
