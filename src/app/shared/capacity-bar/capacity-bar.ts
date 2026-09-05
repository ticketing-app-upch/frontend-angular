import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';

/** Barra de aforo: muestra el porcentaje vendido con color según la presión. */
@Component({
  selector: 'tkt-capacity-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe],
  template: `
    <div class="wrap">
      <div class="track">
        <div
          class="fill"
          [class.warn]="level() === 'warn'"
          [class.full]="level() === 'full'"
          [style.width.%]="pct()"
        ></div>
      </div>
      @if (showLabel()) {
        <div class="label">
          <span>{{ sold() | number }} / {{ total() | number }}</span>
          <span class="pct">{{ pct() | number: '1.0-0' }}%</span>
        </div>
      }
    </div>
  `,
  styles: `
    :host { display: block; }
    .track {
      height: 8px;
      border-radius: 999px;
      background: color-mix(in srgb, var(--mat-sys-on-surface) 10%, transparent);
      overflow: hidden;
    }
    .fill {
      height: 100%;
      border-radius: 999px;
      background: var(--mat-sys-primary);
      transition: width 0.5s ease;
    }
    .fill.warn { background: #e2a400; }
    .fill.full { background: #b3261e; }
    .label {
      display: flex;
      justify-content: space-between;
      margin-top: 0.35rem;
      font-size: 0.8rem;
      color: var(--mat-sys-on-surface-variant);
    }
    .pct { font-weight: 600; }
  `,
})
export class CapacityBar {
  readonly sold = input.required<number>();
  readonly total = input.required<number>();
  readonly showLabel = input(true);

  readonly pct = computed(() => {
    const t = this.total();
    return t === 0 ? 0 : Math.min(100, (this.sold() / t) * 100);
  });

  readonly level = computed<'ok' | 'warn' | 'full'>(() => {
    const p = this.pct();
    if (p >= 100) return 'full';
    if (p >= 85) return 'warn';
    return 'ok';
  });
}
