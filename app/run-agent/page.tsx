import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { ArrowLeft, Bot } from 'lucide-react';

import { getCardSnapshot } from '@/features/card/service';
import { getActiveLocale } from '@/i18n/server';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Agent - GPT Card'
};

export default async function RunAgentPage() {
  const [locale, t] = await Promise.all([
    getActiveLocale(),
    getTranslations('RunAgent')
  ]);
  const snapshot = await getCardSnapshot({ locale });
  const profile = snapshot.profile;
  const agentChatUrl = parseAgentChatUrl(profile.agentChatUrl);
  const name = profile.name?.trim() || 'GPT Card';
  const title = profile.title?.trim();
  const initial = name.slice(0, 1).toUpperCase();

  return (
    <main className="run-agent-page">
      <style>{runAgentStyles}</style>
      <section className="run-agent-panel" aria-label={t('pageLabel')}>
        {profile.photoUrl ? (
          <Image
            className="run-agent-avatar"
            src={profile.photoUrl}
            alt=""
            width={96}
            height={96}
            unoptimized
          />
        ) : (
          <div className="run-agent-avatar run-agent-avatar-fallback">
            {initial}
          </div>
        )}
        <p className="run-agent-eyebrow">{name}</p>
        {title ? <p className="run-agent-title">{title}</p> : null}
        {!agentChatUrl ? (
          <p className="run-agent-copy">{t('missingDescription')}</p>
        ) : null}
        <div className="run-agent-actions">
          {agentChatUrl ? (
            <a className="run-agent-primary" href={agentChatUrl}>
              <Bot size={18} />
              <span>{t('openAgent')}</span>
            </a>
          ) : null}
        </div>
      </section>
      <footer className="run-agent-footer">
        <Link className="run-agent-secondary" href="/">
          <ArrowLeft size={18} />
          <span>{t('backToCard')}</span>
        </Link>
      </footer>
    </main>
  );
}

function parseAgentChatUrl(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value.trim());

    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

const runAgentStyles = `
  .run-agent-page {
    align-items: center;
    background: #f6f8fb;
    color: #111827;
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    padding: 24px;
  }

  .run-agent-panel {
    align-items: center;
    display: flex;
    flex: 1;
    flex-direction: column;
    justify-content: center;
    margin: 0 auto;
    max-width: 440px;
    text-align: center;
    width: 100%;
  }

  .run-agent-avatar {
    align-items: center;
    background: #111827;
    border-radius: 999px;
    color: #ffffff;
    display: inline-flex;
    height: 96px;
    justify-content: center;
    margin-bottom: 24px;
    object-fit: cover;
    width: 96px;
  }

  .run-agent-avatar-fallback {
    font-size: 40px;
    font-weight: 750;
  }

  .run-agent-eyebrow {
    color: #111827;
    font-size: 22px;
    font-weight: 750;
    line-height: 1.2;
    margin: 0;
  }

  .run-agent-title {
    color: #667085;
    font-size: 16px;
    line-height: 1.45;
    margin: 8px auto 0;
    max-width: 32ch;
  }

  .run-agent-copy {
    color: #475467;
    font-size: 16px;
    line-height: 1.55;
    margin: 14px auto 26px;
    max-width: 36ch;
  }

  .run-agent-actions {
    align-items: center;
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-top: 34px;
  }

  .run-agent-footer {
    align-items: center;
    display: flex;
    justify-content: center;
    width: 100%;
  }

  .run-agent-primary,
  .run-agent-secondary {
    align-items: center;
    border-radius: 10px;
    display: inline-flex;
    font-size: 16px;
    font-weight: 700;
    gap: 10px;
    justify-content: center;
    max-width: 100%;
    min-height: 48px;
    padding: 0 22px;
    text-decoration: none;
    white-space: nowrap;
    width: fit-content;
  }

  .run-agent-primary {
    background: #111827;
    color: #ffffff;
  }

  .run-agent-secondary {
    background: transparent;
    color: #344054;
  }
`;
