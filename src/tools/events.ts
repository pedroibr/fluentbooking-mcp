import type { ToolDefinition } from "../types";
import {
  optionalArrayArg,
  optionalBooleanArg,
  optionalNumberArg,
  optionalStringArg,
  requiredObjectArg,
  requiredNumberArg,
  requiredStringArg,
  textToolResult,
} from "./shared";

export const eventTools: ToolDefinition[] = [
  {
    name: "list_events",
    description: "Lista os tipos de evento disponiveis, achatando os slots retornados pelos calendars.",
    module: "events",
    access: "read",
    status: "ready",
    upstreamHint: "GET /calendars (flatten calendars[].slots)",
    inputSchema: {
      type: "object",
      properties: {
        page: { type: "number", description: "Numero da pagina de calendars." },
        per_page: { type: "number", description: "Quantidade de calendars por pagina." },
        search: {
          type: "string",
          description: "Busca por titulo do evento via query do endpoint de calendars.",
        },
        calendar_type: {
          type: "string",
          description: "Filtro por tipo de calendar, por exemplo simple, team ou all.",
        },
        calendar_id: {
          type: "number",
          description: "Filtra eventos de um calendar especifico apos a resposta.",
        },
        status: {
          type: "string",
          description: "Filtra eventos por status apos a resposta.",
          enum: ["active", "draft"],
        },
        event_type: {
          type: "string",
          description: "Filtra eventos por tipo, por exemplo single ou group.",
        },
      },
      additionalProperties: false,
    },
    handler: async ({ client, env }, args) => {
      const page = optionalNumberArg(args, "page");
      const perPage = optionalNumberArg(args, "per_page");
      const search = optionalStringArg(args, "search");
      const calendarType = optionalStringArg(args, "calendar_type");
      const calendarId = optionalNumberArg(args, "calendar_id");
      const status = optionalStringArg(args, "status");
      const eventType = optionalStringArg(args, "event_type");
      const query = new URLSearchParams();

      query.set("page", String(page || 1));
      query.set("per_page", String(perPage || env.defaultPerPage));

      if (search) {
        query.set("query[search]", search);
      }

      if (calendarType) {
        query.set("query[calendarType]", calendarType);
      }

      const response = await client.get<{
        calendars?: { data?: Array<Record<string, unknown>> };
      }>(`/calendars?${query.toString()}`);

      const calendars = Array.isArray(response.calendars?.data) ? response.calendars?.data : [];
      const events = calendars.flatMap((calendar) => {
        const slots = Array.isArray(calendar.slots) ? calendar.slots : [];

        return slots.map((slot) => {
          const event = typeof slot === "object" && slot !== null ? slot : {};
          return {
            ...event,
            calendar: {
              id: calendar.id ?? null,
              title: calendar.title ?? null,
              slug: calendar.slug ?? null,
              type: calendar.type ?? null,
              status: calendar.status ?? null,
            },
          };
        });
      });

      const filtered = events.filter((event) => {
        if (calendarId !== undefined && Number(event.calendar?.id) !== calendarId) {
          return false;
        }

        if (status && String(event.status || "").toLowerCase() !== status.toLowerCase()) {
          return false;
        }

        if (eventType && String(event.event_type || "").toLowerCase() !== eventType.toLowerCase()) {
          return false;
        }

        return true;
      });

      return textToolResult({
        ok: true,
        tool: "list_events",
        filters: {
          page: page || 1,
          per_page: perPage || env.defaultPerPage,
          search: search || null,
          calendar_type: calendarType || null,
          calendar_id: calendarId ?? null,
          status: status || null,
          event_type: eventType || null,
        },
        source: "GET /calendars flattened from calendars[].slots",
        total_events: filtered.length,
        data: filtered,
      });
    },
  },
  {
    name: "get_event",
    description: "Busca os detalhes completos de um evento do FluentBooking.",
    module: "events",
    access: "read",
    status: "ready",
    upstreamHint: "GET /events/{event_id}",
    inputSchema: {
      type: "object",
      properties: {
        event_id: { type: "number", description: "ID do evento." },
        event_hash: {
          type: "string",
          description: "Hash do evento para fallback de busca.",
        },
      },
      required: ["event_id"],
      additionalProperties: false,
    },
    handler: async ({ client }, args) => {
      const eventId = requiredNumberArg(args, "event_id");
      const eventHash = optionalStringArg(args, "event_hash");
      const query = new URLSearchParams();

      if (eventHash) {
        query.set("event_hash", eventHash);
      }

      const suffix = query.toString() ? `?${query.toString()}` : "";
      const data = await client.get(`/events/${eventId}${suffix}`);

      return textToolResult({
        ok: true,
        tool: "get_event",
        event_id: eventId,
        event_hash: eventHash || null,
        data,
      });
    },
  },
  {
    name: "create_event",
    description: "Cria um novo tipo de evento dentro de um calendar existente.",
    module: "events",
    access: "write",
    status: "ready",
    upstreamHint: "POST /calendars/{id}/events",
    inputSchema: {
      type: "object",
      properties: {
        calendar_id: { type: "number", description: "ID do calendar." },
        title: { type: "string", description: "Titulo do evento." },
        duration: { type: "number", description: "Duracao em minutos." },
        status: {
          type: "string",
          description: "Status do evento.",
          enum: ["active", "draft"],
        },
        event_type: {
          type: "string",
          description: "Tipo do evento, por exemplo single ou group.",
        },
        settings: {
          type: "object",
          description: "Configuracao de agenda do evento, conforme a doc do FluentBooking.",
          additionalProperties: true,
        },
        description: { type: "string", description: "Descricao do evento." },
        color_schema: { type: "string", description: "Cor hexadecimal." },
        location_type: { type: "string", description: "Tipo de local." },
        location_settings: {
          type: "array",
          description: "Configuracoes de local.",
          items: {
            type: "object",
            additionalProperties: true,
          },
        },
        max_book_per_slot: {
          type: "number",
          description: "Maximo de bookings por slot, util para eventos em grupo.",
        },
        is_display_spots: {
          type: "boolean",
          description: "Exibe quantidade de vagas restantes.",
        },
      },
      required: ["calendar_id", "title", "duration", "status", "event_type", "settings"],
      additionalProperties: false,
    },
    handler: async ({ client }, args) => {
      const calendarId = requiredNumberArg(args, "calendar_id");
      const title = requiredStringArg(args, "title");
      const duration = requiredNumberArg(args, "duration");
      const status = requiredStringArg(args, "status");
      const eventType = requiredStringArg(args, "event_type");
      const settings = requiredObjectArg(args, "settings");
      const description = optionalStringArg(args, "description");
      const colorSchema = optionalStringArg(args, "color_schema");
      const locationType = optionalStringArg(args, "location_type");
      const locationSettings = optionalArrayArg(args, "location_settings");
      const maxBookPerSlot = optionalNumberArg(args, "max_book_per_slot");
      const isDisplaySpots = optionalBooleanArg(args, "is_display_spots");

      const data = await client.post(`/calendars/${calendarId}/events`, {
        title,
        duration,
        status,
        event_type: eventType,
        settings,
        ...(description ? { description } : {}),
        ...(colorSchema ? { color_schema: colorSchema } : {}),
        ...(locationType ? { location_type: locationType } : {}),
        ...(locationSettings ? { location_settings: locationSettings } : {}),
        ...(maxBookPerSlot !== undefined ? { max_book_per_slot: maxBookPerSlot } : {}),
        ...(isDisplaySpots !== undefined ? { is_display_spots: isDisplaySpots } : {}),
      });

      return textToolResult({
        ok: true,
        tool: "create_event",
        calendar_id: calendarId,
        data,
      });
    },
  },
  {
    name: "get_calendar_event",
    description: "Busca um evento com contexto de calendar e includes opcionais.",
    module: "events",
    access: "read",
    status: "ready",
    upstreamHint: "GET /calendars/{id}/events/{event_id}",
    inputSchema: {
      type: "object",
      properties: {
        calendar_id: { type: "number", description: "ID do calendar." },
        event_id: { type: "number", description: "ID do evento." },
        include: {
          type: "array",
          description:
            "Payloads adicionais. Suporta calendar, smart_codes, settings_menu e calendar_event_lists.",
          items: { type: "string" },
        },
      },
      required: ["calendar_id", "event_id"],
      additionalProperties: false,
    },
    handler: async ({ client }, args) => {
      const calendarId = requiredNumberArg(args, "calendar_id");
      const eventId = requiredNumberArg(args, "event_id");
      const include = optionalArrayArg<string>(args, "include");
      const query = new URLSearchParams();

      for (const item of include || []) {
        query.append("with[]", String(item));
      }

      const suffix = query.toString() ? `?${query.toString()}` : "";
      const data = await client.get(`/calendars/${calendarId}/events/${eventId}${suffix}`);

      return textToolResult({
        ok: true,
        tool: "get_calendar_event",
        calendar_id: calendarId,
        event_id: eventId,
        include: include || [],
        data,
      });
    },
  },
  {
    name: "delete_event",
    description: "Exclui um evento de um calendar.",
    module: "events",
    access: "delete",
    status: "ready",
    upstreamHint: "DELETE /calendars/{id}/events/{event_id}",
    inputSchema: {
      type: "object",
      properties: {
        calendar_id: { type: "number", description: "ID do calendar." },
        event_id: { type: "number", description: "ID do evento." },
      },
      required: ["calendar_id", "event_id"],
      additionalProperties: false,
    },
    handler: async ({ client }, args) => {
      const calendarId = requiredNumberArg(args, "calendar_id");
      const eventId = requiredNumberArg(args, "event_id");
      const data = await client.delete(`/calendars/${calendarId}/events/${eventId}`);

      return textToolResult({
        ok: true,
        tool: "delete_event",
        calendar_id: calendarId,
        event_id: eventId,
        data,
      });
    },
  },
  {
    name: "get_event_availability",
    description: "Busca a configuracao de disponibilidade de um evento em um calendar.",
    module: "events",
    access: "read",
    status: "ready",
    upstreamHint: "GET /calendars/{id}/events/{event_id}/availability",
    inputSchema: {
      type: "object",
      properties: {
        calendar_id: { type: "number", description: "ID do calendar." },
        event_id: { type: "number", description: "ID do evento." },
      },
      required: ["calendar_id", "event_id"],
      additionalProperties: false,
    },
    handler: async ({ client }, args) => {
      const calendarId = requiredNumberArg(args, "calendar_id");
      const eventId = requiredNumberArg(args, "event_id");
      const data = await client.get(`/calendars/${calendarId}/events/${eventId}/availability`);

      return textToolResult({
        ok: true,
        tool: "get_event_availability",
        calendar_id: calendarId,
        event_id: eventId,
        data,
      });
    },
  },
];
