import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import {
  NotificationService,
  ToastKind,
} from '../../core/services/notification.service';

@Component({
  selector: 'tkt-toaster',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  template: `
    <div class="toaster" role="region" aria-label="Notificaciones">
      @for (t of notify.toasts(); track t.id) {
        <div class="toast" [class]="'is-' + t.kind" role="status">
          <mat-icon class="ico">{{ iconFor(t.kind) }}</mat-icon>
          <span class="msg">{{ t.message }}</span>
          <button
            type="button"
            class="x"
            (click)="notify.dismiss(t.id)"
            aria-label="Cerrar notificación"
          >
            <mat-icon>close</mat-icon>
          </button>
        </div>
      }
    </div>
  `,
  styleUrl: './toaster.scss',
})
export class Toaster {
  readonly notify = inject(NotificationService);

  iconFor(kind: ToastKind): string {
    if (kind === 'success') return 'check_circle';
    if (kind === 'error') return 'error';
    return 'info';
  }
}
