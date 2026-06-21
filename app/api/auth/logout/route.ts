import { NextResponse } from 'next/server';

import { clearSession } from '@/server/auth';

export async function POST(request: Request) {
  await clearSession();
  return NextResponse.redirect(new URL('/', request.url));
}

export async function GET(request: Request) {
  await clearSession();
  return NextResponse.redirect(new URL('/', request.url));
}
