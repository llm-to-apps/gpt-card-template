'use client';

import { Badge, Box, Group, Loader, SegmentedControl } from '@mantine/core';
import { Eye, Pencil, Printer } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { LocaleSwitcher } from './locale-switcher';

export type CardMode = 'view' | 'edit' | 'print';

export function CardModeToolbar({
  activeLocale,
  className,
  isAdmin,
  localeLocked,
  mode,
  onModeChange,
  saving = false
}: {
  activeLocale: string;
  className?: string;
  isAdmin: boolean;
  localeLocked: boolean;
  mode: CardMode;
  onModeChange?: (mode: CardMode) => Promise<void> | void;
  saving?: boolean;
}) {
  const router = useRouter();
  const t = useTranslations('App');

  async function changeMode(value: string) {
    const nextMode = value as CardMode;

    if (onModeChange) {
      await onModeChange(nextMode);
      return;
    }

    if (nextMode === 'view') {
      router.push('/');
      return;
    }

    if (nextMode === 'edit') {
      router.push('/admin');
      return;
    }

    router.push('/print');
  }

  return (
    <Box className={className} style={{ minHeight: 36, position: 'relative' }}>
      {isAdmin ? (
        <Group justify="center">
          <SegmentedControl
            value={mode}
            onChange={changeMode}
            data={[
              {
                value: 'view',
                label: (
                  <Group gap={4} justify="center" wrap="nowrap">
                    <Eye size={14} />
                    <span>{t('view')}</span>
                  </Group>
                )
              },
              {
                value: 'edit',
                label: (
                  <Group gap={4} justify="center" wrap="nowrap">
                    <Pencil size={14} />
                    <span>{t('edit')}</span>
                  </Group>
                )
              },
              {
                value: 'print',
                label: (
                  <Group gap={4} justify="center" wrap="nowrap">
                    <Printer size={14} />
                    <span>{t('print')}</span>
                  </Group>
                )
              }
            ]}
          />
        </Group>
      ) : null}
      <Group
        gap="xs"
        wrap="nowrap"
        style={{
          position: 'absolute',
          right: 0,
          top: 0
        }}
      >
        {isAdmin && saving ? (
          <Loader aria-label={t('saving')} size="sm" type="dots" />
        ) : null}
        {isAdmin && mode === 'edit' ? (
          <Badge size="sm" variant="light">
            {activeLocale.toUpperCase()}
          </Badge>
        ) : null}
        {!localeLocked ? <LocaleSwitcher /> : null}
      </Group>
    </Box>
  );
}
