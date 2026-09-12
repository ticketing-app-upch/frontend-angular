import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { AdminService } from '../../../core/services/admin.service';
import { AuthService } from '../../../core/auth/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { User, UserRole } from '../../../core/models/user.model';
import { EmptyState } from '../../../shared/empty-state/empty-state';

@Component({
  selector: 'tkt-admin-users',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    EmptyState,
  ],
  templateUrl: './admin-users.html',
  styleUrl: './admin-users.scss',
})
export class AdminUsers {
  private admin = inject(AdminService);
  private auth = inject(AuthService);
  private notify = inject(NotificationService);

  readonly loading = signal(true);
  readonly users = signal<User[]>([]);
  readonly busyId = signal<string | null>(null);
  readonly confirmId = signal<string | null>(null);

  readonly roles: UserRole[] = ['CLIENT', 'ORGANIZER', 'ADMIN'];
  readonly roleLabel: Record<UserRole, string> = {
    CLIENT: 'Cliente',
    ORGANIZER: 'Organizador',
    ADMIN: 'Administrador',
  };

  constructor() {
    this.load();
  }

  isSelf(u: User): boolean {
    return u.id === this.auth.user()?.id;
  }

  initials(name: string): string {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('');
  }

  changeRole(u: User, role: UserRole): void {
    if (role === u.role) return;
    this.busyId.set(u.id);
    this.admin.setUserRole(u.id, role).subscribe({
      next: () => {
        this.users.update((list) =>
          list.map((x) => (x.id === u.id ? { ...x, role } : x)),
        );
        this.busyId.set(null);
        this.notify.success(`${u.fullName} ahora es ${this.roleLabel[role]}.`);
      },
      error: (err) => {
        this.busyId.set(null);
        this.notify.error(err?.message ?? 'No se pudo cambiar el rol.');
      },
    });
  }

  askDelete(u: User): void {
    this.confirmId.set(u.id);
  }

  cancelDelete(): void {
    this.confirmId.set(null);
  }

  confirmDelete(u: User): void {
    this.busyId.set(u.id);
    this.admin.deleteUser(u.id).subscribe({
      next: () => {
        this.users.update((list) => list.filter((x) => x.id !== u.id));
        this.busyId.set(null);
        this.confirmId.set(null);
        this.notify.success(`Cuenta de ${u.fullName} eliminada.`);
      },
      error: (err) => {
        this.busyId.set(null);
        this.confirmId.set(null);
        this.notify.error(err?.message ?? 'No se pudo eliminar la cuenta.');
      },
    });
  }

  private load(): void {
    this.loading.set(true);
    this.admin.users().subscribe({
      next: (list) => {
        this.users.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.notify.error('No se pudieron cargar los usuarios.');
      },
    });
  }
}
