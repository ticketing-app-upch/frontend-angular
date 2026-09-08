import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../enviroments/enviroment';
import { mockError, mockResponse } from '../mock/mock-latency';
import { MockStore } from '../mock/mock-store';
import { computeCapacity } from '../models/event.model';
import { User, UserRole } from '../models/user.model';

export interface AdminMetrics {
  users: { total: number; clients: number; organizers: number; admins: number };
  events: { total: number; published: number; drafts: number };
  orders: { total: number; confirmed: number; cancelled: number };
  ticketsSold: number;
  grossRevenue: number;
}

/**
 * Operaciones exclusivas del rol ADMIN: ve y modifica cualquier cosa del
 * sistema. En modo mock trabaja directo sobre `MockStore`; con backend real
 * pega a `/admin/*`.
 */
@Injectable({ providedIn: 'root' })
export class AdminService {
  private http = inject(HttpClient);
  private store = inject(MockStore);
  private base = environment.apiBackendUrl;

  /** Todos los usuarios, sin la contraseña. */
  users(): Observable<User[]> {
    if (environment.useMock) {
      return mockResponse(
        this.store.users
          .map(({ password: _pw, ...u }) => structuredClone(u) as User)
          .sort((a, b) => a.fullName.localeCompare(b.fullName)),
      );
    }
    return this.http.get<User[]>(`${this.base}/admin/users`);
  }

  setUserRole(id: string, role: UserRole): Observable<User> {
    if (environment.useMock) {
      const found = this.store.users.find((u) => u.id === id);
      if (!found) return mockError<User>('Usuario no encontrado.', 404);
      this.store.updateUser(id, { role });
      const { password: _pw, ...u } = { ...found, role };
      return mockResponse(structuredClone(u) as User);
    }
    return this.http.patch<User>(`${this.base}/admin/users/${id}`, { role });
  }

  deleteUser(id: string): Observable<void> {
    if (environment.useMock) {
      if (!this.store.users.some((u) => u.id === id)) {
        return mockError<void>('Usuario no encontrado.', 404);
      }
      this.store.removeUser(id);
      return mockResponse<void>(undefined);
    }
    return this.http.delete<void>(`${this.base}/admin/users/${id}`);
  }

  metrics(): Observable<AdminMetrics> {
    if (environment.useMock) {
      return mockResponse(this.buildMetrics());
    }
    return this.http.get<AdminMetrics>(`${this.base}/admin/metrics`);
  }

  private buildMetrics(): AdminMetrics {
    const users = this.store.users;
    const events = this.store.events;
    const orders = this.store.orders;
    const confirmed = orders.filter((o) => o.status === 'CONFIRMADA');

    return {
      users: {
        total: users.length,
        clients: users.filter((u) => u.role === 'CLIENT').length,
        organizers: users.filter((u) => u.role === 'ORGANIZER').length,
        admins: users.filter((u) => u.role === 'ADMIN').length,
      },
      events: {
        total: events.length,
        published: events.filter((e) => e.status === 'PUBLICADO').length,
        drafts: events.filter((e) => e.status === 'BORRADOR').length,
      },
      orders: {
        total: orders.length,
        confirmed: confirmed.length,
        cancelled: orders.filter((o) => o.status === 'CANCELADA').length,
      },
      ticketsSold: events.reduce((acc, e) => acc + computeCapacity(e).sold, 0),
      grossRevenue:
        Math.round(confirmed.reduce((acc, o) => acc + o.total, 0) * 100) / 100,
    };
  }
}
