import { NextResponse } from 'next/server';

import {
  clearManualLogout,
  createLocalAdminSession,
  createOAuthRequest,
  rememberOAuthNextPath
} from '@/server/auth';
import { isLocalAuthMode } from '@/server/env';
import { renderOAuthLoginPage } from '@/server/oauth-login-page';
import { publicOrigin } from '@/server/request-origin';

export async function GET(request: Request) {
  await clearManualLogout();
  const url = new URL(request.url);
  const nextPath = safeNextPath(url.searchParams.get('next'));

  if (isLocalAuthMode()) {
    await createLocalAdminSession();
    return NextResponse.redirect(new URL(nextPath, requestOrigin(request)));
  }

  await rememberOAuthNextPath(nextPath);
  const origin = await publicOrigin();
  const oauthRequest = await createOAuthRequest(origin);

  return new NextResponse(renderOAuthLoginPage({ ...oauthRequest, nextPath }), {
    headers: {
      'content-type': 'text/html; charset=utf-8'
    }
  });
}

function safeNextPath(value: string | null) {
  if (!value?.startsWith('/') || value.startsWith('//')) {
    return '/';
  }

  return value;
}

function requestOrigin(request: Request) {
  const url = new URL(request.url);
  const forwardedHost = request.headers.get('x-forwarded-host');
  const host = forwardedHost ?? request.headers.get('host');

  if (!host) {
    return url.origin;
  }

  const forwardedProto = request.headers.get('x-forwarded-proto');
  const proto = forwardedProto ?? url.protocol.replace(':', '');

  return `${proto}://${host}`;
}
