import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
} from '@angular/material/dialog';

export type LegalDoc = 'terms' | 'privacy';

interface Block {
  h: string;
  tag?: 'CLIENTE' | 'ORGANIZADOR';
  p: string[];
}
interface Doc {
  key: LegalDoc;
  title: string;
  updated: string;
  blocks: Block[];
  disclaimer: string;
}

/** Comunicado legal en un diálogo con fondo difuminado (T&C + Privacidad). */
@Component({
  selector: 'tkt-legal-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, MatButtonModule, MatIconModule, MatTabsModule],
  template: `
    <div class="legal">
      <header>
        <h2 mat-dialog-title>Documentos legales</h2>
        <button
          mat-icon-button
          mat-dialog-close
          aria-label="Cerrar"
          class="x"
        >
          <mat-icon>close</mat-icon>
        </button>
      </header>

      <mat-tab-group [selectedIndex]="startIndex" mat-stretch-tabs="false">
        @for (doc of docs; track doc.key) {
          <mat-tab [label]="doc.title">
            <mat-dialog-content>
              <p class="updated">{{ doc.updated }}</p>

              @for (b of doc.blocks; track b.h) {
                <section>
                  <h3>
                    {{ b.h }}
                    @if (b.tag) {
                      <span class="tag" [class.org]="b.tag === 'ORGANIZADOR'">
                        {{ b.tag }}
                      </span>
                    }
                  </h3>
                  @for (line of b.p; track line) {
                    <p>{{ line }}</p>
                  }
                </section>
              }

              <p class="disclaimer">{{ doc.disclaimer }}</p>
            </mat-dialog-content>
          </mat-tab>
        }
      </mat-tab-group>

      <mat-dialog-actions align="end">
        <button mat-flat-button mat-dialog-close>Entendido</button>
      </mat-dialog-actions>
    </div>
  `,
  styles: `
    .legal { display: flex; flex-direction: column; max-height: 86vh; }

    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.35rem 0.5rem 0 1.25rem;
    }
    header h2 {
      margin: 0;
      font-size: 1.15rem;
      font-weight: 800;
      letter-spacing: -0.01em;
    }

    mat-dialog-content {
      padding: 0.5rem 1.5rem 1rem;
      max-height: 62vh;
    }

    .updated {
      margin: 0 0 1rem;
      font-size: 0.75rem;
      color: var(--mat-sys-on-surface-variant);
    }

    section { margin-bottom: 1.1rem; }

    h3 {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin: 0 0 0.4rem;
      font-size: 0.95rem;
      font-weight: 800;
    }

    .tag {
      padding: 0.08rem 0.5rem;
      border-radius: 999px;
      font-size: 0.62rem;
      font-weight: 800;
      letter-spacing: 0.04em;
      background: color-mix(in srgb, var(--mat-sys-primary) 16%, transparent);
      color: var(--mat-sys-primary);
    }
    .tag.org {
      background: color-mix(in srgb, var(--tkt-accent) 16%, transparent);
      color: var(--tkt-accent-strong);
    }

    section p {
      margin: 0.3rem 0;
      font-size: 0.86rem;
      line-height: 1.6;
      color: var(--mat-sys-on-surface-variant);
    }

    .disclaimer {
      margin: 1.25rem 0 0;
      padding-top: 0.75rem;
      border-top: 1px solid color-mix(in srgb, var(--mat-sys-on-surface) 10%, transparent);
      font-size: 0.76rem;
      font-style: italic;
      color: var(--mat-sys-on-surface-variant);
    }

    mat-dialog-actions {
      padding: 0.75rem 1.25rem 1rem;
    }
  `,
})
export class LegalDialog {
  private data = inject<{ key?: LegalDoc }>(MAT_DIALOG_DATA, { optional: true });

  readonly startIndex = this.data?.key === 'privacy' ? 1 : 0;

