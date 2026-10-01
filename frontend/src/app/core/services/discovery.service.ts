import { Injectable, signal } from '@angular/core';
/** Preferencias locales de este dispositivo. */
@Injectable({ providedIn: 'root' })
export class DiscoveryService {
  readonly favorites = signal<string[]>(this.read());
  private read(): string[] {
    try { const raw: unknown = JSON.parse(localStorage.getItem('aforo.favorites.v1') ?? '[]'); return Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string') : []; }
    catch { return []; }
  }
  has(id: string): boolean { return this.favorites().includes(id); }
  toggle(id: string): void {
    this.favorites.update(ids => ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]);
    try { localStorage.setItem('aforo.favorites.v1', JSON.stringify(this.favorites())); } catch { /* Preferencia de sesión. */ }
  }
}
