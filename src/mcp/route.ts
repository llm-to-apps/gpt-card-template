import 'server-only';

import { NextResponse } from 'next/server';

import { appErrorFromUnknown } from '@/shared/result';

type Runner = (name: string, args: unknown) => Promise<unknown>;

export async function handleMcpRequest(request: Request, runner: Runner) {
  const body = await request.json();
  const id = body.id ?? null;
  const toolName = body.tool ?? body.name ?? body.params?.name ?? body.method;
  const args =
    body.arguments ?? body.args ?? body.params?.arguments ?? body.params ?? {};

  if (typeof toolName !== 'string') {
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32600,
          message: 'Tool name is required'
        }
      },
      { status: 400 }
    );
  }

  try {
    const result = await runner(toolName, args);
    return NextResponse.json({
      jsonrpc: '2.0',
      id,
      result
    });
  } catch (error) {
    const appError = appErrorFromUnknown(error);
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        id,
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
