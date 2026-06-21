import 'server-only';

import { cookies, headers } from 'next/headers';

import {
  defaultLocale,
  isAppLocale,
  localeCookieName,
  localeFromAcceptLanguage,
  localeHeaderName
} from './locales';

export async function getActiveLocale() {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  const headerLocale = headerStore.get(localeHeaderName);
  const cookieLocale = cookieStore.get(localeCookieName)?.value;

  return isAppLocale(headerLocale)
    ? headerLocale
    : isAppLocale(cookieLocale)
      ? cookieLocale
      : (localeFromAcceptLanguage(headerStore.get('accept-language')) ??
        defaultLocale);
}
