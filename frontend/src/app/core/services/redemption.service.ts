import { Injectable, computed, signal } from '@angular/core';

const STORAGE_KEY = 'aforo.redenciones.v1';

export interface Redemption {
  /** id de la orden canjeada */
  oid: string;
  /** código legible de la entrada */
  cod: string;
  /** momento del primer escaneo válido (epoch ms) */
  at: number;
  /** intervalo rotativo con el que se canjeó */
  stp: number;
}

/**
 * Registro de entradas ya canjeadas en la puerta (control de acceso).
 *
 * Es el equivalente local a la tabla de redenciones del backend: la primera
 * vez que un QR válido se escanea se guarda aquí; a partir de entonces
 * cualquier reintento (una captura reenviada, la misma entrada dos veces)
 * se responde como "ya utilizada". Persiste en `localStorage` para que el
 * estado sobreviva al refresco de la sesión.
 */
@Injectable({ providedIn: 'root' })
export class RedemptionService {
  private readonly _log = signal<Record<string, Redemption>>(this.load());

  /** Mapa `oid -> Redemption` de todo lo canjeado. */
  readonly log = this._log.asReadonly();
  /** Total de entradas canjeadas (para contadores de la UI). */
  readonly count = computed(() => Object.keys(this._log()).length);

  get(oid: string): Redemption | undefined {
    return this._log()[oid];
  }

  isRedeemed(oid: string): boolean {
    return oid in this._log();
  }

  /**
   * Marca una entrada como usada. Si ya estaba canjeada, devuelve el registro
   * original con `firstTime: false` (la puerta debe rechazar el acceso).
   */
  redeem(
    oid: string,
    cod: string,
    stp: number,
  ): { record: Redemption; firstTime: boolean } {
    const existing = this._log()[oid];
    if (existing) return { record: existing, firstTime: false };
    const record: Redemption = { oid, cod, at: Date.now(), stp };
    this._log.update((map) => ({ ...map, [oid]: record }));
    this.save();
    return { record, firstTime: true };
  }

  /** Limpia el registro de validaciones local. */
  reset(): void {
    this._log.set({});
    this.save();
  }

  private load(): Record<string, Redemption> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Record<string, Redemption>) : {};
    } catch {
      return {};
    }
  }

  private save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this._log()));
    } catch {
      /* modo incógnito / almacenamiento lleno: seguimos solo en memoria */
    }
  }
}
