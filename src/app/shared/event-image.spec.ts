import { describe, expect, it } from 'vitest';
import { EventItem } from '../core/models/event.model';
import { eventImage, recoverEventImage } from './event-image';

const marathon: Pick<EventItem, 'name' | 'category' | 'venue' | 'imageUrl'> = {
  name: 'Maratón de Lima 42K',
  category: 'DEPORTE',
  venue: 'Circuito Costa Verde',
  imageUrl: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc6',
};

describe('event image recovery', () => {
  it('replaces a broken backend image and stops after the local fallback', () => {
    const img = document.createElement('img');
    img.src = marathon.imageUrl;
    const error = { target: img } as unknown as Event;

    recoverEventImage(error, marathon);
    expect(img.src).toBe(eventImage(marathon));

    recoverEventImage(error, marathon);
    expect(img.src).toBe(new URL('/events/parque-exposicion.jpg', document.baseURI).href);

    recoverEventImage(error, marathon);
    expect(img.style.visibility).toBe('hidden');
  });

  it('tries the event image when an uploaded banner fails', () => {
    const img = document.createElement('img');
    img.src = 'https://alpateck-backend.onrender.com/api/events/18/banner';
    recoverEventImage({ target: img } as unknown as Event, marathon);
    expect(img.src).toBe(marathon.imageUrl);
  });
});
