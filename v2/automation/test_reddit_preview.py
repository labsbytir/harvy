"""Synthetic provider replies only; these tests make no network requests."""
import gzip
import hashlib
import json
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import patch

from reddit_preview import IP_CHECK, MAX_BYTES, SPIDER, PreviewError, Transport, collect, normalize, redact, source_content, validate_config, write_preview

PROXY = "http://synthetic-user:synthetic-password@proxy.example:8080"
KEY = "synthetic-provider-key"
NOW = datetime.now(timezone.utc)


def post(post_id="abc123", **changes):
    return {"kind": "t3", "data": {"id": post_id, "subreddit": "worldnews", "title": "Synthetic report",
            "permalink": f"/r/worldnews/comments/{post_id}/report/", "created_utc": NOW.timestamp() - 60,
            "author": "synthetic-author", "selftext": "Synthetic text", "score": 1, "num_comments": 2, **changes}}


def listing(children):
    return json.dumps({"kind": "Listing", "data": {"children": children, "after": "t3_next"}})


def page(content, url=IP_CHECK, status=200):
    return 200, {}, json.dumps([{"status": status, "url": url, "content": content}]).encode()


class FakeTransport:
    def __init__(self, replies):
        self.replies = list(replies)
        self.calls = []

    def send(self, *args):
        self.calls.append(args)
        return self.replies.pop(0)


def run(transport, **kwargs):
    return collect("worldnews", 10, "reddit-worldnews", "operator-approved-public", KEY, PROXY, transport, **kwargs)


def source_url():
    return "https://www.reddit.com/r/worldnews/new.json?limit=10&raw_json=1"


