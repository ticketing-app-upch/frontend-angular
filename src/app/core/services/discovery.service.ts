import { HttpClient } from '@angular/common/http';
import { Injectable, effect, inject, signal, untracked } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { environment } from '../../../enviroments/enviroment';
import { EventItem } from '../models/event.model';

/**
 * Favoritos del asistente. Con `useMock` se guardan por usuario en este
 * navegador; con el backend real se leen y escriben en `/v1/favoritos`.
 */
@Injectable({ providedIn: 'root' })
export class DiscoveryService {
  private readonly auth = inject(AuthService);
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBackendUrl;
  readonly favorites = signal<string[]>([]);

  constructor() {
    effect(() => {
      const userId = this.auth.user()?.id;
      const isClient = this.auth.isClient();
      untracked(() => {
        if (environment.useMock) this.favorites.set(this.read(userId));
        else this.load(isClient);
      });
    });
  }

  private key(userId: string): string { return `demo3.favorites.${userId}`; }
  private read(userId: string | undefined): string[] {
    if (!userId) return [];
    try {
      const raw: unknown = JSON.parse(localStorage.getItem(this.key(userId)) ?? '[]');
      return Array.isArray(raw) ? raw.filter((id): id is string => typeof id === 'string') : [];
    } catch { return []; }
  }

  private load(isClient: boolean): void {
    if (!isClient) { this.favorites.set([]); return; }
    this.http.get<Pick<EventItem, 'id'>[]>(`${this.base}/v1/favoritos`).subscribe({
      next: events => this.favorites.set(events.map(event => String(event.id))),
      error: () => this.favorites.set([]),
    });
  }

  has(id: string): boolean { return this.favorites().includes(id); }
  toggle(id: string): void {
    const userId = this.auth.user()?.id;
    if (!userId || !this.auth.isClient()) return;
    const wasFavorite = this.has(id);
    this.favorites.update(ids => wasFavorite ? ids.filter(item => item !== id) : [...ids, id]);
    if (environment.useMock) {
      try { localStorage.setItem(this.key(userId), JSON.stringify(this.favorites())); } catch { /* solo sesión */ }
      return;
    }
    const body = { eventId: /^\d+$/.test(id) ? Number(id) : id };
    const request = wasFavorite
      ? this.http.delete(`${this.base}/v1/favoritos`, { body })
      : this.http.post(`${this.base}/v1/favoritos`, body);
    request.subscribe({
      error: () => this.favorites.update(ids => wasFavorite ? [...ids, id] : ids.filter(item => item !== id)),
    });
  }
}
