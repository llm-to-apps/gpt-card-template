'use client';

import { Alert, Button, Container, Stack } from '@mantine/core';

export default function Error({
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <Container py="xl" size="sm">
      <Stack>
        <Alert color="red" title="Something went wrong">
          Please try again.
        </Alert>
        <Button onClick={reset}>Retry</Button>
      </Stack>
    </Container>
  );
}
