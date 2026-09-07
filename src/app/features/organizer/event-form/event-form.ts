import {
  ChangeDetectionStrategy,
  Component,
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
import { TitleCasePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { EventService } from '../../../core/services/event.service';
import { AuthService } from '../../../core/auth/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import {
  EventCategory,
  EventItem,
  EventStatus,
  Zone,
} from '../../../core/models/event.model';
import { eventImage } from '../../../shared/event-image';

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
    imageUrl: [''],
    maxPerOrder: [
      6,
      [Validators.required, Validators.min(1), Validators.max(20)],
    ],
    zones: this.fb.array([this.newZone()]),
  });

  get zones(): FormArray {
    return this.form.controls.zones;
  }

  constructor() {
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

  addZone(): void {
    this.zones.push(this.newZone());
  }

  removeZone(index: number): void {
    if (this.zones.length <= 1) return;
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
      city: 'Lima',
      startsAt: toLocalInput(ev.startsAt),
      imageUrl: ev.imageUrl,
      maxPerOrder: ev.maxPerOrder,
    });
    this.zones.clear();
    ev.zones.forEach((z) => this.zones.push(this.newZone(z)));
  }

  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      this.notify.error('Revisa los campos marcados.');
      return;
    }
    const raw = this.form.getRawValue();
    const existing = this.editing();

    const payload: EventItem = {
      id: existing?.id ?? `ev-${crypto.randomUUID().slice(0, 8)}`,
      name: raw.name.trim(),
      description: raw.description.trim(),
      category: raw.category,
      status: raw.status,
      venue: raw.venue.trim(),
      city: 'Lima',
      startsAt: new Date(raw.startsAt).toISOString(),
      imageUrl:
        raw.imageUrl.trim() ||
        eventImage({ name: raw.name.trim(), category: raw.category }),
      organizerId: existing?.organizerId ?? this.auth.user()?.id ?? '',
      maxPerOrder: raw.maxPerOrder,
      zones: raw.zones.map((z, i) => ({
        id: z.id || `z-${crypto.randomUUID().slice(0, 6)}-${i}`,
        name: z.name.trim(),
        price: z.price,
        capacity: z.capacity,
        sold: Math.min(z.sold, z.capacity),
      })),
    };

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
        this.notify.error('No se pudo guardar el evento.');
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
