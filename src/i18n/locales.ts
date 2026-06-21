export const locales = ['en', 'de', 'ru'] as const;
export const defaultLocale = 'en';
export const localeCookieName = 'gpt_card_locale';
export const localeHeaderName = 'x-gpt-card-locale';
export const localeSearchParamHeaderName = 'x-gpt-card-locale-search-param';
export const localeSearchParamName = 'lang';

export type AppLocale = (typeof locales)[number];

export function isAppLocale(
  value: string | null | undefined
): value is AppLocale {
  return Boolean(value && (locales as readonly string[]).includes(value));
}

export function localeFromAcceptLanguage(value: string | null) {
  if (!value) {
    return defaultLocale;
  }

  const requestedLocales = value
    .split(',')
    .map((part) => part.split(';')[0]?.trim().toLowerCase())
    .filter(Boolean);

  for (const requestedLocale of requestedLocales) {
    const language = requestedLocale.split('-')[0];

    if (isAppLocale(language)) {
      return language;
    }
  }

  return defaultLocale;
}
