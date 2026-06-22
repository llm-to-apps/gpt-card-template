import { headers } from 'next/headers';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { QRCodeSVG } from 'qrcode.react';

import { CardModeToolbar } from '@/features/card/card-mode-toolbar';
import { PrintDownloadActions } from '@/features/card/print-download-actions';
import { getCardSnapshot } from '@/features/card/service';
import { localeSearchParamHeaderName } from '@/i18n/locales';
import { getActiveLocale } from '@/i18n/server';
import { getCurrentUser } from '@/server/auth';

export const metadata: Metadata = {
  title: 'Print - GPT Card'
};

const CARD_WIDTH_IN = 3.5;
const CARD_HEIGHT_IN = CARD_WIDTH_IN / 1.545;
const CARD_WIDTH = 1050;
const CARD_HEIGHT = Math.round(CARD_WIDTH / 1.545);
const CARD_WIDTH_CSS = `${CARD_WIDTH_IN}in`;
const CARD_HEIGHT_CSS = `${CARD_HEIGHT_IN.toFixed(3)}in`;
const CARD_PREVIEW_SCALE = 2;
const CARD_PREVIEW_WIDTH_CSS = `${CARD_WIDTH_IN * CARD_PREVIEW_SCALE}in`;
const CARD_PREVIEW_HEIGHT_CSS = `${(CARD_HEIGHT_IN * CARD_PREVIEW_SCALE).toFixed(3)}in`;
const FRONT_SVG_ID = 'gpt-card-front-svg';
const BACK_SVG_ID = 'gpt-card-back-svg';

export default async function PrintPage() {
  const [headerStore, locale, user, t] = await Promise.all([
    headers(),
    getActiveLocale(),
    getCurrentUser(),
    getTranslations('App')
  ]);
  const snapshot = await getCardSnapshot({ locale });
  const isAdmin = user?.role === 'admin';
  const localeLocked = headerStore.get(localeSearchParamHeaderName) === '1';
  const origin = requestOrigin(headerStore);
  const profile = snapshot.profile;
  const name = profile.name?.trim() || 'GPT Card';
  const title = profile.title?.trim() || 'Personal expert card';
  const location = profile.location?.trim();
  const professionalProfile = profile.professionalProfile?.trim();
  const photoUrl = profile.photoUrl ? new URL(profile.photoUrl, origin) : null;
  const siteQrUrl = new URL('/', origin);
  const agentQrUrl = new URL(profile.agentChatUrl ? '/run-agent' : '/', origin);
  const contacts = [
    { type: 'phone', value: profile.contactPhone },
    { type: 'email', value: profile.contactEmail },
    { type: 'telegram', value: profile.contactTelegram }
  ].flatMap((contact) =>
    contact.value?.trim()
      ? [{ type: contact.type, value: contact.value.trim() }]
      : []
  );
  const initial = name.slice(0, 1).toUpperCase();

  return (
    <main className="print-page">
      <style>{printStyles}</style>
      <CardModeToolbar
        activeLocale={snapshot.profile.locale}
        className="print-toolbar"
        isAdmin={isAdmin}
        localeLocked={localeLocked}
        mode="print"
      />
      <PrintDownloadActions
        backSvgId={BACK_SVG_ID}
        cardHeightIn={CARD_HEIGHT_IN}
        cardWidthIn={CARD_WIDTH_IN}
        frontSvgId={FRONT_SVG_ID}
      />
      <section aria-label="Business card front" className="print-card">
        <FrontCardSvg
          contacts={contacts}
          initial={initial}
          location={location}
          name={name}
          photoUrl={photoUrl?.toString() ?? null}
          professionalProfile={professionalProfile}
          qrUrl={siteQrUrl.toString()}
          svgId={FRONT_SVG_ID}
          title={title}
        />
      </section>
      <section aria-label="Business card back" className="print-card">
        <BackCardSvg
          agentTitle={t('agentBackTitle')}
          qrUrl={agentQrUrl.toString()}
          svgId={BACK_SVG_ID}
        />
      </section>
    </main>
  );
}

