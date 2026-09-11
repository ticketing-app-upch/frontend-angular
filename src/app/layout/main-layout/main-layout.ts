import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'tkt-main-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatDividerModule,
  ],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.scss',
})
export class MainLayout {
  readonly dark = signal(false);
  private router = inject(Router);
  constructor() {
    let preferred = ''; try { preferred = localStorage.getItem('aforo.theme') ?? ''; } catch { /* sistema */ }
    this.dark.set(preferred ? preferred === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.style.colorScheme = this.dark() ? 'dark' : 'light';
  }
  toggleTheme(): void {
    this.dark.update(v => !v);
    const theme = this.dark() ? 'dark' : 'light'; document.documentElement.style.colorScheme = theme;
    try { localStorage.setItem('aforo.theme', theme); } catch { /* solo sesión */ }
  }
  private auth = inject(AuthService);

  readonly user = this.auth.user;
  readonly isAuthenticated = this.auth.isAuthenticated;
  readonly isOrganizer = this.auth.isOrganizer;
  readonly isClient = this.auth.isClient;
  readonly isAdmin = this.auth.isAdmin;
  readonly year = new Date().getFullYear();

  logout(): void {
    this.auth.logout();
    void this.router.navigate(['/eventos']);
  }

  initials(name: string): string {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('');
  }
}
