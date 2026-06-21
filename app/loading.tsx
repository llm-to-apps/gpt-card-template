import { Container, Skeleton, Stack } from '@mantine/core';

export default function Loading() {
  return (
    <Container py="xl" size="lg">
      <Stack>
        <Skeleton h={64} radius="md" />
        <Skeleton h={280} radius="md" />
        <Skeleton h={180} radius="md" />
      </Stack>
    </Container>
  );
}
