import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe, DecimalPipe, PercentPipe, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DashboardService } from '../../../core/services/dashboard.service';
import { AuthService } from '../../../core/auth/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { DashboardFilterOptions, DashboardStats } from '../../../core/models/dashboard.model';
import { EventCategory } from '../../../core/models/event.model';
import { StatCard } from '../../../shared/stat-card/stat-card';
import { LimaMap } from '../../../shared/lima-map/lima-map';
import { BarChart, BarDatum } from '../../../shared/bar-chart/bar-chart';
import { CapacityBar } from '../../../shared/capacity-bar/capacity-bar';
import { ZoneInsights } from './zone-insights';
import { EmptyState } from '../../../shared/empty-state/empty-state';

@Component({
  selector: 'tkt-organizer-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    FormsModule,
    CurrencyPipe,
    DatePipe,
    DecimalPipe,
    PercentPipe,
    TitleCasePipe,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    StatCard,
    LimaMap,
    BarChart,
    CapacityBar,
    EmptyState,
    ZoneInsights,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class OrganizerDashboard {
  private dashboard = inject(DashboardService);
  private auth = inject(AuthService);
  private notify = inject(NotificationService);

  readonly loading = signal(true);
  readonly stats = signal<DashboardStats | null>(null);
  readonly filterOptions = signal<DashboardFilterOptions | null>(null);

  readonly categories: EventCategory[] = [
    'CONCIERTO',
    'FESTIVAL',
    'TEATRO',
    'DEPORTE',
    'CONFERENCIA',
  ];

  /** El buscador del panel: todo lo que se ve abajo (KPIs, mapa, gráfico, tablas) sale filtrado por esto. */
  readonly districtFilter = signal<string | null>(null);
  readonly categoryFilter = signal<EventCategory | null>(null);
  readonly sectorFilter = signal('');

  readonly hasActiveFilters = computed(
    () => !!this.districtFilter() || !!this.categoryFilter() || !!this.sectorFilter().trim(),
  );

  readonly chartData = computed<BarDatum[]>(() =>
    (this.stats()?.revenueSeries ?? []).map((p) => ({
      label: p.label,
      value: p.revenue,
      caption: p.tickets ? `${p.tickets} ent.` : undefined,
    })),
  );

  private requestSeq = 0;

  constructor() {
    const id = this.auth.user()?.id ?? '';

    this.dashboard.filterOptions(id).subscribe({
      next: (opts) => this.filterOptions.set(opts),
      error: () => { /* los selectores simplemente quedan sin sugerencias */ },
    });

    // Se re-ejecuta solo (y vuelve a pedir el panel) cada vez que cambia
    // cualquiera de los tres filtros del buscador.
    effect(() => {
      const district = this.districtFilter() ?? undefined;
      const category = this.categoryFilter() ?? undefined;
      const sector = this.sectorFilter().trim() || undefined;
      const seq = ++this.requestSeq;

      this.loading.set(true);
      this.dashboard.stats(id, { district, category, sector }).subscribe({
        next: (s) => {
          if (seq !== this.requestSeq) return;
          this.stats.set(s);
          this.loading.set(false);
        },
        error: () => {
          if (seq !== this.requestSeq) return;
          this.loading.set(false);
          this.notify.error('No se pudo cargar el panel.');
        },
      });
    });
  }

  clearFilters(): void {
    this.districtFilter.set(null);
    this.categoryFilter.set(null);
    this.sectorFilter.set('');
  }
}
