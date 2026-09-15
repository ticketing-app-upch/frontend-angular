import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { EventService } from '../../../core/services/event.service';
import { AuthService } from '../../../core/auth/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { computeCapacity, EventCategory, EventItem } from '../../../core/models/event.model';
import { CapacityBar } from '../../../shared/capacity-bar/capacity-bar';
import { EmptyState } from '../../../shared/empty-state/empty-state';

@Component({
  selector: 'tkt-event-manage',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    FormsModule,
    CurrencyPipe,
    DatePipe,
    TitleCasePipe,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    CapacityBar,
    EmptyState,
  ],
  templateUrl: './event-manage.html',
  styleUrl: './event-manage.scss',
})
export class EventManage {
  private events = inject(EventService);
  private auth = inject(AuthService);
  private notify = inject(NotificationService);

  readonly loading = signal(true);
  readonly items = signal<EventItem[]>([]);

  /** Búsqueda por nombre, recinto o ciudad. */
  readonly search = signal('');
  readonly category = signal<EventCategory | 'TODAS'>('TODAS');
  /** Recinto exacto elegido en el select ('' = todos). */
  readonly venue = signal('');

  readonly categories: { value: EventCategory | 'TODAS'; label: string; icon: string }[] = [
    { value: 'TODAS', label: 'Todo', icon: 'explore' },
    { value: 'CONCIERTO', label: 'Música', icon: 'music_note' },
    { value: 'DEPORTE', label: 'Deportes', icon: 'sports_soccer' },
    { value: 'TEATRO', label: 'Teatro', icon: 'theater_comedy' },
    { value: 'FESTIVAL', label: 'Festivales', icon: 'festival' },
    { value: 'CONFERENCIA', label: 'Conferencias', icon: 'hub' },
  ];

  /** Recintos únicos entre tus propios eventos, para el select. */
  readonly venues = computed(() => [...new Set(this.items().map((e) => e.venue))].sort());

  readonly filtered = computed(() => {
    const normalize = (s: string) =>
      s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const search = normalize(this.search());
    return this.items().filter((e) => {
      if (search && !normalize(`${e.name} ${e.venue} ${e.city}`).includes(search)) return false;
      if (this.category() !== 'TODAS' && e.category !== this.category()) return false;
      if (this.venue() && e.venue !== this.venue()) return false;
      return true;
    });
  });

  readonly hasFilters = computed(
    () => !!this.search() || this.category() !== 'TODAS' || !!this.venue(),
  );

  constructor() {
    const id = this.auth.user()?.id ?? '';
    this.events.listByOrganizer(id).subscribe({
      next: (list) => {
        this.items.set(
          [...list].sort((a, b) => b.startsAt.localeCompare(a.startsAt)),
        );
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.notify.error('No se pudieron cargar tus eventos.');
      },
    });
  }

  cap = computeCapacity;

  minPrice(ev: EventItem): number {
    return Math.min(...ev.zones.map((z) => z.price));
  }

  clearFilters(): void {
    this.search.set('');
    this.category.set('TODAS');
    this.venue.set('');
  }
}
