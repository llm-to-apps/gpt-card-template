import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';

import { defaultLocale, isAppLocale } from './locales';

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const cookieLocale = cookieStore.get('gpt_card_locale')?.value;
  const acceptLanguage = headerStore
    .get('accept-language')
    ?.split(',')[0]
    ?.split('-')[0];
  const locale = isAppLocale(cookieLocale)
    ? cookieLocale
    : isAppLocale(acceptLanguage)
      ? acceptLanguage
      : defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default
  };
});
