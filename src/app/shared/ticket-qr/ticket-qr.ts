import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { toCanvas } from 'qrcode';
import { TicketOrder } from '../../core/models/ticket.model';
import { STEP_MS, TicketTokenService } from '../../core/services/ticket-token.service';

/**
 * QR real y escaneable del pase de una entrada.
 *
 * Codifica la URL firmada que devuelve {@link TicketTokenService}. Por defecto
 * rota cada {@link STEP_MS} ms (estilo SafeTix): el anillo indica cuánto falta
 * para el siguiente código y "Congelar" lo detiene unos segundos para poder
 * escanearlo con calma.
 */
@Component({
  selector: 'tkt-qr',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="frame" [style.width.px]="size()">
      <canvas
        #canvas
        class="code"
        [attr.aria-label]="'Código QR de la entrada ' + order().code"
      ></canvas>
      @if (rotating() && !frozen()) {
        <svg
          class="ring"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <rect class="track" x="2" y="2" width="96" height="96" rx="13" pathLength="100" />
          <rect
            class="sweep"
            x="2"
            y="2"
            width="96"
            height="96"
            rx="13"
            pathLength="100"
            [style.animationDuration.ms]="stepMs"
            [style.animationDelay.ms]="ringDelay"
          />
        </svg>
      }
    </div>

    @if (rotating()) {
      <button type="button" class="toggle" (click)="toggleFreeze()">
        {{ frozen() ? 'Reanudar' : 'Congelar para escanear' }}
      </button>
      <p class="hint">
        {{
          frozen()
            ? 'QR en pausa · válido unos segundos más'
            : 'Se renueva cada ' + stepMs / 1000 + ' s'
        }}
      </p>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
    }
    .frame {
      position: relative;
      aspect-ratio: 1;
      padding: 8px;
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 6px 18px rgba(12, 6, 32, 0.3);
    }
    .code {
      display: block;
      width: 100% !important;
      height: 100% !important;
      border-radius: 4px;
    }
    .ring {
      position: absolute;
      inset: -6px;
      width: calc(100% + 12px);
      height: calc(100% + 12px);
      pointer-events: none;
      overflow: visible;
    }
    .ring rect {
      fill: none;
      stroke-width: 2.5;
      stroke-linecap: round;
      vector-effect: non-scaling-stroke;
    }
    .ring .track {
      stroke: color-mix(in srgb, currentColor 20%, transparent);
    }
    .ring .sweep {
      stroke: currentColor;
      stroke-dasharray: 100;
      animation: tkt-qr-sweep linear infinite;
    }
    @keyframes tkt-qr-sweep {
      from {
        stroke-dashoffset: 100;
      }
      to {
        stroke-dashoffset: 0;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .ring .sweep {
        animation: none;
        stroke-dashoffset: 0;
      }
    }
    .toggle {
      appearance: none;
      border: 1px solid color-mix(in srgb, currentColor 40%, transparent);
      background: color-mix(in srgb, currentColor 12%, transparent);
      color: inherit;
      font: inherit;
      font-size: 0.72rem;
      font-weight: 600;
      letter-spacing: 0.01em;
      padding: 0.28rem 0.7rem;
      border-radius: 999px;
      cursor: pointer;
    }
    .toggle:hover {
      background: color-mix(in srgb, currentColor 20%, transparent);
    }
    .hint {
      margin: 0;
      font-size: 0.66rem;
      opacity: 0.8;
      text-align: center;
    }
  `,
})
export class TicketQr {
  private readonly tokens = inject(TicketTokenService);
  private readonly destroyRef = inject(DestroyRef);

  /** Orden cuya entrada se representa. */
  readonly order = input.required<TicketOrder>();
  /** Rota el código cada intervalo; si es `false` el QR es fijo. */
  readonly rotating = input(true);
  /** Lado del QR en píxeles CSS. */
  readonly size = input(196);

  readonly frozen = signal(false);
  readonly stepMs = STEP_MS;
  /** Alinea el anillo con el límite real del intervalo rotativo. */
  readonly ringDelay = -(Date.now() % STEP_MS);

  private readonly canvas =
    viewChild<ElementRef<HTMLCanvasElement>>('canvas');
  /** Se incrementa cada vez que el token debe regenerarse. */
  private readonly revision = signal(0);

  constructor() {
    let lastStep = -1;
    const timer = setInterval(() => {
      if (this.frozen() || !this.rotating()) return;
      const current = this.tokens.step();
      if (current !== lastStep) {
        lastStep = current;
        this.revision.update((n) => n + 1);
      }
    }, 1000);
    this.destroyRef.onDestroy(() => clearInterval(timer));

    effect(() => {
      this.revision();
      this.frozen();
      const order = this.order();
      const el = this.canvas()?.nativeElement;
      if (!el) return;
      const url = this.tokens.configured
        ? this.tokens.issueUrl(order)
        : `${this.tokens.linkBase}/validar#${order.code}`;
      void toCanvas(el, url, {
        errorCorrectionLevel: 'M',
        margin: 1,
        width: this.size() * 2,
        color: { dark: '#0c1020', light: '#ffffff' },
      }).catch(() => {});
    });
  }

  toggleFreeze(): void {
    this.frozen.update((v) => !v);
    if (!this.frozen()) this.revision.update((n) => n + 1);
  }
}
