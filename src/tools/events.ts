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

export const eventTools: ToolDefinition[] = [
  {
    name: "list_events",
    description: "Lista os tipos de evento disponiveis, achatando os slots retornados pelos calendars.",
    module: "events",
    access: "read",
    visibility: "public",
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
    visibility: "public",
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
    visibility: "public",
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
          description: "Tipo do evento.",
          enum: ["single", "group"],
        },
        availability_days: {
          type: "array",
          description: "Dias da semana em que o evento pode ser reservado.",
          items: {
            type: "string",
            enum: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
          },
        },
        availability_start_time: {
          type: "string",
          description: "Horario inicial diario no formato HH:mm.",
        },
        availability_end_time: {
          type: "string",
          description: "Horario final diario no formato HH:mm.",
        },
        range_days: {
          type: "number",
          description: "Quantidade de dias futuros disponiveis para reserva.",
        },
        description: { type: "string", description: "Descricao do evento." },
        color_schema: { type: "string", description: "Cor hexadecimal." },
        location_type: {
          type: "string",
          description: "Tipo principal de local.",
          enum: [
            "online_meeting",
            "phone_guest",
            "phone_organizer",
            "in_person_guest",
            "in_person_organizer",
            "custom",
          ],
        },
        location_label: {
          type: "string",
          description: "Titulo/rotulo exibido para o local quando aplicavel.",
        },
        location_description: {
          type: "string",
          description: "Descricao do local, endereco, telefone ou instrucoes.",
        },
        host_phone_number: {
          type: "string",
          description: "Telefone do organizador quando location_type for phone_organizer.",
        },
        meeting_link: {
          type: "string",
          description: "Link da reuniao quando location_type for online_meeting.",
        },
        buffer_time_before: {
          type: "number",
          description: "Minutos de buffer antes de cada slot.",
        },
        buffer_time_after: {
          type: "number",
          description: "Minutos de buffer depois de cada slot.",
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
      required: [
        "calendar_id",
        "title",
        "duration",
        "status",
        "event_type",
        "availability_days",
        "availability_start_time",
        "availability_end_time",
      ],
      additionalProperties: false,
    },
    handler: async ({ client }, args) => {
      const calendarId = requiredNumberArg(args, "calendar_id");
      const title = requiredStringArg(args, "title");
      const duration = requiredNumberArg(args, "duration");
      const status = requiredStringArg(args, "status");
      const eventType = requiredStringArg(args, "event_type");
      const availabilityDays = optionalArrayArg<string>(args, "availability_days") || [];
      const availabilityStartTime = requiredStringArg(args, "availability_start_time");
      const availabilityEndTime = requiredStringArg(args, "availability_end_time");
      const rangeDays = optionalNumberArg(args, "range_days");
      const description = optionalStringArg(args, "description");
      const colorSchema = optionalStringArg(args, "color_schema");
      const locationType = optionalStringArg(args, "location_type");
      const locationLabel = optionalStringArg(args, "location_label");
      const locationDescription = optionalStringArg(args, "location_description");
      const hostPhoneNumber = optionalStringArg(args, "host_phone_number");
      const meetingLink = optionalStringArg(args, "meeting_link");
      const bufferTimeBefore = optionalNumberArg(args, "buffer_time_before");
      const bufferTimeAfter = optionalNumberArg(args, "buffer_time_after");
      const maxBookPerSlot = optionalNumberArg(args, "max_book_per_slot");
      const isDisplaySpots = optionalBooleanArg(args, "is_display_spots");
      const locationSettings = buildLocationSettings({
        locationType,
        locationLabel,
        locationDescription,
        hostPhoneNumber,
        meetingLink,
      });
      const weeklySchedules = availabilityDays.map((day) => ({
        day,
        from: availabilityStartTime,
        to: availabilityEndTime,
      }));

      const data = await client.post(`/calendars/${calendarId}/events`, {
        title,
        duration,
        status,
        event_type: eventType,
        settings: {
          schedule_type: "weekly_schedules",
          weekly_schedules: weeklySchedules,
          range_type: "range_days",
          range_days: rangeDays ?? 60,
          ...(bufferTimeBefore !== undefined
            ? { buffer_time_before: String(bufferTimeBefore) }
            : {}),
          ...(bufferTimeAfter !== undefined ? { buffer_time_after: String(bufferTimeAfter) } : {}),
        },
        ...(description ? { description } : {}),
        ...(colorSchema ? { color_schema: colorSchema } : {}),
        ...(locationType ? { location_type: locationType } : {}),
        ...(locationSettings.length ? { location_settings: locationSettings } : {}),
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
    visibility: "public",
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
    name: "update_event_status",
    description: "Atualiza o status de um evento entre draft e active.",
    module: "events",
    access: "write",
    visibility: "public",
    status: "ready",
    upstreamHint: "PUT /calendars/{id}/events/{event_id}",
    inputSchema: {
      type: "object",
      properties: {
        calendar_id: { type: "number", description: "ID do calendar." },
        event_id: { type: "number", description: "ID do evento." },
        status: {
          type: "string",
          description: "Novo status do evento.",
          enum: ["active", "draft"],
        },
      },
      required: ["calendar_id", "event_id", "status"],
      additionalProperties: false,
    },
    handler: async ({ client }, args) => {
      const calendarId = requiredNumberArg(args, "calendar_id");
      const eventId = requiredNumberArg(args, "event_id");
      const status = requiredStringArg(args, "status");
      const data = await client.put(`/calendars/${calendarId}/events/${eventId}`, {
        status,
      });

      return textToolResult({
        ok: true,
        tool: "update_event_status",
        calendar_id: calendarId,
        event_id: eventId,
        status,
        data,
      });
    },
  },
  {
    name: "update_event_availability",
    description: "Atualiza a disponibilidade de um evento em um calendar.",
    module: "events",
    access: "write",
    visibility: "internal",
    status: "ready",
    upstreamHint: "POST /calendars/{id}/events/{event_id}/availability",
    inputSchema: {
      type: "object",
      properties: {
        calendar_id: { type: "number", description: "ID do calendar." },
        event_id: { type: "number", description: "ID do evento." },
        schedule_type: {
          type: "string",
          description: "Modo de agenda, por exemplo weekly_schedules.",
        },
        weekly_schedules: {
          type: "object",
          description: "Slots semanais por dia da semana.",
          additionalProperties: true,
        },
        date_overrides: {
          type: "array",
          description: "Overrides por data.",
          items: {
            type: "object",
            additionalProperties: true,
          },
        },
        range_type: {
          type: "string",
          description: "range_days ou date_range.",
        },
        range_days: {
          type: "number",
          description: "Numero de dias disponiveis quando usar range_days.",
        },
        range_date_between: {
          type: "array",
          description: "Intervalo de datas quando usar date_range.",
          items: { type: "string" },
        },
        common_schedule: {
          type: "boolean",
          description: "Usa agenda compartilhada em eventos de time.",
        },
        hosts_schedules: {
          type: "object",
          description: "Mapa de host IDs para availability IDs.",
          additionalProperties: true,
        },
        availability_type: {
          type: "string",
          description: "existing_schedule ou custom.",
        },
        availability_id: {
          type: "number",
          description: "ID da availability existente, quando aplicavel.",
        },
      },
      required: ["calendar_id", "event_id", "schedule_type"],
      additionalProperties: false,
    },
    handler: async ({ client }, args) => {
      const calendarId = requiredNumberArg(args, "calendar_id");
      const eventId = requiredNumberArg(args, "event_id");
      const scheduleType = requiredStringArg(args, "schedule_type");
      const weeklySchedules = optionalObjectArg(args, "weekly_schedules");
      const dateOverrides = optionalArrayArg(args, "date_overrides");
      const rangeType = optionalStringArg(args, "range_type");
      const rangeDays = optionalNumberArg(args, "range_days");
      const rangeDateBetween = optionalArrayArg(args, "range_date_between");
      const commonSchedule = optionalBooleanArg(args, "common_schedule");
      const hostsSchedules = optionalObjectArg(args, "hosts_schedules");
      const availabilityType = optionalStringArg(args, "availability_type");
      const availabilityId = optionalNumberArg(args, "availability_id");

      const data = await client.post(`/calendars/${calendarId}/events/${eventId}/availability`, {
        schedule_type: scheduleType,
        ...(weeklySchedules ? { weekly_schedules: weeklySchedules } : {}),
        ...(dateOverrides ? { date_overrides: dateOverrides } : {}),
        ...(rangeType ? { range_type: rangeType } : {}),
        ...(rangeDays !== undefined ? { range_days: rangeDays } : {}),
        ...(rangeDateBetween ? { range_date_between: rangeDateBetween } : {}),
        ...(commonSchedule !== undefined ? { common_schedule: commonSchedule } : {}),
        ...(hostsSchedules ? { hosts_schedules: hostsSchedules } : {}),
        ...(availabilityType ? { availability_type: availabilityType } : {}),
        ...(availabilityId !== undefined ? { availability_id: availabilityId } : {}),
      });

      return textToolResult({
        ok: true,
        tool: "update_event_availability",
        calendar_id: calendarId,
        event_id: eventId,
        data,
      });
    },
  },
  {
    name: "delete_event",
    description: "Exclui um evento de um calendar.",
    module: "events",
    access: "delete",
    visibility: "public",
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
    visibility: "public",
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

function buildLocationSettings({
  locationType,
  locationLabel,
  locationDescription,
  hostPhoneNumber,
  meetingLink,
}: {
  locationType?: string;
  locationLabel?: string;
  locationDescription?: string;
  hostPhoneNumber?: string;
  meetingLink?: string;
}) {
  if (!locationType) {
    return [];
  }

  if (locationType === "online_meeting") {
    return [
      {
        type: "online_meeting",
        title: locationLabel || "",
        display_on_booking: "",
        meeting_link: meetingLink || "#",
      },
    ];
  }

  if (locationType === "phone_organizer") {
    return [
      {
        type: "phone_organizer",
        title: locationLabel || "",
        display_on_booking: "",
        host_phone_number: hostPhoneNumber || locationDescription || "",
      },
    ];
  }

  if (locationType === "custom") {
    return [
      {
        type: "custom",
        title: locationLabel || "Custom",
        display_on_booking: "",
        description: locationDescription || "",
      },
    ];
  }

  if (locationType === "in_person_organizer") {
    return [
      {
        type: "in_person_organizer",
        title: locationLabel || "In person",
        display_on_booking: "",
        description: locationDescription || "",
      },
    ];
  }

  return [
    {
      type: locationType,
      title: locationLabel || "",
      display_on_booking: "",
    },
  ];
}
