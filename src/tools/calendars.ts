import type { ToolDefinition } from "../types";
import {
  optionalArrayArg,
  optionalNumberArg,
  optionalStringArg,
  requiredNumberArg,
  textToolResult,
} from "./shared";

export const calendarTools: ToolDefinition[] = [
  {
    name: "list_calendars",
    description: "Lista calendars do FluentBooking.",
    module: "calendars",
    access: "read",
    status: "ready",
    upstreamHint: "GET /calendars",
    inputSchema: {
      type: "object",
      properties: {
        page: { type: "number", description: "Numero da pagina." },
        per_page: { type: "number", description: "Itens por pagina." },
        search: {
          type: "string",
          description: "Busca pelo titulo do calendar ou do evento.",
        },
        calendar_type: {
          type: "string",
          description: "Filtro por tipo de calendar, por exemplo simple, team ou all.",
        },
        include: {
          type: "array",
          description: "Payloads adicionais. Suporta calendar_event_lists.",
          items: { type: "string" },
        },
      },
      additionalProperties: false,
    },
    handler: async ({ client, env }, args) => {
      const page = optionalNumberArg(args, "page");
      const perPage = optionalNumberArg(args, "per_page");
      const search = optionalStringArg(args, "search");
      const calendarType = optionalStringArg(args, "calendar_type");
      const include = optionalArrayArg<string>(args, "include");
      const query = new URLSearchParams();

      query.set("page", String(page || 1));
      query.set("per_page", String(perPage || env.defaultPerPage));

      if (search) {
        query.set("query[search]", search);
      }

      if (calendarType) {
        query.set("query[calendarType]", calendarType);
      }

      for (const item of include || []) {
        query.append("with[]", String(item));
      }

      const data = await client.get(`/calendars?${query.toString()}`);

      return textToolResult({
        ok: true,
        tool: "list_calendars",
        filters: {
          page: page || 1,
          per_page: perPage || env.defaultPerPage,
          search: search || null,
          calendar_type: calendarType || null,
          include: include || [],
        },
        data,
      });
    },
  },
  {
    name: "get_calendar",
    description: "Busca os detalhes completos de um calendar.",
    module: "calendars",
    access: "read",
    status: "ready",
    upstreamHint: "GET /calendars/{id}",
    inputSchema: {
      type: "object",
      properties: {
        calendar_id: { type: "number", description: "ID do calendar." },
      },
      required: ["calendar_id"],
      additionalProperties: false,
    },
    handler: async ({ client }, args) => {
      const calendarId = requiredNumberArg(args, "calendar_id");
      const data = await client.get(`/calendars/${calendarId}`);

      return textToolResult({
        ok: true,
        tool: "get_calendar",
        calendar_id: calendarId,
        data,
      });
    },
  },
];
