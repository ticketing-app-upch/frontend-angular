import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { MockStore } from '../../core/mock/mock-store';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RedemptionService, Redemption } from '../../core/services/redemption.service';
import {
  STEP_MS,
  TicketTokenCheck,
  TicketTokenService,
} from '../../core/services/ticket-token.service';

type Verdict =
  | 'empty'
  | 'not-configured'
  | 'invalid'
  | 'expired'
  | 'stale'
  | 'reused'
  | 'valid';

type Tone = 'idle' | 'ok' | 'warn' | 'bad';

interface VerdictView {
  tone: Tone;
  icon: string;
  title: string;
  detail: string;
}

const VERDICTS: Record<Verdict, VerdictView> = {
  empty: {
    tone: 'idle',
    icon: 'qr_code_scanner',
    title: 'Escanea una entrada',
    detail: 'Apunta la cámara al QR de una entrada para validar el acceso.',
  },
  'not-configured': {
    tone: 'idle',
    icon: 'key_off',
    title: 'Validación real pendiente de integración',
    detail:
      'La firma y el registro único de ingreso deben resolverse en el backend, nunca con una clave del navegador.',
  },
  invalid: {
    tone: 'bad',
    icon: 'gpp_bad',
    title: 'Entrada inválida o alterada',
    detail:
      'La firma no coincide con el contenido del código. No corresponde a un pase emitido por Aforo.',
  },
  expired: {
    tone: 'bad',
    icon: 'event_busy',
    title: 'Entrada expirada',
    detail: 'El evento ya terminó según la vigencia grabada en el pase.',
  },
  stale: {
    tone: 'warn',
    icon: 'update',
    title: 'Código vencido',
    detail:
      'El QR rota cada ' +
      STEP_MS / 1000 +
      ' s y este ya caducó. Pide que actualicen la pantalla de la entrada y vuelve a escanear.',
  },
  reused: {
    tone: 'warn',
    icon: 'report',
    title: 'Entrada ya utilizada',
    detail: 'Este pase ya registró un ingreso. No se permite un segundo acceso.',
  },
  valid: {
    tone: 'ok',
    icon: 'check_circle',
    title: 'Acceso válido',
    detail: 'Simulación local: pase vigente y orden confirmada. No autoriza un ingreso real ni sincroniza otros dispositivos.',
  },
};

/**
 * Puerta de validación. Se abre al escanear el QR de una entrada: el token
 * viaja en el hash de la URL (`/validar#payload.firma`).
 *
 * Reproduce el flujo real de un lector de accesos:
 *  1. recomputa el HMAC del payload y lo compara con la firma del código;
 *  2. comprueba la vigencia y el intervalo rotativo;
 *  3. consulta el registro de redenciones y marca el primer ingreso válido;
 *     un segundo escaneo del mismo pase se responde como "ya utilizada".
 */
@Component({
  selector: 'tkt-validate',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, RouterLink, MatButtonModule, MatIconModule],
  templateUrl: './validate.html',
  styleUrl: './validate.scss',
})
export class ValidatePage {
  private readonly store = inject(MockStore);
  private readonly tokens = inject(TicketTokenService);
  private readonly redemptions = inject(RedemptionService);
  private readonly rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });

  readonly verdict = signal<Verdict>('empty');
  readonly check = signal<TicketTokenCheck | null>(null);
  readonly firstAccess = signal<Redemption | null>(null);
  readonly rawToken = signal('');
  readonly showDebug = signal(false);

  readonly view = computed<VerdictView>(() => VERDICTS[this.verdict()]);
  readonly claims = computed(() => this.check()?.claims ?? null);
  readonly prettyPayload = computed(() => {
    const c = this.claims();
    return c ? JSON.stringify(c, null, 2) : '';
  });

  constructor() {
    const destroyRef = inject(DestroyRef);
    const onHashChange = () => this.evaluate();
    this.evaluate();
    window.addEventListener('hashchange', onHashChange);
    destroyRef.onDestroy(() =>
      window.removeEventListener('hashchange', onHashChange),
    );
  }

  rescan(): void {
    this.evaluate();
  }

  resetValidation(): void {
    this.redemptions.reset();
    this.evaluate();
  }

  toggleDebug(): void {
    this.showDebug.update((v) => !v);
  }

  relativeTime(epochMs: number): string {
    const diffS = Math.round((epochMs - Date.now()) / 1000);
    const abs = Math.abs(diffS);
    if (abs < 60) return this.rtf.format(diffS, 'second');
    if (abs < 3600) return this.rtf.format(Math.round(diffS / 60), 'minute');
    if (abs < 86_400) return this.rtf.format(Math.round(diffS / 3600), 'hour');
    return this.rtf.format(Math.round(diffS / 86_400), 'day');
  }

  private evaluate(): void {
    const token = this.readHash();
    this.rawToken.set(token);
    this.firstAccess.set(null);

    if (!token) {
      this.check.set(null);
      this.verdict.set('empty');
      return;
    }

    const result = this.tokens.verify(token);
    this.check.set(result);

    switch (result.reason) {
      case 'not-configured':
        this.verdict.set('not-configured');
        return;
      case 'malformed':
      case 'bad-signature':
        this.verdict.set('invalid');
        return;
      case 'expired':
        this.verdict.set('expired');
        return;
      case 'stale':
        this.verdict.set('stale');
        return;
      case 'ok': {
        const c = result.claims!;
        const order = this.store.orders.find(o => o.id === c.oid && o.code === c.cod && o.status === 'CONFIRMADA');
        if (!order) { this.verdict.set('invalid'); return; }
        const { record, firstTime } = this.redemptions.redeem(
          c.oid,
          c.cod,
          c.stp,
        );
        this.firstAccess.set(record);
        this.verdict.set(firstTime ? 'valid' : 'reused');
        return;
      }
    }
  }

  private readHash(): string {
    const raw = window.location.hash.replace(/^#/, '');
    try {
      return decodeURIComponent(raw).trim();
    } catch {
      return raw.trim();
    }
  }
}
