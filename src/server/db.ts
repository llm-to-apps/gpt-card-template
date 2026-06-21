import 'server-only';

import { PrismaClient } from '@prisma/client';

import { isProductionEnv } from '@/server/env';

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (!isProductionEnv()) {
  globalForPrisma.prisma = prisma;
}
