import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import {
  FormArray,
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { TitleCasePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatRadioModule } from '@angular/material/radio';
import { EventService } from '../../../core/services/event.service';
import { AuthService } from '../../../core/auth/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import {
  BANK_LABELS,
  BankDiscount,
  EventCategory,
  EventItem,
  EventStatus,
  normalizeBankDiscounts,
  Zone,
} from '../../../core/models/event.model';
import { eventImage, venuePhoto } from '../../../shared/event-image';
import { eventIssues } from '../../../core/models/ticketing-rules';

/** Origen de la imagen de portada elegido por el organizador. */
export type ImageSource = 'venue' | 'teams' | 'artist' | 'url';

@Component({
  selector: 'tkt-event-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    TitleCasePipe,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatCheckboxModule,
    MatRadioModule,
  ],
  templateUrl: './event-form.html',
  styleUrl: './event-form.scss',
})
export class EventForm {
  private fb = inject(FormBuilder);
  private events = inject(EventService);
  private auth = inject(AuthService);
  private notify = inject(NotificationService);
  private router = inject(Router);

  /** Presente sólo en modo edición (ruta `eventos/:id/editar`). */
  readonly id = input<string>();

  readonly saving = signal(false);
  readonly loading = signal(false);
  private editing = signal<EventItem | null>(null);

  readonly isEdit = computed(() => !!this.id());
  readonly title = computed(() => (this.isEdit() ? 'Editar evento' : 'Nuevo evento'));

