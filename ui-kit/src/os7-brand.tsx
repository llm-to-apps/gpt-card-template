'use client';

import { Box, Image } from '@mantine/core';

export const os7Brand = {
  logoAlt: 'OS7',
  logoSrc: '/brand/os7-logo.svg',
  siteHref: 'https://www.os7.dev'
} as const;

type Os7LogoProps = {
  h?: number | string;
  href?: string;
  label?: string;
  target?: '_blank' | '_self';
  w?: number | string;
};

export function Os7Logo({
  h,
  href,
  label = os7Brand.logoAlt,
  target,
  w
}: Os7LogoProps) {
  const logo = <Image alt={label} h={h} src={os7Brand.logoSrc} w={w} />;

  if (!href) {
    return logo;
  }

  return (
    <Box
      aria-label={label}
      component="a"
      href={href}
      rel={target === '_blank' ? 'noreferrer' : undefined}
      target={target}
    >
      {logo}
    </Box>
  );
}
