import { NextResponse } from 'next/server';

import {
  clearManualLogout,
  createLocalAdminSession,
  createLoginRedirectUrl,
  rememberOAuthNextPath
} from '@/server/auth';
import { isLocalAuthMode } from '@/server/env';
import { publicOrigin } from '@/server/request-origin';

export async function GET(request: Request) {
  await clearManualLogout();
  const url = new URL(request.url);
  const nextPath = safeNextPath(url.searchParams.get('next'));

  if (isLocalAuthMode()) {
    await createLocalAdminSession();
    return NextResponse.redirect(new URL(nextPath, request.url));
  }

  await rememberOAuthNextPath(nextPath);
  const origin = await publicOrigin();
  const redirectUrl = await createLoginRedirectUrl(
    origin,
    url.searchParams.get('interactive') !== '1'
  );

  return NextResponse.redirect(redirectUrl);
}

function safeNextPath(value: string | null) {
  if (!value?.startsWith('/') || value.startsWith('//')) {
    return '/';
  }

  return value;
}
