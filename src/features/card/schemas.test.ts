import { describe, expect, it } from 'vitest';

import {
  availabilitySlotCreateSchema,
  bookingCreateSchema,
  profileUpdateSchema
} from './schemas';

describe('card schemas', () => {
  it('accepts a profile update', () => {
    expect(
      profileUpdateSchema.parse({
        photoUrl: '/uploads/avatar.webp',
        name: 'Ada Lovelace',
        age: 36,
        professionalProfile: 'Computing pioneer',
        expertise: 'Analytical engines',
        casesAndResults: 'Published the first algorithm',
        collaborationFormats: 'Consulting and talks'
      })
    ).toMatchObject({
      name: 'Ada Lovelace'
    });
  });

  it('rejects an invalid availability range', () => {
    expect(() =>
      availabilitySlotCreateSchema.parse({
        weekday: 1,
        startTime: '12:00',
        endTime: '11:00'
      })
    ).toThrow();
  });

  it('accepts a booking request', () => {
    expect(
      bookingCreateSchema.parse({
        requestedStartAt: '2026-06-20T10:00:00.000Z',
        requestedEndAt: '2026-06-20T11:00:00.000Z',
        visitorName: 'Visitor',
        visitorEmail: 'visitor@example.com',
        visitorPhone: '+100000000',
        requestDescription: 'Need help with positioning.'
      })
    ).toMatchObject({
      visitorEmail: 'visitor@example.com'
    });
  });
});
