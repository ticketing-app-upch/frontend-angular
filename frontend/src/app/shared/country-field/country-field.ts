import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatIconModule } from '@angular/material/icon';
import {
  Country,
  COUNTRIES,
  findCountryByName,
  flagEmoji,
  normalize,
} from '../countries';

export interface CountryPick {
  /** País reconocido, o null si el texto no coincide con ninguno. */
  country: Country | null;
  /** Texto tal cual lo escribió la persona. */
  text: string;
}

/**
 * Campo de país con autocompletar sobre la lista mundial. Emite el país
 * reconocido (con su código telefónico) o el texto libre si no coincide.
 */
@Component({
  selector: 'tkt-country-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatIconModule,
  ],
  template: `
    <mat-form-field appearance="outline" class="cf">
      <mat-label>{{ label() }}</mat-label>
      <input
        matInput
        [formControl]="text"
        [matAutocomplete]="auto"
        [required]="required()"
        autocomplete="off"
        placeholder="Escribe tu país…"
      />
      <mat-icon matSuffix>public</mat-icon>
      <mat-autocomplete
        #auto="matAutocomplete"
        (optionSelected)="onSelected($event.option.value)"
        autoActiveFirstOption
      >
        @for (c of filtered(); track c.code) {
          <mat-option [value]="c.name">
            <span class="opt">
              <span class="fl">{{ flag(c.code) }}</span>
              {{ c.name }}
              <span class="dial">{{ c.dial }}</span>
            </span>
          </mat-option>
        }
      </mat-autocomplete>
      @if (touchedInvalid()) {
        <mat-error>Indica tu país.</mat-error>
      }
    </mat-form-field>
  `,
  styles: `
    :host { display: block; }
    .cf { width: 100%; }
    .opt { display: flex; align-items: center; gap: 0.55rem; }
    .opt .fl { font-size: 1rem; }
    .opt .dial {
      margin-left: auto;
      font-size: 0.8rem;
      color: var(--mat-sys-on-surface-variant);
    }
  `,
})
export class CountryField {
  readonly label = input('País');
  readonly required = input(true);
  /** Código ISO-2 inicial (p. ej. "PE"). */
  readonly initial = input<string>('');
  readonly picked = output<CountryPick>();

  protected readonly text = new FormControl('', { nonNullable: true });

  private readonly query = toSignal(this.text.valueChanges, {
    initialValue: this.text.value,
  });

  protected readonly filtered = computed<Country[]>(() => {
    const q = normalize(this.query());
    const list = q
      ? COUNTRIES.filter((c) => normalize(c.name).includes(q))
      : COUNTRIES;
    return list.slice(0, 60);
  });

  protected readonly touchedInvalid = signal(false);

  constructor() {
    // valor inicial desde el código ISO
    effect(() => {
      const code = this.initial().toUpperCase();
      const c = COUNTRIES.find((x) => x.code === code);
      if (c && !this.text.value) {
        this.text.setValue(c.name, { emitEvent: false });
        this.picked.emit({ country: c, text: c.name });
      }
    });

    // texto libre: si coincide exacto con un país, lo reconoce
    this.text.valueChanges.subscribe((value) => {
      this.touchedInvalid.set(this.text.touched && !value.trim());
      this.picked.emit({ country: findCountryByName(value) ?? null, text: value });
    });
  }

  protected onSelected(name: string): void {
    this.picked.emit({ country: findCountryByName(name) ?? null, text: name });
  }

  protected flag(code: string): string {
    return flagEmoji(code);
  }
}
