import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe, DecimalPipe, PercentPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { DashboardService } from '../../../core/services/dashboard.service';
import { AuthService } from '../../../core/auth/auth.service';
import { DashboardStats } from '../../../core/models/dashboard.model';
import { StatCard } from '../../../shared/stat-card/stat-card';
import { BarChart, BarDatum } from '../../../shared/bar-chart/bar-chart';
import { CapacityBar } from '../../../shared/capacity-bar/capacity-bar';
import { EmptyState } from '../../../shared/empty-state/empty-state';

@Component({
  selector: 'tkt-organizer-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    CurrencyPipe,
    DatePipe,
    DecimalPipe,
    PercentPipe,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTableModule,
    StatCard,
    BarChart,
    CapacityBar,
    EmptyState,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class OrganizerDashboard {
  private dashboard = inject(DashboardService);
  private auth = inject(AuthService);

  readonly loading = signal(true);
  readonly stats = signal<DashboardStats | null>(null);

  readonly columns = ['event', 'date', 'occupancy', 'sold', 'revenue'];

  readonly chartData = computed<BarDatum[]>(() =>
    (this.stats()?.revenueSeries ?? []).map((p) => ({
      label: p.label,
      value: p.revenue,
      caption: p.tickets ? `${p.tickets} ent.` : undefined,
    })),
  );

  constructor() {
    const id = this.auth.user()?.id ?? '';
    this.dashboard.stats(id).subscribe({
      next: (s) => {
        this.stats.set(s);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
