import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

import { requireAdmin } from '@/server/auth';
import { jsonErrorFromUnknown, jsonOk } from '@/server/http';
import { updateProfile } from '@/features/card/service';
import { AppError } from '@/shared/result';

const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

export async function POST(request: Request) {
  try {
    const user = await requireAdmin();
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      throw new AppError('validation_error', 'Photo file is required', 400);
    }

    if (!allowedTypes.has(file.type)) {
      throw new AppError('validation_error', 'Unsupported image type', 400);
    }

    const extension = extensionForType(file.type);
    const fileName = `${Date.now()}-${randomBytes(8).toString('hex')}.${extension}`;
    const storageKey = `uploads/${fileName}`;
    const uploadDir = join(process.cwd(), 'public', 'uploads');
    const filePath = join(uploadDir, fileName);

    await mkdir(uploadDir, { recursive: true });
    await writeFile(filePath, Buffer.from(await file.arrayBuffer()));

    const photoUrl = `/${storageKey}`;
    await updateProfile({ photoUrl, photoStorageKey: storageKey }, user);

    return jsonOk({ photoUrl, photoStorageKey: storageKey });
  } catch (error) {
    return jsonErrorFromUnknown(error);
  }
}

function extensionForType(type: string) {
  if (type === 'image/png') {
    return 'png';
  }

  if (type === 'image/webp') {
    return 'webp';
  }

  return 'jpg';
}
