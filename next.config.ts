import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from 'next';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  allowedDevOrigins: ['127.0.0.1', '*.localhost', '*.os7.dev'],
  poweredByHeader: false
};

export default withNextIntl(nextConfig);
