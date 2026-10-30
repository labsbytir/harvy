import type { HarvyProduct } from "./modes";

export interface HarvyContext {
  principalId: string;
  tenantId: string;
  workspaceId: string;
  tenantName: string;
  role: string;
  allowedProducts: string[];
  capabilities: string[];
  featureRevision: string;
  ontologySchemaRevision: string;
  hqlVersion: number;
}

export interface ProductEntitlement { product: HarvyProduct; enabled: boolean; revision: number }

export interface Source {
  id: string;
  product: string;
  publisher: string;
  label: string;
  enabled: boolean;
  revision: number;
  created_at: number;
}

export interface HarvyEvent {
  id: string;
  product: string;
  title: string;
  summary: string;
  status: "new" | "reviewing" | "saved" | "closed";
  assigned_to: string | null;
  revision: number;
  first_seen_at: number;
  last_seen_at: number;
  evidence_count: number;
}

export interface EventActivity {
  revision: number;
  status: HarvyEvent["status"];
  assigned_to: string | null;
  changed_by: string;
  changed_at: number;
}

export interface Evidence {
  id: string;
  source_id: string;
  source_url: string;
  publisher: string;
  headline: string;
  excerpt: string;
  captured_at: number;
  artifact_id: string | null;
}

export interface HarvyRun {
  id: string;
  source_id: string;
  idempotency_key: string | null;
  status: "queued" | "running" | "succeeded" | "partial" | "failed" | "cancelled";
  error_code: string | null;
  created_at: number;
  updated_at: number;
}

export interface OpsAction {
  id: string;
  source_story_id: string | null;
  story_title: string | null;
  event_id: string;
  event_title: string;
  source_product: string;
  source_url: string | null;
  publisher: string | null;
  status: "open" | "in_progress" | "done" | "cancelled";
  revision: number;
  created_at: number;
  updated_at: number;
}

export interface Story {
  id: string;
  event_id: string;
  title: string;
  notes: string;
  status: "draft" | "ready" | "handed_off" | "archived";
  revision: number;
  created_at: number;
  updated_at: number;
}

export interface WorkspaceSearchResult {
  type: "event" | "evidence" | "story" | "dashboard" | "action";
  id: string;
  product: string;
  title: string;
  description: string;
  updated_at: number;
  event_id?: string;
  source_product?: string;
}

export interface AdminAuditEntry {
  id: string;
  kind: "product_entitlement" | "monitor_state" | "dashboard_state";
  tenant_id: string;
  workspace_id: string | null;
  product: string;
  subject_id: string;
  subject_label: string;
  enabled: boolean | null;
  action: string;
  revision: number;
  changed_by: string;
  changed_at: number;
}

export interface ApiErrorBody { error?: { code?: string; message?: string; trace_id?: string } }

export class HarvyApiError extends Error {
  constructor(message: string, readonly status: number, readonly code?: string) { super(message); }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: "same-origin",
    headers: { ...(init?.body ? { "Content-Type": "application/json" } : {}), ...init?.headers },
  });
  const body = await response.json().catch(() => null) as T | ApiErrorBody | null;
  if (!response.ok) {
    const problem = body && typeof body === "object" && "error" in body ? body.error : undefined;
    throw new HarvyApiError(problem?.message || `Request failed (${response.status}).`, response.status, problem?.code);
  }
  return body as T;
}

