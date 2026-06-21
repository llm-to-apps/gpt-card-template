import 'server-only';

import { RequestStatus } from '@prisma/client';

import { requireAdmin } from '@/server/auth';
import {
  availabilitySlotCreateSchema,
  availabilitySlotUpdateSchema,
  bookingCreateSchema,
  consultationRequestUpdateSchema,
  exceptionCreateSchema,
  profileUpdateSchema,
  requestStatusSchema
} from '@/features/card/schemas';
import {
  createAvailabilitySlot,
  createConsultationRequest,
  createException,
  deleteAvailabilitySlot,
  deleteException,
  deleteProfileTranslation,
  getCardSnapshot,
  updateAvailabilitySlot,
  updateConsultationRequest,
  updateConsultationRequestStatus,
  updateProfile
} from '@/features/card/service';
import { getActiveLocale } from '@/i18n/server';
import { isAppLocale } from '@/i18n/locales';
import { AppError } from '@/shared/result';
import type { CardSnapshotDto } from '@/features/card/types';

type ToolResult = {
  tool: string;
  data: unknown;
};

export const adminTools = [
  'getCard',
  'updateProfile',
  'deleteProfileTranslation',
  'listAvailabilitySlots',
  'addAvailabilitySlot',
  'updateAvailabilitySlot',
  'removeAvailabilitySlot',
  'listExceptions',
  'addException',
  'removeException',
  'listConsultationRequests',
  'updateConsultationRequest',
  'updateConsultationRequestStatus'
] as const;

export const publicTools = [
  'getPublicCard',
  'listAvailableSlots',
  'checkSlotAvailability',
  'createConsultationRequest'
] as const;

export async function runAdminTool(
  name: string,
  args: unknown,
  currentUser?: Awaited<ReturnType<typeof requireAdmin>>
): Promise<ToolResult> {
  const user = currentUser ?? (await requireAdmin());

  switch (name) {
    case 'getCard': {
      const { locale, data } = await parseMcpLocaleArgs(args);
      const input = data as { weekStart?: unknown };
      const weekStart =
        typeof input.weekStart === 'string'
          ? new Date(`${input.weekStart}T00:00:00.000Z`)
          : undefined;

      return {
        tool: name,
        data: await getCardSnapshot({
          includeRequests: true,
          isAdmin: true,
          locale,
          weekStart
        })
      };
    }
    case 'updateProfile': {
      const { locale, data } = await parseMcpLocaleArgs(args);

      return {
        tool: name,
        data: await updateProfile(profileUpdateSchema.parse(data), user, locale)
      };
    }
    case 'deleteProfileTranslation': {
      const { locale } = await parseMcpLocaleArgs(args);

      return {
        tool: name,
        data: await deleteProfileTranslation(user, locale)
      };
    }
    case 'listAvailabilitySlots':
      return {
        tool: name,
        data: (await getCardSnapshot({ includeRequests: true, isAdmin: true }))
          .availabilitySlots
      };
    case 'addAvailabilitySlot':
      return {
        tool: name,
        data: await createAvailabilitySlot(
          availabilitySlotCreateSchema.parse(args),
          user
        )
      };
    case 'updateAvailabilitySlot': {
      const input = args as { id?: unknown; data?: unknown };
      if (typeof input.id !== 'string') {
        throw new AppError('validation_error', 'id is required', 400);
      }
      return {
        tool: name,
        data: await updateAvailabilitySlot(
          input.id,
          availabilitySlotUpdateSchema.parse(input.data),
          user
        )
      };
    }
    case 'removeAvailabilitySlot': {
      const input = args as { id?: unknown };
      if (typeof input.id !== 'string') {
        throw new AppError('validation_error', 'id is required', 400);
      }
      return { tool: name, data: await deleteAvailabilitySlot(input.id, user) };
    }
    case 'listExceptions':
      return {
        tool: name,
        data: (await getCardSnapshot({ includeRequests: true, isAdmin: true }))
          .exceptions
      };
    case 'addException':
      return {
        tool: name,
        data: await createException(exceptionCreateSchema.parse(args), user)
      };
    case 'removeException': {
      const input = args as { id?: unknown };
      if (typeof input.id !== 'string') {
        throw new AppError('validation_error', 'id is required', 400);
      }
      return { tool: name, data: await deleteException(input.id, user) };
    }
    case 'listConsultationRequests':
      return {
        tool: name,
        data: (await getCardSnapshot({ includeRequests: true, isAdmin: true }))
          .consultationRequests
      };
    case 'updateConsultationRequest': {
      const input = args as { id?: unknown; data?: unknown };
      if (typeof input.id !== 'string') {
        throw new AppError('validation_error', 'id is required', 400);
      }
      return {
        tool: name,
        data: await updateConsultationRequest(
          input.id,
          consultationRequestUpdateSchema.parse(input.data),
          user
        )
      };
    }
    case 'updateConsultationRequestStatus': {
      const input = args as { id?: unknown; status?: unknown };
      if (typeof input.id !== 'string') {
        throw new AppError('validation_error', 'id is required', 400);
      }
      const parsed = requestStatusSchema.parse({ status: input.status });
      return {
        tool: name,
        data: await updateConsultationRequestStatus(
          input.id,
          parsed.status as RequestStatus,
          user
        )
      };
    }
    default:
      throw new AppError(
        'unknown_tool',
        `Unknown admin MCP tool: ${name}`,
        404
      );
  }
}

