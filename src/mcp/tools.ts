import 'server-only';

import { RequestStatus } from '@prisma/client';

import { requireAdmin } from '@/server/auth';
import {
  availabilitySlotCreateSchema,
  availabilitySlotUpdateSchema,
  bookingCreateSchema,
  excludedDateCreateSchema,
  profileUpdateSchema,
  requestStatusSchema
} from '@/features/card/schemas';
import {
  createAvailabilitySlot,
  createConsultationRequest,
  createExcludedDate,
  deleteAvailabilitySlot,
  deleteExcludedDate,
  getCardSnapshot,
  updateAvailabilitySlot,
  updateConsultationRequestStatus,
  updateProfile
} from '@/features/card/service';
import { AppError } from '@/shared/result';

type ToolResult = {
  tool: string;
  data: unknown;
};

export const adminTools = [
  'getCard',
  'updateProfile',
  'addAvailabilitySlot',
  'updateAvailabilitySlot',
  'removeAvailabilitySlot',
  'addExcludedDate',
  'removeExcludedDate',
  'listConsultationRequests',
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
  args: unknown
): Promise<ToolResult> {
  const user = await requireAdmin();

  switch (name) {
    case 'getCard':
      return {
        tool: name,
        data: await getCardSnapshot({ includeRequests: true, isAdmin: true })
      };
    case 'updateProfile':
      return {
        tool: name,
        data: await updateProfile(profileUpdateSchema.parse(args), user)
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
    case 'addExcludedDate':
      return {
        tool: name,
        data: await createExcludedDate(
          excludedDateCreateSchema.parse(args),
          user
        )
      };
    case 'removeExcludedDate': {
      const input = args as { id?: unknown };
      if (typeof input.id !== 'string') {
        throw new AppError('validation_error', 'id is required', 400);
      }
      return { tool: name, data: await deleteExcludedDate(input.id, user) };
    }
    case 'listConsultationRequests':
      return {
        tool: name,
        data: (await getCardSnapshot({ includeRequests: true, isAdmin: true }))
          .consultationRequests
      };
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
      return { tool: name, data: await getCardSnapshot() };
    case 'listAvailableSlots':
      return {
        tool: name,
        data: (await getCardSnapshot()).availableBookingSlots
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
              slot.endAt === input.requestedEndAt
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
