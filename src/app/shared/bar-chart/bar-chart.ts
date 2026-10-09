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
      <div class="grid" aria-hidden="true">
        <span></span><span></span><span></span><span></span>
      </div>
      @for (bar of bars(); track bar.label) {
        <div class="col" [class.is-peak]="bar.peak">
          <div class="bar-wrap">
            <span class="val">
              {{ bar.value | currency: 'PEN' : 'symbol-narrow' : '1.0-0' }}
            </span>
            <div
              class="bar"
              [class.zero]="bar.value <= 0"
              [style.height.%]="bar.height"
            ></div>
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
      position: relative;
      display: flex;
      align-items: flex-end;
      gap: clamp(0.5rem, 3vw, 1.25rem);
      height: 220px;
      padding: 1.6rem 0.25rem 0;
    }
    .grid {
      position: absolute;
      inset: 1.6rem 0 2.9rem;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      pointer-events: none;
    }
    .grid span {
      display: block;
      border-top: 1px dashed color-mix(in srgb, var(--mat-sys-on-surface) 12%, transparent);
    }
    .col {
      position: relative;
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      height: 100%;
    }
    .bar-wrap {
      position: relative;
      flex: 1;
      width: 100%;
      display: flex;
      align-items: flex-end;
      justify-content: center;
    }
    .bar {
      width: min(66%, 46px);
      min-height: 6px;
      border-radius: 7px 7px 3px 3px;
      background: linear-gradient(
        180deg,
        var(--mat-sys-primary),
        color-mix(in srgb, var(--mat-sys-primary) 45%, var(--tkt-accent))
      );
      box-shadow: 0 8px 20px -8px color-mix(in srgb, var(--mat-sys-primary) 60%, transparent);
      transition: height 0.5s cubic-bezier(0.2, 0.9, 0.3, 1);
    }
    .col.is-peak .bar {
      background: linear-gradient(180deg, var(--tkt-accent-soft), var(--tkt-accent-strong));
      box-shadow: 0 10px 24px -8px color-mix(in srgb, var(--tkt-accent) 60%, transparent);
    }
    .bar.zero {
      background: color-mix(in srgb, var(--mat-sys-on-surface) 14%, transparent);
      box-shadow: none;
    }
    .val {
      position: absolute;
      top: -1.5rem;
      font-size: 0.72rem;
      font-weight: 700;
      color: var(--mat-sys-on-surface-variant);
      white-space: nowrap;
    }
    .col.is-peak .val { color: var(--tkt-accent-strong); }
    .x {
      margin-top: 0.55rem;
      font-size: 0.78rem;
      font-weight: 600;
      color: var(--mat-sys-on-surface-variant);
    }
    .cap { font-size: 0.72rem; font-weight: 600; color: var(--mat-sys-on-surface); }
  `,
})
export class BarChart {
  readonly data = input.required<BarDatum[]>();

  readonly bars = computed(() => {
    const rows = this.data();
    const max = Math.max(1, ...rows.map((d) => d.value));
    return rows.map((d) => ({
      ...d,
      height: d.value <= 0 ? 0 : Math.max(6, (d.value / max) * 100),
      peak: d.value > 0 && d.value === max,
    }));
  });

  readonly ariaLabel = computed(() =>
    this.data()
      .map((d) => `${d.label}: ${Math.round(d.value)}`)
      .join(', '),
  );
}