export async function runPublicTool(
  name: string,
  args: unknown
): Promise<ToolResult> {
  switch (name) {
    case 'getPublicCard':
      return { tool: name, data: toPublicCardPayload(await getCardSnapshot()) };
    case 'listAvailableSlots':
      return {
        tool: name,
        data: (await getCardSnapshot()).availableBookingSlots.filter(
          (slot) => !slot.booked
        )
      };
    case 'checkSlotAvailability': {
      const input = args as {
        requestedStartAt?: unknown;
        requestedEndAt?: unknown;
      };
      if (
        typeof input.requestedStartAt !== 'string' ||
        typeof input.requestedEndAt !== 'string'
      ) {
        throw new AppError(
          'validation_error',
          'requestedStartAt and requestedEndAt are required',
          400
        );
      }
      const slots = (await getCardSnapshot()).availableBookingSlots;
      return {
        tool: name,
        data: {
          available: slots.some(
            (slot) =>
              slot.startAt === input.requestedStartAt &&
              slot.endAt === input.requestedEndAt &&
              !slot.booked
          )
        }
      };
    }
    case 'createConsultationRequest':
      return {
        tool: name,
        data: await createConsultationRequest(bookingCreateSchema.parse(args))
      };
    default:
      throw new AppError(
        'unknown_tool',
        `Unknown public MCP tool: ${name}`,
        404
      );
  }
}

async function parseMcpLocaleArgs(args: unknown) {
  const input = isRecord(args) ? args : {};
  const localeValue = input.locale;

  if (localeValue !== undefined && !isAppLocale(String(localeValue))) {
    throw new AppError('validation_error', 'locale is invalid', 400);
  }

  return {
    data: isRecord(input) && 'data' in input ? input.data : args,
    locale: isAppLocale(String(localeValue))
      ? String(localeValue)
      : await getActiveLocale()
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function toPublicCardPayload(snapshot: CardSnapshotDto) {
  const { profile } = snapshot;

  return {
    profile: {
      photoUrl: profile.photoUrl,
      name: profile.name,
      title: profile.title,
      location: profile.location,
      age: profile.age,
      professionalProfile: profile.professionalProfile,
      expertise: profile.expertise,
      casesAndResults: profile.casesAndResults,
      experienceAndAchievements: profile.experienceAndAchievements,
      collaborationFormats: profile.collaborationFormats,
      showAvailability: profile.showAvailability,
      contacts: {
        phone: profile.contactPhone,
        email: profile.contactEmail,
        whatsapp: profile.contactWhatsApp,
        telegram: profile.contactTelegram,
        website: profile.contactWebsite
      }
    },
    availableBookingSlots: snapshot.availableBookingSlots.filter(
      (slot) => !slot.booked
    )
  };
}
