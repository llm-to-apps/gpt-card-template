'use client';

import type { ElementType, ReactNode } from 'react';
import { Breadcrumbs, Button, Text } from '@mantine/core';

export type Os7BreadcrumbItem = {
  href?: string;
  label: string;
  leftSection?: ReactNode;
  onClick?: () => void;
};

export type Os7BreadcrumbsProps = {
  items: Os7BreadcrumbItem[];
  linkComponent?: ElementType;
  separator?: ReactNode;
};

export function Os7Breadcrumbs({
  items,
  linkComponent,
  separator
}: Os7BreadcrumbsProps) {
  return (
    <Breadcrumbs separator={separator}>
      {items.map((item, index) => {
        const isCurrent =
          index === items.length - 1 || (!item.href && !item.onClick);
        const key = `${item.label}-${index}`;

        if (isCurrent) {
          return (
            <Os7BreadcrumbLabel key={key}>{item.label}</Os7BreadcrumbLabel>
          );
        }

        if (item.href && linkComponent) {
          return (
            <Button
              key={key}
              component={linkComponent as unknown as 'a'}
              href={item.href}
              leftSection={item.leftSection}
              size="compact-sm"
              variant="subtle"
            >
              {item.label}
            </Button>
          );
        }

        if (item.href) {
          return (
            <Button
              key={key}
              component="a"
              href={item.href}
              leftSection={item.leftSection}
              size="compact-sm"
              variant="subtle"
            >
              {item.label}
            </Button>
          );
        }

        return (
          <Button
            key={key}
            leftSection={item.leftSection}
            onClick={item.onClick}
            size="compact-sm"
            type="button"
            variant="subtle"
          >
            {item.label}
          </Button>
        );
      })}
    </Breadcrumbs>
  );
}

export function Os7BreadcrumbLabel({ children }: { children: string }) {
  return (
    <Text
      c="dimmed"
      component="span"
      style={{
        display: 'block',
        maxWidth: 'min(52vw, 520px)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }}
    >
      {children}
    </Text>
  );
}
