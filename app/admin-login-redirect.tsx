'use client';

import { Container, Loader, Stack } from '@mantine/core';
import { useEffect } from 'react';

export function AdminLoginRedirect({ nextPath }: { nextPath: string }) {
  useEffect(() => {
    window.location.replace(`/auth/login?next=${encodeURIComponent(nextPath)}`);
  }, [nextPath]);

  return (
    <Container py="xl" size="sm">
      <Stack align="center">
        <Loader size="sm" />
      </Stack>
    </Container>
  );
}
