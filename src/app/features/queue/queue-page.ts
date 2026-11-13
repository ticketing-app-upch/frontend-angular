import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { interval } from 'rxjs';
import { EventItem } from '../../core/models/event.model';
import { EventService } from '../../core/services/event.service';
import { NotificationService } from '../../core/services/notification.service';
import { QueueService, QueueState } from '../../core/services/queue.service';
import { EmptyState } from '../../shared/empty-state/empty-state';

/** Sala de espera de la cola virtual (Épica 4): posición, tiempo estimado y paso al checkout. */
@Component({
  selector: 'tkt-queue-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, RouterLink, MatButtonModule, MatIconModule, MatProgressBarModule, MatProgressSpinnerModule, EmptyState],
  templateUrl: './queue-page.html',
  styleUrl: './queue-page.scss',
})
export class QueuePage {
  private queue = inject(QueueService);
  private events = inject(EventService);
  private router = inject(Router);
  private notify = inject(NotificationService);

  readonly eventId = input.required<string>();
  readonly event = signal<EventItem | null>(null);
  readonly state = signal<QueueState | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  private readonly now = signal(Date.now());

  /** Avance de la barra: 0 al entrar, 100 cuando llega tu turno. */
  readonly progress = computed(() => {
    const s = this.state();
    if (!s) return 0;
    if (s.status !== 'WAITING') return 100;
    return s.initialPosition ? Math.round((1 - s.position / s.initialPosition) * 100) : 0;
  });

  readonly eta = computed(() => {
    const seconds = this.state()?.etaSeconds ?? 0;
    if (seconds < 60) return `${seconds} s`;
    return `${Math.floor(seconds / 60)} min ${seconds % 60} s`;
  });

  /** Tiempo que te queda para pagar una vez que es tu turno. */
  readonly passLeft = computed(() => {
    const expires = this.state()?.passExpiresAt;
    if (!expires) return 0;
    return Math.max(0, Math.round((Date.parse(expires) - this.now()) / 1000));
  });

  constructor() {
    effect(() => {
      const id = this.eventId();
      untracked(() => this.start(id));
    });
    interval(1000).pipe(takeUntilDestroyed()).subscribe((tick) => {
      this.now.set(Date.now());
      if (tick % 5 === 4) this.refresh();
    });
  }

  private start(id: string): void {
    this.loading.set(true);
    this.error.set('');
    this.events.getById(id).subscribe({ next: ev => this.event.set(ev), error: () => this.error.set('No encontramos este evento.') });
    this.queue.join(id).subscribe({
      next: state => {
        this.state.set(state);
        this.loading.set(false);
      },
      error: err => {
        this.error.set(err?.error?.message ?? err?.message ?? 'No pudimos ingresarte a la cola.');
        this.loading.set(false);
      },
    });
  }

  private refresh(): void {
    const current = this.state();
    if (!current || ['COMPLETED', 'EXPIRED', 'CANCELLED', 'CLOSED'].includes(current.status)) return;
    this.queue.status(this.eventId()).subscribe({
      next: next => {
        if (!next) return;
        if (current.status === 'WAITING' && next.status === 'ADMITTED') this.notify.success('¡Es tu turno! Ya puedes comprar.');
        this.state.set(next);
      },
      error: () => undefined,
    });
  }

  buy(): void {
    void this.router.navigate(['/comprar', this.eventId()]);
  }

  rejoin(): void {
    this.start(this.eventId());
  }

  leave(): void {
    this.queue.leave(this.eventId()).subscribe({
      next: () => void this.router.navigate(['/eventos', this.eventId()]),
      error: () => void this.router.navigate(['/eventos', this.eventId()]),
    });
  }
}
