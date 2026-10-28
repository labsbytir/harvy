"""Bounded operator preview for Automation; does not publish Harvy records."""
import argparse
import gzip
import hashlib
import html
import ipaddress
import json
import math
import os
import re
import sys
import time
import uuid
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path
from typing import Optional, Union
from urllib import error, parse, request

MAX_BYTES = 5_000_000
IP_CHECK = "https://ipv4.webshare.io/"
SPIDER = "https://api.spider.cloud/unlimited/scrape"
ID = re.compile(r"[a-z][a-z0-9-]{0,95}")


class PreviewError(Exception):
    """Safe operational error; never includes response bodies or credentials."""


class NoRedirect(request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise PreviewError("Unexpected redirect; the preview was stopped.")


class Transport:
    def __init__(self, proxy_url: str):
        self.proxy = request.build_opener(request.ProxyHandler({"http": proxy_url, "https": proxy_url}), NoRedirect())
        self.provider = request.build_opener(request.ProxyHandler({}), NoRedirect())

    def send(self, url: str, body: Optional[bytes], headers: dict, proxied: bool, timeout: float) -> tuple:
        if proxied and request.proxy_bypass(parse.urlsplit(url).hostname):
            raise PreviewError("The host proxy-bypass configuration excludes the required preflight target.")
        opener = self.proxy if proxied else self.provider
        req = request.Request(url, data=body, headers=headers)
        read_deadline = time.monotonic() + timeout
        try:
            with opener.open(req, timeout=timeout) as response:
                chunks, total = [], 0
                while True:
                    # shortcut: one socket read may overrun the budget; use cancellable I/O before service integration.
                    if time.monotonic() >= read_deadline:
                        raise PreviewError("The response read deadline was reached.")
                    chunk = response.read1(min(65_536, MAX_BYTES + 1 - total))
                    if not chunk:
                        break
                    total += len(chunk)
                    if total > MAX_BYTES:
                        raise PreviewError("Response exceeded the preview byte limit.")
                    chunks.append(chunk)
                return response.status, dict(response.headers), b"".join(chunks)
        except error.HTTPError as exc:
            status, response_headers = exc.code, dict(exc.headers or {})
            exc.close()
            return status, response_headers, b""
        except (error.URLError, OSError, ValueError):
            raise PreviewError("Network request failed; no direct-source fallback was used.") from None


def validate_config(subreddit: str, limit: int, source_scope_id: str, access_scope_id: str, proxy_url: str) -> None:
    if not isinstance(subreddit, str) or not re.fullmatch(r"[a-z0-9_]{2,21}", subreddit):
        raise PreviewError("Choose a lowercase subreddit name without a URL.")
    if type(limit) is not int or not 1 <= limit <= 10:
        raise PreviewError("The sample limit must be 1–10 posts.")
    if not all(isinstance(value, str) and ID.fullmatch(value) for value in (source_scope_id, access_scope_id)):
        raise PreviewError("Explicit registered source and access scope IDs are required.")
    try:
        proxy = parse.urlsplit(proxy_url)
        valid = proxy.scheme == "http" and proxy.hostname and proxy.port and not proxy.path.strip("/") and not proxy.query and not proxy.fragment
        valid = valid and not re.search(r"\s", proxy_url)
    except (ValueError, TypeError):
        valid = False
    if not valid:
        raise PreviewError("Inject a valid HTTP proxy URL with an explicit port.")


def decode_json(payload: Union[str, bytes]) -> object:
    try:
        return json.loads(payload)
    except (ValueError, UnicodeError, TypeError):
        raise PreviewError("Expected valid JSON; the response may be a blocked page.") from None


def source_content(payload: bytes, expected_url: str) -> str:
    pages = decode_json(payload)
    if not isinstance(pages, list) or len(pages) != 1 or not isinstance(pages[0], dict):
        raise PreviewError("Expected exactly one captured page.")
    page = pages[0]
    if page.get("status") != 200 or page.get("error"):
        raise PreviewError("The target returned an error or blocked page.")
    returned_url = page.get("url", expected_url)
    if not isinstance(returned_url, str) or returned_url.split("?")[0].lower() != expected_url.split("?")[0].lower() or "#" in returned_url:
        raise PreviewError("The capture came from an unexpected source URL.")
    content = page.get("content")
    if not isinstance(content, str) or len(content.encode("utf-8")) > MAX_BYTES:
        raise PreviewError("Missing or oversized source content.")
    try:
        json.loads(content)
        return content
    except ValueError:
        pass
    pre = re.search(r"<pre\b[^>]*>(.*?)</pre>", content, re.I | re.S)
    return html.unescape(pre.group(1)) if pre else content


def ipv4(payload: Union[str, bytes]) -> str:
    try:
        text = payload.decode("utf-8").strip() if isinstance(payload, bytes) else payload.strip()
        if text.startswith("{"):
            result = json.loads(text)
            if result.get("proxy") is False:
                raise ValueError()
            text = result["ip"]
        address = ipaddress.ip_address(text)
        if address.version != 4 or address.is_loopback or address.is_link_local or address.is_private or address.is_unspecified:
            raise ValueError()
        return str(address)
    except (ValueError, UnicodeError, TypeError, AttributeError, KeyError):
        raise PreviewError("Proxy preflight did not return a public IPv4 address.") from None


def redact(text: str, secrets: list) -> str:
    for secret in secrets:
        if secret:
            text = text.replace(secret, "[redacted]")
    text = re.sub(r"\bsk-[A-Za-z0-9_-]{12,}", "[redacted]", text)
    text = re.sub(r"Bearer\s+[A-Za-z0-9._~-]+", "Bearer [redacted]", text, flags=re.I)
    return re.sub(r"https?://[^\s/\"]+:[^\s/\"]+@[^\s\"]+", "[redacted proxy]", text, flags=re.I)


def normalize(content: str, subreddit: str, limit: int, collected_at: datetime) -> tuple:
    listing = decode_json(content)
    if not isinstance(listing, dict) or listing.get("kind") != "Listing" or not isinstance(listing.get("data"), dict):
        raise PreviewError("The source is not a Reddit listing.")
    children = listing["data"].get("children")
    if not isinstance(children, list):
        raise PreviewError("The source is not a Reddit post listing.")
    records = {}
    for entry in children:
        post = entry.get("data") if isinstance(entry, dict) else None
        if not isinstance(post, dict) or entry.get("kind") != "t3" or not isinstance(post.get("id"), str) or not re.fullmatch(r"[a-z0-9]{3,20}", post["id"]) or str(post.get("subreddit", "")).lower() != subreddit:
            raise PreviewError("A post failed source or identity validation.")
        post_id = post["id"]
        permalink = post.get("permalink", "")
        decoded = parse.unquote(permalink) if isinstance(permalink, str) else ""
        if not decoded.lower().startswith(f"/r/{subreddit}/comments/{post_id}/") or re.search(r"[?#\\\x00-\x1f]", decoded) or any(part in (".", "..") for part in decoded.split("/")):
            raise PreviewError("Invalid Reddit post path.")
        created = post.get("created_utc")
        if type(created) not in (int, float) or not math.isfinite(created) or not 0 < created <= collected_at.timestamp() + 300:
            raise PreviewError("Invalid Reddit post timestamp.")
        if not isinstance(post.get("title"), str) or not post["title"].strip():
            raise PreviewError("A post has no valid title.")
        if post_id in records or len(records) >= limit:
            continue
        records[post_id] = {
            "source_record_id": f"t3_{post_id}", "source_url": f"https://www.reddit.com{permalink}",
            "subreddit": subreddit, "title": post["title"],
            "author": post.get("author") if isinstance(post.get("author"), str) else None,
            "text": post.get("selftext") if isinstance(post.get("selftext"), str) else "",
            "created_at": datetime.fromtimestamp(created, timezone.utc).isoformat(),
            "score": post.get("score") if type(post.get("score")) is int else None,
            "num_comments": post.get("num_comments") if type(post.get("num_comments")) is int and post["num_comments"] >= 0 else None,
        }
    return list(records.values()), bool(listing["data"].get("after"))


def collect(subreddit: str, limit: int, source_scope_id: str, access_scope_id: str,
            api_key: str, proxy_url: str, transport: Optional[Transport] = None,
            deadline_seconds: int = 180) -> dict:
    validate_config(subreddit, limit, source_scope_id, access_scope_id, proxy_url)
    if not isinstance(api_key, str) or not api_key.strip() or api_key.startswith("Bearer "):
        raise PreviewError("Inject SPIDER_API_KEY without a Bearer prefix.")
    if type(deadline_seconds) is not int or not 10 <= deadline_seconds <= 300:
        raise PreviewError("The preview deadline must be 10–300 seconds.")
    transport = transport or Transport(proxy_url)
    deadline = time.monotonic() + deadline_seconds

    def send(url, body=None, proxied=False):
        headers = {"Accept": "application/json"}
        if url == SPIDER:
            headers.update({"Content-Type": "application/json", "Authorization": f"Bearer {api_key}"})
        for attempt in range(3):
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                raise PreviewError("The preview deadline was reached.")
            status, response_headers, payload = transport.send(url, body, headers, proxied, min(20, remaining))
            if status == 200:
                if len(payload) > MAX_BYTES:
                    raise PreviewError("Response exceeded the preview byte limit.")
                return payload
            if url != SPIDER or status != 429 and not 500 <= status <= 599 or attempt == 2:
                raise PreviewError(f"Preflight or capture failed with HTTP {status}; no fallback was used.")
            retry = next((v for k, v in response_headers.items() if k.lower() == "retry-after"), "0")
            try:
                wait = float(retry) if str(retry).isdigit() else parsedate_to_datetime(retry).timestamp() - time.time()
            except (ValueError, TypeError, OverflowError):
                wait = 0
            wait = max(5 * 2 ** attempt, wait)
            if wait > 60 or wait >= deadline - time.monotonic():
                raise PreviewError("Retry-After exceeds the bounded preview wait.")
            time.sleep(wait)

    def scrape(url):
        body = json.dumps({"url": url, "request": "smart", "return_format": "raw", "cache": False,
                           "session": False, "return_cookies": False, "remote_proxy": proxy_url,
                           "stealth": False, "router": {"mode": "off"}, "max_size": MAX_BYTES}).encode()
        return source_content(send(SPIDER, body), url)

    direct_ip = ipv4(send(IP_CHECK, proxied=True))
    if ipv4(scrape(IP_CHECK)) != direct_ip:
        raise PreviewError("Spider target egress did not match the verified static proxy.")
    source_url = f"https://www.reddit.com/r/{subreddit}/new.json?limit={limit}&raw_json=1"
    content = scrape(source_url)
    captured_at = datetime.now(timezone.utc)
    records, has_more = normalize(content, subreddit, limit, captured_at)
    safe_content = redact(content, [api_key, proxy_url])
    return {
        "schema_version": 1, "preview_id": f"reddit-{uuid.uuid4()}", "published": False,
        "source_scope_id": source_scope_id, "access_scope_id": access_scope_id,
        "source_url": source_url, "collected_at": captured_at.isoformat(),
        "proxy_verified": True, "target_egress_verified": True, "complete": False,
        "limitations": ["One public listing page; no comments, full history, or media archive.",
                        "Operator preview only; scope authorization and Harvy publication are not implemented."],
        "record_count": len(records), "has_more": has_more,
        "records": decode_json(redact(json.dumps(records), [api_key, proxy_url])),
        "source_capture": safe_content, "redaction_applied": safe_content != content,
    }


def write_preview(capture: dict, output_dir: Union[str, Path]) -> dict:
    root = Path(output_dir).resolve()
    if not root.is_dir():
        raise PreviewError("Choose an existing output directory outside the repository.")
    repo = Path(__file__).resolve().parents[2]
    if root == repo or repo in root.parents:
        raise PreviewError("Source captures must be written outside the repository.")
    destination = root / capture["preview_id"]
    destination.mkdir(mode=0o700)
    manifests = []
    for name, content in [("source.json.gz", capture["source_capture"].encode()),
                          ("records.json.gz", json.dumps({k: v for k, v in capture.items() if k != "source_capture"}, ensure_ascii=False).encode())]:
        data = gzip.compress(content, mtime=0)
        path = destination / name
        fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, "wb") as target:
            target.write(data)
        manifests.append({"path": str(path), "sha256": hashlib.sha256(data).hexdigest(), "byte_count": len(data)})
    summary = {k: capture[k] for k in ("preview_id", "published", "source_scope_id", "access_scope_id", "source_url", "collected_at", "record_count", "proxy_verified", "target_egress_verified", "complete", "limitations", "redaction_applied")}
    summary["local_artifacts"] = manifests
    (destination / "manifest.json").write_text(json.dumps(summary, indent=2) + "\n")
    return summary


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--subreddit", required=True)
    parser.add_argument("--source-scope-id", required=True)
    parser.add_argument("--access-scope-id", required=True)
    parser.add_argument("--limit", type=int, default=10)
    parser.add_argument("--output-dir", required=True)
    args = parser.parse_args()
    try:
        capture = collect(args.subreddit, args.limit, args.source_scope_id, args.access_scope_id,
                          os.environ.get("SPIDER_API_KEY", ""), os.environ.get("WEBSHARE_PROXY_URL", ""))
        print(json.dumps(write_preview(capture, args.output_dir)))
    except PreviewError as exc:
        print(f"Reddit preview failed: {exc} No result was published.", file=sys.stderr)
        return 1
    except (OSError, UnicodeError):
        print("Reddit preview failed while handling local artifacts. No result was published.", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
