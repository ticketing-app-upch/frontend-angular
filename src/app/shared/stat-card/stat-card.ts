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
      position: relative;
      display: flex;
      gap: 0.9rem;
      align-items: center;
      padding: 1.2rem 1.3rem;
      border-radius: 18px;
      height: 100%;
      overflow: hidden;
      border: 1px solid color-mix(in srgb, var(--mat-sys-on-surface) 8%, transparent);
      background:
        radial-gradient(
          120% 80% at 100% 0%,
          color-mix(in srgb, var(--tkt-accent) 8%, transparent),
          transparent 60%
        ),
        radial-gradient(
          120% 90% at 0% 0%,
          color-mix(in srgb, var(--mat-sys-primary) 11%, transparent),
          transparent 55%
        ),
        var(--mat-sys-surface);
      box-shadow: 0 1px 2px rgba(20, 12, 45, 0.04),
        0 18px 40px -30px rgba(76, 29, 149, 0.35);
      transition: transform 0.16s ease, box-shadow 0.16s ease;
    }
    .stat::before {
      content: '';
      position: absolute;
      inset: 0 0 auto 0;
      height: 3px;
      background: linear-gradient(90deg, var(--mat-sys-primary), var(--tkt-accent));
    }
    :host(:hover) .stat {
      transform: translateY(-2px);
      box-shadow: 0 1px 2px rgba(20, 12, 45, 0.04),
        0 22px 46px -26px rgba(76, 29, 149, 0.45);
    }
    .icon {
      display: grid;
      place-items: center;
      width: 46px;
      height: 46px;
      border-radius: 13px;
      background: linear-gradient(
        135deg,
        color-mix(in srgb, var(--mat-sys-primary) 20%, transparent),
        color-mix(in srgb, var(--tkt-accent) 16%, transparent)
      );
      color: var(--mat-sys-primary);
      flex: none;
    }
    .content { display: flex; flex-direction: column; gap: 0.12rem; min-width: 0; }
    .label {
      font-size: 0.78rem;
      font-weight: 600;
      letter-spacing: 0.01em;
      color: var(--mat-sys-on-surface-variant);
    }
    .value {
      font-size: 1.6rem;
      font-weight: 800;
      letter-spacing: -0.025em;
    }
    .hint { font-size: 0.76rem; color: var(--mat-sys-on-surface-variant); }
  `,
})
export class StatCard {
  readonly icon = input.required<string>();
  readonly label = input.required<string>();
  readonly value = input.required<string | number | null>();
  readonly hint = input<string>('');
}
