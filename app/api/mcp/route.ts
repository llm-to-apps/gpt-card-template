import { handleMcpRequest } from '@/mcp/route';
import { runAdminTool } from '@/mcp/tools';

export async function POST(request: Request) {
  return handleMcpRequest(request, runAdminTool);
}
