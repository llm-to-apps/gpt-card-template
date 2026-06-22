import { headers } from 'next/headers';
import type { Metadata } from 'next';
import { Fragment } from 'react';

import { CardApp, type CardSection } from '@/features/card/card-app';
import type { CardMode } from '@/features/card/card-mode-toolbar';
import { EmbeddedAuthBridge } from '@/features/card/embedded-auth-bridge';
import { getCardSnapshot } from '@/features/card/service';
import {
  locales,
  localeSearchParamHeaderName,
  localeSearchParamName
} from '@/i18n/locales';
import { getActiveLocale } from '@/i18n/server';
import { getCurrentUser } from '@/server/auth';

type RenderCardPageOptions = {
  mode?: CardMode;
};

export async function renderCardPage(
  section: CardSection,
  options: RenderCardPageOptions = {}
) {
  const [user, headerStore, locale] = await Promise.all([
    getCurrentUser(),
    headers(),
    getActiveLocale()
  ]);
  const isAdmin = user?.role === 'admin';
  const localeLocked = headerStore.get(localeSearchParamHeaderName) === '1';
  const origin = requestOrigin(headerStore);
  const snapshot = await getCardSnapshot({
    includeRequests: isAdmin,
    isAdmin,
    locale
  });
  const weekStart = formatDateOnly(
    startOfWeek(new Date(), snapshot.profile.firstDayOfWeek)
  );

  return (
    <Fragment>
      <EmbeddedAuthBridge enabled={!user} />
      <CardApp
        initialMode={options.mode ?? 'view'}
        initialSection={section}
        initialSnapshot={snapshot}
        initialWeekStart={weekStart}
        initialLocaleLocked={localeLocked}
        initialPublicOrigin={origin}
      />
    </Fragment>
  );
}

export async function generateCardMetadata(
  section: CardSection
): Promise<Metadata> {
  const [locale, headerStore] = await Promise.all([
    getActiveLocale(),
    headers()
  ]);
  const snapshot = await getCardSnapshot({ locale });
  const profile = snapshot.profile;
  const origin = requestOrigin(headerStore);
  const path = sectionPath(section);
  const url = new URL(path, origin);
  const name = profile.name?.trim() || 'GPT Card';
  const sectionTitle = metadataSectionTitle(section);
  const title = sectionTitle ? `${name} - ${sectionTitle}` : name;
  const description = compactText(
    profile.title ||
      profile.professionalProfile ||
      profile.expertise ||
      'Personal website card with consultation booking.',
    155
  );
  const imageUrl = profile.photoUrl
    ? new URL(profile.photoUrl, origin).toString()
    : undefined;

  return {
    title,
    description,
    metadataBase: new URL(origin),
    alternates: {
      canonical: url.toString(),
      languages: Object.fromEntries(
        locales.map((item) => {
          const localizedUrl = new URL(path, origin);
          localizedUrl.searchParams.set(localeSearchParamName, item);
          return [item, localizedUrl.toString()];
        })
      )
    },
    openGraph: {
      description,
      images: imageUrl ? [{ url: imageUrl }] : undefined,
      locale,
      siteName: name,
      title,
      type: 'profile',
      url: url.toString()
    },
    twitter: {
      card: imageUrl ? 'summary_large_image' : 'summary',
      description,
      images: imageUrl ? [imageUrl] : undefined,
      title
    }
  };
}

function formatDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function startOfWeek(date: Date, firstDayOfWeek = 1) {
  const day = date.getUTCDay();
  const diff = (day - firstDayOfWeek + 7) % 7;
  return addDays(startOfDay(date), -diff);
}

function startOfDay(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function requestOrigin(headerStore: Headers) {
  const host = headerStore.get('x-forwarded-host') ?? headerStore.get('host');
  const protocol =
    headerStore.get('x-forwarded-proto') ??
    (host?.startsWith('localhost') || host?.startsWith('127.0.0.1')
      ? 'http'
      : 'https');

  return host ? `${protocol}://${host}` : 'http://localhost:3006';
}

function sectionPath(section: CardSection) {
  if (section === 'book') {
    return '/book';
  }

  if (section === 'contacts') {
    return '/contacts';
  }

  return '/';
}

function metadataSectionTitle(section: CardSection) {
  if (section === 'book') {
    return 'Book a consultation';
  }

  if (section === 'contacts') {
    return 'Contacts';
  }

  return '';
}

function compactText(value: string, maxLength: number) {
  const compacted = value.replace(/\s+/g, ' ').trim();

  if (compacted.length <= maxLength) {
    return compacted;
  }

  return `${compacted.slice(0, maxLength - 1).trimEnd()}...`;
}
