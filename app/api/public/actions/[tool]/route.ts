import { NextResponse } from 'next/server';

import { runPublicTool } from '@/mcp/tools';
import { appErrorFromUnknown } from '@/shared/result';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tool: string }> }
) {
  const { tool } = await params;
  const args = await readJsonBody(request);

  try {
    const result = await runPublicTool(tool, args);

    return NextResponse.json(result);
  } catch (error) {
    const appError = appErrorFromUnknown(error);

    return NextResponse.json(
      {
        error: {
          code: appError.code,
          message: appError.message,
          details: appError.details
        }
      },
      { status: appError.status }
    );
  }
}

async function readJsonBody(request: Request) {
  const text = await request.text();

  if (!text.trim()) {
    return {};
  }

  return JSON.parse(text) as unknown;
}
