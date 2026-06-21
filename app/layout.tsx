import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import './globals.css';

import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';

import { AppMantineProvider } from './mantine-provider';

export const metadata: Metadata = {
  title: 'GPT Card',
  description: 'Personal website card with consultation booking.'
};

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider messages={messages}>
          <AppMantineProvider>{children}</AppMantineProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
