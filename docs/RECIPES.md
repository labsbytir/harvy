---
publish: true
title: Recipes
description: Short copyable snippets for common integration tasks.
tags: [api, guide]
---

# Recipes

**Status:** Source-derived snippets (2026-10-30), not executed against a deployed API. Assumes `HARVY_API_KEY` and `HARVY_ORGANIZATION_ID` are set ([[GETTING_STARTED|Get started]]). All examples use Python `requests`; the [[TUTORIAL|tutorial]] shows the JavaScript equivalents of the same patterns.

Headers used below:

```python
import os, requests
H = {"x-api-key": os.environ["HARVY_API_KEY"],
     "x-harvy-organization-id": os.environ["HARVY_ORGANIZATION_ID"]}
BASE = "https://harvy.dev"
```

## Paginate everything

```python
def pages(path, params):
    cursor = None
    while True:
        p = dict(params)
        if cursor: p["before"] = cursor
        page = requests.get(BASE + path, headers=H, params=p, timeout=30).json()
        yield from page["items"]
        cursor = page.get("next_cursor")
        if not cursor: return
```

Works for events; the cursor contract is identical wherever `next_cursor` appears. Keep product and filters constant across pages.

## Mark an event reviewed (revision-safe)

```python
detail = requests.get(f"{BASE}/api/v1/events/{event_id}", headers=H,
                      params={"product": "Newsk"}, timeout=30).json()
r = requests.patch(f"{BASE}/api/v1/events/{event_id}", headers=H,
                   params={"product": "Newsk"},
                   json={"status": "reviewing", "expected_revision": detail["revision"]},
                   timeout=30)
if r.status_code == 409:
    pass  # someone else moved it; re-read if you still need the write
```

## Pause and resume a monitor

```python
source = ...  # from GET /api/v1/sources?product=Newsk
requests.patch(f"{BASE}/api/v1/sources/{source['id']}", headers=H,
               params={"product": "Newsk"},
               json={"enabled": False, "expected_revision": source["revision"]},
               timeout=30)
```

## Build an investigation with an evidence-backed link

```python
inv = requests.post(f"{BASE}/api/v1/investigations", headers=H,
                    json={"product": "Newsk", "title": "Case A", "summary": "Scope."},
                    timeout=30).json()

entity = requests.post(f"{BASE}/api/v1/entities", headers=H,
                       json={"product": "Newsk", "entity_type": "organization",
                             "display_name": "Example Org", "description": "Observed in sources."},
                       timeout=30).json()

requests.post(f"{BASE}/api/v1/relationships", headers=H,
              json={"product": "Newsk",
                    "from_entity_id": entity["id"], "to_entity_id": other_id,
                    "relationship_type": "mentioned_with", "interpretation": "observed",
                    "evidence_id": evidence_id, "notes": "Both named in source X."},
              timeout=30)
```

A relationship **requires** in-scope evidence — the API rejects evidence-free links by design.

## Generate a brief (requires evidence)

```python
story = requests.post(f"{BASE}/api/v1/stories", headers=H,
                      json={"event_id": event_id, "title": "Draft", "notes": "Working notes."},
                      timeout=30).json()
brief = requests.post(f"{BASE}/api/v1/briefs", headers=H,
                      json={"story_id": story["id"]}, timeout=30).json()
print(brief["citations"])
```

## Start a collection run (idempotent)

```python
r = requests.post(f"{BASE}/api/v1/runs", headers=H,
                  json={"source_id": source_id,
                        "idempotency_key": f"nightly-{source_id}-2026-10-30"},
                  timeout=30)
# 202 = queued and dispatched; a repeat of the same key returns the same run
```

Same key + same source = same run; same key + different source = `409 idempotency_conflict`.

## Query aggregates (HQL)

```python
rows = requests.post(f"{BASE}/api/v1/query", headers=H,
                     json={"hql_version": 1, "cube": "evidence_activity",
                           "dimensions": ["source_id"], "measures": ["evidence_count"],
                           "filters": [], "limit": 100},
                     timeout=60).json()["rows"]
```

See [[QUERY_GUIDE|Query guide]] for field rules; check `GET /api/v1/cube/meta` for registered names.

## See also

- [[API_ENDPOINTS|API endpoints]] — full contracts behind each snippet.
- [[ERRORS|Errors]] — codes these snippets can return.
- [[TUTORIAL|Build an integration]] — the complete poller with production checklist.
