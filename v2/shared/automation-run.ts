/** Control envelope for Harvy API -> Automation. This does not authorize a source. */
export interface AutomationRunRequest {
	contract_version: 1;
	connector_id: string;
	source_scope_id: string;
	access_scope_id: string;
	target_url: string;
	mode: "scrape" | "crawl" | "links";
	provider: "spider_unlimited";
	required_proxy: "webshare";
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

function isId(value: unknown): value is string {
	return typeof value === "string" && /^[a-z][a-z0-9-]{0,95}$/.test(value);
}

function isIdempotencyKey(value: unknown): value is string {
	return typeof value === "string" && value.length >= 8 && value.length <= 128 &&
		/^[A-Za-z0-9._:-]+$/.test(value);
}

function isSourceUrl(value: unknown): value is string {
	if (typeof value !== "string" || value.length > 2048) return false;
	try {
		const url = new URL(value);
		return url.protocol === "https:" && !!url.hostname && !url.username && !url.password &&
			!url.hash && url.hostname !== "localhost" && !url.hostname.endsWith(".local") &&
			!url.hostname.endsWith(".internal") && !url.hostname.endsWith(".localhost") &&
			url.hostname !== "127.0.0.1" && url.hostname !== "::1" &&
			!/^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.)/.test(url.hostname);
	} catch {
		return false;
	}
}

/** Explicitly excluded legacy sources cannot enter the new Automation boundary. */
export function isExcludedConnectorId(value: string): boolean {
	return /^(telegram|judyrecords|truth-?social|sam-?gov)(?:$|-)/.test(value);
}

/**
 * Shape and bounds check only. Automation must still authorize the connector,
 * registered source scope, access scope, target URL, provider, and proxy egress.
 */
export function parseAutomationRunRequest(value: unknown): AutomationRunRequest | null {
	if (!isRecord(value)) return null;
	const fields = [
		"contract_version", "connector_id", "source_scope_id", "access_scope_id",
		"target_url", "mode", "provider", "required_proxy", "max_pages",
		"deadline_seconds", "idempotency_key",
	];
	if (Object.keys(value).some((key) => !fields.includes(key))) return null;
	if (value.contract_version !== 1 || !isId(value.connector_id) ||
		isExcludedConnectorId(value.connector_id) || !isId(value.source_scope_id) ||
		!isId(value.access_scope_id) || !isSourceUrl(value.target_url) ||
		!["scrape", "crawl", "links"].includes(String(value.mode)) ||
		value.provider !== "spider_unlimited" || value.required_proxy !== "webshare" ||
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
