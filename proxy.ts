import { NextRequest, NextResponse } from 'next/server';

import {
  isAppLocale,
  localeCookieName,
  localeHeaderName,
  localeSearchParamHeaderName,
  localeSearchParamName
} from '@/i18n/locales';

export function proxy(request: NextRequest) {
  const queryLocale = request.nextUrl.searchParams.get(localeSearchParamName);
  const requestHeaders = new Headers(request.headers);

  if (queryLocale !== null) {
    requestHeaders.set(localeSearchParamHeaderName, '1');
  }

  if (!isAppLocale(queryLocale)) {
    return NextResponse.next({
      request: {
        headers: requestHeaders
      }
    });
  }

  requestHeaders.set(localeHeaderName, queryLocale);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders
    }
  });

  response.cookies.set(localeCookieName, queryLocale, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
    sameSite: 'lax'
  });

  return response;
}

export const config = {
  matcher: ['/((?!_next|.*\\..*).*)']
};
