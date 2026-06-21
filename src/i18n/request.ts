import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';

import {
  isAppLocale,
  localeCookieName,
  localeFromAcceptLanguage,
  localeHeaderName
} from './locales';

export default getRequestConfig(async () => {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  const headerLocale = headerStore.get(localeHeaderName);
  const cookieLocale = cookieStore.get(localeCookieName)?.value;
  const locale = isAppLocale(headerLocale)
    ? headerLocale
    : isAppLocale(cookieLocale)
      ? cookieLocale
      : localeFromAcceptLanguage(headerStore.get('accept-language'));

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default
  };
});
