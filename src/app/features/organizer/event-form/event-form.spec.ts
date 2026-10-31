import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { EventItem } from '../../../core/models/event.model';
import { DEMO_VENUES } from '../../../core/models/venue-catalog';
import { eventIssues } from '../../../core/models/ticketing-rules';
import { EventService } from '../../../core/services/event.service';
import { NotificationService } from '../../../core/services/notification.service';
import { EventForm } from './event-form';

describe('Crear evento por recinto', () => {
  const saved: EventItem[] = [];
  const errors: string[] = [];

  beforeEach(() => {
    saved.length = 0;
    errors.length = 0;
    TestBed.configureTestingModule({
      providers: [
        { provide: EventService, useValue: { save: (event: EventItem) => { saved.push(event); return of(event); } } },
        { provide: AuthService, useValue: { user: () => ({ id: 'org-demo' }) } },
        { provide: NotificationService, useValue: { error: (message: string) => errors.push(message), success: () => {} } },
        { provide: Router, useValue: { navigate: () => Promise.resolve(true) } },
      ],
    });
  });

  function formFor(venueId: string): EventForm {
    const form = TestBed.runInInjectionContext(() => new EventForm());
    form.chooseVenue(venueId);
    form.form.patchValue({
      name: 'Evento de prueba',
      description: 'Descripción suficiente para publicar un evento de prueba.',
      startsAt: new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 16),
    });
    form.prices.controls.forEach(control => control.setValue(150));
    form.bannerUrl.set('data:image/jpeg;base64,portada');
    form.secondaryBannerUrl.set('data:image/jpeg;base64,secundaria');
    return form;
  }

  it.each(DEMO_VENUES.map(venue => [venue.name, venue.id]))('publica con todas las zonas de %s', (_name, id) => {
    const form = formFor(id);
    form.submit();
    expect(errors).toEqual([]);
    expect(saved).toHaveLength(1);
    expect(saved[0].zones).toHaveLength(form.venue()!.zones.length);
    expect(saved[0].zones.every(zone => zone.price === 150)).toBe(true);
    expect(eventIssues(saved[0])).toEqual([]);
  });

  it('publica el recinto de prueba con una sola entrada disponible', () => {
    const form = formFor('recinto-prueba');
    form.submit();
    expect(errors).toEqual([]);
    expect(saved[0].venueCapacity).toBe(1);
    expect(saved[0].zones).toEqual([expect.objectContaining({ name: 'General', capacity: 1, sold: 0 })]);
  });

  it('identifica la fecha faltante aunque todos los precios sean válidos', () => {
    const form = formFor('arena-1');
    form.form.controls.startsAt.setValue('');
    form.submit();
    expect(saved).toHaveLength(0);
    expect(errors).toEqual(['Selecciona la fecha y hora del evento.']);
  });

  it('nombra la zona cuyo precio falta', () => {
    const form = formFor('monumental');
    form.prices.at(1).setValue(0);
    form.submit();
    expect(saved).toHaveLength(0);
    expect(errors).toEqual(['Asigna un precio mayor a cero a la zona Occidente Central B.']);
  });
});
