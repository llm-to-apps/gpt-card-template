import { randomBytes } from 'node:crypto';
import sharp from 'sharp';

import { requireAdmin } from '@/server/auth';
import { jsonErrorFromUnknown, jsonOk } from '@/server/http';
import { updateProfile } from '@/features/card/service';
import { getActiveLocale } from '@/i18n/server';
import { putStorageObject, storageUrl } from '@/server/storage';
import { AppError } from '@/shared/result';

const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const maxPhotoBytes = 10 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const user = await requireAdmin();
    const locale = await getActiveLocale();
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      throw new AppError('validation_error', 'Photo file is required', 400);
    }

    if (!allowedTypes.has(file.type)) {
      throw new AppError('validation_error', 'Unsupported image type', 400);
    }

    if (file.size > maxPhotoBytes) {
      throw new AppError('validation_error', 'Photo file is too large', 400);
    }

    const input = Buffer.from(await file.arrayBuffer());
    const output = await sharp(input)
      .rotate()
      .resize(400, 400, {
        fit: 'cover',
        position: 'centre'
      })
      .webp({ quality: 88 })
      .toBuffer();
    const fileName = `${Date.now()}-${randomBytes(8).toString('hex')}.webp`;
    const storageKey = `uploads/${fileName}`;
    await putStorageObject({
      body: output,
      contentType: 'image/webp',
      key: storageKey
    });

    const photoUrl = storageUrl(storageKey);
    await updateProfile(
      { photoUrl, photoStorageKey: storageKey },
      user,
      locale
    );

    return jsonOk({ photoUrl, photoStorageKey: storageKey });
  } catch (error) {
    return jsonErrorFromUnknown(error);
  }
}
