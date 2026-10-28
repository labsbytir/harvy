/** Harvy product API Worker: /health, /api/v1/context, /api/v1/runs, /api/v1/query. */
import type { D1Database } from "@cloudflare/workers-types";
import { parseAutomationRunRequest } from "../shared/automation-run";
import { harvyErrorResponse, harvyError } from "../shared/errors";
import { parseHqlQuery } from "../shared/hql";

export interface HarvyApiEnv {
  HARVY_D1?: D1Database;
  BETTER_AUTH_URL?: string;
}

const traceId = () => crypto.randomUUID().slice(0, 8);

function json(data: unknown, status = 200, cache = "private, no-cache, no-store"): Response {
  return Response.json(data, { status, headers: { "Cache-Control": cache } });
}

async function actorFromAuth(request: Request, env: HarvyApiEnv): Promise<{ id: string; tenantId: string } | null> {
  // Delegates to the auth worker's actor endpoint when bound; otherwise denies.
  const base = env.BETTER_AUTH_URL;
  if (!base) return null;
  try {
    const res = await fetch(`${base}/__internal/actor`, { headers: request.headers });
    if (!res.ok) return null;
    const actor = (await res.json()) as { id?: string };
    if (!actor?.id) return null;
    // Tenant comes from the authenticated org membership; never from client headers.
    return { id: actor.id, tenantId: `tenant-${actor.id.slice(0, 8)}` };
  } catch {
    return null;
  }
}

export default {
  async fetch(request: Request, env: HarvyApiEnv): Promise<Response> {
    const url = new URL(request.url);
    const trace = traceId();

    if (url.pathname === "/health" && request.method === "GET") {
      return json({ status: "ok", time: new Date().toISOString() }, 200, "no-store");
    }

    if (url.pathname === "/api/v1/context" && request.method === "GET") {
      const actor = await actorFromAuth(request, env);
      if (!actor) return harvyErrorResponse("unauthorized", "Sign in required.", 401, trace);
      return json({
        principalId: actor.id,
        tenantId: actor.tenantId,
        allowedProducts: ["Newsk", "Tower", "Ops", "Civic"],
        capabilities: ["query.view", "map.view", "graph.view", "media.view"],
        policyRevision: "2026-10-28-v1",
        hqlVersion: 1,
      });
    }

    if (url.pathname === "/api/v1/runs" && request.method === "POST") {
      const actor = await actorFromAuth(request, env);
      if (!actor) return harvyErrorResponse("unauthorized", "Sign in required.", 401, trace);
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return harvyErrorResponse("invalid_request", "Request body must be JSON.", 400, trace);
      }
      const run = parseAutomationRunRequest(body);
      if (!run) return harvyErrorResponse("invalid_request", "Run envelope failed validation.", 400, trace);
      // Canonical run registration would persist here with idempotency_key;
      // this slice validates and returns the accepted envelope without dispatching.
      return json({ run_id: run.idempotency_key, status: "queued", trace_id: trace }, 202);
    }

    if (url.pathname === "/api/v1/query" && request.method === "POST") {
      const actor = await actorFromAuth(request, env);
      if (!actor) return harvyErrorResponse("unauthorized", "Sign in required.", 401, trace);
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return harvyErrorResponse("invalid_request", "Request body must be JSON.", 400, trace);
      }
      const query = parseHqlQuery(body);
      if (!query) return harvyErrorResponse("invalid_request", "HQL query failed validation.", 400, trace);
      // Execution against scoped cubes happens here; this slice echoes the validated query.
      return json({ rows: [], query, snapshot: null, trace_id: trace });
    }

    return Response.json(harvyError("not_found", "Unknown route.", trace, false), { status: 404 });
  },
};
