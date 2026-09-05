import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'tkt-stat-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  template: `
    <div class="stat">
      <div class="icon"><mat-icon>{{ icon() }}</mat-icon></div>
      <div class="content">
        <span class="label">{{ label() }}</span>
        <span class="value">{{ value() }}</span>
        @if (hint()) {
          <span class="hint">{{ hint() }}</span>
        }
      </div>
    </div>
  `,
  styles: `
    :host { display: block; }
    .stat {
      display: flex;
      gap: 0.9rem;
      align-items: center;
      padding: 1.15rem 1.25rem;
      background: var(--mat-sys-surface);
      border: 1px solid color-mix(in srgb, var(--mat-sys-on-surface) 8%, transparent);
      border-radius: var(--tkt-radius);
      height: 100%;
    }
    .icon {
      display: grid;
      place-items: center;
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: color-mix(in srgb, var(--mat-sys-primary) 14%, transparent);
      color: var(--mat-sys-primary);
      flex: none;
    }
    .content { display: flex; flex-direction: column; gap: 0.1rem; min-width: 0; }
    .label { font-size: 0.8rem; color: var(--mat-sys-on-surface-variant); }
    .value { font-size: 1.5rem; font-weight: 700; letter-spacing: -0.02em; }
    .hint { font-size: 0.78rem; color: var(--mat-sys-on-surface-variant); }
  `,
})
export class StatCard {
  readonly icon = input.required<string>();
  readonly label = input.required<string>();
  readonly value = input.required<string | number | null>();
  readonly hint = input<string>('');
}
