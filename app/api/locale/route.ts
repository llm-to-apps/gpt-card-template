import { NextRequest, NextResponse } from 'next/server';

import { isAppLocale, localeCookieName } from '@/i18n/locales';

export async function POST(request: NextRequest) {
  const { locale } = (await request.json().catch(() => ({}))) as {
    locale?: string;
  };

  if (!isAppLocale(locale)) {
    return NextResponse.json(
      { ok: false, error: { code: 'BAD_REQUEST', message: 'Invalid locale' } },
      { status: 400 }
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(localeCookieName, locale, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
    sameSite: 'lax'
  });

  return response;
}
