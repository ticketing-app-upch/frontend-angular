import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { debounceTime, startWith } from 'rxjs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { EventService } from '../../../core/services/event.service';
import { EventCategory, EventItem } from '../../../core/models/event.model';
import { EventCard } from '../../../shared/event-card/event-card';
import { EmptyState } from '../../../shared/empty-state/empty-state';

interface CategoryOption {
  value: EventCategory | 'TODAS';
  label: string;
}

@Component({
  selector: 'tkt-event-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatChipsModule,
    MatSlideToggleModule,
    MatProgressSpinnerModule,
    EventCard,
    EmptyState,
  ],
  templateUrl: './event-list.html',
  styleUrl: './event-list.scss',
})
export class EventList {
  private events = inject(EventService);

  readonly categories: CategoryOption[] = [
    { value: 'TODAS', label: 'Todas' },
    { value: 'CONCIERTO', label: 'Conciertos' },
    { value: 'FESTIVAL', label: 'Festivales' },
    { value: 'TEATRO', label: 'Teatro' },
    { value: 'DEPORTE', label: 'Deporte' },
    { value: 'CONFERENCIA', label: 'Conferencias' },
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

  constructor() {
    this.events.list().subscribe({
      next: (list) => {
        this.allEvents.set(list);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  setCategory(value: EventCategory | 'TODAS'): void {
    this.category.set(value);
  }
}
