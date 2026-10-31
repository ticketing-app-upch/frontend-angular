import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../core/auth/auth.service';
import { EventItem } from '../../../core/models/event.model';
import { EventService } from '../../../core/services/event.service';

@Component({
  selector: 'tkt-event-sales',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrencyPipe, DatePipe, DecimalPipe, RouterLink, MatButtonModule, MatIconModule],
  templateUrl: './event-sales.html',
  styleUrl: './event-sales.scss',
})
export class EventSales {
  private readonly auth = inject(AuthService);
  private readonly events = inject(EventService);
  private readonly route = inject(ActivatedRoute);
  readonly loading = signal(true);
  readonly event = signal<EventItem | null>(null);
  readonly sold = () => this.event()?.zones.reduce((sum, zone) => sum + zone.sold, 0) ?? 0;
  readonly capacity = () => this.event()?.zones.reduce((sum, zone) => sum + zone.capacity, 0) ?? 0;
  readonly revenue = () => this.event()?.zones.reduce((sum, zone) => sum + zone.sold * zone.price, 0) ?? 0;

  constructor() {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.events.getById(id).subscribe({
      next: event => {
        if (event.organizerId === this.auth.user()?.id) this.event.set(event);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