  readonly categories: EventCategory[] = [
    'CONCIERTO',
    'FESTIVAL',
    'TEATRO',
    'DEPORTE',
    'CONFERENCIA',
  ];
  readonly statuses: EventStatus[] = ['BORRADOR', 'PUBLICADO'];

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(4)]],
    description: ['', [Validators.required, Validators.minLength(20)]],
    category: ['CONCIERTO' as EventCategory, Validators.required],
    status: ['BORRADOR' as EventStatus, Validators.required],
    venue: ['', Validators.required],
    city: ['Lima', Validators.required],
    startsAt: ['', Validators.required],
    venueCapacity: [1000, [Validators.required, Validators.min(1)]],
    imageSource: ['venue' as ImageSource, Validators.required],
    imageUrl: [''],
    maxPerOrder: [
      6,
      [Validators.required, Validators.min(1), Validators.max(6)],
    ],
    zones: this.fb.array([this.newZone()]),
    bankDiscounts: this.fb.array(
      normalizeBankDiscounts().map((d) => this.newBankDiscount(d)),
    ),
    accessibleDiscount: [false],
  });

  readonly bankLabels = BANK_LABELS;

  get zones(): FormArray {
    return this.form.controls.zones;
  }

  bankLabelFor(row: ReturnType<EventForm['newBankDiscount']>): string {
    return BANK_LABELS[row.controls.bank.value];
  }

  get bankDiscounts() {
    return this.form.controls.bankDiscounts;
  }

  /** Estadios de Lima habilitados para partidos de fútbol. */
  readonly footballVenues = [
    'Estadio Monumental',
    'Estadio Nacional',
    'Estadio San Marcos',
    'Estadio Alejandro Villanueva',
    'Estadio Iván Elías Moreno',
    'Estadio Alberto Gallardo',
    'Estadio Miguel Grau',
  ];

  /**
   * Recintos de Lima aptos para conciertos. Se excluye la Explanada del Jockey
   * Club: la Municipalidad de Surco mantiene la restricción a conciertos masivos
   * desde 2023 y a 2026 no se ha levantado.
   */
  readonly concertVenues = [
    'Estadio Nacional',
    'Estadio San Marcos',
    'Estadio Monumental',
    'Estadio Alejandro Villanueva',
    'Arena 1 - Costa Verde',
    'Multiespacio Costa 21',
    'Coliseo Eduardo Dibós',
    'Explanada Costa Verde',
    'Anfiteatro del Parque de la Exposición',
    'Gran Teatro Nacional',
    'Teatro Municipal de Lima',
    'Teatro Peruano Japonés',
  ];

  private categoryValue = toSignal(this.form.controls.category.valueChanges, {
    initialValue: this.form.controls.category.value,
  });
  /**
   * Lista cerrada de recintos según la categoría (DEPORTE / CONCIERTO).
   * `null` = el recinto es texto libre.
   */
  readonly venueOptions = computed<readonly string[] | null>(() => {
    switch (this.categoryValue()) {
      case 'DEPORTE':
        return this.footballVenues;
      case 'CONCIERTO':
        return this.concertVenues;
      default:
        return null;
    }
  });

  /**
   * Fuentes de imagen disponibles según la categoría: escudos de equipos sólo
   * tiene sentido en DEPORTE; imagen del artista, en el resto.
   */
  readonly imageSourceOptions = computed<{ value: ImageSource; label: string }[]>(() => {
    const options: { value: ImageSource; label: string }[] = [
      { value: 'venue', label: 'Imagen del recinto' },
    ];
    if (this.categoryValue() === 'DEPORTE') {
      options.push({ value: 'teams', label: 'Escudos de los equipos' });
    } else {
      options.push({ value: 'artist', label: 'Imagen del artista' });
    }
    options.push({ value: 'url', label: 'Otra URL' });
    return options;
  });

  private venueValue = toSignal(this.form.controls.venue.valueChanges, {
    initialValue: this.form.controls.venue.value,
  });
  /** Hay una foto real registrada para el recinto escrito (ver `venuePhoto`). */
  readonly hasVenuePhoto = computed(() => venuePhoto(this.venueValue()) !== null);

  readonly imageSourceValue = toSignal(this.form.controls.imageSource.valueChanges, {
    initialValue: this.form.controls.imageSource.value,
  });
  /** El campo de URL sólo aplica cuando la fuente es "otra URL" o "artista". */
  readonly needsImageUrl = computed(() =>
    this.imageSourceValue() === 'url' || this.imageSourceValue() === 'artist',
  );

  private imageUrlValue = toSignal(this.form.controls.imageUrl.valueChanges, {
    initialValue: this.form.controls.imageUrl.value,
  });
  /** URL a previsualizar: sólo si parece un enlace (evita pedir la imagen en cada tecla de un texto suelto). */
  readonly imagePreviewUrl = computed(() => {
    const url = this.imageUrlValue().trim();
    return /^https?:\/\//i.test(url) ? url : null;
  });
  readonly imagePreviewFailed = signal(false);

  onImagePreviewError(): void {
    this.imagePreviewFailed.set(true);
  }

  onImagePreviewLoad(): void {
    this.imagePreviewFailed.set(false);
  }

  /** Encuadre por defecto: centrado, sesgado hacia el tercio superior (ahí suele estar la cara). */
  static readonly DEFAULT_FOCUS = { x: 50, y: 20 };

  readonly imageFocusX = signal(EventForm.DEFAULT_FOCUS.x);
  readonly imageFocusY = signal(EventForm.DEFAULT_FOCUS.y);
  private draggingFocusFrame: HTMLElement | null = null;
  private readonly handleFocusPointerMove = (event: PointerEvent) => this.applyFocusFromEvent(event);
  private readonly handleFocusPointerUp = () => this.endFocusDrag();

  onFocusPointerDown(event: PointerEvent, frame: HTMLElement): void {
    event.preventDefault();
    this.draggingFocusFrame = frame;
    this.applyFocusFromEvent(event);
    window.addEventListener('pointermove', this.handleFocusPointerMove);
    window.addEventListener('pointerup', this.handleFocusPointerUp, { once: true });
  }

  onFocusKeydown(event: KeyboardEvent): void {
    const step = event.shiftKey ? 10 : 3;
    let dx = 0;
    let dy = 0;
    switch (event.key) {
      case 'ArrowLeft': dx = -step; break;
      case 'ArrowRight': dx = step; break;
      case 'ArrowUp': dy = -step; break;
      case 'ArrowDown': dy = step; break;
      default: return;
    }
    event.preventDefault();
    this.imageFocusX.set(clampPercent(this.imageFocusX() + dx));
    this.imageFocusY.set(clampPercent(this.imageFocusY() + dy));
  }

  resetImageFocus(): void {
    this.imageFocusX.set(EventForm.DEFAULT_FOCUS.x);
    this.imageFocusY.set(EventForm.DEFAULT_FOCUS.y);
  }

  private applyFocusFromEvent(event: PointerEvent): void {
    if (!this.draggingFocusFrame) return;
    const rect = this.draggingFocusFrame.getBoundingClientRect();
    this.imageFocusX.set(clampPercent(((event.clientX - rect.left) / rect.width) * 100));
    this.imageFocusY.set(clampPercent(((event.clientY - rect.top) / rect.height) * 100));
  }

  private endFocusDrag(): void {
    this.draggingFocusFrame = null;
    window.removeEventListener('pointermove', this.handleFocusPointerMove);
  }

  constructor() {
    // Cada vez que cambia la URL, olvida el error anterior hasta que la nueva
    // imagen termine de cargar (o falle de nuevo).
    effect(() => {
      this.imagePreviewUrl();
      this.imagePreviewFailed.set(false);
    });

    // Si cambia la categoría y la fuente elegida ya no aplica (p. ej. "escudos"
    // en un evento que dejó de ser DEPORTE), vuelve a la imagen del recinto.
    effect(() => {
      const valid = this.imageSourceOptions().map((o) => o.value);
      const current = this.form.controls.imageSource.value;
      if (!valid.includes(current)) {
        this.form.controls.imageSource.setValue('venue');
      }
    });

    effect(() => {
      const id = this.id();
      if (!id) {
        if (this.zones.length === 0) this.addZone();
        return;
      }
      this.loading.set(true);
      this.events.getById(id).subscribe({
        next: (ev) => {
          this.editing.set(ev);
          this.patch(ev);
          this.loading.set(false);
        },
        error: () => {
          this.notify.error('No se pudo cargar el evento.');
          this.router.navigate(['/organizador/eventos']);
        },
      });
    });

    inject(DestroyRef).onDestroy(() => {
      window.removeEventListener('pointermove', this.handleFocusPointerMove);
    });
  }

  newZone(zone?: Partial<Zone>) {
    return this.fb.nonNullable.group({
      id: [zone?.id ?? ''],
      name: [zone?.name ?? '', Validators.required],
      price: [zone?.price ?? 0, [Validators.required, Validators.min(0)]],
      capacity: [
        zone?.capacity ?? 100,
        [Validators.required, Validators.min(1)],
      ],
      sold: [zone?.sold ?? 0],
    });
  }

  newBankDiscount(d: BankDiscount) {
    return this.fb.nonNullable.group({
      bank: [d.bank],
      percent: this.fb.nonNullable.control<10 | 20>(d.percent),
      enabled: [d.enabled],
    });
  }

  addZone(): void {
    this.zones.push(this.newZone());
  }

  removeZone(index: number): void {
    if (this.zones.length <= 1) return;
    if (this.zones.at(index).get('sold')?.value > 0) { this.notify.error('Esta zona ya tiene ventas y no se puede eliminar.'); return; }
    this.zones.removeAt(index);
  }

  private patch(ev: EventItem): void {
    this.form.patchValue({
      name: ev.name,
      description: ev.description,
      category: ev.category,
      status: ev.status === 'AGOTADO' || ev.status === 'FINALIZADO'
        ? 'PUBLICADO'
        : ev.status,
      venue: ev.venue,
      city: ev.city,
      venueCapacity: ev.venueCapacity ?? ev.zones.reduce((s, z) => s + z.capacity, 0),
      startsAt: toLocalInput(ev.startsAt),
      imageSource: 'url',
      imageUrl: ev.imageUrl,
      maxPerOrder: ev.maxPerOrder,
      accessibleDiscount: ev.accessibleDiscount ?? false,
    });
    this.imageFocusX.set(ev.imageFocus?.x ?? EventForm.DEFAULT_FOCUS.x);
    this.imageFocusY.set(ev.imageFocus?.y ?? EventForm.DEFAULT_FOCUS.y);
    this.zones.clear();
    ev.zones.forEach((z) => this.zones.push(this.newZone(z)));
    this.bankDiscounts.clear();
    normalizeBankDiscounts(ev.bankDiscounts).forEach((d) => this.bankDiscounts.push(this.newBankDiscount(d)));
  }

  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      this.notify.error('Revisa los campos marcados.');
      return;
    }
    const raw = this.form.getRawValue();
    const existing = this.editing();
    if (!Number.isFinite(new Date(raw.startsAt).getTime())) { this.notify.error('Ingresa una fecha válida.'); return; }

    if ((raw.imageSource === 'url' || raw.imageSource === 'artist') && !raw.imageUrl.trim()) {
      this.notify.error('Ingresa la URL de la imagen.');
      return;
    }

    const name = raw.name.trim();
    const venue = raw.venue.trim();
    const isCustomImage = raw.imageSource === 'url' || raw.imageSource === 'artist';
    const imageUrl = isCustomImage
      ? raw.imageUrl.trim()
      : raw.imageSource === 'venue'
        ? venuePhoto(venue) ?? eventImage({ name, category: raw.category, venue })
        : eventImage({ name, category: raw.category, venue });
    const imageFocus = isCustomImage
      ? { x: Math.round(this.imageFocusX()), y: Math.round(this.imageFocusY()) }
      : undefined;

    const payload: EventItem = {
      id: existing?.id ?? '',
      name,
      description: raw.description.trim(),
      category: raw.category,
      status: raw.status,
      venue,
      city: raw.city.trim(),
      venueCapacity: raw.venueCapacity,
      publishedAt: existing?.publishedAt ?? (raw.status === 'PUBLICADO' ? new Date().toISOString() : undefined),
      startsAt: new Date(raw.startsAt).toISOString(),
      imageUrl,
      imageFocus,
      organizerId: existing?.organizerId ?? this.auth.user()?.id ?? '',
      maxPerOrder: raw.maxPerOrder,
      zones: raw.zones.map((z, i) => ({
        ...existing?.zones.find(old => old.id === z.id),
        id: z.id || `z-${crypto.randomUUID().slice(0, 6)}-${i}`,
        name: z.name.trim(),
        price: z.price,
        capacity: z.capacity,
        sold: existing?.zones.find(old => old.id === z.id)?.sold ?? 0,
      })),
      bankDiscounts: raw.bankDiscounts as BankDiscount[],
      accessibleDiscount: raw.accessibleDiscount,
    };

    const issues = eventIssues(payload, existing ?? undefined);
    if (issues.length) { this.notify.error(issues[0]); return; }
    this.saving.set(true);
    this.events.save(payload).subscribe({
      next: () => {
        this.notify.success(
          this.isEdit() ? 'Evento actualizado.' : 'Evento creado.',
        );
        this.router.navigate(['/organizador/eventos']);
      },
      error: () => {
        this.saving.set(false);
        this.notify.error('No se pudo guardar. Comprueba tus permisos y la conexión.');
      },
    });
  }
}

/** ISO -> valor para <input type="datetime-local"> en hora local. */
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => `${n}`.padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value * 10) / 10));
}
