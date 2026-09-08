import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CurrencyPipe, TitleCasePipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { debounceTime, startWith } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { EventService } from '../../../core/services/event.service';
import { NotificationService } from '../../../core/services/notification.service';
import {
  computeCapacity,
  EventCategory,
  EventItem,
} from '../../../core/models/event.model';
import { EventCard } from '../../../shared/event-card/event-card';
import { EmptyState } from '../../../shared/empty-state/empty-state';

interface CategoryOption {
  value: EventCategory | 'TODAS';
  label: string;
  icon: string;
}

interface SpotlightVm {
  id: string;
  category: EventCategory;
  name: string;
  place: string;
  ratio: number;
  zoneName: string;
  available: number;
  price: number;
}

@Component({
  selector: 'tkt-event-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    CurrencyPipe,
    TitleCasePipe,
    MatIconModule,
    MatProgressSpinnerModule,
    EventCard,
    EmptyState,
  ],
  templateUrl: './event-list.html',
  styleUrl: './event-list.scss',
})
export class EventList {
  private events = inject(EventService);
  private notify = inject(NotificationService);

  readonly categories: CategoryOption[] = [
    { value: 'TODAS', label: 'Todas', icon: 'grid_view' },
    { value: 'CONCIERTO', label: 'Conciertos', icon: 'music_note' },
    { value: 'FESTIVAL', label: 'Festivales', icon: 'festival' },
    { value: 'TEATRO', label: 'Teatro', icon: 'theater_comedy' },
    { value: 'DEPORTE', label: 'Deporte', icon: 'sports_soccer' },
    { value: 'CONFERENCIA', label: 'Conferencias', icon: 'co_present' },
  ];

  readonly search = new FormControl('', { nonNullable: true });
  private readonly searchValue = toSignal(
    this.search.valueChanges.pipe(debounceTime(250), startWith('')),
    { initialValue: '' },
  );

  readonly category = signal<EventCategory | 'TODAS'>('TODAS');
  readonly onlyAvailable = signal(false);

  readonly loading = signal(true);
  private readonly allEvents = signal<EventItem[]>([]);

  readonly filtered = computed<EventItem[]>(() => {
    const term = this.searchValue().trim().toLowerCase();
    const cat = this.category();
    const onlyAvail = this.onlyAvailable();
    return this.allEvents().filter((e) => {
      if (cat !== 'TODAS' && e.category !== cat) return false;
      if (term) {
        const hay = `${e.name} ${e.venue} ${e.city}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      if (onlyAvail) {
        const avail = e.zones.reduce((a, z) => a + (z.capacity - z.sold), 0);
        if (avail <= 0) return false;
      }
      return true;
    });
  });

  // --- Carrusel del hero (tarjeta que va rotando eventos) --------------
  readonly spotlightIndex = signal(0);
  readonly spotlightPaused = signal(false);

  /** Hasta 5 eventos publicados con disponibilidad para el carrusel. */
  readonly spotlight = computed<EventItem[]>(() =>
    this.allEvents()
      .filter((e) => computeCapacity(e).available > 0)
      .slice(0, 5),
  );

  readonly spotlightVm = computed<SpotlightVm | null>(() => {
    const list = this.spotlight();
    if (list.length === 0) return null;
    const ev = list[this.spotlightIndex() % list.length];
    const cap = computeCapacity(ev);
    const cheapest = [...ev.zones].sort((a, b) => a.price - b.price)[0];
    return {
      id: ev.id,
      category: ev.category,
      name: ev.name,
      place: `${ev.venue} · ${ev.city}`,
      ratio: cap.total ? (cap.sold / cap.total) * 100 : 0,
      zoneName: cheapest.name,
      available: Math.max(0, cheapest.capacity - cheapest.sold),
      price: cheapest.price,
    };
  });

  constructor() {
    this.events.list().subscribe({
      next: (list) => {
        this.allEvents.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.notify.error('No se pudieron cargar los eventos.');
      },
    });

    const timer = setInterval(() => {
      if (this.spotlightPaused()) return;
      const total = this.spotlight().length;
      if (total > 1) {
        this.spotlightIndex.update((i) => (i + 1) % total);
      }
    }, 4000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  setCategory(value: EventCategory | 'TODAS'): void {
    this.category.set(value);
  }

  /** Baja al catálogo con scroll suave, sin ensuciar la URL con el hash. */
  scrollToCatalog(event: Event): void {
    event.preventDefault();
    const target = document.getElementById('catalogo');
    if (!target) return;
    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    target.scrollIntoView({
      behavior: reduceMotion ? 'auto' : 'smooth',
      block: 'start',
    });
  }

  showSpotlight(i: number): void {
    this.spotlightIndex.set(i);
  }
}
