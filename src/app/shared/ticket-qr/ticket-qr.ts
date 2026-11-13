import { ChangeDetectionStrategy, Component, ElementRef, effect, input, viewChild } from '@angular/core';
import { toCanvas } from 'qrcode';
import { IssuedTicket, OrderStatus } from '../../core/models/ticket.model';
import { environment } from '../../../enviroments/enviroment';

/** QR estático de la HU-16: abre una página pública de confirmación. */
@Component({
  selector: 'tkt-qr',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (status() === 'CONFIRMADA') {
      <span class="qr-frame" [style.width.px]="size()" [style.height.px]="size()">
        <canvas #canvas [attr.aria-label]="'Código QR de la entrada ' + ticket().code"></canvas>
      </span>
      <small>QR estático · {{ ticket().code }}</small>
    } @else { <span>QR no disponible</span> }
  `,
  styles: `
    :host { display: flex; flex-direction: column; align-items: center; gap: .45rem; min-width: 0; }
    .qr-frame { display: block; flex: none; max-width: 100%; aspect-ratio: 1 / 1; padding: 8px; border-radius: 12px; background: #fff; box-sizing: border-box; overflow: hidden; }
    canvas { display: block; width: 100% !important; height: 100% !important; aspect-ratio: 1 / 1; object-fit: contain; }
    small { display: block; max-width: 100%; font-size: .7rem; overflow-wrap: anywhere; text-align: center; }
  `,
})
export class TicketQr {
  readonly ticket = input.required<IssuedTicket>();
  readonly status = input.required<OrderStatus>();
  readonly size = input(196);
  private readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>('canvas');

  constructor() {
    effect(() => {
      const ticket = this.ticket();
      const canvas = this.canvas()?.nativeElement;
      if (!canvas || this.status() !== 'CONFIRMADA') return;
      const base = environment.publicBaseUrl || window.location.origin;
      const url = `${base.replace(/\/$/, '')}/validar/${encodeURIComponent(ticket.code)}`;
      void toCanvas(canvas, url, { errorCorrectionLevel: 'M', margin: 1, width: this.size() * 2,
        color: { dark: '#0c1020', light: '#ffffff' } });
    });
  }
}
