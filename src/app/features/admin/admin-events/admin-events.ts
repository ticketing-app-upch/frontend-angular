import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DatePipe, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { EventService } from '../../../core/services/event.service';
import { AdminService } from '../../../core/services/admin.service';
import { NotificationService } from '../../../core/services/notification.service';
import { EventItem } from '../../../core/models/event.model';
import { EmptyState } from '../../../shared/empty-state/empty-state';
import { ZoneMap } from '../../../shared/zone-map/zone-map';
import { venueMap, venueHotspots } from '../../../shared/event-image';

@Component({
  selector: 'tkt-admin-events',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, CurrencyPipe, FormsModule, MatButtonModule, MatProgressSpinnerModule, EmptyState, ZoneMap],
  templateUrl: './admin-events.html',
  styleUrl: './admin-events.scss',
})
export class AdminEvents {
  private events = inject(EventService);
  private admin = inject(AdminService);
  private notify = inject(NotificationService);
  readonly loading = signal(true);
  readonly items = signal<EventItem[]>([]);
  readonly selected = signal<EventItem | null>(null);
  readonly decision = signal<'PUBLICADO' | 'RECHAZADO' | null>(null);
  readonly busy = signal(false);
  reason = '';
  private readonly orgNames = signal<Record<string, string>>({});
  readonly venueMap = venueMap;
  readonly venueHotspots = venueHotspots;

  constructor() {
    forkJoin({ events: this.events.pendingForReview(), users: this.admin.users() }).subscribe({
      next: ({ events, users }) => {
        this.orgNames.set(Object.fromEntries(users.map(u => [u.id, u.fullName])));
        this.items.set(events);
        this.loading.set(false);
      },
      error: () => { this.loading.set(false); this.notify.error('No se pudieron cargar los eventos pendientes.'); },
    });
  }

  organizer(id: string): string { return this.orgNames()[id] ?? id; }
  open(ev: EventItem): void { this.selected.set(ev); this.decision.set(null); this.reason = ''; }
  review(): void {
    const ev = this.selected();
    const decision = this.decision();
    if (!ev || !decision || this.busy()) return;
    if (decision === 'RECHAZADO' && !this.reason.trim()) { this.notify.error('Indica un motivo de rechazo.'); return; }
    this.busy.set(true);
    this.events.review(ev.id, decision, this.reason).subscribe({
      next: () => {
        this.items.update(items => items.filter(item => item.id !== ev.id));
        this.selected.set(null);
        this.decision.set(null);
        this.busy.set(false);
        this.notify.success(decision === 'PUBLICADO' ? 'Evento publicado' : 'Evento rechazado');
      },
      error: err => { this.busy.set(false); this.notify.error(err?.error?.message ?? err?.message ?? 'No se pudo revisar el evento.'); },
    });
  }
}
