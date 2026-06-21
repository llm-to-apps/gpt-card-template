import { Button, Container, Stack, Text, Title } from '@mantine/core';

export default function NotFound() {
  return (
    <Container py="xl" size="sm">
      <Stack>
        <Title order={1}>Not found</Title>
        <Text c="dimmed">This page does not exist.</Text>
        <Button component="a" href="/">
          Open card
        </Button>
      </Stack>
    </Container>
  );
}
