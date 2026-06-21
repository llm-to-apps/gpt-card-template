import 'server-only';

import { randomUUID } from 'node:crypto';
import { NextRequest } from 'next/server';

export function requestId(request: NextRequest) {
  return request.headers.get('x-request-id') ?? randomUUID();
}

export function clientRateLimitKey(request: NextRequest, fallback: string) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    fallback
  );
}
