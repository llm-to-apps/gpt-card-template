import { jsonOk } from '@/server/http';

export async function GET() {
  return jsonOk({ service: 'gpt-card-template' });
}
