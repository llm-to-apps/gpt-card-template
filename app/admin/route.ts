import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/server/auth';

export async function GET(request: Request) {
  const user = await getCurrentUser();

  if (user?.role === 'admin') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.redirect(new URL('/auth/login', request.url));
}
