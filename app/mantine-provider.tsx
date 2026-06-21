'use client';

import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';

import { os7Theme } from '@os7/ui-kit/os7-theme';

export function AppMantineProvider({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <MantineProvider theme={os7Theme}>
      <Notifications position="top-right" />
      {children}
    </MantineProvider>
  );
}