class RedditPreviewTests(unittest.TestCase):
    def test_configuration_rejects_unbounded_or_unscoped_requests(self):
        validate_config("worldnews", 10, "reddit-worldnews", "public-scope", PROXY)
        for args in [("../other", 10, "source", "scope", PROXY), ("worldnews", True, "source", "scope", PROXY),
                     ("worldnews", 11, "source", "scope", PROXY), ("worldnews", 10, "", "scope", PROXY),
                     ("worldnews", 10, "source", "scope", "file:///tmp/proxy"),
                     ("worldnews", 10, "source", "scope", "http://proxy.example:99999")]:
            with self.subTest(args=args), self.assertRaises(PreviewError):
                validate_config(*args)

    def test_proxy_407_stops_before_spider_and_does_not_echo_credentials(self):
        transport = FakeTransport([(407, {}, b"not authenticated")])
        with self.assertRaisesRegex(PreviewError, "HTTP 407") as failure:
            run(transport)
        self.assertEqual(len(transport.calls), 1)
        self.assertEqual(transport.calls[0][0], IP_CHECK)
        self.assertTrue(transport.calls[0][3])
        self.assertNotIn(KEY, str(failure.exception))
        self.assertNotIn(PROXY, str(failure.exception))

    def test_target_egress_must_match_before_reddit_is_requested(self):
        transport = FakeTransport([(200, {}, b"8.8.8.8"), page("8.8.4.4")])
        with self.assertRaisesRegex(PreviewError, "egress did not match"):
            run(transport)
        self.assertEqual(len(transport.calls), 2)
        body = json.loads(transport.calls[1][1])
        self.assertEqual(body["remote_proxy"], PROXY)
        self.assertEqual(body["url"], IP_CHECK)

    def test_success_is_bounded_attributed_deduplicated_and_not_published(self):
        transport = FakeTransport([(200, {}, b"8.8.8.8"), page("8.8.8.8"),
                                   page(listing([post(), post()]), source_url())])
        capture = run(transport)
        self.assertEqual(capture["record_count"], 1)
        self.assertEqual(capture["records"][0]["source_record_id"], "t3_abc123")
        self.assertTrue(capture["records"][0]["source_url"].startswith("https://www.reddit.com/r/worldnews/"))
        self.assertTrue(capture["target_egress_verified"])
        self.assertFalse(capture["published"])
        self.assertFalse(capture["complete"])
        self.assertEqual([call[0] for call in transport.calls], [IP_CHECK, SPIDER, SPIDER])
        self.assertEqual(json.loads(transport.calls[-1][1])["url"], source_url())
        self.assertEqual(json.loads(transport.calls[-1][1])["router"], {"mode": "off"})
        self.assertNotIn(PROXY, json.dumps(capture))

    def test_wrappers_empty_pages_and_post_limit(self):
        wrapped = page("<html><pre>" + listing([]).replace('"', "&quot;") + "</pre></html>")
        self.assertEqual(normalize(source_content(wrapped[2], IP_CHECK), "worldnews", 10, NOW), ([], True))
        records, _ = normalize(listing([post(f"post{n}") for n in range(12)]), "worldnews", 10, NOW)
        self.assertEqual(len(records), 10)
        content = listing([post(selftext="<pre>Text inside the post</pre>", permalink="/r/WorldNews/comments/abc123/report/")])
        captured = source_content(page(content, source_url())[2], source_url())
        self.assertEqual(captured, content)
        self.assertEqual(normalize(captured, "worldnews", 10, NOW)[0][0]["text"], "<pre>Text inside the post</pre>")

    def test_malformed_blocked_cross_source_and_unsafe_posts_are_rejected(self):
        for content in ["<html>Sign in</html>", "[]", listing([post(subreddit="other")]),
                        listing([post(permalink="/r/worldnews/comments/abc123/%2e%2e/secret/")]),
                        listing([post(created_utc=True)]), listing([post(created_utc=1e20)]),
                        listing([post(id=123)]), listing([post(title=None)])]:
            with self.subTest(content=content), self.assertRaises(PreviewError):
                normalize(content, "worldnews", 10, NOW)
        for reply in [page("8.8.8.8", "https://example.com/"), page("8.8.8.8", status=403)]:
            with self.assertRaises(PreviewError):
                source_content(reply[2], IP_CHECK)

    def test_retries_honor_retry_after_and_remain_bounded(self):
        for retry in ("25", "Tue, 27 Oct 2099 22:00:00 GMT"):
            transport = FakeTransport([(200, {}, b"8.8.8.8"), (429, {"Retry-After": retry}, b"error")])
            if retry == "25":
                transport.replies += [page("8.8.8.8"), page(listing([]), source_url())]
                with patch("reddit_preview.time.sleep") as sleep:
                    self.assertEqual(run(transport)["record_count"], 0)
                    sleep.assert_called_once_with(25.0)
            else:
                with self.assertRaisesRegex(PreviewError, "Retry-After"):
                    run(transport)
        transport = FakeTransport([(200, {}, b"8.8.8.8")] + [(503, {}, b"")] * 3)
        with patch("reddit_preview.time.sleep"), self.assertRaisesRegex(PreviewError, "HTTP 503"):
            run(transport)
        self.assertEqual(len(transport.calls), 4)

    def test_oversized_responses_and_deadlines_fail(self):
        with self.assertRaises(PreviewError):
            run(FakeTransport([(200, {}, b"x" * (MAX_BYTES + 1))]))
        with patch("reddit_preview.time.monotonic", side_effect=[0, 181]), self.assertRaisesRegex(PreviewError, "deadline"):
            run(FakeTransport([]))

    def test_proxy_bypass_is_rejected_before_network_io(self):
        transport = Transport(PROXY)
        with patch("reddit_preview.request.proxy_bypass", return_value=True), self.assertRaisesRegex(PreviewError, "proxy-bypass"):
            transport.send(IP_CHECK, None, {}, True, 10)

    def test_streamed_response_checks_deadline_between_chunks(self):
        transport = Transport(PROXY)
        response = unittest.mock.MagicMock()
        response.__enter__.return_value = response
        response.read1.return_value = b"{}"
        with patch.object(transport.provider, "open", return_value=response), \
                patch("reddit_preview.time.monotonic", side_effect=[0, 1, 3]), \
                self.assertRaisesRegex(PreviewError, "read deadline"):
            transport.send(SPIDER, b"{}", {}, False, 2)
        response.read1.assert_called_once()

    def test_capture_redaction_compression_hashes_and_output_scope(self):
        secret_text = f"{KEY} {PROXY} Bearer synthetic-token"
        self.assertNotIn(KEY, redact(secret_text, [KEY, PROXY]))
        transport = FakeTransport([(200, {}, b"8.8.8.8"), page("8.8.8.8"),
                                   page(listing([post(selftext=secret_text)]), source_url())])
        capture = run(transport)
        self.assertTrue(capture["redaction_applied"])
        with tempfile.TemporaryDirectory() as root:
            summary = write_preview(capture, root)
            self.assertNotIn("records", summary)
            self.assertEqual(len(summary["local_artifacts"]), 2)
            for artifact in summary["local_artifacts"]:
                path = Path(artifact["path"])
                data = path.read_bytes()
                self.assertEqual(hashlib.sha256(data).hexdigest(), artifact["sha256"])
                self.assertEqual(len(data), artifact["byte_count"])
                content = gzip.decompress(data).decode()
                self.assertNotIn(KEY, content)
                self.assertNotIn(PROXY, content)
                json.loads(content)
            self.assertFalse(json.loads((path.parent / "manifest.json").read_text())["published"])
        with self.assertRaises(PreviewError):
            write_preview(capture, Path(__file__).resolve().parents[2])


if __name__ == "__main__":
    unittest.main()
