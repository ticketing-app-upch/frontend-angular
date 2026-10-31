import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AdminService } from '../../../core/services/admin.service';
import { NotificationService } from '../../../core/services/notification.service';
import { User } from '../../../core/models/user.model';

@Component({
  selector: 'tkt-admin-users',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './admin-users.html',
  styleUrl: './admin-users.scss',
})
export class AdminUsers {
  private readonly admin = inject(AdminService);
  private readonly notify = inject(NotificationService);
  readonly loading = signal(true);
  readonly users = signal<User[]>([]);
  readonly role = signal('ALL');
  readonly status = signal('ALL');
  readonly busyId = signal<string | null>(null);
  readonly confirmId = signal<string | null>(null);
  readonly visible = computed(() => this.users().filter(user =>
    (this.role() === 'ALL' || user.role === this.role()) &&
    (this.status() === 'ALL' || (user.active !== false ? 'ACTIVE' : 'INACTIVE') === this.status()),
  ));

  constructor() { this.load(); }

  setRole(event: Event): void { this.role.set((event.target as HTMLSelectElement).value); }
  setStatus(event: Event): void { this.status.set((event.target as HTMLSelectElement).value); }
  isActive(user: User): boolean { return user.active !== false; }
  roleLabel(user: User): string { return user.role === 'ORGANIZER' ? 'Organizador' : 'Asistente'; }
  initials(name: string): string { return name.split(' ').filter(Boolean).slice(0, 2).map(part => part[0].toUpperCase()).join(''); }

  toggle(user: User): void {
    if (this.isActive(user) && this.confirmId() !== user.id) {
      this.confirmId.set(user.id);
      return;
    }
    this.confirmId.set(null);
    const active = !this.isActive(user);
    this.busyId.set(user.id);
    this.admin.setUserActive(user.id, active).subscribe({
      next: () => {
        this.users.update(users => users.map(item => item.id === user.id ? { ...item, active } : item));
        this.busyId.set(null);
        this.notify.success(active ? 'Cuenta activada.' : 'Cuenta desactivada.');
      },
      error: error => {
        this.busyId.set(null);
        this.notify.error(error?.message ?? 'No se pudo cambiar el estado.');
      },
    });
  }

  private load(): void {
    this.admin.users().subscribe({
      next: users => { this.users.set(users.filter(user => user.role !== 'ADMIN')); this.loading.set(false); },
      error: () => { this.loading.set(false); this.notify.error('No se pudo cargar el listado.'); },
    });
  }
}
