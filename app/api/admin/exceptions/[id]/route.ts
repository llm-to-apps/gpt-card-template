import { requireAdmin } from '@/server/auth';
import { jsonErrorFromUnknown, jsonOk } from '@/server/http';
import { deleteException } from '@/features/card/service';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAdmin();
    const { id } = await params;
    const result = await deleteException(id, user);

    return jsonOk(result);
  } catch (error) {
    return jsonErrorFromUnknown(error);
  }
}
