import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'tkt-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  template: `
    <div class="empty">
      <mat-icon>{{ icon() }}</mat-icon>
      <p class="title">{{ title() }}</p>
      @if (message()) {
        <p class="msg">{{ message() }}</p>
      }
      <ng-content />
    </div>
  `,
  styles: `
    :host { display: block; }
    .empty {
      text-align: center;
      padding: 3.5rem 1.5rem;
      border: 1px dashed color-mix(in srgb, var(--mat-sys-on-surface) 20%, transparent);
      border-radius: var(--tkt-radius);
      color: var(--mat-sys-on-surface-variant);
    }
    mat-icon {
      font-size: 2.5rem;
      width: 2.5rem;
      height: 2.5rem;
      margin-bottom: 0.5rem;
      opacity: 0.7;
    }
    .title { margin: 0; font-weight: 600; color: var(--mat-sys-on-surface); }
    .msg { margin: 0.35rem 0 1rem; }
  `,
})
export class EmptyState {
  readonly icon = input('inbox');
  readonly title = input.required<string>();
  readonly message = input<string>('');
}
