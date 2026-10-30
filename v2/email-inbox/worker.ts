/** Receive-only email inbox: stores inbound MIME to R2; authenticated read-only HTTP API. */
import type { Fetcher } from "@cloudflare/workers-types";

interface Env {
  HARVY_INBOX: R2Bucket;
  AUTH: Fetcher;
}

interface Actor { id: string; tenantId: string }

// Actor shape matches v2/api/worker.ts; the inbox scopes all reads by tenantId.
async function actor(request: Request, env: Env): Promise<Actor | null> {
  try {
    const authRequest = new Request("https://auth.internal/__internal/actor", { headers: request.headers });
    const response = await env.AUTH.fetch(authRequest);
    if (!response.ok) return null;
    const value = await response.json() as Partial<Actor>;
    return typeof value.id === "string" && typeof value.tenantId === "string" ? { id: value.id, tenantId: value.tenantId } : null;
  } catch { return null; }
}

const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });

// Tiny header parser over the raw header block; no dependencies.
function parseHeaders(head: string): Record<string, string> {
  const out: Record<string, string> = {};
  const folded = head.replace(/\r\n[ \t]+/g, " ");
  for (const line of folded.split(/\r?\n/)) {
    const idx = line.indexOf(":");
    if (idx <= 0) continue;
    const name = line.slice(0, idx).trim().toLowerCase();
    if (!out[name]) out[name] = line.slice(idx + 1).trim();
  }
  return out;
}

// Plus-addressing (local+<tenantId>@domain) attributes inbound mail to one tenant; the tag is sender-controlled, so it is strictly validated.
function tenantFromRecipient(to: string): string | null {
  const local = to.split("@", 1)[0] || "";
  const plus = local.indexOf("+");
  const tag = plus >= 0 ? local.slice(plus + 1) : "";
  return /^[A-Za-z0-9._-]+$/.test(tag) ? tag : null;
}

export default {
  async email(message: ForwardableEmailMessage, env: Env): Promise<void> {
    try {
      const raw = new Uint8Array(await new Response(message.raw).arrayBuffer());
      const tenantId = tenantFromRecipient(message.to);
      if (!tenantId) { message.setReject("unrecognized inbox address"); return; }
      const headEnd = raw.length > 65_536 ? 65_536 : raw.length;
      const head = new TextDecoder("latin1").decode(raw.subarray(0, headEnd)).split(/\r?\n\r?\n/, 1)[0] || "";
      const headers = parseHeaders(head);
      const day = new Date().toISOString().slice(0, 10).replaceAll("-", "/");
      const base = `inbox/${tenantId}/${day}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
      const meta = {
        from: headers["from"] || null,
        to: headers["to"] || message.to,
        subject: headers["subject"] || null,
        date: headers["date"] || null,
        messageId: headers["message-id"] || null,
        receivedAt: new Date().toISOString(),
        size: raw.byteLength,
      };
      await Promise.all([
        env.HARVY_INBOX.put(`${base}.eml`, raw, { httpMetadata: { contentType: "message/rfc822" } }),
        env.HARVY_INBOX.put(`${base}.json`, JSON.stringify(meta), { httpMetadata: { contentType: "application/json" } }),
      ]);
    } catch {
      message.setReject("inbox storage unavailable");
    }
  },

  async fetch(request: Request, env: Env): Promise<Response> {
    const a = await actor(request, env);
    if (a === null) return json({ error: "unauthorized" }, 401);
    const url = new URL(request.url);
    if (request.method !== "GET") return json({ error: "method_not_allowed" }, 405);
    const prefix = `inbox/${a.tenantId}/`;
    if (url.pathname === "/") {
      const listed = await env.HARVY_INBOX.list({ prefix, limit: 1000 });
      const keys = listed.objects.map((o) => o.key).filter((k) => k.endsWith(".json")).sort().reverse().slice(0, 200);
      const items = await Promise.all(keys.map(async (key) => {
        const body = await env.HARVY_INBOX.get(key);
        try { return { key: key.replace(/\.json$/, ".eml"), ...(body ? await body.json() as object : {}) }; }
        catch { return { key: key.replace(/\.json$/, ".eml") }; }
      }));
      return json({ items });
    }
    if (url.pathname.startsWith("/m/")) {
      const key = decodeURIComponent(url.pathname.slice(3));
      if (!key.startsWith(prefix) || !key.endsWith(".eml")) return json({ error: "not_found" }, 404);
      const object = await env.HARVY_INBOX.get(key);
      if (!object) return json({ error: "not_found" }, 404);
      return new Response(object.body, { headers: { "Content-Type": "message/rfc822", "Cache-Control": "no-store" } });
    }
    return json({ error: "not_found" }, 404);
  },
};