function FrontCardSvg({
  contacts,
  initial,
  location,
  name,
  photoUrl,
  professionalProfile,
  qrUrl,
  svgId,
  title
}: {
  contacts: Array<{ type: string; value: string }>;
  initial: string;
  location?: string;
  name: string;
  photoUrl: string | null;
  professionalProfile?: string;
  qrUrl: string;
  svgId: string;
  title: string;
}) {
  const titleLayout = createTitleLayout(title);
  const professionalProfileText = professionalProfile?.trim();
  const professionalProfileLayout = professionalProfileText
    ? createProfessionalProfileLayout(professionalProfileText)
    : null;
  const contactLineGap = 38;
  const titleStartY = 216;
  const titleEndY =
    titleStartY + (titleLayout.lines.length - 1) * titleLayout.lineHeight;
  const locationY = titleEndY + 36;
  const contactsY = location ? locationY + 48 : titleEndY + 52;

  return (
    <svg
      aria-label="GPT Card front side"
      id={svgId}
      role="img"
      viewBox={`0 0 ${CARD_WIDTH} ${CARD_HEIGHT}`}
      width={CARD_WIDTH_CSS}
      height={CARD_HEIGHT_CSS}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <clipPath id="avatarClip">
          <circle cx="170" cy="185" r="82" />
        </clipPath>
      </defs>
      <rect width={CARD_WIDTH} height={CARD_HEIGHT} fill="#ffffff" />
      <circle cx="170" cy="185" r="86" fill="#f1f4f8" />
      {photoUrl ? (
        <image
          href={photoUrl}
          x="88"
          y="103"
          width="164"
          height="164"
          preserveAspectRatio="xMidYMid slice"
          clipPath="url(#avatarClip)"
        />
      ) : (
        <text
          x="170"
          y="210"
          textAnchor="middle"
          fontFamily="Inter, Arial, sans-serif"
          fontSize="76"
          fontWeight="700"
          fill="#1f2937"
        >
          {initial}
        </text>
      )}
      <text
        x="300"
        y="162"
        fontFamily="Inter, Arial, sans-serif"
        fontSize="44"
        fontWeight="750"
        fill="#101828"
      >
        {compactSvgText(name, 24)}
      </text>
      <text
        x="302"
        y={titleStartY}
        fontFamily="Inter, Arial, sans-serif"
        fontSize={titleLayout.fontSize}
        fill="#3b4454"
      >
        {titleLayout.lines.map((line, index) => (
          <tspan
            key={`${line}-${index}`}
            x="302"
            dy={index === 0 ? 0 : titleLayout.lineHeight}
          >
            {line}
          </tspan>
        ))}
      </text>
      {location ? (
        <g>
          <LocationIcon x={302} y={locationY - 20} />
          <text
            x="332"
            y={locationY}
            fontFamily="Inter, Arial, sans-serif"
            fontSize="23"
            fill="#667085"
          >
            {compactSvgText(location, 35)}
          </text>
        </g>
      ) : null}
      {contacts.length > 0 ? (
        <g transform={`translate(302 ${contactsY})`}>
          {contacts.slice(0, 3).map((contact, index) => {
            const iconOffset = ['email', 'phone', 'telegram'].includes(
              contact.type
            );

            return (
              <g key={`${contact.type}-${contact.value}`}>
                {contact.type === 'phone' ? (
                  <PhoneIcon x={0} y={index * contactLineGap - 18} />
                ) : null}
                {contact.type === 'email' ? (
                  <EmailIcon x={0} y={index * contactLineGap - 17} />
                ) : null}
                {contact.type === 'telegram' ? (
                  <TelegramIcon x={0} y={index * contactLineGap - 17} />
                ) : null}
                <text
                  x={iconOffset ? 30 : 0}
                  y={index * contactLineGap}
                  fontFamily="Inter, Arial, sans-serif"
                  fontSize="21"
                  fill="#4b5563"
                >
                  {compactSvgText(contact.value, iconOffset ? 44 : 48)}
                </text>
              </g>
            );
          })}
        </g>
      ) : null}
      {professionalProfileLayout ? (
        <text
          x="88"
          y="510"
          fontFamily="Inter, Arial, sans-serif"
          fontSize={professionalProfileLayout.fontSize}
          fill="#374151"
        >
          {professionalProfileLayout.lines.map((line, index) => (
            <tspan
              key={`${line}-${index}`}
              x="88"
              dy={index === 0 ? 0 : professionalProfileLayout.lineHeight}
            >
              {line}
            </tspan>
          ))}
        </text>
      ) : null}
      <g transform="translate(870 56)">
        <rect width="130" height="130" fill="#ffffff" />
        <g transform="translate(13 13)">
          <QRCodeSVG value={qrUrl} size={104} marginSize={0} />
        </g>
      </g>
    </svg>
  );
}

