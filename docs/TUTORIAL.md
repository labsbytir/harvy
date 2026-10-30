---
publish: true
title: Build an integration
description: End-to-end tutorial — poll events, page safely, read evidence, and update state without losing writes.
tags: [guide, tutorial]
---

# Build an integration

**Status:** Tutorial derived from the checked-in contracts; it has **not** been executed against a deployed API (none is verified). Run it only against your own provisioned deployment with an authorized key. See [[STATUS|Implementation status]].

This tutorial builds the most common integration: a poller that reads new events, inspects source evidence, and marks items as reviewed — without losing concurrent writes. It uses the events contract ([[API_ENDPOINTS|API endpoints]]) and the error envelope ([[API_EXAMPLES|API examples]]). Prerequisites: `HARVY_API_KEY` and `HARVY_ORGANIZATION_ID` injected, product `Newsk` enabled, capability `events.edit` ([[AUTH|Authentication]]).

## Step 1 — Learn your scope

Every integration starts at `/api/v1/context`. It tells you which products are enabled and which capabilities the key has, so the poller fails fast instead of looping on `403`s.

## Step 2 — Poll events with a cursor

Page with the opaque `next_cursor` and pass it back as `before`. Pollers usually track a `from` timestamp watermark so each cycle only asks for what changed.

## Step 3 — Read evidence before acting

`GET /api/v1/events/:id` returns up to 100 evidence rows. Integrations that classify or route events should read the evidence — evidence-less handoffs are rejected anyway (`409 insufficient_evidence`).

## Step 4 — Write with the current revision

Update with the `revision` you just read. On `409 revision_conflict`, re-read and decide; never overwrite blindly.

## The complete poller (Python)

One file, standard `requests` library. It polls once per run (wire it to cron or your scheduler):

```python
"""Harvy events poller — source-derived example, not executed against a live API."""
import os, sys, time
import requests

BASE = os.environ.get("HARVY_API_BASE", "https://harvy.dev")
HEADERS = {
    "x-api-key": os.environ["HARVY_API_KEY"],
    "x-harvy-organization-id": os.environ["HARVY_ORGANIZATION_ID"],
}
PRODUCT = "Newsk"


def call(method, path, **kwargs):
    response = requests.request(method, BASE + path, headers=HEADERS, timeout=30, **kwargs)
    if not response.ok:
        problem = response.json().get("error", {}) if response.content else {}
        print(f"{method} {path} -> {response.status_code} {problem.get('code')}"
              f" trace={problem.get('trace_id')}", file=sys.stderr)
        response.raise_for_status()
    return response.json()


def main():
    context = call("GET", "/api/v1/context")
    if PRODUCT not in context["allowedProducts"] or "events.view" not in context["capabilities"]:
        sys.exit(f"Key lacks {PRODUCT} / events.view: {context['allowedProducts']} {context['capabilities']}")

    can_write = "events.edit" in context["capabilities"]
    watermark = str(int(time.time() * 1000) - 24 * 60 * 60 * 1000)  # last 24h

    cursor, seen = None, 0
    while True:
        params = {"product": PRODUCT, "limit": "50", "from": watermark}
        if cursor:
            params["before"] = cursor
        page = call("GET", "/api/v1/events", params=params)

        for event in page["items"]:
            seen += 1
            detail = call("GET", f"/api/v1/events/{event['id']}", params={"product": PRODUCT})
            for item in detail["evidence"]:
                print(f"  evidence: {item['publisher']} {item['source_url']}")

            if can_write and event["status"] == "new":
                try:
                    call("PATCH", f"/api/v1/events/{event['id']}", params={"product": PRODUCT},
                         json={"status": "reviewing", "expected_revision": detail["revision"]})
                except requests.HTTPError:
                    pass  # 409: someone else moved it first; correct to skip
                break  # demo: one write per run; remove to process every event

        cursor = page.get("next_cursor")
        if not cursor:
            break

    print(f"processed {seen} events")


if __name__ == "__main__":
    main()
```

Run it with `python poller.py`. It deliberately writes at most one event per run so you can observe behavior before enabling the loop; remove the `break` to process everything.

## The same flow in JavaScript

For Node 18+, without dependencies:

```js
const BASE = process.env.HARVY_API_BASE ?? "https://harvy.dev";
const headers = {
  "x-api-key": process.env.HARVY_API_KEY,
  "x-harvy-organization-id": process.env.HARVY_ORGANIZATION_ID,
};

async function call(method, path, body) {
  const response = await fetch(BASE + path, {
    method,
    headers: body ? { ...headers, "Content-Type": "application/json" } : headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const problem = payload?.error ?? {};
    throw new Error(`${method} ${path} -> ${response.status} ${problem.code} trace=${problem.trace_id}`);
  }
  return payload;
}

const context = await call("GET", "/api/v1/context");
if (!context.allowedProducts.includes("Newsk")) throw new Error("Newsk not enabled");

let cursor = null;
do {
  const params = new URLSearchParams({ product: "Newsk", limit: "50" });
  if (cursor) params.set("before", cursor);
  const page = await call("GET", `/api/v1/events?${params}`);
  for (const event of page.items) {
    const detail = await call("GET", `/api/v1/events/${event.id}?product=Newsk`);
    if (event.status === "new") {
      try {
        await call("PATCH", `/api/v1/events/${event.id}?product=Newsk`,
          { status: "reviewing", expected_revision: detail.revision });
      } catch { /* 409: concurrent writer won; re-read if you must retry */ }
    }
  }
  cursor = page.next_cursor;
} while (cursor);
```

## Production checklist

Before this runs unattended:

1. **Persist the watermark** — store the newest `last_seen_at` you processed instead of a fixed 24-hour window; treat `from` as inclusive and dedupe by event ID at boundaries.
2. **Backoff on `503`/`429`** — transient dependency or quota failures are retryable; `401/403/400` are not.
3. **Never log keys** — log `trace_id` and `code`, not headers or full URLs with parameters.
4. **Respect scope** — do not fan out IDs across organizations; an out-of-scope record is `404` by design.
5. **Idempotency for writes** — PATCH is safe to skip on `409`, but if your integration starts runs (`POST /api/v1/runs`), use a stable `idempotency_key` per logical run ([[API_ENDPOINTS|Runs]]).
6. **Cache nothing shared** — API responses are `private, no-store`.

## Where to go next

- [[API_ENDPOINTS|API endpoints]] — contracts for stories, dashboards, runs and more.
- [[QUERY_GUIDE|Query guide]] — aggregate what you ingest.
- [[CODE_WALKTHROUGH|Code walkthrough]] — why the server behaves as this tutorial assumes.
