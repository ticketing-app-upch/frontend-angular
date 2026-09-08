import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe, TitleCasePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { EventService } from '../../../core/services/event.service';
import { AuthService } from '../../../core/auth/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { computeCapacity, EventItem } from '../../../core/models/event.model';
import { CapacityBar } from '../../../shared/capacity-bar/capacity-bar';
import { EmptyState } from '../../../shared/empty-state/empty-state';

@Component({
  selector: 'tkt-event-manage',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    CurrencyPipe,
    DatePipe,
    TitleCasePipe,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule,
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
}
