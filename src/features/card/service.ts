import 'server-only';

import { OnboardingStep, RequestStatus } from '@prisma/client';
import type { CardProfileTranslation } from '@prisma/client';

import { prisma } from '@/server/db';
import type { CurrentUser } from '@/server/auth';
import { publishCardEvent } from '@/server/card-events';
import { AppError } from '@/shared/result';
import { defaultLocale } from '@/i18n/locales';
import type {
  AvailabilitySlotCreateInput,
  AvailabilitySlotUpdateInput,
  BookingCreateInput,
  ConsultationRequestUpdateInput,
  ExceptionCreateInput,
  ProfileUpdateInput
} from './schemas';
import type {
  AvailabilitySlotDto,
  AvailableBookingSlotDto,
  CardSnapshotDto,
  ConsultationRequestDto,
  ExceptionDto,
  PublicProfileDto
} from './types';

export async function getCardSnapshot({
  includeRequests = false,
  isAdmin = false,
  locale = defaultLocale,
  weekStart
}: {
  includeRequests?: boolean;
  isAdmin?: boolean;
  locale?: string;
  weekStart?: Date;
} = {}): Promise<CardSnapshotDto> {
  const profile = await getOrCreateProfile();
  const [
    availabilitySlots,
    exceptions,
    bookedRequests,
    visibleRequests,
    translation
  ] = await Promise.all([
    prisma.availabilitySlot.findMany({
      where: { profileId: profile.id },
      orderBy: [{ weekday: 'asc' }, { startTime: 'asc' }]
    }),
    prisma.exception.findMany({
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
      : Promise.resolve([]),
    getProfileTranslation(profile.id, locale)
  ]);

  const bookedRequestDtos = bookedRequests.map(serializeConsultationRequest);
  const visibleRequestDtos = visibleRequests.map(serializeConsultationRequest);

  return {
    profile: serializeProfile(profile, translation, locale),
    availabilitySlots: availabilitySlots.map(serializeAvailabilitySlot),
    exceptions: exceptions.map(serializeException),
    availableBookingSlots: buildAvailableBookingSlots({
      availabilitySlots: availabilitySlots.map(serializeAvailabilitySlot),
      exceptions: exceptions.map(serializeException),
      consultationRequests: bookedRequestDtos,
      firstDayOfWeek: profile.firstDayOfWeek,
      timeZone: profile.timeZone,
      weekStart
    }),
    consultationRequests: includeRequests ? visibleRequestDtos : undefined,
    isAdmin
  };
}

export async function updateProfile(
  input: ProfileUpdateInput,
  user: CurrentUser,
  locale = defaultLocale
) {
  const profile = await getOrCreateProfile();
  const nextStep = input.onboardingStep;
  const shouldComplete = nextStep === 'COMPLETE';
  const profileData = {
    ownerUserId: profile.ownerUserId ?? user.id,
    photoUrl: input.photoUrl,
    photoStorageKey: input.photoStorageKey,
    age: input.age,
    contactPhone: input.contactPhone,
    contactEmail: input.contactEmail,
    contactWhatsApp: input.contactWhatsApp,
    contactTelegram: input.contactTelegram,
    contactWebsite: input.contactWebsite,
    agentChatUrl: input.agentChatUrl,
    currency: input.currency,
    timeZone: input.timeZone,
    firstDayOfWeek: input.firstDayOfWeek,
    showAvailability: input.showAvailability,
    onboardingStep: nextStep,
    onboardingCompletedAt: shouldComplete
      ? (profile.onboardingCompletedAt ?? new Date())
      : undefined
  };
  const translationData = localizedProfileData(input);

  const updated = await prisma.cardProfile.update({
    where: { id: profile.id },
    data: profileData
  });

  if (Object.keys(translationData).length > 0) {
    await prisma.cardProfileTranslation.upsert({
      where: {
        profileId_locale: {
          profileId: profile.id,
          locale
        }
      },
      update: translationData,
      create: {
        profileId: profile.id,
        locale,
        ...translationData
      }
    });
  }

  const translation = await getProfileTranslation(updated.id, locale);

  await audit('profile.updated', user.id, { profileId: updated.id });
  publishCardEvent('profile.updated', { profileId: updated.id, locale });
  return serializeProfile(updated, translation, locale);
}

export async function deleteProfileTranslation(
  user: CurrentUser,
  locale = defaultLocale
) {
  const profile = await getOrCreateProfile();
  const translation = await prisma.cardProfileTranslation.findUnique({
    where: {
      profileId_locale: {
        profileId: profile.id,
        locale
      }
    }
  });

  if (!translation) {
    throw new AppError('not_found', 'Profile translation not found', 404);
  }

  const translationCount = await prisma.cardProfileTranslation.count({
    where: { profileId: profile.id }
  });

  if (translationCount <= 1) {
    throw new AppError(
      'validation_error',
      'At least one profile translation must remain',
      400
    );
  }

  await prisma.cardProfileTranslation.delete({
    where: {
      profileId_locale: {
        profileId: profile.id,
        locale
      }
    }
  });
  await audit('profile_translation.deleted', user.id, {
    profileId: profile.id,
    locale
  });
  publishCardEvent('profile_translation.deleted', {
    profileId: profile.id,
    locale
  });

  return { locale };
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
  publishCardEvent('availability_slot.created', { slotId: slot.id });
  return serializeAvailabilitySlot(slot);
}

export async function updateAvailabilitySlot(
  id: string,
  input: AvailabilitySlotUpdateInput,
  user: CurrentUser
) {
  const profile = await getOrCreateProfile();
  const existingSlot = await prisma.availabilitySlot.findFirst({
    where: { id, profileId: profile.id }
  });

  if (!existingSlot) {
    throw new AppError('not_found', 'Availability slot not found', 404);
  }

  const slot = await prisma.availabilitySlot.update({
    where: { id },
    data: input
  });

  await audit('availability_slot.updated', user.id, { slotId: slot.id });
  publishCardEvent('availability_slot.updated', { slotId: slot.id });
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
  publishCardEvent('availability_slot.deleted', { slotId: id });
  return { id };
}

export async function createException(
  input: ExceptionCreateInput,
  user: CurrentUser
) {
  const profile = await getOrCreateProfile();
  const exception = await prisma.exception.create({
    data: {
      profileId: profile.id,
      date: parseDateOnly(input.date),
      note: input.note ?? null
    }
  });

  await audit('exception.created', user.id, {
    exceptionId: exception.id
  });
  publishCardEvent('exception.created', { exceptionId: exception.id });
  return serializeException(exception);
}

export async function deleteException(id: string, user: CurrentUser) {
  const profile = await getOrCreateProfile();
  const exception = await prisma.exception.findFirst({
    where: { id, profileId: profile.id }
  });

  if (!exception) {
    throw new AppError('not_found', 'Exception not found', 404);
  }

  await prisma.exception.delete({ where: { id } });
  await audit('exception.deleted', user.id, { exceptionId: id });
  publishCardEvent('exception.deleted', { exceptionId: id });
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

  publishCardEvent('consultation_request.created', { requestId: request.id });
  return serializeConsultationRequest(request);
}

export async function updateConsultationRequestStatus(
  id: string,
  status: RequestStatus,
  user: CurrentUser
) {
  const profile = await getOrCreateProfile();
  const existingRequest = await prisma.consultationRequest.findFirst({
    where: { id, profileId: profile.id }
  });

  if (!existingRequest) {
    throw new AppError('not_found', 'Consultation request not found', 404);
  }

  const request = await prisma.consultationRequest.update({
    where: { id },
    data: { status }
  });

  await audit('consultation_request.status_updated', user.id, {
    requestId: id,
    status
  });
  publishCardEvent('consultation_request.status_updated', {
    requestId: id,
    status
  });
  return serializeConsultationRequest(request);
}

export async function updateConsultationRequest(
  id: string,
  input: ConsultationRequestUpdateInput,
  user: CurrentUser
) {
  const profile = await getOrCreateProfile();
  const existingRequest = await prisma.consultationRequest.findFirst({
    where: { id, profileId: profile.id }
  });

  if (!existingRequest) {
    throw new AppError('not_found', 'Consultation request not found', 404);
  }

  const request = await prisma.consultationRequest.update({
    where: { id },
    data: {
      visitorName: input.visitorName,
      visitorEmail: input.visitorEmail,
      visitorPhone: input.visitorPhone,
      requestDescription: input.requestDescription,
      status: input.status
    }
  });

  await audit('consultation_request.updated', user.id, {
    requestId: id
  });
  publishCardEvent('consultation_request.updated', { requestId: id });
  return serializeConsultationRequest(request);
}

async function ensureSlotIsAvailable(startAt: Date, endAt: Date) {
  const snapshot = await getCardSnapshot({ weekStart: startOfWeek(startAt) });
  const requestedStart = startAt.toISOString();
  const requestedEnd = endAt.toISOString();
  const isAvailable = snapshot.availableBookingSlots.some(
    (slot) =>
      slot.startAt === requestedStart &&
      slot.endAt === requestedEnd &&
      !slot.booked
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
  exceptions,
  consultationRequests,
  firstDayOfWeek,
  timeZone,
  weekStart
}: {
  availabilitySlots: AvailabilitySlotDto[];
  exceptions: ExceptionDto[];
  consultationRequests: ConsultationRequestDto[];
  firstDayOfWeek: number;
  timeZone: string;
  weekStart?: Date;
}): AvailableBookingSlotDto[] {
  const today = startOfDay(new Date());
  const start = weekStart ? startOfDay(weekStart) : today;
  const exceptionDates = new Set(exceptions.map((date) => date.date));
  const booked = new Set(
    consultationRequests.map((request) => request.requestedStartAt)
  );
  const output: AvailableBookingSlotDto[] = [];

  for (let dayOffset = 0; dayOffset < 7; dayOffset += 1) {
    const date = addDays(start, dayOffset);
    const dateKey = formatDateOnly(date);

    if (exceptionDates.has(dateKey)) {
      continue;
    }

    const weekday = date.getDay();
    const slots = availabilitySlots.filter((slot) => slot.weekday === weekday);

    for (const slot of slots) {
      const startAt = dateWithTime(date, slot.startTime, timeZone);
      const endAt = dateWithTime(date, slot.endTime, timeZone);

      if (startAt <= new Date()) {
        continue;
      }

      const isBooked = booked.has(startAt.toISOString());

      output.push({
        date: dateKey,
        weekday,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        label: `${slot.startTime}-${slot.endTime}`,
        price: slot.price,
        booked: isBooked
      });
    }
  }

  return output;
}

type ProfileTranslationResult = {
  fallbackLocale: string | null;
  translation: CardProfileTranslation | null;
};

const localizedProfileKeys = [
  'name',
  'title',
  'location',
  'professionalProfile',
  'expertise',
  'casesAndResults',
  'experienceAndAchievements',
  'collaborationFormats'
] as const;

function localizedProfileData(input: ProfileUpdateInput) {
  const data: Partial<
    Pick<CardProfileTranslation, (typeof localizedProfileKeys)[number]>
  > = {};

  for (const key of localizedProfileKeys) {
    if (input[key] !== undefined) {
      data[key] = input[key] ?? null;
    }
  }

  return data;
}

async function getProfileTranslation(
  profileId: string,
  locale: string
): Promise<ProfileTranslationResult> {
  const translations = await prisma.cardProfileTranslation.findMany({
    where: { profileId },
    orderBy: [{ locale: 'asc' }]
  });
  const exact = translations.find(
    (translation) => translation.locale === locale
  );

  if (exact) {
    return { fallbackLocale: null, translation: exact };
  }

  const fallback =
    translations.find((translation) => translation.locale === defaultLocale) ??
    translations[0] ??
    null;

  return {
    fallbackLocale: fallback?.locale ?? null,
    translation: fallback
  };
}

function serializeProfile(
  profile: {
    id: string;
    onboardingCompletedAt: Date | null;
    photoUrl: string | null;
    age: number | null;
    contactPhone: string | null;
    contactEmail: string | null;
    contactWhatsApp: string | null;
    contactTelegram: string | null;
    contactWebsite: string | null;
    agentChatUrl: string | null;
    currency: string;
    timeZone: string;
    firstDayOfWeek: number;
    showAvailability: boolean;
  },
  translationResult: ProfileTranslationResult,
  locale: string
): PublicProfileDto {
  const { fallbackLocale, translation } = translationResult;

  return {
    id: profile.id,
    locale,
    fallbackLocale,
    onboardingComplete: Boolean(profile.onboardingCompletedAt),
    photoUrl: profile.photoUrl,
    name: translation?.name ?? null,
    title: translation?.title ?? null,
    location: translation?.location ?? null,
    age: profile.age,
    contactPhone: profile.contactPhone,
    contactEmail: profile.contactEmail,
    contactWhatsApp: profile.contactWhatsApp,
    contactTelegram: profile.contactTelegram,
    contactWebsite: profile.contactWebsite,
    agentChatUrl: profile.agentChatUrl,
    currency: profile.currency,
    timeZone: profile.timeZone,
    firstDayOfWeek: profile.firstDayOfWeek,
    professionalProfile: translation?.professionalProfile ?? null,
    expertise: translation?.expertise ?? null,
    casesAndResults: translation?.casesAndResults ?? null,
    experienceAndAchievements: translation?.experienceAndAchievements ?? null,
    collaborationFormats: translation?.collaborationFormats ?? null,
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

function serializeException(date: {
  id: string;
  date: Date;
  note: string | null;
}): ExceptionDto {
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

function startOfWeek(date: Date, firstDayOfWeek = 1) {
  const day = date.getUTCDay();
  const diff = (day - firstDayOfWeek + 7) % 7;
  return addDays(startOfDay(date), -diff);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function dateWithTime(date: Date, time: string, timeZone: string) {
  const [hours = '0', minutes = '0'] = time.split(':');
  const dateKey = formatDateOnly(date);
  return zonedTimeToUtc(dateKey, Number(hours), Number(minutes), timeZone);
}

function zonedTimeToUtc(
  dateKey: string,
  hours: number,
  minutes: number,
  timeZone: string
) {
  const [year = '0', month = '1', day = '1'] = dateKey.split('-');
  const utcGuess = new Date(
    Date.UTC(Number(year), Number(month) - 1, Number(day), hours, minutes)
  );
  const offset = getTimeZoneOffset(utcGuess, timeZone);
  const firstPass = new Date(utcGuess.getTime() - offset);
  const correctedOffset = getTimeZoneOffset(firstPass, timeZone);
  return new Date(utcGuess.getTime() - correctedOffset);
}

function getTimeZoneOffset(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
    minute: '2-digit',
    month: '2-digit',
    second: '2-digit',
    timeZone,
    year: 'numeric'
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)])
  );

  return (
    Date.UTC(
      values.year,
      values.month - 1,
      values.day,
      values.hour,
      values.minute,
      values.second
    ) - date.getTime()
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
