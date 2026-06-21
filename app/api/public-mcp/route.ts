import { handleMcpRequest } from '@/mcp/route';
import { runPublicTool } from '@/mcp/tools';

export async function POST(request: Request) {
  return handleMcpRequest(request, runPublicTool);
}
