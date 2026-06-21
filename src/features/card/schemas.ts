import { z } from 'zod';

const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:mm time format');

const photoUrlSchema = z
  .string()
  .trim()
  .max(500)
  .refine(
    (value) =>
      value.startsWith('/uploads/') ||
      z.string().url().safeParse(value).success,
    'Use a valid photo URL'
  );

export const profileUpdateSchema = z.object({
  photoUrl: photoUrlSchema.nullable().optional(),
  photoStorageKey: z.string().max(500).nullable().optional(),
  name: z.string().trim().min(1).max(120).optional(),
  title: z.string().trim().max(180).nullable().optional(),
  location: z.string().trim().max(180).nullable().optional(),
  age: z.number().int().min(1).max(120).nullable().optional(),
  contactPhone: z.string().trim().max(80).nullable().optional(),
  contactEmail: z.string().trim().email().max(180).nullable().optional(),
  contactWhatsApp: z.string().trim().max(180).nullable().optional(),
  contactTelegram: z.string().trim().max(180).nullable().optional(),
  contactWebsite: z.string().trim().max(300).nullable().optional(),
  professionalProfile: z.string().trim().max(4000).optional(),
  expertise: z.string().trim().max(4000).optional(),
  casesAndResults: z.string().trim().max(4000).optional(),
  experienceAndAchievements: z.string().trim().max(4000).nullable().optional(),
  collaborationFormats: z.string().trim().max(4000).optional(),
  showAvailability: z.boolean().optional(),
  onboardingStep: z
    .enum([
      'PHOTO',
      'PROFILE',
      'EXPERTISE',
      'RESULTS',
      'COLLABORATION',
      'AVAILABILITY',
      'COMPLETE'
    ])
    .optional()
});

const availabilitySlotBaseSchema = z.object({
  weekday: z.number().int().min(0).max(6),
  startTime: timeSchema,
  endTime: timeSchema,
  price: z.number().int().min(0).max(1_000_000).nullable().optional()
});

export const availabilitySlotCreateSchema = availabilitySlotBaseSchema.refine(
  (value) => value.startTime < value.endTime,
  {
    message: 'End time must be later than start time',
    path: ['endTime']
  }
);

export const availabilitySlotUpdateSchema =
  availabilitySlotBaseSchema.partial();

export const excludedDateCreateSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().trim().max(160).nullable().optional()
});

export const bookingCreateSchema = z.object({
  requestedStartAt: z.string().datetime(),
  requestedEndAt: z.string().datetime(),
  visitorName: z.string().trim().min(1).max(120),
  visitorEmail: z.string().trim().email().max(180),
  visitorPhone: z.string().trim().min(3).max(80),
  requestDescription: z.string().trim().min(1).max(2000)
});

export const requestStatusSchema = z.object({
  status: z.enum(['NEW', 'REVIEWED', 'HANDLED'])
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
export type AvailabilitySlotCreateInput = z.infer<
  typeof availabilitySlotCreateSchema
>;
export type AvailabilitySlotUpdateInput = z.infer<
  typeof availabilitySlotUpdateSchema
>;
export type ExcludedDateCreateInput = z.infer<typeof excludedDateCreateSchema>;
export type BookingCreateInput = z.infer<typeof bookingCreateSchema>;