function LocationIcon({ x, y }: { x: number; y: number }) {
  return (
    <g
      transform={`translate(${x} ${y})`}
      fill="none"
      stroke="#667085"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2.4"
    >
      <path d="M10 21s7-6.6 7-12a7 7 0 0 0-14 0c0 5.4 7 12 7 12Z" />
      <circle cx="10" cy="9" r="2.4" />
    </g>
  );
}

function PhoneIcon({ x, y }: { x: number; y: number }) {
  return (
    <g
      transform={`translate(${x} ${y})`}
      fill="none"
      stroke="#4b5563"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2.4"
    >
      <path d="M7.5 4.5 10 10l-2.2 1.7c1.5 3 3.8 5.3 6.8 6.8L16.3 16l5.2 2.4c.6.3.9.9.7 1.5-.5 1.8-2.1 3.1-4 3.1C9 23 1 15 1 5.8c0-1.9 1.3-3.5 3.1-4 .6-.2 1.2.1 1.5.7Z" />
    </g>
  );
}

function EmailIcon({ x, y }: { x: number; y: number }) {
  return (
    <g
      transform={`translate(${x} ${y})`}
      fill="none"
      stroke="#4b5563"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2.4"
    >
      <rect x="2" y="5" width="22" height="16" rx="2" />
      <path d="m3 7 10 8 10-8" />
    </g>
  );
}

function TelegramIcon({ x, y }: { x: number; y: number }) {
  return (
    <g
      transform={`translate(${x} ${y})`}
      fill="none"
      stroke="#4b5563"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2.4"
    >
      <path d="M22 3 2.7 10.6c-1 .4-1 1.8.1 2.1l4.9 1.5 1.9 5.8c.3.9 1.5 1.1 2.1.4l2.7-3.1 5 3.7c.8.6 1.9.1 2.1-.9L24 4.4c.2-1-.8-1.8-2-1.4Z" />
      <path d="m8 14 11-7-8.5 9.7" />
    </g>
  );
}

