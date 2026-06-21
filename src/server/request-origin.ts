import { headers } from 'next/headers';

export async function publicOrigin() {
  const headerStore = await headers();
  const host = headerStore.get('x-forwarded-host') ?? headerStore.get('host');

  if (!host) {
    throw new Error('Missing request host');
  }

  const forwardedProto = headerStore.get('x-forwarded-proto');
  const proto = publicProtocol(host, forwardedProto);

  return `${proto}://${host}`;
}

export function publicProtocol(host: string, forwardedProto: string | null) {
  const normalizedHost = normalizeHost(host);

  if (
    normalizedHost === 'localhost' ||
    normalizedHost.endsWith('.localhost') ||
    normalizedHost === '127.0.0.1' ||
    normalizedHost === '::1'
  ) {
    return 'http';
  }

  if (forwardedProto === 'https' || normalizedHost.endsWith('.os7.dev')) {
    return 'https';
  }

  return forwardedProto ?? 'http';
}

function normalizeHost(host: string) {
  const lowerHost = host.toLowerCase();

  if (lowerHost.startsWith('[')) {
    return lowerHost.slice(1, lowerHost.indexOf(']'));
  }

  return lowerHost.split(':')[0] ?? lowerHost;
}
