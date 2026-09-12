import { Directive, ElementRef, HostListener, inject, input } from '@angular/core';

/**
 * Restringe un <input> a solo dígitos: bloquea el tecleo de caracteres no
 * numéricos y limpia cualquier cosa pegada. Funciona con Reactive Forms.
 *
 * Se puede desactivar de forma reactiva: `[tktDigitsOnly]="false"`.
 */
@Directive({
  selector: 'input[tktDigitsOnly]',
})
export class DigitsOnly {
  private el = inject<ElementRef<HTMLInputElement>>(ElementRef);

  /** `false` desactiva el filtro (permite cualquier carácter). */
  readonly enabled = input(true, { alias: 'tktDigitsOnly', transform: coerceEnabled });

  @HostListener('beforeinput', ['$event'])
  onBeforeInput(event: InputEvent): void {
    if (!this.enabled()) return;
    if (
      event.inputType === 'insertText' &&
      event.data != null &&
      /\D/.test(event.data)
    ) {
      event.preventDefault();
    }
  }

  @HostListener('input')
  onInput(): void {
    if (!this.enabled()) return;
    const input = this.el.nativeElement;
    const clean = input.value.replace(/\D+/g, '');
    if (input.value !== clean) {
      input.value = clean;
      // reenvía el evento para que el value accessor de Angular tome el valor limpio
      input.dispatchEvent(new Event('input'));
    }
  }
}

/** El atributo desnudo `tktDigitsOnly` (cadena vacía) cuenta como activado. */
function coerceEnabled(value: boolean | string | undefined): boolean {
  return value === '' || value === true || value === 'true' || value == null;
}
