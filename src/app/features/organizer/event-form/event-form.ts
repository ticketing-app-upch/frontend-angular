import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TitleCasePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { EventService } from '../../../core/services/event.service';
import { AuthService } from '../../../core/auth/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { EventCategory, EventItem, Zone } from '../../../core/models/event.model';
import { DEMO_VENUES, DemoVenue, venueCapacity } from '../../../core/models/venue-catalog';
import { eventImage, venueHotspots } from '../../../shared/event-image';
import { inspectJpegBanner, validBannerDimensions } from '../../../shared/banner-validation';
import { ZoneMap } from '../../../shared/zone-map/zone-map';

@Component({
  selector: 'tkt-event-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, TitleCasePipe, MatCardModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, MatIconModule, ZoneMap],
  templateUrl: './event-form.html',
  styleUrl: './event-form.scss',
})
export class EventForm {
  private readonly fb = inject(FormBuilder);
  private readonly events = inject(EventService);
  private readonly auth = inject(AuthService);
  private readonly notify = inject(NotificationService);
  private readonly router = inject(Router);

  readonly venues = DEMO_VENUES;
  readonly categories: EventCategory[] = ['CONCIERTO', 'FESTIVAL', 'TEATRO', 'DEPORTE', 'CONFERENCIA'];
  readonly saving = signal(false);
  readonly venue = signal<DemoVenue | null>(null);
  readonly selectedZoneId = signal<string | null>(null);
  readonly bannerUrl = signal<string | null>(null);
  readonly bannerError = signal('');
  readonly bannerName = signal('');
  private bannerSource: string | null = null;
  readonly secondaryBannerUrl = signal<string | null>(null);
  readonly secondaryBannerError = signal('');
  readonly secondaryBannerName = signal('');
  private secondaryBannerSource: string | null = null;
  readonly capacity = computed(() => this.venue() ? venueCapacity(this.venue()!) : 0);
  readonly mapZones = computed<Zone[]>(() => this.venue()?.zones.map((zone, index) => ({
    id: this.zoneId(index), name: zone.name, capacity: zone.capacity, sold: 0,
    price: Number(this.prices.at(index)?.value ?? 0),
  })) ?? []);
  readonly hotspots = computed(() => venueHotspots(this.venue()?.name, this.mapZones()));

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(4)]],
    description: ['', [Validators.required, Validators.minLength(20)]],
    category: ['CONCIERTO' as EventCategory, Validators.required],
    startsAt: ['', Validators.required],
    venueId: ['', Validators.required],
    prices: this.fb.array([] as ReturnType<typeof this.fb.nonNullable.control<number>>[]),
  });

  get prices(): FormArray { return this.form.controls.prices; }
  zoneId(index: number): string { return `venue-${this.venue()?.id ?? 'none'}-${index}`; }

  chooseVenue(id: string): void {
    const venue = this.venues.find(item => item.id === id) ?? null;
    this.venue.set(venue);
    this.selectedZoneId.set(null);
    this.prices.clear();
    for (const _zone of venue?.zones ?? []) {
      this.prices.push(this.fb.nonNullable.control(0, [Validators.required, Validators.min(0.01)]));
    }
  }

  focusZone(id: string): void {
    this.selectedZoneId.set(id);
    queueMicrotask(() => document.getElementById(`price-${id}`)?.focus());
  }

  async onBannerChange(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    this.bannerUrl.set(null);
    this.bannerName.set('');
    this.bannerError.set('');
    this.bannerSource = null;
    if (!file) return;
    const invalid = (message: string) => {
      this.bannerError.set(message);
      input.value = '';
    };
    const inspection = await inspectJpegBanner(file);
    if (!inspection.ok) {
      invalid(inspection.issue === 'format' ? 'La portada debe ser un archivo JPG o JPEG.'
        : inspection.issue === 'size' ? 'La portada no puede superar 2 MB.'
        : inspection.issue === 'signature' ? 'El contenido de la portada no es un JPEG válido.'
        : 'No se pudo leer la portada. Selecciona otro JPG.');
      return;
    }
    const source = inspection.fingerprint;
    if (source === this.secondaryBannerSource) {
      invalid('La portada y la imagen secundaria deben ser fotografías diferentes.');
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    try {
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error('No se pudo leer la imagen.'));
        image.src = objectUrl;
      });
      if (!validBannerDimensions(image.naturalWidth, image.naturalHeight)) {
        invalid('La portada necesita al menos 1920 × 480 px y proporción 4:1.');
        return;
      }
      const dataUrl = encodeForDemo(image, 1920, 480);
      this.bannerUrl.set(dataUrl);
      this.bannerName.set(`${file.name} · ${image.naturalWidth} × ${image.naturalHeight} px`);
      this.bannerSource = source;
    } catch {
      invalid('No se pudo leer la imagen. Selecciona otro JPG.');
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  async onSecondaryBannerChange(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    this.secondaryBannerUrl.set(null);
    this.secondaryBannerName.set('');
    this.secondaryBannerError.set('');
    this.secondaryBannerSource = null;
    if (!file) return;
    const invalid = (message: string) => {
      this.secondaryBannerError.set(message);
      input.value = '';
    };
    const inspection = await inspectJpegBanner(file);
    if (!inspection.ok) {
      invalid(inspection.issue === 'format' ? 'La imagen secundaria debe ser un archivo JPG o JPEG.'
        : inspection.issue === 'size' ? 'La imagen secundaria no puede superar 2 MB.'
        : inspection.issue === 'signature' ? 'El contenido de la imagen secundaria no es un JPEG válido.'
        : 'No se pudo leer la imagen secundaria. Selecciona otro JPG.');
      return;
    }
    const source = inspection.fingerprint;
    if (source === this.bannerSource) {
      invalid('La imagen secundaria debe ser distinta de la portada.');
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    try {
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error('Imagen ilegible.'));
        image.src = objectUrl;
      });
      if (!validBannerDimensions(image.naturalWidth, image.naturalHeight)) {
        invalid('La imagen secundaria necesita al menos 1920 × 480 px y proporción 4:1.');
        return;
      }
      this.secondaryBannerUrl.set(encodeForDemo(image, 1920, 480));
      this.secondaryBannerName.set(`${file.name} · ${image.naturalWidth} × ${image.naturalHeight} px`);
      this.secondaryBannerSource = source;
    } catch {
      invalid('No se pudo leer o guardar la imagen secundaria.');
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  submit(): void {
    const venue = this.venue();
    if (!venue || this.form.invalid || !this.bannerUrl() || !this.secondaryBannerUrl() || this.saving()) {
      this.form.markAllAsTouched();
      this.notify.error(!this.bannerUrl() ? 'Selecciona una portada JPG válida antes de publicar.' : !this.secondaryBannerUrl() ? 'Selecciona una imagen secundaria válida.' : 'Completa los datos y asigna un precio mayor a cero a cada zona.');
      return;
    }
    const raw = this.form.getRawValue();
    const startsAt = new Date(raw.startsAt);
    if (!Number.isFinite(startsAt.getTime()) || startsAt.getTime() <= Date.now()) {
      this.notify.error('La fecha y hora deben ser futuras.');
      return;
    }
    const event: EventItem = {
      id: '', name: raw.name.trim(), description: raw.description.trim(), category: raw.category,
      status: 'PUBLICADO', venue: venue.name, city: venue.city,
      startsAt: startsAt.toISOString(), publishedAt: new Date().toISOString(),
      venueCapacity: venueCapacity(venue), organizerId: this.auth.user()?.id ?? '', maxPerOrder: 6,
      imageUrl: eventImage({ name: raw.name.trim(), category: raw.category, venue: venue.name }),
      bannerUrl: this.bannerUrl()!,
      secondaryBannerUrl: this.secondaryBannerUrl()!,
      zones: venue.zones.map((zone, index) => ({
        id: this.zoneId(index), name: zone.name, capacity: zone.capacity, sold: 0,
        price: Number(raw.prices[index]),
      })),
    };
    this.saving.set(true);
    this.events.save(event).subscribe({
      next: () => { this.notify.success('Evento publicado.'); void this.router.navigate(['/organizador/eventos']); },
      error: error => { this.saving.set(false); this.notify.error(error?.message ?? 'No se pudo publicar el evento.'); },
    });
  }
}

/** Reduce el peso de las dos imágenes para que la maqueta pueda persistirlas localmente. */
function encodeForDemo(image: HTMLImageElement, maxWidth: number, maxHeight: number): string {
  const scale = Math.min(1, maxWidth / image.naturalWidth, maxHeight / image.naturalHeight);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(image.naturalWidth * scale);
  canvas.height = Math.round(image.naturalHeight * scale);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('No se pudo procesar la imagen.');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  for (const quality of [.84, .72, .58]) {
    const encoded = canvas.toDataURL('image/jpeg', quality);
    if (encoded.length <= 1_250_000) return encoded;
  }
  throw new Error('La imagen es demasiado compleja para guardar en la demo.');
}
