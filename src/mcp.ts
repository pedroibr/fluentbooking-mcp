import { inspectEnv, resolveEnv, type Env } from "./env";
import { FluentBookingClient } from "./fluentbooking-client";
import { getReadyToolRegistry, getToolByName, getToolRegistry } from "./tools";
import type { JsonRpcRequest, ToolAnnotations, ToolDefinition } from "./types";

const DEFAULT_PROTOCOL_VERSION = "2024-11-05";

export async function handleMcpRequest(request: Request, env: Env): Promise<Response> {
  let body: JsonRpcRequest;

  try {
    body = (await request.json()) as JsonRpcRequest;
  } catch {
    return jsonRpcError(null, -32700, "Invalid JSON");
  }

  const id = body.id ?? null;
  const method = body.method;

  if (!method) {
    return jsonRpcError(id, -32600, "Method ausente");
  }

  if (method === "initialize") {
    const requestedProtocolVersion =
      typeof body.params?.protocolVersion === "string" && body.params.protocolVersion.trim()
        ? body.params.protocolVersion.trim()
        : undefined;

    return jsonRpcResult(id, {
      protocolVersion: requestedProtocolVersion || DEFAULT_PROTOCOL_VERSION,
      capabilities: {
        tools: {},
      },
      serverInfo: {
        name: "fluentbooking-mcp",
        version: "0.1.0",
      },
      instructions:
        "Use as tools listadas para consultar eventos do FluentBooking, criar bookings e acessar configuracoes relacionadas.",
    });
  }

  if (method === "tools/list") {
    return jsonRpcResult(id, {
      tools: getReadyToolRegistry().map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
        annotations: buildToolAnnotations(tool),
      })),
    });
  }

  if (method === "tools/call") {
    return handleToolCall(id, body.params, env, request);
  }

  return jsonRpcError(id, -32601, `Method nao encontrado: ${method}`);
}

export function buildHealthPayload(env: Env) {
  return {
    ok: true,
    service: "fluentbooking-mcp",
    mcp_endpoint: "/mcp",
    tool_count: getToolRegistry().length,
    ready_tool_count: getReadyToolRegistry().length,
    modules: Array.from(new Set(getToolRegistry().map((tool) => tool.module))),
    env: inspectEnv(env),
  };
}

async function handleToolCall(
  id: string | number | null,
  params: Record<string, unknown> | undefined,
  rawEnv: Env,
  request: Request
): Promise<Response> {
  const toolName = typeof params?.name === "string" ? params.name : "";
  const args = isPlainObject(params?.arguments) ? params.arguments : {};

  if (!toolName) {
    return jsonRpcError(id, -32602, "params.name e obrigatorio");
  }

  const tool = getToolByName(toolName);
  if (!tool) {
    return jsonRpcError(id, -32601, `Tool nao encontrada: ${toolName}`);
  }

  let env;
  try {
    env = resolveEnv(rawEnv);
  } catch (error) {
    return jsonRpcError(
      id,
      -32000,
      error instanceof Error ? error.message : "Falha ao validar variaveis"
    );
  }

  if (tool.access === "write" && !env.allowWrites) {
    return jsonRpcError(id, -32000, "Escrita desabilitada. Defina ALLOW_WRITES=true.");
  }

  if (tool.access === "delete" && !env.allowDeletes) {
    return jsonRpcError(id, -32000, "Delete desabilitado. Defina ALLOW_DELETES=true.");
  }

  try {
    const result = await tool.handler(
      {
        env,
        client: new FluentBookingClient(env),
        request,
      },
      args
    );

    return jsonRpcResult(id, result);
  } catch (error) {
    return jsonRpcError(
      id,
      -32000,
      error instanceof Error ? error.message : "Erro interno"
    );
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function buildToolAnnotations(tool: ToolDefinition): ToolAnnotations {
  const isRead = tool.access === "read";

  return {
    readOnlyHint: isRead,
    destructiveHint: !isRead,
    idempotentHint: isRead,
    openWorldHint: !isRead,
  };
}

function jsonRpcResult(id: string | number | null, result: unknown): Response {
  return Response.json({
    jsonrpc: "2.0",
    id,
    result,
  });
}

function jsonRpcError(
  id: string | number | null,
  code: number,
  message: string
): Response {
  return Response.json(
    {
      jsonrpc: "2.0",
      id,
      error: { code, message },
    },
    { status: 200 }
  );
}
