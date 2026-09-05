import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CurrencyPipe } from '@angular/common';

export interface BarDatum {
  label: string;
  value: number;
  caption?: string;
}

/** Gráfico de barras simple hecho a mano (sin dependencias externas). */
@Component({
  selector: 'tkt-bar-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrencyPipe],
  template: `
    <div class="chart" role="img" [attr.aria-label]="ariaLabel()">
      @for (bar of bars(); track bar.label) {
        <div class="col">
          <div class="bar-wrap">
            <span class="tip">
              {{ bar.value | currency: 'PEN' : 'symbol-narrow' : '1.0-0' }}
            </span>
            <div class="bar" [style.height.%]="bar.height"></div>
          </div>
          <span class="x">{{ bar.label }}</span>
          @if (bar.caption) {
            <span class="cap">{{ bar.caption }}</span>
          }
        </div>
      }
    </div>
  `,
  styles: `
    :host { display: block; }
    .chart {
      display: flex;
      align-items: flex-end;
      gap: 0.75rem;
      height: 220px;
      padding: 0.5rem 0.25rem 0;
    }
    .col { flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%; }
    .bar-wrap {
      position: relative;
      flex: 1;
      width: 100%;
      display: flex;
      align-items: flex-end;
      justify-content: center;
    }
    .bar {
      width: min(60%, 42px);
      min-height: 4px;
      border-radius: 8px 8px 2px 2px;
      background: linear-gradient(
        180deg,
        var(--mat-sys-primary),
        color-mix(in srgb, var(--mat-sys-primary) 55%, var(--mat-sys-tertiary))
      );
      transition: height 0.5s ease;
    }
    .tip {
      position: absolute;
      top: -1.4rem;
      font-size: 0.7rem;
      font-weight: 600;
      color: var(--mat-sys-on-surface-variant);
      opacity: 0;
      transition: opacity 0.15s ease;
      white-space: nowrap;
    }
    .col:hover .tip { opacity: 1; }
    .x { margin-top: 0.5rem; font-size: 0.78rem; color: var(--mat-sys-on-surface-variant); }
    .cap { font-size: 0.72rem; font-weight: 600; }
  `,
})
export class BarChart {
  readonly data = input.required<BarDatum[]>();

  readonly bars = computed(() => {
    const rows = this.data();
    const max = Math.max(1, ...rows.map((d) => d.value));
    return rows.map((d) => ({
      ...d,
      height: Math.max(2, (d.value / max) * 100),
    }));
  });

  readonly ariaLabel = computed(() =>
    this.data()
      .map((d) => `${d.label}: ${Math.round(d.value)}`)
      .join(', '),
  );
}