function BackCardSvg({
  agentTitle,
  qrUrl,
  svgId
}: {
  agentTitle: string;
  qrUrl: string;
  svgId: string;
}) {
  return (
    <svg
      aria-label="GPT Card back side"
      id={svgId}
      role="img"
      viewBox={`0 0 ${CARD_WIDTH} ${CARD_HEIGHT}`}
      width={CARD_WIDTH_CSS}
      height={CARD_HEIGHT_CSS}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width={CARD_WIDTH} height={CARD_HEIGHT} fill="#111827" />
      <text
        x="525"
        y="190"
        textAnchor="middle"
        fontFamily="Inter, Arial, sans-serif"
        fontSize="42"
        fontWeight="750"
        fill="#ffffff"
      >
        {agentTitle}
      </text>
      <g transform="translate(405 245)">
        <rect width="240" height="240" fill="#ffffff" />
        <g transform="translate(24 24)">
          <QRCodeSVG value={qrUrl} size={192} marginSize={0} />
        </g>
      </g>
    </svg>
  );
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

function compactSvgText(value: string, maxLength: number) {
  const compacted = value.replace(/\s+/g, ' ').trim();

  if (compacted.length <= maxLength) {
    return compacted;
  }

  return `${compacted.slice(0, maxLength - 1).trimEnd()}...`;
}

function createTitleLayout(value: string) {
  const lines = value
    .split(/\r?\n/)
    .flatMap((line) => wrapSvgTextLine(line, 44))
    .filter(Boolean);
  const normalizedLines = lines.length > 0 ? lines : ['Personal expert card'];
  const longestLine = normalizedLines.reduce(
    (longest, line) => Math.max(longest, line.length),
    1
  );
  const widthLimitedFont = Math.floor(560 / (longestLine * 0.56));
  const heightLimitedFont = Math.floor(122 / (normalizedLines.length * 1.22));
  const fontSize = Math.max(
    10,
    Math.min(28, widthLimitedFont, heightLimitedFont)
  );

  return {
    fontSize,
    lineHeight: Math.round(fontSize * 1.22),
    lines: normalizedLines
  };
}

function createProfessionalProfileLayout(value: string) {
  const compacted = value.replace(/\s+/g, ' ').trim();
  const maxWidth = 874;
  const maxHeight = 132;
  const minFontSize = 12;

  for (let fontSize = 19; fontSize >= minFontSize; fontSize -= 1) {
    const lineHeight = Math.round(fontSize * 1.35);
    const maxCharacters = Math.max(20, Math.floor(maxWidth / (fontSize * 0.52)));
    const lines = wrapSvgTextLine(compacted, maxCharacters);

    if (lines.length * lineHeight <= maxHeight) {
      return { fontSize, lineHeight, lines };
    }
  }

  const lineHeight = Math.round(minFontSize * 1.35);
  const maxCharacters = Math.max(
    20,
    Math.floor(maxWidth / (minFontSize * 0.52))
  );
  const maxLines = Math.floor(maxHeight / lineHeight);

  return {
    fontSize: minFontSize,
    lineHeight,
    lines: wrapSvgTextLine(compacted, maxCharacters).slice(0, maxLines)
  };
}

function wrapSvgTextLine(value: string, maxLength: number) {
  const words = value.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;

    if (next.length <= maxLength || !current) {
      current = next;
      continue;
    }

    lines.push(current);
    current = word;
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}

const printStyles = `
  .print-page {
    align-items: center;
    background: transparent;
    display: flex;
    flex-direction: column;
    gap: 24px;
    margin: 0 auto;
    max-width: 960px;
    min-height: 100vh;
    padding: 32px 16px;
  }

  .print-toolbar {
    max-width: min(720px, 100%);
    width: 100%;
  }

  .print-card {
    background: white;
    height: ${CARD_PREVIEW_HEIGHT_CSS};
    line-height: 0;
    width: ${CARD_PREVIEW_WIDTH_CSS};
  }

  .print-card > svg {
    height: 100%;
    width: 100%;
  }

  @page {
    margin: 0.25in;
    size: ${CARD_WIDTH_CSS} ${CARD_HEIGHT_CSS};
  }

  @media print {
    body {
      margin: 0;
    }

    .print-page {
      background: white;
      display: block;
      min-height: 0;
      padding: 0;
    }

    .print-toolbar {
      display: none;
    }

    .print-download-actions {
      display: none;
    }

    .print-card {
      box-shadow: none;
      break-after: page;
      height: ${CARD_HEIGHT_CSS};
      page-break-after: always;
      width: ${CARD_WIDTH_CSS};
    }
  }
`;
