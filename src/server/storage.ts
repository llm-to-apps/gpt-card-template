import 'server-only';

import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client
} from '@aws-sdk/client-s3';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, normalize } from 'node:path';
import { Readable } from 'node:stream';

import {
  s3AccessKeyId,
  s3Bucket,
  s3Endpoint,
  s3ForcePathStyle,
  s3Region,
  s3SecretAccessKey,
  storageBackend
} from '@/server/env';
import { AppError } from '@/shared/result';

type StoredObject = {
  body: Buffer;
  contentType: string;
};

let s3Client: S3Client | null = null;

export function storageUrl(key: string) {
  assertSafeStorageKey(key);
  return `/api/storage/${key}`;
}

export async function putStorageObject({
  body,
  contentType,
  key
}: {
  body: Buffer;
  contentType: string;
  key: string;
}) {
  assertSafeStorageKey(key);

  if (storageBackend() === 's3') {
    await getS3Client().send(
      new PutObjectCommand({
        Body: body,
        Bucket: s3Bucket(),
        ContentType: contentType,
        Key: key
      })
    );
    return;
  }

  const filePath = diskPathForKey(key);
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, body);
}

export async function getStorageObject(key: string): Promise<StoredObject> {
  assertSafeStorageKey(key);

  if (storageBackend() === 's3') {
    const response = await getS3Client().send(
      new GetObjectCommand({
        Bucket: s3Bucket(),
        Key: key
      })
    );

    if (!response.Body) {
      throw new AppError('not_found', 'File not found', 404);
    }

    return {
      body: await streamToBuffer(response.Body),
      contentType: response.ContentType ?? contentTypeForKey(key)
    };
  }

  try {
    return {
      body: await readFile(diskPathForKey(key)),
      contentType: contentTypeForKey(key)
    };
  } catch {
    throw new AppError('not_found', 'File not found', 404);
  }
}

function getS3Client() {
  s3Client ??= new S3Client({
    credentials: {
      accessKeyId: s3AccessKeyId(),
      secretAccessKey: s3SecretAccessKey()
    },
    endpoint: s3Endpoint(),
    forcePathStyle: s3ForcePathStyle(),
    region: s3Region()
  });

  return s3Client;
}

function diskPathForKey(key: string) {
  return join(process.cwd(), 'public', normalize(key));
}

function assertSafeStorageKey(key: string) {
  const normalized = normalize(key);

  if (
    normalized !== key ||
    key.startsWith('/') ||
    key.includes('..') ||
    !key.startsWith('uploads/')
  ) {
    throw new AppError('validation_error', 'Invalid storage key', 400);
  }
}

function contentTypeForKey(key: string) {
  if (key.endsWith('.webp')) {
    return 'image/webp';
  }

  if (key.endsWith('.png')) {
    return 'image/png';
  }

  if (key.endsWith('.jpg') || key.endsWith('.jpeg')) {
    return 'image/jpeg';
  }

  return 'application/octet-stream';
}

async function streamToBuffer(body: unknown) {
  if (body instanceof Readable) {
    const chunks: Buffer[] = [];

    for await (const chunk of body) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    return Buffer.concat(chunks);
  }

  if (body instanceof Blob) {
    return Buffer.from(await body.arrayBuffer());
  }

  if (body instanceof Uint8Array) {
    return Buffer.from(body);
  }

  throw new AppError('storage_error', 'Unsupported storage response body', 500);
}
