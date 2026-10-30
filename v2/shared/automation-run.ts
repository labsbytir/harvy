/** Control envelope for Harvy API -> Automation. This does not authorize a source. */
export interface AutomationRunRequest {
	contract_version: 1;
	run_id: string;
	trace_id: string;
	config_revision: string;
	connector_id: string;
	source_scope_id: string;
	access_scope_id: string;
	target_url: string;
	mode: "scrape" | "crawl" | "links" | "api";
	provider: "spider_unlimited" | "registered_api";
	required_proxy: "webshare";
	preflight_required: true;
	direct_fallback_allowed: false;
	max_pages: number;
	deadline_seconds: number;
	idempotency_key: string;
}

export type AutomationRunStatus = "queued" | "running" | "succeeded" | "partial" | "failed" | "cancelled";

const terminal = new Set<AutomationRunStatus>(["succeeded", "partial", "failed", "cancelled"]);
const transitions: Record<AutomationRunStatus, readonly AutomationRunStatus[]> = {
	queued: ["running", "failed", "cancelled"],
	running: ["succeeded", "partial", "failed", "cancelled"],
	succeeded: [],
	partial: [],
	failed: [],
	cancelled: [],
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isConnectorId(value: unknown): value is string {
	return typeof value === "string" && /^[a-z][a-z0-9_-]{0,95}$/.test(value);
}

function isScopeId(value: unknown): value is string {
	return typeof value === "string" && /^[a-zA-Z0-9_-][a-zA-Z0-9._:-]{0,127}$/.test(value);
}

function isIdempotencyKey(value: unknown): value is string {
	return typeof value === "string" && value.length >= 8 && value.length <= 128 &&
		/^[A-Za-z0-9._:-]+$/.test(value);
}

export function isSafeSourceUrl(value: unknown): value is string {
	if (typeof value !== "string" || value.length > 2048) return false;
	try {
		const url = new URL(value);
		const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
		if (url.protocol !== "https:" || !host || url.username || url.password || url.hash ||
			host === "localhost" || host.endsWith(".local") || host.endsWith(".internal") || host.endsWith(".localhost") ||
			host.includes(":")) return false;
		const octets = host.split(".").map(Number);
		if (octets.length === 4 && octets.every((part) => Number.isInteger(part) && part >= 0 && part <= 255)) {
			const [a, b] = octets;
			if (a === 0 || a === 10 || a === 127 || a >= 224 ||
				(a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
				(a === 172 && b >= 16 && b <= 31) || (a === 192 && (b === 0 || b === 168)) ||
				(a === 198 && (b === 18 || b === 19 || b === 51)) || (a === 203 && b === 0)) return false;
		}
		return true;
	} catch {
		return false;
	}
}

/** Explicitly excluded legacy sources cannot enter the new Automation boundary. */
export function isExcludedConnectorId(value: string): boolean {
	return /^(telegram|judyrecords|truth[-_]?social|sam[-_]?gov)(?:$|[-_])/.test(value);
}

/**
 * Shape and bounds check only. Automation must still authorize the workflow,
 * registered source scope, access scope, target URL, provider, and proxy egress.
 */
export function parseAutomationRunRequest(value: unknown): AutomationRunRequest | null {
	if (!isRecord(value)) return null;
	const fields = [
		"contract_version", "run_id", "trace_id", "config_revision", "connector_id", "source_scope_id", "access_scope_id",
		"target_url", "mode", "provider", "required_proxy", "preflight_required", "direct_fallback_allowed", "max_pages",
		"deadline_seconds", "idempotency_key",
	];
	if (Object.keys(value).some((key) => !fields.includes(key))) return null;
	if (value.contract_version !== 1 ||
		!isScopeId(value.run_id) || !isIdempotencyKey(value.trace_id) ||
		typeof value.config_revision !== "string" || !/^[A-Za-z0-9._:-]{1,64}$/.test(value.config_revision) ||
		!isConnectorId(value.connector_id) ||
		isExcludedConnectorId(value.connector_id) || !isScopeId(value.source_scope_id) ||
		!isScopeId(value.access_scope_id) || !isSafeSourceUrl(value.target_url) ||
		!["scrape", "crawl", "links", "api"].includes(String(value.mode)) ||
		!((value.mode === "api" && value.provider === "registered_api") ||
			(value.mode !== "api" && value.provider === "spider_unlimited")) || value.required_proxy !== "webshare" ||
		value.preflight_required !== true || value.direct_fallback_allowed !== false ||
		!Number.isInteger(value.max_pages) || (value.max_pages as number) < 1 ||
		(value.max_pages as number) > 100 || !Number.isInteger(value.deadline_seconds) ||
		(value.deadline_seconds as number) < 10 || (value.deadline_seconds as number) > 900 ||
		!isIdempotencyKey(value.idempotency_key)) return null;
	return value as unknown as AutomationRunRequest;
}

export function canTransitionAutomationRun(from: AutomationRunStatus, to: AutomationRunStatus): boolean {
	return transitions[from]?.includes(to) ?? false;
}

export function isTerminalAutomationRun(status: AutomationRunStatus): boolean {
	return terminal.has(status);
}
