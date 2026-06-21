import { Box, Group, Text } from '@mantine/core';
import type { ReactNode } from 'react';

type ModalTitleProps = {
  children: ReactNode;
  icon?: ReactNode;
};

export function ModalTitle({ children, icon }: ModalTitleProps) {
  return (
    <Group align="center" gap="xs" wrap="nowrap">
      {icon ? (
        <Box component="span" style={{ display: 'inline-flex', flexShrink: 0 }}>
          {icon}
        </Box>
      ) : null}
      <Text fw={700} lh={1.2} size="lg">
        {children}
      </Text>
    </Group>
  );
}
