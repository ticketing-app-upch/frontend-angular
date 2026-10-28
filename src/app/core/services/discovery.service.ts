import { Injectable, effect, inject, signal } from '@angular/core';
import { AuthService } from '../auth/auth.service';

/** Favoritos de maqueta, separados por usuario en este navegador. */
@Injectable({ providedIn: 'root' })
export class DiscoveryService {
  private readonly auth = inject(AuthService);
  readonly favorites = signal<string[]>([]);

  constructor() {
    effect(() => { this.favorites.set(this.read(this.auth.user()?.id)); });
  }

  private key(userId: string): string { return `demo3.favorites.${userId}`; }
  private read(userId: string | undefined): string[] {
    if (!userId) return [];
    try {
      const raw: unknown = JSON.parse(localStorage.getItem(this.key(userId)) ?? '[]');
      return Array.isArray(raw) ? raw.filter((id): id is string => typeof id === 'string') : [];
    } catch { return []; }
  }

  has(id: string): boolean { return this.favorites().includes(id); }
  toggle(id: string): void {
    const userId = this.auth.user()?.id;
    if (!userId || !this.auth.isClient()) return;
    this.favorites.update(ids => ids.includes(id) ? ids.filter(item => item !== id) : [...ids, id]);
    try { localStorage.setItem(this.key(userId), JSON.stringify(this.favorites())); } catch { /* solo sesión */ }
  }
}
