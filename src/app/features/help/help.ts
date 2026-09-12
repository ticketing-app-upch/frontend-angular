import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'tkt-help',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, FormsModule, MatButtonModule, MatIconModule],
  template: `
    <div class="tkt-page">
      <span class="eyebrow">AFORO / GUÍA DE EXPERIENCIA</span><h1>Todo listo para vivirlo.</h1>
      <p class="intro">Tu ruta desde el primer “vamos” hasta el ingreso: explora, elige tu zona, confirma el pago y lleva tu entrada digital contigo.</p>
      <div class="steps"><article><mat-icon>explore</mat-icon><h2>01. Encuentra tu plan</h2><p>Filtra por fecha y recinto. Aforo Match encuentra zonas para tu grupo dentro de tu presupuesto, incluido el servicio.</p><a routerLink="/eventos">Explorar eventos →</a></article><article><mat-icon>payments</mat-icon><h2>02. Decide con claridad</h2><p>Compara hasta tres eventos. Revisa el ajuste dinámico y la comisión del 6% antes de confirmar hasta seis entradas.</p></article><article><mat-icon>qr_code_2</mat-icon><h2>03. Prepara tu llegada</h2><p>Guarda la fecha en tu calendario, revisa tu resumen y consulta tu pase en Mis entradas.</p><a routerLink="/mis-entradas">Ver mis entradas →</a></article></div>
      <h2>Preguntas, sin vueltas.</h2><label class="search">Buscar en la ayuda<input type="search" placeholder="Pago, QR, favoritos…" [ngModel]="search()" (ngModelChange)="search.set($event)" /></label>
      @for (item of faqs; track item.q) { @if ((item.q + item.a).toLowerCase().includes(search().toLowerCase())) { <details><summary>{{ item.q }}</summary><p>{{ item.a }}</p></details> } }
      <section class="checklist"><div><span class="eyebrow">CHECKLIST DE LLEGADA</span><h2>El plan empieza antes del show.</h2><p>Lista personal de esta sesión. Confirma condiciones específicas con el organizador.</p></div><div><label><input type="checkbox" /> Revisé la fecha, el recinto y cómo llegar.</label><label><input type="checkbox" /> Tengo batería y acceso a Mis entradas.</label><label><input type="checkbox" /> Revisé las restricciones y documentación del evento.</label></div></section>
      <aside><h2>Compra y acceso</h2><p>Revisa los datos antes de pagar y conserva tu entrada en Mis entradas. El organizador define las condiciones de ingreso, los horarios y las restricciones aplicables a cada evento.</p></aside>
    </div>
  `,
  styles: `
    .eyebrow{color:var(--mat-sys-primary);font:700 11px monospace;letter-spacing:2px}h1{font-size:clamp(36px,5vw,60px);letter-spacing:-2px;margin:20px 0}.intro{max-width:620px;font-size:17px;line-height:1.7;color:var(--mat-sys-on-surface-variant)}h2{font-size:23px;letter-spacing:-.5px}.steps{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin:40px 0}.steps article{padding:24px;background:var(--mat-sys-surface);border:1px solid var(--mat-sys-outline-variant);border-radius:18px}.steps h2{font-size:19px}.steps mat-icon{color:var(--mat-sys-primary)}p{line-height:1.7;font-size:14px;color:var(--mat-sys-on-surface-variant)}.search{display:grid;gap:10px;max-width:500px;font-size:13px;margin:24px 0}.search input{padding:16px;border-radius:12px;background:var(--mat-sys-surface);border:1px solid var(--mat-sys-outline-variant);color:inherit}details{border-bottom:1px solid var(--mat-sys-outline-variant);padding:16px 0}summary{cursor:pointer;font-weight:600;padding:8px 0}details p{max-width:800px}.checklist{margin:36px 0;padding:26px;border-radius:18px;background:var(--mat-sys-primary-container);display:grid;grid-template-columns:1fr 1fr;gap:24px}.checklist label{display:flex;gap:10px;align-items:center;padding:12px 0;font-size:14px}.checklist input{accent-color:var(--mat-sys-primary);width:18px;height:18px;flex:none}aside{border:1px dashed var(--mat-sys-outline);padding:20px;border-radius:14px}@media(max-width:700px){.steps,.checklist{grid-template-columns:1fr}.steps{gap:12px}.steps article{padding:20px}}
  `
})
export class Help {
  readonly search = signal('');
  readonly faqs = [
    { q: '¿Por qué cambia el precio?', a: 'Las reglas del proyecto aplican +20% si queda menos del 15% del aforo o faltan menos de 3 días. Aplican −10% si lleva más de 30 días publicado y vendió menos del 10%. El incremento tiene prioridad y los ajustes no se suman. Una compra confirmada conserva sus precios.' },
    { q: '¿Hay pagos con tarjeta, Yape o Plin?', a: 'Aforo Pay te permite elegir tarjeta o billetera digital al finalizar la compra. Revisa el monto, el evento y el medio de pago antes de confirmar.' },
    { q: '¿Qué pasa si vence la cotización o cambia el aforo?', a: 'La pantalla permite confirmar durante dos minutos y luego pide actualizar. Cotizar no reserva stock. Si cambia el precio o ya no hay disponibilidad al confirmar, debes revisar la selección. En producción esto requiere una transacción del backend.' },
    { q: '¿Dónde se guardan mis favoritos y compras?', a: 'Tus favoritos, compras y preferencias se vinculan a tu sesión actual. Ingresa siempre desde tu cuenta para consultar tus entradas.' },
    { q: '¿Cómo funciona el QR rotativo?', a: 'El código cambia periódicamente para mantener la entrada actualizada. El personal de acceso valida su vigencia antes de permitir el ingreso.' },
    { q: '¿Puedo cancelar o transferir entradas?', a: 'Las condiciones de cambios, transferencias y reembolsos dependen del organizador. Consulta los términos específicos del evento antes de confirmar tu compra.' },
    { q: '¿Cómo agrego un evento a mi calendario?', a: 'El botón Mi calendario descarga un archivo .ics compatible con aplicaciones de calendario. La hora se guarda en UTC para respetar tu zona horaria. No conocemos la duración del evento ni accedemos a tu cuenta de Google o Apple.' },
    { q: '¿Esto incluye asientos numerados y accesibilidad del recinto?', a: 'La compra es por sectores, no por asientos. Los planos son referenciales. Confirma con el organizador accesos, edad mínima, acompañantes y condiciones del recinto; no inventamos esas políticas.' }
  ];
}
