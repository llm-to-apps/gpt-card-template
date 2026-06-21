import 'server-only';

import { OnboardingStep, RequestStatus } from '@prisma/client';

import { prisma } from '@/server/db';
import type { CurrentUser } from '@/server/auth';
import { AppError } from '@/shared/result';
import type {
  AvailabilitySlotCreateInput,
  AvailabilitySlotUpdateInput,
  BookingCreateInput,
  ExcludedDateCreateInput,
  ProfileUpdateInput
} from './schemas';
import type {
  AvailabilitySlotDto,
  AvailableBookingSlotDto,
  CardSnapshotDto,
  ConsultationRequestDto,
  ExcludedDateDto,
  PublicProfileDto
} from './types';

export async function getCardSnapshot({
  includeRequests = false,
  isAdmin = false,
  weekStart
}: {
  includeRequests?: boolean;
  isAdmin?: boolean;
  weekStart?: Date;
} = {}): Promise<CardSnapshotDto> {
  const profile = await getOrCreateProfile();
  const [availabilitySlots, excludedDates, bookedRequests, visibleRequests] =
    await Promise.all([
      prisma.availabilitySlot.findMany({
        where: { profileId: profile.id },
        orderBy: [{ weekday: 'asc' }, { startTime: 'asc' }]
      }),
      prisma.excludedDate.findMany({
        where: { profileId: profile.id },
        orderBy: { date: 'asc' }
      }),
      prisma.consultationRequest.findMany({
        where: {
          profileId: profile.id,
          requestedStartAt: {
            gte: new Date()
          }
        },
        orderBy: { requestedStartAt: 'desc' },
        take: 100
      }),
      includeRequests
        ? prisma.consultationRequest.findMany({
            where: { profileId: profile.id },
            orderBy: { requestedStartAt: 'desc' },
            take: 50
          })
        : Promise.resolve([])
    ]);

  const bookedRequestDtos = bookedRequests.map(serializeConsultationRequest);
  const visibleRequestDtos = visibleRequests.map(serializeConsultationRequest);

  return {
    profile: serializeProfile(profile),
    availabilitySlots: availabilitySlots.map(serializeAvailabilitySlot),
    excludedDates: excludedDates.map(serializeExcludedDate),
    availableBookingSlots: buildAvailableBookingSlots({
      availabilitySlots: availabilitySlots.map(serializeAvailabilitySlot),
      excludedDates: excludedDates.map(serializeExcludedDate),
      consultationRequests: bookedRequestDtos,
      weekStart
    }),
    consultationRequests: includeRequests ? visibleRequestDtos : undefined,
    isAdmin
  };
}

export async function updateProfile(
  input: ProfileUpdateInput,
  user: CurrentUser
) {
  const profile = await getOrCreateProfile();
  const nextStep = input.onboardingStep;
  const shouldComplete = nextStep === 'COMPLETE';

  const updated = await prisma.cardProfile.update({
    where: { id: profile.id },
    data: {
      ownerUserId: profile.ownerUserId ?? user.id,
      photoUrl: input.photoUrl,
      photoStorageKey: input.photoStorageKey,
      name: input.name,
      title: input.title,
      location: input.location,
      age: input.age,
      contactPhone: input.contactPhone,
      contactEmail: input.contactEmail,
      contactWhatsApp: input.contactWhatsApp,
      contactTelegram: input.contactTelegram,
      contactWebsite: input.contactWebsite,
      professionalProfile: input.professionalProfile,
      expertise: input.expertise,
      casesAndResults: input.casesAndResults,
      experienceAndAchievements: input.experienceAndAchievements,
      collaborationFormats: input.collaborationFormats,
      showAvailability: input.showAvailability,
      onboardingStep: nextStep,
      onboardingCompletedAt: shouldComplete
        ? (profile.onboardingCompletedAt ?? new Date())
        : undefined
    }
  });

  await audit('profile.updated', user.id, { profileId: updated.id });
  return serializeProfile(updated);
}

export async function createAvailabilitySlot(
  input: AvailabilitySlotCreateInput,
  user: CurrentUser
) {
  const profile = await getOrCreateProfile();
  const slot = await prisma.availabilitySlot.create({
    data: {
      profileId: profile.id,
      weekday: input.weekday,
      startTime: input.startTime,
      endTime: input.endTime,
      price: input.price
    }
  });

  await audit('availability_slot.created', user.id, { slotId: slot.id });
  return serializeAvailabilitySlot(slot);
}

