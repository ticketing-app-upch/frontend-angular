import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { CurrencyPipe, PercentPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ZonePerformance } from '../../../core/models/dashboard.model';
import { zonePrice } from '../../../core/models/ticketing-rules';
import { csvCell, downloadFile } from '../../../shared/event-actions';

@Component({
  selector: 'tkt-zone-insights',
  imports: [CurrencyPipe, PercentPipe, FormsModule, MatButtonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="insights">
      <div class="heading"><div><span class="eyebrow">AFORO PULSE / INTELIGENCIA POR ZONA</span><h2>Cada sector cuenta una historia.</h2><p>Ventas de entradas sin comisión. Exporta datos y explora escenarios sin modificar tus eventos.</p></div>
        <button mat-stroked-button (click)="exportCsv()" [disabled]="!filtered().length"><mat-icon>download</mat-icon> Exportar CSV</button></div>
      <label class="event-filter">Evento <select [ngModel]="eventId()" (ngModelChange)="eventId.set($event)"><option value="">Todos mis eventos</option>@for (event of events(); track event.id) { <option [value]="event.id">{{ event.name }}</option> }</select></label>
      @if (!rows().length) { <p>Sin métricas por zona. Registra eventos o conecta el endpoint del panel con el campo byZone.</p> }
      <div class="zone-grid">
        @for (row of filtered(); track row.eventId + row.zoneId) {
          <button class="zone-card" [class.selected]="selectedKey() === row.eventId + ':' + row.zoneId" (click)="select(row)">
            <span class="event-name">{{ row.eventName }}</span><strong>{{ row.zoneName }}</strong>
            <div class="occupancy" [style.--fill]="(row.capacity ? row.sold / row.capacity * 100 : 0) + '%'"><span>{{ row.capacity ? row.sold / row.capacity : 0 | percent:'1.0-0' }}</span></div>
            <span>{{ row.sold }} / {{ row.capacity }} entradas</span><b>{{ row.revenue | currency:'PEN':'symbol-narrow':'1.2-2' }}</b>
            <span class="price-note">{{ row.currentPrice | currency:'PEN':'symbol-narrow' }} · {{ row.priceReason }}</span>
            <span class="explore">Simular este sector ↗</span>
          </button>
        }
      </div>
      @if (selected(); as row) {
        <section class="lab" aria-labelledby="lab-title">
          <div><span class="eyebrow">PRICE LAB / ESCENARIO HIPOTÉTICO</span><h3 id="lab-title">{{ row.zoneName }} · ¿Qué pasaría si…?</h3><p>El precio de las entradas ya compradas nunca cambia. Este laboratorio no guarda cambios.</p>
            <label>Entradas vendidas: <b>{{ simulatedSold() }} de {{ row.capacity }}</b><input type="range" min="0" [max]="row.capacity" step="1" [ngModel]="simulatedSold()" (ngModelChange)="simulatedSold.set(+$event)" /></label>
            <label>Días hasta el evento: <b>{{ days() }}</b><input type="range" min="0" max="60" step="1" [ngModel]="days()" (ngModelChange)="days.set(+$event)" /></label>
            <label>Días desde publicación: <b>{{ age() }}</b><input type="range" min="0" max="90" step="1" [ngModel]="age()" (ngModelChange)="age.set(+$event)" /></label>
          </div>
          <output aria-live="polite"><span>Precio estimado por entrada</span><strong>{{ simulation()?.unitPrice | currency:'PEN':'symbol-narrow' }}</strong><b>{{ simulation()?.note }}</b><small>Base: {{ row.basePrice | currency:'PEN':'symbol-narrow' }} · servicio 6% adicional</small><button mat-button (click)="select(row)">Restaurar escenario actual</button></output>
        </section>
      }
      <details><summary>¿Cómo se calcula el precio?</summary><p>+20% si queda menos del 15% del aforo o faltan menos de 3 días. −10% si lleva más de 30 días publicado y vendió menos del 10%. Si coinciden, tiene prioridad el incremento; no se acumulan ajustes.</p></details>
    </section>
  `,
  styles: `
    :host{display:block;margin-top:28px}.insights{border:1px solid var(--mat-sys-outline-variant);border-radius:24px;padding:28px;background:var(--mat-sys-surface)}
    .heading{display:flex;gap:24px;justify-content:space-between;align-items:center}.eyebrow{font:700 10px/1.5 monospace;letter-spacing:1.5px;color:var(--mat-sys-primary)}h2{font-size:26px;letter-spacing:-1px;margin:8px 0}p{font-size:13px;color:var(--mat-sys-on-surface-variant);line-height:1.6}
    .event-filter{display:grid;gap:8px;max-width:420px;margin:22px 0;font-size:12px}select{padding:12px;background:var(--mat-sys-surface-container);color:inherit;border:1px solid var(--mat-sys-outline-variant);border-radius:10px;min-width:0;width:100%}
    .zone-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(205px,1fr));gap:12px}.zone-card{font:inherit;text-align:left;cursor:pointer;border:1px solid var(--mat-sys-outline-variant);background:var(--mat-sys-surface-container-low);color:inherit;display:flex;flex-direction:column;gap:8px;padding:20px;border-radius:16px}.zone-card:hover,.selected{border-color:var(--mat-sys-primary);background:var(--mat-sys-primary-container)}.event-name{font-size:10px;color:var(--mat-sys-on-surface-variant);min-height:26px}.zone-card>strong{font-size:18px}.zone-card>span{font-size:12px}.zone-card>b{font-size:22px}
    .occupancy{width:76px;height:76px;border-radius:50%;background:conic-gradient(var(--mat-sys-primary) var(--fill),var(--mat-sys-outline-variant) 0);display:grid;place-items:center;margin:6px 0}.occupancy span{display:grid;place-items:center;border-radius:50%;background:var(--mat-sys-surface);height:60px;width:60px;font-size:16px;font-weight:700}.price-note{line-height:1.5}.explore{color:var(--mat-sys-primary);margin-top:8px}
    .lab{margin:24px 0;padding:24px;border-radius:18px;background:var(--mat-sys-surface-container);display:grid;grid-template-columns:1.3fr 1fr;gap:32px}h3{margin:8px 0;font-size:22px}.lab label{display:block;font-size:13px;margin-top:18px}.lab input{display:block;width:100%;accent-color:var(--mat-sys-primary);margin-top:10px;min-height:28px}.lab output{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:16px}.lab output>strong{font-size:46px;letter-spacing:-2px;color:var(--mat-sys-primary)}.lab small{line-height:1.6}details{font-size:13px;margin-top:20px}summary{cursor:pointer;padding:12px 0}
    @media(max-width:700px){.insights{padding:18px}.heading{align-items:start;flex-direction:column}.lab{grid-template-columns:1fr;padding:18px;gap:16px}.zone-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.zone-card{padding:14px}.zone-card>b{font-size:18px}h2{font-size:23px}}
  `
})
export class ZoneInsights {
  readonly rows = input<ZonePerformance[]>([]);
  readonly eventId = signal('');
  readonly selectedKey = signal('');
  readonly simulatedSold = signal(0);
  readonly days = signal(10);
  readonly age = signal(0);
  readonly events = computed(() => Array.from(new Map(this.rows().map(r => [r.eventId, { id: r.eventId, name: r.eventName }])).values()));
  readonly filtered = computed(() => this.rows().filter(r => !this.eventId() || r.eventId === this.eventId()));
  readonly selected = computed(() => this.filtered().find(r => r.eventId + ':' + r.zoneId === this.selectedKey()));
  readonly simulation = computed(() => {
    const row = this.selected(); if (!row) return null;
    const now = Date.now();
    return zonePrice({ startsAt: new Date(now + this.days() * 86400000).toISOString(), publishedAt: new Date(now - this.age() * 86400000).toISOString() },
      { id: row.zoneId, name: row.zoneName, price: row.basePrice, capacity: row.capacity, sold: this.simulatedSold() }, now);
  });
  select(row: ZonePerformance): void {
    this.selectedKey.set(row.eventId + ':' + row.zoneId); this.simulatedSold.set(row.sold);
    this.days.set(Math.max(0, Math.min(60, Math.ceil((Date.parse(row.startsAt) - Date.now()) / 86400000))));
    this.age.set(row.publishedAt ? Math.max(0, Math.min(90, Math.floor((Date.now() - Date.parse(row.publishedAt)) / 86400000))) : 0);
  }
  exportCsv(): void {
    const records = [['Evento', 'Zona', 'Capacidad', 'Vendidas', 'Disponibles', 'Recaudación sin comisión', 'Precio base', 'Precio actual'],
      ...this.filtered().map(r => [r.eventName, r.zoneName, r.capacity, r.sold, r.capacity - r.sold, r.revenue.toFixed(2), r.basePrice.toFixed(2), r.currentPrice.toFixed(2)])];
    downloadFile('\uFEFF' + records.map(row => row.map(csvCell).join(',')).join('\r\n'), 'aforo-zonas.csv', 'text/csv;charset=utf-8');
  }
}
