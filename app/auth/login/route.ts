import { NextResponse } from 'next/server';

import {
  clearManualLogout,
  createLocalAdminSession,
  createLoginRedirectUrl
} from '@/server/auth';
import { isLocalAuthMode } from '@/server/env';

export async function GET(request: Request) {
  await clearManualLogout();

  if (isLocalAuthMode()) {
    await createLocalAdminSession();
    return NextResponse.redirect(new URL('/', request.url));
  }

  const origin = new URL(request.url).origin;
  const redirectUrl = await createLoginRedirectUrl(origin, false);

  return NextResponse.redirect(redirectUrl);
}
