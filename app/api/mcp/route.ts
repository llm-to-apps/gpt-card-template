import { NextRequest, NextResponse } from 'next/server';

import type { CurrentUser } from '@/server/auth';
import {
  devMcpToken,
  isLocalAuthMode,
  os7RequestHostHeader,
  projectId,
  projectTokenIntrospectionUrl
} from '@/server/env';
import { adminTools, runAdminTool } from '@/mcp/tools';
import { clientRateLimitKey } from '@/server/request-context';
import { checkRateLimit } from '@/server/rate-limit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type JsonRpcRequest = {
  arguments?: unknown;
  args?: unknown;
  id?: number | string | null;
  method?: string;
  params?: {
    arguments?: unknown;
    name?: string;
  };
  tool?: string;
};

const mcpTools = adminTools.map((name) => ({
  description: adminToolDescription(name),
  inputSchema: {
    additionalProperties: true,
    properties: {},
    type: 'object'
  },
  name
}));

export async function GET(request: NextRequest) {
  const user = await authorizeMcpRequest(request);

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const limitResponse = enforceMcpRateLimit(request);
  if (limitResponse) {
    return limitResponse;
  }

  return NextResponse.json({ tools: mcpTools });
}

export async function POST(request: NextRequest) {
  const user = await authorizeMcpRequest(request);

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const limitResponse = enforceMcpRateLimit(request);
  if (limitResponse) {
    return limitResponse;
  }

  const body = (await request.json()) as JsonRpcRequest;
  const id = body.id ?? null;

  if (body.method === 'tools/list') {
    return jsonRpcResult(id, { tools: mcpTools });
  }

  const toolName =
    body.params?.name ??
    body.tool ??
    (typeof body.method === 'string' ? body.method : undefined);
  const args = body.params?.arguments ?? body.arguments ?? body.args ?? {};

  if (body.method === 'tools/call' || body.tool || toolName) {
    try {
      const result = await runAdminTool(toolName ?? '', args, user);

      return jsonRpcResult(id, {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }
        ],
        structuredContent: result
      });
    } catch (error) {
      return jsonRpcError(
        id,
        -32000,
        error instanceof Error ? error.message : 'Tool failed'
      );
    }
  }

  return jsonRpcError(id, -32601, 'Method not found');
}

function enforceMcpRateLimit(request: NextRequest) {
  const rateLimit = checkRateLimit({
    key: `mcp:${clientRateLimitKey(request, 'anonymous')}`,
    limit: 240,
    windowMs: 60_000
  });

  if (rateLimit.ok) {
    return null;
  }

  return NextResponse.json(
    {
      error: 'Too many requests'
    },
    { status: 429 }
  );
}

async function authorizeMcpRequest(
  request: NextRequest
): Promise<CurrentUser | null> {
  const token = readBearerToken(request);

  if (!token) {
    return null;
  }

  if (isLocalAuthMode()) {
    return devMcpToken() === token ? mcpUser('local-mcp-agent', 'admin') : null;
  }

  const response = await fetch(projectTokenIntrospectionUrl(), {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      ...os7RequestHostHeader()
    }
  }).catch(() => null);

  if (!response?.ok) {
    return null;
  }

  const payload = (await response.json().catch(() => null)) as {
    active?: boolean;
    projectId?: string;
    role?: string;
    sub?: string;
  } | null;

  if (
    payload?.active !== true ||
    payload.projectId !== projectId() ||
    (payload.role !== 'admin' && payload.role !== 'editor')
  ) {
    return null;
  }

  return mcpUser(payload.sub ?? 'project-mcp-agent', payload.role);
}

function readBearerToken(request: NextRequest) {
  const authorization = request.headers.get('authorization') ?? '';
  const [scheme, token] = authorization.split(/\s+/, 2);

  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return null;
  }

  return token;
}

function mcpUser(id: string, role: string): CurrentUser {
  return {
    email: `${id}@mcp.local`,
    id,
    name: 'Project MCP Agent',
    role
  };
}

function jsonRpcResult(id: number | string | null, result: unknown) {
  return NextResponse.json({
    id,
    jsonrpc: '2.0',
    result
  });
}

function jsonRpcError(
  id: number | string | null,
  code: number,
  message: string
) {
  return NextResponse.json(
    {
      error: {
        code,
        message
      },
      id,
      jsonrpc: '2.0'
    },
    { status: code === -32601 ? 404 : 400 }
  );
}

function adminToolDescription(tool: (typeof adminTools)[number]) {
  switch (tool) {
    case 'getCard':
      return 'Get the full GPT Card admin snapshot, including profile, availability, exceptions, and consultation requests.';
    case 'updateProfile':
      return 'Update GPT Card profile fields. Pass locale to update localized profile content for a specific language.';
    case 'deleteProfileTranslation':
      return 'Delete the profile translation for the selected locale when another translation remains.';
    case 'listAvailabilitySlots':
      return 'List weekly consultation availability slots.';
    case 'addAvailabilitySlot':
      return 'Add a consultation availability slot. This mutation refreshes the GPT Card UI.';
    case 'updateAvailabilitySlot':
      return 'Update one consultation availability slot by id. This mutation refreshes the GPT Card UI.';
    case 'removeAvailabilitySlot':
      return 'Delete one consultation availability slot by id. This mutation refreshes the GPT Card UI.';
    case 'listExceptions':
      return 'List exception dates when booking is unavailable.';
    case 'addException':
      return 'Add an exception date when booking is unavailable. This mutation refreshes the GPT Card UI.';
    case 'removeException':
      return 'Delete an exception date by id. This mutation refreshes the GPT Card UI.';
    case 'listConsultationRequests':
      return 'List consultation booking requests.';
    case 'updateConsultationRequest':
      return 'Update a consultation request by id.';
    case 'updateConsultationRequestStatus':
      return 'Update consultation request status by id.';
  }
}
