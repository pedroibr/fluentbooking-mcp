export interface Env {
  WORDPRESS_BASE_URL?: string;
  WP_USERNAME?: string;
  WP_APPLICATION_PASSWORD?: string;
  FLUENTBOOKING_API_PATH?: string;
  ALLOW_WRITES?: string;
  ALLOW_DELETES?: string;
  DEFAULT_PER_PAGE?: string;
  REQUEST_TIMEOUT_MS?: string;
}

export interface ResolvedEnv {
  wordpressBaseUrl: string;
  wpUsername: string;
  wpApplicationPassword: string;
  fluentbookingApiPath: string;
  allowWrites: boolean;
  allowDeletes: boolean;
  defaultPerPage: number;
  requestTimeoutMs: number;
}

export function resolveEnv(env: Env): ResolvedEnv {
  return {
    wordpressBaseUrl: normalizeBaseUrl(requiredString(env.WORDPRESS_BASE_URL, "WORDPRESS_BASE_URL")),
    wpUsername: requiredString(env.WP_USERNAME, "WP_USERNAME"),
    wpApplicationPassword: requiredString(
      env.WP_APPLICATION_PASSWORD,
      "WP_APPLICATION_PASSWORD"
    ),
    fluentbookingApiPath: normalizeApiPath(
      env.FLUENTBOOKING_API_PATH || "/wp-json/fluent-booking/v2"
    ),
    allowWrites: parseBoolean(env.ALLOW_WRITES, false),
    allowDeletes: parseBoolean(env.ALLOW_DELETES, false),
    defaultPerPage: parsePositiveInt(env.DEFAULT_PER_PAGE, 20, "DEFAULT_PER_PAGE"),
    requestTimeoutMs: parsePositiveInt(env.REQUEST_TIMEOUT_MS, 15000, "REQUEST_TIMEOUT_MS"),
  };
}

export function inspectEnv(env: Env) {
  return {
    wordpress_base_url: env.WORDPRESS_BASE_URL || null,
    fluentbooking_api_path: normalizeApiPath(
      env.FLUENTBOOKING_API_PATH || "/wp-json/fluent-booking/v2"
    ),
    wp_username_configured: Boolean(env.WP_USERNAME),
    wp_application_password_configured: Boolean(env.WP_APPLICATION_PASSWORD),
    writes_enabled: parseBoolean(env.ALLOW_WRITES, false),
    deletes_enabled: parseBoolean(env.ALLOW_DELETES, false),
    default_per_page: safeParsePositiveInt(env.DEFAULT_PER_PAGE, 20),
    request_timeout_ms: safeParsePositiveInt(env.REQUEST_TIMEOUT_MS, 15000),
    fully_configured: Boolean(
      env.WORDPRESS_BASE_URL && env.WP_USERNAME && env.WP_APPLICATION_PASSWORD
    ),
  };
}

function requiredString(value: string | undefined, name: string): string {
  const normalized = value?.trim();

  if (!normalized) {
    throw new Error(`${name} nao configurado`);
  }

  return normalized;
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (!value) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes";
}

function parsePositiveInt(value: string | undefined, fallback: number, name: string): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${name} precisa ser um inteiro positivo`);
  }

  return parsed;
}

function safeParsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, "");
}

function normalizeApiPath(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "/wp-json/fluent-booking/v2";
  }

  return `/${trimmed.replace(/^\/+/, "").replace(/\/+$/, "")}`;
}
