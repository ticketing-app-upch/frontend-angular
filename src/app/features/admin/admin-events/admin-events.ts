import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DatePipe, TitleCasePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { EventService } from '../../../core/services/event.service';
import { AdminService } from '../../../core/services/admin.service';
import { NotificationService } from '../../../core/services/notification.service';
import { EventItem } from '../../../core/models/event.model';
import { EmptyState } from '../../../shared/empty-state/empty-state';

@Component({
  selector: 'tkt-admin-events',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    TitleCasePipe,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    EmptyState,
  ],
  templateUrl: './admin-events.html',
  styleUrl: './admin-events.scss',
})
export class AdminEvents {
  private events = inject(EventService);
  private admin = inject(AdminService);
  private notify = inject(NotificationService);

  readonly loading = signal(true);
  readonly items = signal<EventItem[]>([]);
  readonly busyId = signal<string | null>(null);
  readonly confirmId = signal<string | null>(null);
  private readonly orgNames = signal<Record<string, string>>({});

  constructor() {
    this.load();
  }

  organizer(id: string): string {
    return this.orgNames()[id] ?? id;
  }

  askDelete(ev: EventItem): void {
    this.confirmId.set(ev.id);
  }

  cancelDelete(): void {
    this.confirmId.set(null);
  }

  confirmDelete(ev: EventItem): void {
    this.busyId.set(ev.id);
    this.events.remove(ev.id).subscribe({
      next: () => {
        this.items.update((list) => list.filter((x) => x.id !== ev.id));
        this.busyId.set(null);
        this.confirmId.set(null);
        this.notify.success(`Evento "${ev.name}" eliminado.`);
      },
      error: (err) => {
        this.busyId.set(null);
        this.confirmId.set(null);
        this.notify.error(err?.message ?? 'No se pudo eliminar el evento.');
      },
    });
  }

  private load(): void {
    this.loading.set(true);
    forkJoin({
      events: this.events.listAll(),
      users: this.admin.users(),
    }).subscribe({
      next: ({ events, users }) => {
        const names: Record<string, string> = {};
        for (const u of users) names[u.id] = u.fullName;
        this.orgNames.set(names);
        this.items.set(events);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.notify.error('No se pudieron cargar los eventos.');
      },
    });
  }
}
