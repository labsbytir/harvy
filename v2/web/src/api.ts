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

export interface Source {
  id: string;
  product: string;
  publisher: string;
  label: string;
  enabled: boolean;
  created_at: number;
}

export interface HarvyEvent {
  id: string;
  product: string;
  title: string;
  summary: string;
  status: "new" | "reviewing" | "saved" | "closed";
  first_seen_at: number;
  last_seen_at: number;
  evidence_count: number;
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
  status: "queued" | "running" | "succeeded" | "partial" | "failed" | "cancelled";
  error_code: string | null;
  created_at: number;
  updated_at: number;
}

export interface OpsAction {
  id: string;
  source_story_id: string;
  story_title: string;
  event_id: string;
  event_title: string;
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
export const listSources = (product: string) => request<{ items: Source[] }>(`/api/v1/sources?product=${encodeURIComponent(product)}`);
export const listEvents = (filters: URLSearchParams) => request<{ items: HarvyEvent[]; next_cursor: string | null }>(`/api/v1/events?${filters}`);
export const getEvent = (id: string, product: string) => request<HarvyEvent & { evidence: Evidence[] }>(`/api/v1/events/${encodeURIComponent(id)}?product=${encodeURIComponent(product)}`);
export const listStories = () => request<{ items: Story[] }>("/api/v1/stories");
export const getStory = (id: string) => request<Story>(`/api/v1/stories/${encodeURIComponent(id)}`);
export interface DashboardView { id: string; product: string; title: string; config_json: string; revision: number }
export const listDashboards = () => request<{ results: DashboardView[] }>("/api/v1/dashboards");
export const createDashboard = (value: { title: string; product: string; config: unknown; visibility?: "private" | "workspace" }) => request<{ id: string; revision: number }>("/api/v1/dashboards", { method: "POST", body: JSON.stringify(value) });
export const updateDashboard = (id: string, value: { revision: number; title: string; config: unknown }) => request<{ id: string; title: string; config_json: string; revision: number; updated_at: number }>(`/api/v1/dashboards/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(value) });
export const listRuns = (product: string) => request<{ items: HarvyRun[] }>(`/api/v1/runs?product=${encodeURIComponent(product)}`);
export const listOpsActions = () => request<{ items: OpsAction[] }>("/api/v1/actions");
export const updateOpsAction = (action: OpsAction) => request<OpsAction>(`/api/v1/actions/${encodeURIComponent(action.id)}`, { method: "PATCH", body: JSON.stringify(action) });
export const startRun = (source_id: string) => request<{ run_id: string; status: HarvyRun["status"]; trace_id: string }>("/api/v1/runs", { method: "POST", body: JSON.stringify({ source_id, idempotency_key: crypto.randomUUID() }) });
export const createStory = (value: { event_id: string; title: string; notes: string }) => request<Story>("/api/v1/stories", { method: "POST", body: JSON.stringify(value) });
export const saveStory = (story: Story) => request<Story>(`/api/v1/stories/${encodeURIComponent(story.id)}`, { method: "PATCH", body: JSON.stringify(story) });
export const handoffStory = (id: string) => request<{ action_id: string; story_id: string; status: "open" }>(`/api/v1/stories/${encodeURIComponent(id)}/handoff`, { method: "POST" });
export const createBrief = (story_id: string) => request<{ id: string; title: string; body: string; citations: Evidence[]; generated_by: string }>("/api/v1/briefs", { method: "POST", body: JSON.stringify({ story_id }) });
