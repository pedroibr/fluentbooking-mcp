import { buildHealthPayload, handleMcpRequest } from "./mcp";
import type { Env } from "./env";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/" && request.method === "GET") {
      return Response.json(buildHealthPayload(env));
    }

    if (url.pathname === "/mcp" && request.method === "POST") {
      return handleMcpRequest(request, env);
    }

    return new Response("Not found", { status: 404 });
  },
};
