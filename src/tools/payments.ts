import type { ToolDefinition } from "../types";
import { requiredNumberArg, textToolResult } from "./shared";

export const paymentTools: ToolDefinition[] = [
  {
    name: "get_event_payment_settings",
    description: "Busca as configuracoes de pagamento de um evento especifico.",
    module: "payments",
    access: "read",
    status: "ready",
    upstreamHint: "GET /calendars/{id}/events/{event_id}/payment-settings",
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
      const data = await client.get(
        `/calendars/${calendarId}/events/${eventId}/payment-settings`
      );

      return textToolResult({
        ok: true,
        tool: "get_event_payment_settings",
        calendar_id: calendarId,
        event_id: eventId,
        data,
      });
    },
  },
];
