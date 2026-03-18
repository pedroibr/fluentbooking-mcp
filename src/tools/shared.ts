import type { ToolArguments, ToolDefinition, ToolResult } from "../types";

interface PlannedToolOptions {
  name: string;
  description: string;
  module: string;
  access: "read" | "write" | "delete";
  inputSchema: ToolDefinition["inputSchema"];
  upstreamHint?: string;
}

export function plannedTool(options: PlannedToolOptions): ToolDefinition {
  return {
    ...options,
    status: "planned",
    handler: async (_context, args) => plannedResult(options, args),
  };
}

export function textToolResult(payload: unknown, isError = false): ToolResult {
  return {
    isError,
    content: [
      {
        type: "text",
        text: JSON.stringify(payload, null, 2),
      },
    ],
  };
}

export function requiredStringArg(args: ToolArguments, key: string): string {
  const value = args[key];

  if (typeof value !== "string") {
    throw new Error(`${key} e obrigatorio e precisa ser texto`);
  }

  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${key} e obrigatorio e precisa ser texto`);
  }

  return normalized;
}

export function requiredNumberArg(args: ToolArguments, key: string): number {
  const value = args[key];

  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${key} e obrigatorio e precisa ser numerico`);
  }

  return value;
}

export function optionalNumberArg(args: ToolArguments, key: string): number | undefined {
  const value = args[key];

  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${key} precisa ser numerico`);
  }

  return value;
}

export function optionalStringArg(args: ToolArguments, key: string): string | undefined {
  const value = args[key];

  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new Error(`${key} precisa ser texto`);
  }

  const normalized = value.trim();
  return normalized ? normalized : undefined;
}

export function optionalBooleanArg(args: ToolArguments, key: string): boolean | undefined {
  const value = args[key];

  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "boolean") {
    throw new Error(`${key} precisa ser booleano`);
  }

  return value;
}

export function optionalArrayArg<T = unknown>(args: ToolArguments, key: string): T[] | undefined {
  const value = args[key];

  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    throw new Error(`${key} precisa ser um array`);
  }

  return value as T[];
}

export function optionalObjectArg(
  args: ToolArguments,
  key: string
): Record<string, unknown> | undefined {
  const value = args[key];

  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${key} precisa ser um objeto`);
  }

  return value as Record<string, unknown>;
}

export function requiredObjectArg(args: ToolArguments, key: string): Record<string, unknown> {
  const value = args[key];

  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${key} e obrigatorio e precisa ser um objeto`);
  }

  return value as Record<string, unknown>;
}

function plannedResult(options: PlannedToolOptions, args: ToolArguments): ToolResult {
  return {
    isError: true,
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            ok: false,
            tool: options.name,
            module: options.module,
            status: "planned",
            access: options.access,
            upstream_hint: options.upstreamHint || null,
            received_arguments: args,
            message: "Tool registrada no esqueleto, mas o handler real ainda nao foi implementado.",
          },
          null,
          2
        ),
      },
    ],
  };
}
