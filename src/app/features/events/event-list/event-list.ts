import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { EventService } from '../../../core/services/event.service';
import { DiscoveryService } from '../../../core/services/discovery.service';
import { AuthService } from '../../../core/auth/auth.service';
import { EventItem, computeCapacity } from '../../../core/models/event.model';
import { SERVICE_FEE_RATE, roundMoney, zonePrice } from '../../../core/models/ticketing-rules';
import { addToCalendar } from '../../../shared/event-actions';
import { matchArt } from '../../../shared/event-image';

export function lowestPrice(event: EventItem): number {
  const zones = event.zones.filter(z => z.capacity > z.sold);
  return zones.length ? Math.min(...zones.map(z => zonePrice(event, z).unitPrice)) : 0;
}
@Component({
  selector: 'tkt-event-compare',
  imports: [MatDialogModule, CurrencyPipe, DatePipe, RouterLink],
  template: '<h2 mat-dialog-title>Tu próxima experiencia, lado a lado.</h2><mat-dialog-content><div class="compare">@for (e of events; track e.id) {<article><span>{{ e.category }}</span><h3>{{ e.name }}</h3><p>{{ e.startsAt | date:"EEE d MMM · HH:mm" }}</p><p>{{ e.venue }}</p><strong>{{ total(e) | currency:"PEN":"symbol-narrow" }}</strong><p>Desde, con comisión de servicio</p><p>{{ capacity(e).available }} lugares disponibles</p><a [routerLink]="[\'/eventos\', e.id]" mat-dialog-close>Ver evento →</a></article>}</div></mat-dialog-content><mat-dialog-actions align="end"><button mat-dialog-close>Cerrar comparación</button></mat-dialog-actions>',
  styles: '.compare{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:20px}.compare article{padding:20px;border:1px solid #80808055;border-radius:16px}.compare span{font-size:12px;letter-spacing:.1em}.compare strong{font-size:26px}.compare p{font-size:14px}button{padding:12px 20px;background:transparent;color:inherit;border:1px solid #80808066;border-radius:24px;cursor:pointer}',
})
export class EventCompare {
  readonly events: EventItem[] = inject(MAT_DIALOG_DATA);
  readonly capacity = computeCapacity;
  total(e: EventItem): number { const price = lowestPrice(e); return roundMoney(price + roundMoney(price * SERVICE_FEE_RATE)); }
}
@Component({
  selector: 'tkt-event-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, FormsModule, CurrencyPipe, DatePipe, DecimalPipe, MatIconModule, MatDialogModule],
  templateUrl: './event-list.html',
  styleUrl: './event-list.scss',
})
export class EventList {
  private events = inject(EventService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private dialog = inject(MatDialog);
  readonly auth = inject(AuthService);
  readonly discovery = inject(DiscoveryService);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly allEvents = signal<EventItem[]>([]);
  readonly search = signal('');
  readonly category = signal('TODAS');
  readonly date = signal('any');
  readonly venue = signal('');
  readonly budget = signal(800);
  readonly party = signal(1);
  readonly sort = signal('date');
  readonly onlyAvailable = signal(false);
  readonly savedOnly = signal(false);
  readonly planner = signal(false);
  readonly compared = signal<string[]>([]);
  readonly compareMessage = signal('');
  readonly page = signal(1);
  readonly categories = [
    { value: 'TODAS', label: 'Todo', icon: 'explore' }, { value: 'CONCIERTO', label: 'Música', icon: 'music_note' },
    { value: 'DEPORTE', label: 'Deportes', icon: 'sports_soccer' }, { value: 'TEATRO', label: 'Teatro', icon: 'theater_comedy' },
    { value: 'FESTIVAL', label: 'Festivales', icon: 'festival' }, { value: 'CONFERENCIA', label: 'Conferencias', icon: 'hub' },
  ];
  readonly capacity = computeCapacity;
  readonly price = lowestPrice;
  readonly calendar = addToCalendar;
  readonly matchArt = matchArt;
  readonly venues = computed(() => [...new Set(this.allEvents().map(e => e.venue))].sort());
  readonly featuredEvents = computed(() => this.allEvents().filter(e => this.capacity(e).available > 0).slice(0, 5));
  readonly featuredIndex = signal(0);
  readonly featured = computed(() => this.featuredEvents()[this.featuredIndex()]);
  readonly publicCount = computed(() => this.allEvents().length);
  nextFeatured(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.featuredIndex.update(i => (i + 1) % this.featuredEvents().length);
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
      if (this.planner() && (!this.capacity(e).available || this.groupPrice(e) > this.budget() || !e.zones.some(z => z.capacity - z.sold >= this.party()) || e.maxPerOrder < this.party())) return false;
      return true;
    }).sort((a, b) => this.sort() === 'price' ? this.price(a) - this.price(b) : this.sort() === 'availability' ? this.capacity(b).available - this.capacity(a).available : a.startsAt.localeCompare(b.startsAt));
  });
  readonly shown = computed(() => this.filtered().slice(0, this.page() * 9));
  readonly comparison = computed(() => this.allEvents().filter(e => this.compared().includes(e.id)));
  readonly groupPrice = (e: EventItem): number => {
    const zones = e.zones.filter(z => z.capacity - z.sold >= this.party());
    if (!zones.length) return Infinity;
    const subtotal = Math.min(...zones.map(z => zonePrice(e, z).unitPrice)) * this.party();
    return roundMoney(subtotal + roundMoney(subtotal * SERVICE_FEE_RATE));
  };
  constructor() {
    const sub = this.route.queryParamMap.subscribe(p => {
      this.search.set(p.get('q') ?? ''); this.category.set(this.categories.some(c => c.value === p.get('category')) ? p.get('category')! : 'TODAS');
      this.savedOnly.set(p.get('saved') === '1'); this.date.set(['week', 'month'].includes(p.get('when') ?? '') ? p.get('when')! : 'any');
    });
    inject(DestroyRef).onDestroy(() => sub.unsubscribe());
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
    this.search.set(''); this.category.set('TODAS'); this.date.set('any'); this.venue.set(''); this.savedOnly.set(false); this.onlyAvailable.set(false); this.planner.set(false); this.sync();
  }
  toggleCompare(id: string): void {
    this.compareMessage.set('');
    if (this.compared().includes(id)) this.compared.update(ids => ids.filter(x => x !== id));
    else if (this.compared().length < 3) this.compared.update(ids => [...ids, id]);
    else this.compareMessage.set('Puedes comparar hasta tres eventos. Quita uno para agregar otro.');
  }
  more(): void { this.page.update(p => p + 1); }
  openCompare(): void { this.dialog.open(EventCompare, { data: this.comparison(), width: '940px', maxWidth: '96vw' }); }
  surprise(): void {
    const available = this.filtered().filter(e => this.capacity(e).available > 0);
    if (available.length) void this.router.navigate(['/eventos', available[Math.floor(Math.random() * available.length)].id]);
  }
}
