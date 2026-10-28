# Reddit Automation preview

`v2/automation/reddit_preview.py` is a bounded operator preview runner for the
Automation host. It uses Python's standard library and adds no package dependency.
It is not a deployed connector or HTTP endpoint, and it does not publish records
to PostgreSQL, D1, R2, Basin, or the UI. No schedule is installed or activated.

## Run after operator access is configured

The Automation host must receive `SPIDER_API_KEY` and `WEBSHARE_PROXY_URL` through
approved scoped secret injection. Cloudflare Worker bindings do not automatically
populate an external host's environment. Do not put either value in commands,
workflow exports, Git, screenshots, or logs. n8n continues to submit control
envelopes to Automation; do not execute this CLI through an exposed shell node.

Run from the repository root, with an existing private output directory outside
the repository. The example scope IDs are placeholders: the operator must supply
registered, authorized source and access scopes before contacting a source.

```sh
python3 v2/automation/reddit_preview.py \
  --subreddit worldnews --limit 10 \
  --source-scope-id reddit-worldnews \
  --access-scope-id replace-with-approved-scope \
  --output-dir /private/operator-preview
```

The runner checks the direct Webshare IPv4 path, then uses Spider Unlimited to
capture that same endpoint with `remote_proxy`. Both observed IPv4 addresses must
match before a Reddit URL is requested. This first verification supports a static
proxy path; rotating pools need a separately approved egress verification strategy.
A host `NO_PROXY` exclusion cannot silently bypass the direct preflight.

An HTTP 407 stops before Spider. Invalid provider credentials, source challenges,
unexpected URLs/redirects, mismatched egress, oversized responses, and malformed
post records also stop the preview. Source requests always use
`/unlimited/scrape`; there is no direct Reddit or metered fallback. Provider 429/5xx
responses get at most three attempts, honoring `Retry-After` up to 60 seconds
within a 180-second run budget. Network failures stop immediately. Socket I/O has
at most a 20-second timeout and the read budget is checked between bounded chunks;
an in-flight read can exceed the budget by one socket timeout. Cancellable I/O is
required before service integration. Do not overlap runs without provider capacity.

## Evidence and limits

Only one public listing page and up to ten distinct posts are accepted. Retained
fields include source IDs/URLs, text, author, source time, score, and comment count.
Comments, historical pagination, images, and videos are not downloaded. Source
permissions and operator scope authorization are prerequisites, not established
by this CLI's syntax checks or a public URL.

The output directory contains a new private run directory with compressed source
JSON, compressed normalized records, and a manifest with hashes, byte lengths,
scope labels, capture time, coverage limits, and `published: false`. Redaction of
injected credential strings is recorded explicitly; HTML browser wrappers are
unwrapped when present, so the capture is not a byte-for-byte HTTP response.
Partial artifact directories are unpublished and may remain after a disk error.
CLI stdout contains only summary/manifest metadata; source payloads stay in files.

Source post IDs remain external IDs. HarvyDex mapping, durable idempotency,
tenant/service authorization, R2 publication, canonical run tracking, and the
Automation HTTP dispatch endpoint still require implementation and verification.
The installed legacy n8n preview is not a production integration for this repo.

## Verification

`npm run test:automation` covers synthetic replies, preflight ordering, target
egress mismatch, blocked/malformed sources, redaction, deduplication, bounds,
retry/deadline handling, proxy bypass rejection, and compressed artifact hashes.
It does not contact providers. Live Reddit access remains unverified until the
proxy owner provides a working approved authorization path.

References: [Spider Unlimited](https://spider.cloud/docs/api/unlimited/),
[Webshare IP authorization](https://help.webshare.io/en/articles/8375312-ip-authorization).