export async function updateAvailabilitySlot(
  id: string,
  input: AvailabilitySlotUpdateInput,
  user: CurrentUser
) {
  const profile = await getOrCreateProfile();
  const slot = await prisma.availabilitySlot.update({
    where: {
      id
    },
    data: input
  });

  if (slot.profileId !== profile.id) {
    throw new AppError('not_found', 'Availability slot not found', 404);
  }

  await audit('availability_slot.updated', user.id, { slotId: slot.id });
  return serializeAvailabilitySlot(slot);
}

export async function deleteAvailabilitySlot(id: string, user: CurrentUser) {
  const profile = await getOrCreateProfile();
  const slot = await prisma.availabilitySlot.findFirst({
    where: { id, profileId: profile.id }
  });

  if (!slot) {
    throw new AppError('not_found', 'Availability slot not found', 404);
  }

  await prisma.availabilitySlot.delete({ where: { id } });
  await audit('availability_slot.deleted', user.id, { slotId: id });
  return { id };
}

export async function createExcludedDate(
  input: ExcludedDateCreateInput,
  user: CurrentUser
) {
  const profile = await getOrCreateProfile();
  const excludedDate = await prisma.excludedDate.create({
    data: {
      profileId: profile.id,
      date: parseDateOnly(input.date),
      note: input.note ?? null
    }
  });

  await audit('excluded_date.created', user.id, {
    excludedDateId: excludedDate.id
  });
  return serializeExcludedDate(excludedDate);
}

export async function deleteExcludedDate(id: string, user: CurrentUser) {
  const profile = await getOrCreateProfile();
  const excludedDate = await prisma.excludedDate.findFirst({
    where: { id, profileId: profile.id }
  });

  if (!excludedDate) {
    throw new AppError('not_found', 'Excluded date not found', 404);
  }

  await prisma.excludedDate.delete({ where: { id } });
  await audit('excluded_date.deleted', user.id, { excludedDateId: id });
  return { id };
}

export async function createConsultationRequest(input: BookingCreateInput) {
  const profile = await getOrCreateProfile();
  const startAt = new Date(input.requestedStartAt);
  const endAt = new Date(input.requestedEndAt);

  await ensureSlotIsAvailable(startAt, endAt);

  const request = await prisma.consultationRequest.create({
    data: {
      profileId: profile.id,
      requestedStartAt: startAt,
      requestedEndAt: endAt,
      visitorName: input.visitorName,
      visitorEmail: input.visitorEmail,
      visitorPhone: input.visitorPhone,
      requestDescription: input.requestDescription
    }
  });

  return serializeConsultationRequest(request);
}

export async function updateConsultationRequestStatus(
  id: string,
  status: RequestStatus,
  user: CurrentUser
) {
  const profile = await getOrCreateProfile();
  const request = await prisma.consultationRequest.update({
    where: { id },
    data: { status }
  });

  if (request.profileId !== profile.id) {
    throw new AppError('not_found', 'Consultation request not found', 404);
  }

  await audit('consultation_request.status_updated', user.id, {
    requestId: id,
    status
  });
  return serializeConsultationRequest(request);
}

async function ensureSlotIsAvailable(startAt: Date, endAt: Date) {
  const snapshot = await getCardSnapshot({ weekStart: startOfWeek(startAt) });
  const requestedStart = startAt.toISOString();
  const requestedEnd = endAt.toISOString();
  const isAvailable = snapshot.availableBookingSlots.some(
    (slot) => slot.startAt === requestedStart && slot.endAt === requestedEnd
  );

  if (!isAvailable) {
    throw new AppError(
      'slot_unavailable',
      'This time slot is not available',
      409
    );
  }
}

async function getOrCreateProfile() {
  const existing = await prisma.cardProfile.findFirst({
    orderBy: { createdAt: 'asc' }
  });

  if (existing) {
    return existing;
  }

  return prisma.cardProfile.create({
    data: {
      onboardingStep: OnboardingStep.PHOTO
    }
  });
}

