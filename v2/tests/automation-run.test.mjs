import test from "node:test";
import assert from "node:assert/strict";
import {
	parseAutomationRunRequest,
	isExcludedConnectorId,
	canTransitionAutomationRun,
	isTerminalAutomationRun,
} from "../shared/automation-run.ts";

const request = {
	contract_version: 1,
	run_id: "123e4567-e89b-42d3-a456-426614174099",
	trace_id: "123e4567-e89b-42d3-a456-426614174098",
	config_revision: "1",
	connector_id: "approved-news",
	source_scope_id: "publisher-feed",
	access_scope_id: "tenant-1",
	target_url: "https://example.org/news",
	mode: "scrape",
	provider: "spider_unlimited",
	required_proxy: "webshare",
	max_pages: 1,
	deadline_seconds: 60,
	idempotency_key: "job-12345",
};

test("Automation envelope accepts a bounded explicit scope", () => {
	assert.deepEqual(parseAutomationRunRequest(request), request);
	assert.deepEqual(parseAutomationRunRequest({ ...request, mode: "crawl" })?.mode, "crawl");
	assert.deepEqual(parseAutomationRunRequest({ ...request, mode: "links" })?.mode, "links");
});

test("Automation envelope rejects missing scope, unbounded work, and unsafe target syntax", () => {
	for (const changed of [
		{ access_scope_id: undefined },
		{ source_scope_id: undefined },
		{ max_pages: 0 },
		{ max_pages: 101 },
		{ deadline_seconds: 901 },
		{ target_url: "http://example.org/news" },
		{ target_url: "https://user:pass@example.org/news" },
		{ target_url: "https://localhost/news" },
		{ target_url: "https://example.org/news#fragment" },
		{ required_proxy: "none" },
		{ provider: "spider_metered" },
		{ unexpected_field: "value" },
	]) {
		assert.equal(parseAutomationRunRequest({ ...request, ...changed }), null);
	}
});

test("excluded legacy connectors cannot enter the new run contract", () => {
	for (const connector_id of ["telegram", "telegram-channels", "judyrecords", "truthsocial", "truth-social", "sam-gov", "samgov"]) {
		assert.equal(isExcludedConnectorId(connector_id), true);
		assert.equal(parseAutomationRunRequest({ ...request, connector_id }), null);
	}
	assert.equal(isExcludedConnectorId("approved-news"), false);
});

test("a submitted run is not complete and terminal status cannot reopen", () => {
	assert.equal(isTerminalAutomationRun("queued"), false);
	assert.equal(canTransitionAutomationRun("queued", "succeeded"), false);
	assert.equal(canTransitionAutomationRun("queued", "running"), true);
	assert.equal(canTransitionAutomationRun("running", "partial"), true);
	assert.equal(canTransitionAutomationRun("running", "succeeded"), true);
	assert.equal(canTransitionAutomationRun("succeeded", "running"), false);
	assert.equal(isTerminalAutomationRun("partial"), true);
});