export const getContext = () => request<HarvyContext>("/api/v1/context");
export const listProductEntitlements = () => request<{ items: ProductEntitlement[] }>("/api/v1/entitlements");
export const listAdminAudit = (limit = 50) => request<{ items: AdminAuditEntry[] }>(`/api/v1/admin/audit?limit=${limit}`);
export const updateProductEntitlement = (value: ProductEntitlement) => request<ProductEntitlement>("/api/v1/entitlements", {
  method: "PUT", body: JSON.stringify({ product: value.product, enabled: value.enabled, expected_revision: value.revision }),
});
export const listSources = (product: string) => request<{ items: Source[] }>(`/api/v1/sources?product=${encodeURIComponent(product)}`);
export const updateSourceState = (source: Source, enabled: boolean) => request<{ id: string; enabled: boolean; revision: number }>(`/api/v1/sources/${encodeURIComponent(source.id)}?product=${encodeURIComponent(source.product)}`, {
  method: "PATCH", body: JSON.stringify({ enabled, expected_revision: source.revision }),
});
export const listEvents = (filters: URLSearchParams) => request<{ items: HarvyEvent[]; next_cursor: string | null }>(`/api/v1/events?${filters}`);
export const searchWorkspace = (query: string, product: string, signal?: AbortSignal, from?: string, to?: string) => {
  const params = new URLSearchParams({ q: query, product, limit: "12" });
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  return request<{ items: WorkspaceSearchResult[] }>(`/api/v1/search?${params}`, { signal });
};
export const getEvent = (id: string, product: string) => request<HarvyEvent & { evidence: Evidence[]; activity: EventActivity[] }>(`/api/v1/events/${encodeURIComponent(id)}?product=${encodeURIComponent(product)}`);
export const updateEventState = (event: HarvyEvent, update: { status?: HarvyEvent["status"]; assigned_to?: string | null }) => request<HarvyEvent & { evidence: Evidence[]; activity: EventActivity[] }>(`/api/v1/events/${encodeURIComponent(event.id)}?product=${encodeURIComponent(event.product)}`, {
  method: "PATCH", body: JSON.stringify({ ...update, expected_revision: event.revision }),
});
export const listStories = () => request<{ items: Story[] }>("/api/v1/stories");
export const getStory = (id: string) => request<Story>(`/api/v1/stories/${encodeURIComponent(id)}`);
export interface DashboardView { id: string; product: string; title: string; config_json: string; visibility: "private" | "workspace"; can_edit: boolean; revision: number }
export const listDashboards = () => request<{ results: DashboardView[] }>("/api/v1/dashboards");
export const createDashboard = (value: { title: string; product: string; config: unknown; visibility?: "private" | "workspace" }) => request<{ id: string; revision: number }>("/api/v1/dashboards", { method: "POST", body: JSON.stringify(value) });
export const updateDashboard = (id: string, value: { revision: number; title: string; config: unknown; visibility?: "private" | "workspace" }) => request<{ id: string; title: string; config_json: string; visibility: "private" | "workspace"; revision: number; updated_at: number }>(`/api/v1/dashboards/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(value) });
export const deleteDashboard = (id: string, expectedRevision: number) => request<{ deleted: boolean }>(`/api/v1/dashboards/${encodeURIComponent(id)}`, { method: "DELETE", body: JSON.stringify({ expected_revision: expectedRevision }) });
export const listRuns = (product: string) => request<{ items: HarvyRun[] }>(`/api/v1/runs?product=${encodeURIComponent(product)}`);
export const listOpsActions = () => request<{ items: OpsAction[] }>("/api/v1/actions");
export const updateOpsAction = (action: Pick<OpsAction, "id" | "revision" | "status">) => request<OpsAction>(`/api/v1/actions/${encodeURIComponent(action.id)}`, { method: "PATCH", body: JSON.stringify({ revision: action.revision, status: action.status }) });
export const handoffEventToOps = (id: string, product: string) => request<{ action_id: string; event_id: string; status: string }>(`/api/v1/events/${encodeURIComponent(id)}/handoff?product=${encodeURIComponent(product)}`, { method: "POST" });
export const startRun = (source_id: string, idempotency_key: string = crypto.randomUUID()) => request<{ run_id: string; status: HarvyRun["status"]; error_code?: string | null; idempotency_key: string; trace_id: string }>("/api/v1/runs", { method: "POST", body: JSON.stringify({ source_id, idempotency_key }) });
export const createStory = (value: { event_id: string; title: string; notes: string }) => request<Story>("/api/v1/stories", { method: "POST", body: JSON.stringify(value) });
export const saveStory = (story: Story) => request<Story>(`/api/v1/stories/${encodeURIComponent(story.id)}`, { method: "PATCH", body: JSON.stringify(story) });
export const handoffStory = (id: string) => request<{ action_id: string; story_id: string; status: "open" }>(`/api/v1/stories/${encodeURIComponent(id)}/handoff`, { method: "POST" });
export const createBrief = (story_id: string) => request<{ id: string; title: string; body: string; citations: Evidence[]; generated_by: string }>("/api/v1/briefs", { method: "POST", body: JSON.stringify({ story_id }) });
