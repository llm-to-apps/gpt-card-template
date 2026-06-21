import { getStorageObject } from '@/server/storage';
import { jsonErrorFromUnknown } from '@/server/http';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string[] }> }
) {
  try {
    const { key } = await params;
    const object = await getStorageObject(key.join('/'));

    return new Response(new Uint8Array(object.body), {
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Type': object.contentType
      }
    });
  } catch (error) {
    return jsonErrorFromUnknown(error);
  }
}
