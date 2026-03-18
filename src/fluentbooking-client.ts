import type { ResolvedEnv } from "./env";

export class FluentBookingClient {
  constructor(private readonly env: ResolvedEnv) {}

  async get<T = unknown>(path: string): Promise<T> {
    return this.request<T>(path, { method: "GET" });
  }

  async post<T = unknown>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: "POST",
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  async put<T = unknown>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: "PUT",
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  async patch<T = unknown>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: "PATCH",
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  async delete<T = unknown>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: "DELETE",
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  async request<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.env.requestTimeoutMs);

    try {
      const response = await fetch(this.buildUrl(path), {
        ...init,
        headers: {
          Accept: "application/json",
          Authorization: `Basic ${this.basicAuthToken()}`,
          ...(init.body ? { "Content-Type": "application/json" } : {}),
          ...(init.headers || {}),
        },
        signal: controller.signal,
      });

      const rawText = await response.text();
      const data = parseResponseBody(rawText);

      if (!response.ok) {
        throw new Error(
          `FluentBooking API ${response.status}: ${
            typeof data === "string" ? data : JSON.stringify(data)
          }`
        );
      }

      return data as T;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private buildUrl(path: string): string {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return `${this.env.wordpressBaseUrl}${this.env.fluentbookingApiPath}${normalizedPath}`;
  }

  private basicAuthToken(): string {
    return btoa(`${this.env.wpUsername}:${this.env.wpApplicationPassword}`);
  }
}

function parseResponseBody(text: string): unknown {
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
