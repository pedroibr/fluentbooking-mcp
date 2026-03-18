import type { ResolvedEnv } from "./env";
import type { FluentBookingClient } from "./fluentbooking-client";

export interface JsonSchema {
  type?: string;
  description?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  additionalProperties?: boolean;
  items?: JsonSchema;
  enum?: string[];
}

export interface ToolAnnotations {
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
  openWorldHint?: boolean;
}

export interface ToolResult {
  content: Array<{
    type: "text";
    text: string;
  }>;
  isError?: boolean;
}

export interface ToolContext {
  env: ResolvedEnv;
  client: FluentBookingClient;
  request: Request;
}

export type ToolArguments = Record<string, unknown>;

export type ToolHandler = (
  context: ToolContext,
  args: ToolArguments
) => Promise<ToolResult>;

export interface ToolDefinition {
  name: string;
  description: string;
  module: string;
  access: "read" | "write" | "delete";
  visibility?: "public" | "internal";
  status: "planned" | "ready";
  upstreamHint?: string;
  inputSchema: JsonSchema;
  handler: ToolHandler;
}

export interface InitializeParams {
  protocolVersion?: string;
}

export interface JsonRpcRequest {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown> & Partial<InitializeParams>;
}
