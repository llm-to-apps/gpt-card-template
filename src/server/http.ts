import 'server-only';

import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

import { appErrorFromUnknown, AppError } from '@/shared/result';

export function jsonOk<T>(data: T) {
  return NextResponse.json({ ok: true, data });
}

export function jsonError(error: AppError) {
  return NextResponse.json(
    {
      ok: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details
      }
    },
    { status: error.status }
  );
}

export function jsonErrorFromUnknown(error: unknown) {
  if (error instanceof ZodError) {
    return jsonError(
      new AppError('validation_error', 'Invalid request', 400, error.flatten())
    );
  }

  return jsonError(appErrorFromUnknown(error));
}