function buildAvailableBookingSlots({
  availabilitySlots,
  excludedDates,
  consultationRequests,
  weekStart
}: {
  availabilitySlots: AvailabilitySlotDto[];
  excludedDates: ExcludedDateDto[];
  consultationRequests: ConsultationRequestDto[];
  weekStart?: Date;
}): AvailableBookingSlotDto[] {
  const today = startOfDay(new Date());
  const start = weekStart ? startOfDay(weekStart) : startOfWeek(today);
  const excluded = new Set(excludedDates.map((date) => date.date));
  const booked = new Set(
    consultationRequests.map((request) => request.requestedStartAt)
  );
  const output: AvailableBookingSlotDto[] = [];

  for (let dayOffset = 0; dayOffset < 7; dayOffset += 1) {
    const date = addDays(start, dayOffset);
    const dateKey = formatDateOnly(date);

    if (excluded.has(dateKey)) {
      continue;
    }

    const weekday = date.getDay();
    const slots = availabilitySlots.filter((slot) => slot.weekday === weekday);

    for (const slot of slots) {
      const startAt = dateWithTime(date, slot.startTime);
      const endAt = dateWithTime(date, slot.endTime);

      if (startAt <= new Date()) {
        continue;
      }

      if (booked.has(startAt.toISOString())) {
        continue;
      }

      output.push({
        date: dateKey,
        weekday,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        label: `${slot.startTime}-${slot.endTime}`,
        price: slot.price
      });
    }
  }

  return output;
}

function serializeProfile(profile: {
  id: string;
  onboardingCompletedAt: Date | null;
  photoUrl: string | null;
  name: string | null;
  title: string | null;
  location: string | null;
  age: number | null;
  contactPhone: string | null;
  contactEmail: string | null;
  contactWhatsApp: string | null;
  contactTelegram: string | null;
  contactWebsite: string | null;
  professionalProfile: string | null;
  expertise: string | null;
  casesAndResults: string | null;
  experienceAndAchievements: string | null;
  collaborationFormats: string | null;
  showAvailability: boolean;
}): PublicProfileDto {
  return {
    id: profile.id,
    onboardingComplete: Boolean(profile.onboardingCompletedAt),
    photoUrl: profile.photoUrl,
    name: profile.name,
    title: profile.title,
    location: profile.location,
    age: profile.age,
    contactPhone: profile.contactPhone,
    contactEmail: profile.contactEmail,
    contactWhatsApp: profile.contactWhatsApp,
    contactTelegram: profile.contactTelegram,
    contactWebsite: profile.contactWebsite,
    professionalProfile: profile.professionalProfile,
    expertise: profile.expertise,
    casesAndResults: profile.casesAndResults,
    experienceAndAchievements: profile.experienceAndAchievements,
    collaborationFormats: profile.collaborationFormats,
    showAvailability: profile.showAvailability
  };
}

function serializeAvailabilitySlot(slot: {
  id: string;
  weekday: number;
  startTime: string;
  endTime: string;
  price: number | null;
}): AvailabilitySlotDto {
  return {
    id: slot.id,
    weekday: slot.weekday,
    startTime: slot.startTime,
    endTime: slot.endTime,
    price: slot.price
  };
}

function serializeExcludedDate(date: {
  id: string;
  date: Date;
  note: string | null;
}): ExcludedDateDto {
  return {
    id: date.id,
    date: formatDateOnly(date.date),
    note: date.note
  };
}

function serializeConsultationRequest(request: {
  id: string;
  requestedStartAt: Date;
  requestedEndAt: Date;
  visitorName: string;
  visitorEmail: string;
  visitorPhone: string;
  requestDescription: string;
  status: RequestStatus;
  createdAt: Date;
}): ConsultationRequestDto {
  return {
    id: request.id,
    requestedStartAt: request.requestedStartAt.toISOString(),
    requestedEndAt: request.requestedEndAt.toISOString(),
    visitorName: request.visitorName,
    visitorEmail: request.visitorEmail,
    visitorPhone: request.visitorPhone,
    requestDescription: request.requestDescription,
    status: request.status,
    createdAt: request.createdAt.toISOString()
  };
}

function parseDateOnly(date: string) {
  return new Date(`${date}T00:00:00.000Z`);
}

function formatDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function startOfDay(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
}

function startOfWeek(date: Date) {
  return addDays(startOfDay(date), -date.getUTCDay());
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function dateWithTime(date: Date, time: string) {
  const [hours = '0', minutes = '0'] = time.split(':');
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      Number(hours),
      Number(minutes)
    )
  );
}

async function audit(action: string, userId: string | null, metadata: unknown) {
  await prisma.auditEvent.create({
    data: {
      action,
      userId,
      metadata: JSON.stringify(metadata)
    }
  });
}
