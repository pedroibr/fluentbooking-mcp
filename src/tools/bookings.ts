import type { ToolDefinition } from "../types";
import {
  optionalArrayArg,
  optionalBooleanArg,
  optionalNumberArg,
  optionalObjectArg,
  optionalStringArg,
  requiredNumberArg,
  requiredStringArg,
  textToolResult,
} from "./shared";

export const bookingTools: ToolDefinition[] = [
  {
    name: "create_booking",
    description:
      "Cria um novo booking para um evento do FluentBooking com nome, email, timezone e data/hora selecionada.",
    module: "bookings",
    access: "write",
    status: "ready",
    upstreamHint: "POST /bookings/create/{event_id}",
    inputSchema: {
      type: "object",
      properties: {
        event_id: { type: "number", description: "ID do evento." },
        name: { type: "string", description: "Nome do attendee." },
        email: { type: "string", description: "Email do attendee." },
        timezone: {
          type: "string",
          description: "Timezone IANA do attendee, por exemplo America/Sao_Paulo.",
        },
        event_time: {
          type: "string",
          description: "Data e hora selecionada no formato YYYY-MM-DD HH:mm:ss.",
        },
        status: {
          type: "string",
          description: "Status inicial do booking.",
        },
        message: {
          type: "string",
          description: "Mensagem ou observacao do attendee.",
        },
        location_type: {
          type: "string",
          description: "Tipo de local escolhido no evento.",
        },
        location_description: {
          type: "string",
          description: "Descricao do local, endereco ou telefone quando exigido pelo evento.",
        },
        phone_number: {
          type: "string",
          description: "Telefone do attendee.",
        },
        address: {
          type: "string",
          description: "Endereco do attendee.",
        },
        guests: {
          type: "array",
          description: "Convidados adicionais, como emails ou objetos com name e email.",
          items: {
            type: "object",
            additionalProperties: true,
          },
        },
        custom_fields: {
          type: "object",
          description: "Valores dos custom fields exigidos pelo evento.",
          additionalProperties: true,
        },
        duration: {
          type: "number",
          description: "Override da duracao, quando o evento suporta multi-duration.",
        },
        source: {
          type: "string",
          description: "Origem do booking, por exemplo web ou admin.",
        },
        source_url: {
          type: "string",
          description: "URL da pagina onde o booking foi criado.",
        },
        booking_fields: {
          type: "array",
          description: "Compatibilidade legada para campos adicionais do booking.",
          items: {
            type: "object",
            additionalProperties: true,
          },
        },
      },
      required: ["event_id", "name", "email", "timezone", "event_time"],
      additionalProperties: false,
    },
    handler: async ({ client }, args) => {
      const eventId = requiredNumberArg(args, "event_id");
      const name = requiredStringArg(args, "name");
      const email = requiredStringArg(args, "email");
      const timezone = requiredStringArg(args, "timezone");
      const eventTime = requiredStringArg(args, "event_time");
      const status = optionalStringArg(args, "status");
      const message = optionalStringArg(args, "message");
      const locationType = optionalStringArg(args, "location_type");
      const locationDescription = optionalStringArg(args, "location_description");
      const phoneNumber = optionalStringArg(args, "phone_number");
      const address = optionalStringArg(args, "address");
      const guests = optionalArrayArg(args, "guests");
      const customFields = optionalObjectArg(args, "custom_fields");
      const duration = optionalNumberArg(args, "duration");
      const source = optionalStringArg(args, "source");
      const sourceUrl = optionalStringArg(args, "source_url");
      const bookingFields = optionalArrayArg(args, "booking_fields");

      const data = await client.post(`/bookings/create/${eventId}`, {
        name,
        email,
        timezone,
        event_time: eventTime,
        ...(status ? { status } : {}),
        ...(message ? { message } : {}),
        ...(locationType ? { location_type: locationType } : {}),
        ...(locationDescription ? { location_description: locationDescription } : {}),
        ...(phoneNumber ? { phone_number: phoneNumber } : {}),
        ...(address ? { address } : {}),
        ...(guests ? { guests } : {}),
        ...(customFields ? { custom_fields: customFields } : {}),
        ...(duration !== undefined ? { duration } : {}),
        ...(source ? { source } : {}),
        ...(sourceUrl ? { source_url: sourceUrl } : {}),
        ...(bookingFields ? { booking_fields: bookingFields } : {}),
      });

      return textToolResult({
        ok: true,
        tool: "create_booking",
        event_id: eventId,
        data,
      });
    },
  },
  {
    name: "update_schedule",
    description: "Atualiza um campo de um booking existente usando o endpoint de schedules.",
    module: "bookings",
    access: "write",
    status: "ready",
    upstreamHint: "PUT /schedules/{id}",
    inputSchema: {
      type: "object",
      properties: {
        booking_id: {
          type: "number",
          description: "ID do booking/schedule.",
        },
        column: {
          type: "string",
          description: "Campo a atualizar no schedule.",
          enum: [
            "status",
            "payment_status",
            "internal_note",
            "email",
            "phone",
            "first_name",
            "last_name",
          ],
        },
        value: {
          type: "string",
          description: "Novo valor para o campo escolhido.",
        },
        cancel_reason: {
          type: "string",
          description: "Obrigatorio quando column=status e value=cancelled.",
        },
        reject_reason: {
          type: "string",
          description: "Obrigatorio quando column=status e value=rejected.",
        },
        refund_payment: {
          type: "string",
          description: "Use yes para pedir reembolso ao cancelar ou rejeitar.",
          enum: ["yes"],
        },
        update_all: {
          type: "boolean",
          description: "Atualiza todos os attendees de um booking multi-guest.",
        },
      },
      required: ["booking_id", "column", "value"],
      additionalProperties: false,
    },
    handler: async ({ client }, args) => {
      const bookingId = requiredNumberArg(args, "booking_id");
      const column = requiredStringArg(args, "column");
      const value = requiredStringArg(args, "value");
      const cancelReason = optionalStringArg(args, "cancel_reason");
      const rejectReason = optionalStringArg(args, "reject_reason");
      const refundPayment = optionalStringArg(args, "refund_payment");
      const updateAll = optionalBooleanArg(args, "update_all");

      if (column === "status" && value === "cancelled" && !cancelReason) {
        throw new Error("cancel_reason e obrigatorio quando column=status e value=cancelled");
      }

      if (column === "status" && value === "rejected" && !rejectReason) {
        throw new Error("reject_reason e obrigatorio quando column=status e value=rejected");
      }

      const data = await client.put(`/schedules/${bookingId}`, {
        column,
        value,
        ...(cancelReason ? { cancel_reason: cancelReason } : {}),
        ...(rejectReason ? { reject_reason: rejectReason } : {}),
        ...(refundPayment ? { refund_payment: refundPayment } : {}),
        ...(updateAll !== undefined ? { update_all: updateAll } : {}),
      });

      return textToolResult({
        ok: true,
        tool: "update_schedule",
        booking_id: bookingId,
        column,
        value,
        data,
      });
    },
  },
  {
    name: "list_bookings",
    description: "Lista bookings do FluentBooking.",
    module: "bookings",
    access: "read",
    status: "ready",
    upstreamHint: "GET /bookings",
    inputSchema: {
      type: "object",
      properties: {
        per_page: { type: "number", description: "Itens por pagina." },
        period: {
          type: "string",
          description: "Periodo do booking.",
          enum: ["all", "upcoming", "past"],
        },
        status: {
          type: "string",
          description: "Filtro local por status do booking.",
          enum: ["scheduled", "pending", "cancelled", "completed", "rejected"],
        },
        calendar_ids: {
          type: "array",
          description: "IDs dos calendars para filtrar. Use ['all'] para incluir todos.",
          items: {
            type: "string",
          },
        },
      },
      additionalProperties: false,
    },
    handler: async ({ client }, args) => {
      const perPage = optionalNumberArg(args, "per_page");
      const period = optionalStringArg(args, "period");
      const status = optionalStringArg(args, "status");
      const calendarIds = optionalArrayArg<string | number>(args, "calendar_ids");
      const query = new URLSearchParams();

      if (perPage !== undefined) {
        query.set("per_page", String(perPage));
      }

      if (period) {
        query.set("period", period);
      }

      for (const item of calendarIds || []) {
        query.append("calendar_ids[]", String(item));
      }

      const suffix = query.toString() ? `?${query.toString()}` : "";
      const data = await client.get<{
        bookings?: Array<Record<string, unknown>>;
        total?: number;
      }>(`/bookings${suffix}`);
      const bookings = Array.isArray(data.bookings) ? data.bookings : [];
      const filteredBookings =
        status === undefined
          ? bookings
          : bookings.filter(
              (booking) =>
                String(booking.status || "").trim().toLowerCase() === status.toLowerCase()
            );

      return textToolResult({
        ok: true,
        tool: "list_bookings",
        filters: {
          per_page: perPage ?? null,
          period: period || null,
          status: status || null,
          calendar_ids: calendarIds || [],
        },
        source: "GET /bookings",
        local_filters_applied: {
          status: status || null,
        },
        data: {
          ...data,
          bookings: filteredBookings,
          filtered_total: filteredBookings.length,
        },
      });
    },
  },
  {
    name: "get_event_for_booking",
    description: "Busca os detalhes de um evento e seus slots disponiveis para criacao de booking.",
    module: "bookings",
    access: "read",
    status: "ready",
    upstreamHint: "GET /bookings/event/{event_id}",
    inputSchema: {
      type: "object",
      properties: {
        event_id: { type: "number", description: "ID do evento." },
        start_date: {
          type: "string",
          description: "Data inicial para checar disponibilidade no formato YYYY-MM-DD.",
        },
        timezone: {
          type: "string",
          description: "Timezone IANA para disponibilidade.",
        },
        duration: {
          type: "number",
          description: "Override da duracao em minutos.",
        },
        host_id: {
          type: "number",
          description: "Host especifico para eventos de time.",
        },
      },
      required: ["event_id"],
      additionalProperties: false,
    },
    handler: async ({ client }, args) => {
      const eventId = requiredNumberArg(args, "event_id");
      const startDate = optionalStringArg(args, "start_date");
      const timezone = optionalStringArg(args, "timezone");
      const duration = optionalNumberArg(args, "duration");
      const hostId = optionalNumberArg(args, "host_id");
      const query = new URLSearchParams();

      if (startDate) {
        query.set("start_date", startDate);
      }

      if (timezone) {
        query.set("timezone", timezone);
      }

      if (duration !== undefined) {
        query.set("duration", String(duration));
      }

      if (hostId !== undefined) {
        query.set("host_id", String(hostId));
      }

      const suffix = query.toString() ? `?${query.toString()}` : "";
      const data = await client.get(`/bookings/event/${eventId}${suffix}`);

      return textToolResult({
        ok: true,
        tool: "get_event_for_booking",
        event_id: eventId,
        filters: {
          start_date: startDate || null,
          timezone: timezone || null,
          duration: duration ?? null,
          host_id: hostId ?? null,
        },
        data,
      });
    },
  },
  {
    name: "get_event_time_slots",
    description: "Busca apenas os slots disponiveis de um evento para booking.",
    module: "bookings",
    access: "read",
    status: "ready",
    upstreamHint: "GET /bookings/slots/{event_id}",
    inputSchema: {
      type: "object",
      properties: {
        event_id: { type: "number", description: "ID do evento." },
        start_date: {
          type: "string",
          description: "Data inicial no formato YYYY-MM-DD HH:mm:ss.",
        },
        timezone: {
          type: "string",
          description: "Timezone IANA para disponibilidade.",
        },
      },
      required: ["event_id"],
      additionalProperties: false,
    },
    handler: async ({ client }, args) => {
      const eventId = requiredNumberArg(args, "event_id");
      const startDate = optionalStringArg(args, "start_date");
      const timezone = optionalStringArg(args, "timezone");
      const query = new URLSearchParams();

      if (startDate) {
        query.set("start_date", startDate);
      }

      if (timezone) {
        query.set("timezone", timezone);
      }

      const suffix = query.toString() ? `?${query.toString()}` : "";
      const data = await client.get(`/bookings/slots/${eventId}${suffix}`);

      return textToolResult({
        ok: true,
        tool: "get_event_time_slots",
        event_id: eventId,
        filters: {
          start_date: startDate || null,
          timezone: timezone || null,
        },
        data,
      });
    },
  },
  {
    name: "delete_booking",
    description: "Exclui um booking existente do FluentBooking.",
    module: "bookings",
    access: "delete",
    status: "ready",
    upstreamHint: "DELETE /schedules/{id}",
    inputSchema: {
      type: "object",
      properties: {
        booking_id: {
          type: "number",
          description: "ID do booking/schedule a excluir.",
        },
      },
      required: ["booking_id"],
      additionalProperties: false,
    },
    handler: async ({ client }, args) => {
      const bookingId = requiredNumberArg(args, "booking_id");
      const data = await client.delete(`/schedules/${bookingId}`);

      return textToolResult({
        ok: true,
        tool: "delete_booking",
        booking_id: bookingId,
        data,
      });
    },
  },
];
