import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../core/auth/auth.service';
import { EventItem } from '../../../core/models/event.model';
import { EventService } from '../../../core/services/event.service';
import { NotificationService } from '../../../core/services/notification.service';

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
  private readonly notify = inject(NotificationService);
  readonly confirming = signal(false);
  readonly busy = signal(false);
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
  enablePurchases(): void {
    const event = this.event();
    if (!event || this.busy()) return;
    this.busy.set(true);
    this.events.enablePurchases(event.id).subscribe({
      next: updated => { this.event.set(updated); this.confirming.set(false); this.busy.set(false); this.notify.success('Compras habilitadas'); },
      error: err => { this.busy.set(false); this.notify.error(err?.error?.message ?? err?.message ?? 'No se pudieron habilitar las compras.'); },
    });
  }
}
