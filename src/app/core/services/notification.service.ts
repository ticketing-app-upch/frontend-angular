import { Injectable, signal } from '@angular/core';

export type ToastKind = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

/**
 * Notificaciones tipo *toast* que aparecen arriba (centro) de la pantalla.
 * La API pública (`success` / `error` / `info`) se mantiene: el render lo hace
 * el componente `tkt-toaster`, montado una sola vez en la raíz.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private seq = 0;
  private readonly _toasts = signal<Toast[]>([]);
  readonly toasts = this._toasts.asReadonly();

  success(message: string): void {
    this.push('success', message, 3500);
  }

  error(message: string): void {
    this.push('error', message, 5000);
  }

  info(message: string): void {
    this.push('info', message, 3000);
  }

  dismiss(id: number): void {
    this._toasts.update((list) => list.filter((t) => t.id !== id));
  }

  private push(kind: ToastKind, message: string, duration: number): void {
    const id = ++this.seq;
    this._toasts.update((list) => [...list, { id, kind, message }]);
    setTimeout(() => this.dismiss(id), duration);
  }
}
