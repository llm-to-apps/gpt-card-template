export const locales = ['en', 'ru', 'de'] as const;
export type AppLocale = (typeof locales)[number];
export const defaultLocale: AppLocale = 'en';

export function isAppLocale(
  value: string | null | undefined
): value is AppLocale {
  return Boolean(value && (locales as readonly string[]).includes(value));
}