  readonly docs: Doc[] = [
    {
      key: 'terms',
      title: 'Términos y Condiciones',
      updated: 'Última revisión: setiembre 2026',
      blocks: [
        {
          h: '1. Qué es Aforo',
          p: [
            'Aforo es una plataforma que conecta a organizadores de eventos con personas que desean comprar entradas. Aforo no organiza los eventos ni garantiza su realización.',
          ],
        },
        {
          h: '2. Cuentas',
          p: [
            'Debes ser mayor de edad o contar con la autorización de un adulto responsable.',
            'Los datos que registras deben ser verdaderos y mantenerse actualizados.',
            'Eres responsable de la actividad de tu cuenta y de mantener tu contraseña segura.',
          ],
        },
        {
          h: '3. Compra de entradas',
          tag: 'CLIENTE',
          p: [
            'El precio mostrado incluye la comisión de servicio de Aforo.',
            'La compra queda confirmada cuando recibes el código en "Mis entradas".',
            'Cada transacción tiene un máximo de entradas definido por el organizador.',
            'Las entradas son personales; la reventa por canales no oficiales puede anular su validez.',
            'Cambios de fecha, lugar o cancelación del evento son responsabilidad del organizador. Cuando corresponda, se devuelve el valor de la entrada; la comisión de servicio no es reembolsable salvo que la ley disponga lo contrario.',
            'El ingreso se realiza presentando la entrada digital. No se permite el reingreso salvo autorización del organizador.',
          ],
        },
        {
          h: '4. Publicación y venta',
          tag: 'ORGANIZADOR',
          p: [
            'Declaras contar con las autorizaciones, licencias y permisos necesarios para realizar el evento.',
            'Eres el único responsable frente al público por la realización del evento, su contenido, la seguridad del recinto y el cumplimiento de la normativa aplicable.',
            'La información publicada (fecha, lugar, aforo, precios y condiciones) debe ser exacta y mantenerse actualizada.',
            'Aforo puede revisar tu cuenta y tu documentación antes de habilitar la publicación, y suspender publicaciones que incumplan estos términos o la ley.',
            'La liquidación de lo recaudado se realiza a la cuenta que registres, descontando la comisión de servicio y los impuestos que correspondan.',
            'Debes atender los reclamos de los compradores y gestionar las devoluciones si el evento se cancela, reprograma o cambia de forma sustancial.',
            'Los eventos se publican para realizarse en Lima, Perú, aunque tu organización tenga domicilio en el extranjero.',
          ],
        },
        {
          h: '5. Uso de la plataforma',
          p: [
            'No está permitido usar Aforo con fines fraudulentos, cargar contenido de terceros sin derechos, vulnerar la seguridad del servicio ni automatizar compras.',
          ],
        },
        {
          h: '6. Disponibilidad y cambios',
          p: [
            'El servicio se ofrece "tal cual". Aforo puede modificar o interrumpir funciones y actualizar estos términos; los cambios relevantes se comunican con anticipación razonable.',
          ],
        },
        {
          h: '7. Contacto',
          p: ['Consultas sobre estos términos: soporte@aforo.pe.'],
        },
      ],
      disclaimer:
        'Este texto es informativo y no constituye asesoría legal.',
    },
    {
      key: 'privacy',
      title: 'Política de privacidad',
      updated: 'Última revisión: setiembre 2026',
      blocks: [
        {
          h: '1. Datos que tratamos',
          tag: 'CLIENTE',
          p: [
            'Nombre y apellidos, correo, país, ciudad, distrito, tipo y número de documento, género y teléfono.',
            'Tu historial de compras y las entradas emitidas a tu nombre.',
          ],
        },
        {
          h: '1. Datos que tratamos',
          tag: 'ORGANIZADOR',
          p: [
            'Datos de la organización: nombre comercial, razón social, RUC o DNI, país, ciudad, teléfono y sitio web.',
            'Nombre del responsable de la cuenta y la documentación usada para la verificación.',
          ],
        },
        {
          h: '2. Para qué los usamos',
          p: [
            'Crear y administrar tu cuenta, procesar compras y entregar entradas, verificar organizadores, brindar soporte, prevenir fraude, cumplir obligaciones legales y —solo si lo aceptas— enviarte promociones.',
          ],
        },
        {
          h: '3. Con quién los compartimos',
          p: [
            'Con el organizador del evento que compras, para el control de acceso y la gestión de reclamos.',
            'Con proveedores de pago cuando exista una integración, y con autoridades cuando la ley lo exija.',
            'No vendemos tus datos.',
          ],
        },
        {
          h: '4. Conservación',
          p: [
            'Conservamos los datos mientras tengas cuenta y por los plazos que exijan las normas tributarias y de protección al consumidor.',
          ],
        },
        {
          h: '5. Tus derechos',
          p: [
            'Puedes acceder, rectificar, actualizar o solicitar la eliminación de tus datos, y retirar tu consentimiento para comunicaciones comerciales, escribiendo a privacidad@aforo.pe.',
          ],
        },
        {
          h: '6. Seguridad',
          p: [
            'Aplicamos medidas razonables para proteger tu información durante la navegación.',
          ],
        },
      ],
      disclaimer:
        'Este texto es informativo y no constituye asesoría legal.',
    },
  ];
}
