import type { ToolDefinition } from "../types";
import { bookingTools } from "./bookings";
import { calendarTools } from "./calendars";
import { eventTools } from "./events";
import { paymentTools } from "./payments";

const TOOL_REGISTRY: ToolDefinition[] = [
  ...calendarTools,
  ...eventTools,
  ...bookingTools,
  ...paymentTools,
];

export function getToolRegistry(): ToolDefinition[] {
  return TOOL_REGISTRY;
}

export function getReadyToolRegistry(): ToolDefinition[] {
  return TOOL_REGISTRY.filter(
    (tool) => tool.status === "ready" && (tool.visibility || "public") === "public"
  );
}

export function getToolByName(name: string): ToolDefinition | undefined {
  return TOOL_REGISTRY.find((tool) => tool.name === name);
}
