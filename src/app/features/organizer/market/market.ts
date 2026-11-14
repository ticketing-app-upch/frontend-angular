import { CurrencyPipe, DecimalPipe, PercentPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MarketFilters, MarketGroup, MarketReport, MarketService } from '../../../core/services/market.service';
import { DEMO_VENUES } from '../../../core/models/venue-catalog';

const COLORS = ['#7c3aed', '#0ea5e9', '#f59e0b', '#10b981', '#ef4444'];

@Component({
  selector: 'tkt-market',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrencyPipe, DecimalPipe, PercentPipe, MatProgressSpinnerModule],
  templateUrl: './market.html',
  styleUrl: './market.scss',
})
export class Market {
  private service = inject(MarketService);
  readonly categories = ['CONCIERTO', 'TEATRO', 'DEPORTE', 'CONFERENCIA', 'FESTIVAL'];
  readonly venues = [...new Set(DEMO_VENUES.map(v => v.name))].sort();
  readonly filters = signal<MarketFilters>({ queue: 'all' });
  readonly report = signal<MarketReport | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly colors = COLORS;
  readonly weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  readonly donut = computed(() => {
    const categories = this.report()?.categories ?? [];
    const total = categories.reduce((n, c) => n + c.tickets, 0);
    if (!total) return 'conic-gradient(#d1d5db 0 100%)';
    let start = 0;
    const slices = categories.map((c, i) => {
      const end = start + c.tickets / total * 100;
      const slice = `${COLORS[i % COLORS.length]} ${start}% ${end}%`;
      start = end; return slice;
    });
    return `conic-gradient(${slices.join(', ')})`;
  });
  readonly line = computed(() => {
    const months = this.report()?.monthly ?? [];
    const max = Math.max(1, ...months.map(m => m.tickets));
    return months.map((m, i) => `${i * 60 + 10},${110 - m.tickets / max * 95}`).join(' ');
  });
  readonly conversion = computed(() => {
    const q = this.report()?.queue;
    if (!q) return 0;
    const total = q.completed + q.expired + q.cancelled;
    return total ? q.completed / total : 0;
  });

  constructor() { this.load(); }
  change(key: keyof MarketFilters, value: string): void {
    this.filters.update(current => ({ ...current, [key]: value || undefined }));
    this.load();
  }
  top(groups: MarketGroup[], key: 'events' | 'tickets' | 'revenue'): MarketGroup[] {
    return [...groups].sort((a, b) => b[key] - a[key]).slice(0, 5);
  }
  width(value: number, groups: MarketGroup[], key: 'events' | 'tickets' | 'revenue'): number {
    return Math.max(2, value / Math.max(1, ...groups.map(g => g[key])) * 100);
  }
  heat(value: number, values: number[]): string {
    if (!value) return '#e5e7eb';
    const fraction = value / Math.max(1, ...values);
    return fraction > .66 ? '#5b21b6' : fraction > .33 ? '#a78bfa' : '#ddd6fe';
  }
  private load(): void {
    this.loading.set(true); this.error.set('');
    this.service.report(this.filters()).subscribe({
      next: report => { this.report.set(report); this.loading.set(false); },
      error: err => { this.loading.set(false); this.error.set(err?.error?.message ?? 'No se pudo cargar el mercado.'); },
    });
  }
}
