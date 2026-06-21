import { copyFileSync } from 'node:fs';
import { join } from 'node:path';

const schemaPath = join(process.cwd(), 'prisma', 'schema.prisma');
const generatedPath = join(process.cwd(), 'prisma', 'schema.generated.prisma');

copyFileSync(schemaPath, generatedPath);
