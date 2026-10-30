const CONFIG_KEYS = new Set(["portlets", "layoutMode", "grid", "rows", "groups", "layouts", "colorPalette", "filters", "eagerLoad", "thumbnailUrl"]);
const PORTLET_KEYS = new Set(["id", "title", "analysisConfig", "query", "chartType", "chartConfig", "displayConfig", "dashboardFilterMapping", "eagerLoad", "analysisType", "funnelCube", "funnelSteps", "funnelTimeDimension", "funnelBindingKey", "funnelChartType", "funnelChartConfig", "funnelDisplayConfig", "w", "h", "x", "y"]);
const VIEW_FILTER_KEYS = new Set(["query", "source_id", "from", "to", "status"]);
const STATUSES = new Set(["all", "new", "reviewing", "saved", "closed"]);

type RecordValue = Record<string, unknown>;

export interface HarvySavedViewConfig {
  kind?: "saved_view";
  hql_version: 1;
  filters: { query: string; source_id: string; from: string; to: string; status: "all" | "new" | "reviewing" | "saved" | "closed" };
}

function isRecord(value: unknown): value is RecordValue {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: RecordValue, keys: Set<string>): boolean {
  return Object.keys(value).every((key) => keys.has(key));
}

function boundedString(value: unknown, max: number, allowEmpty = false): value is string {
  return typeof value === "string" && value.length <= max && (allowEmpty || Boolean(value.trim()));
}

function boundedInt(value: unknown, min: number, max: number): value is number {
  return Number.isInteger(value) && (value as number) >= min && (value as number) <= max;
}

function validDate(value: unknown): boolean {
  return boundedString(value, 40, true) && (!value || Number.isFinite(Date.parse(value)));
}

export function isSavedViewConfig(value: unknown): value is HarvySavedViewConfig {
  if (!isRecord(value) || !hasOnlyKeys(value, new Set(["kind", "hql_version", "filters"])) ||
      (value.kind !== undefined && value.kind !== "saved_view") || value.hql_version !== 1 || !isRecord(value.filters) ||
      !hasOnlyKeys(value.filters, VIEW_FILTER_KEYS)) return false;
  const filters = value.filters;
  return boundedString(filters.query, 200, true) && boundedString(filters.source_id, 128, true) &&
    validDate(filters.from) && validDate(filters.to) && typeof filters.status === "string" && STATUSES.has(filters.status);
}

function validQueryString(value: unknown): boolean {
  if (!boundedString(value, 16_000, true) || !value) return typeof value === "string";
  try {
    const query: unknown = JSON.parse(value);
    return isRecord(query) && !Object.hasOwn(query, "sql");
  } catch {
    return false;
  }
}

function validPortlet(value: unknown): boolean {
  if (!isRecord(value) || !hasOnlyKeys(value, PORTLET_KEYS) || !boundedString(value.id, 128) ||
      !boundedString(value.title, 160) || !boundedInt(value.w, 1, 24) || !boundedInt(value.h, 1, 100) ||
      !boundedInt(value.x, 0, 10_000) || !boundedInt(value.y, 0, 10_000)) return false;
  if (value.query !== undefined && !validQueryString(value.query)) return false;
  if (value.analysisConfig !== undefined) {
    const config = value.analysisConfig;
    if (!isRecord(config) || config.version !== 1 || !["query", "funnel", "flow", "retention"].includes(String(config.analysisType)) ||
        !["table", "chart"].includes(String(config.activeView)) || !isRecord(config.query) || !isRecord(config.charts) ||
        Object.hasOwn(config.query, "sql")) return false;
  }
  for (const key of ["chartConfig", "displayConfig", "funnelChartConfig", "funnelDisplayConfig"]) {
    if (value[key] !== undefined && !isRecord(value[key])) return false;
  }
  if (value.chartType !== undefined && !boundedString(value.chartType, 48)) return false;
  if (value.funnelChartType !== undefined && !boundedString(value.funnelChartType, 48)) return false;
  if (value.analysisType !== undefined && !["query", "funnel", "flow", "retention"].includes(String(value.analysisType))) return false;
  if (value.eagerLoad !== undefined && typeof value.eagerLoad !== "boolean") return false;
  if (value.funnelSteps !== undefined && (!Array.isArray(value.funnelSteps) || value.funnelSteps.length > 16 || value.funnelSteps.some((step) => !isRecord(step)))) return false;
  return JSON.stringify(value).length <= 16_000;
}

export function isDashboardConfig<T = RecordValue>(value: unknown): value is T {
  if (!isRecord(value) || !hasOnlyKeys(value, CONFIG_KEYS) || !Array.isArray(value.portlets) || value.portlets.length > 32 ||
      value.portlets.some((portlet) => !validPortlet(portlet)) ||
      (value.layoutMode !== undefined && !["grid", "rows"].includes(String(value.layoutMode))) ||
      (value.grid !== undefined && (!isRecord(value.grid) || !boundedInt(value.grid.cols, 1, 24) || !boundedInt(value.grid.rowHeight, 20, 500) ||
        !boundedInt(value.grid.minW, 1, 24) || !boundedInt(value.grid.minH, 1, 100))) ||
      (value.rows !== undefined && (!Array.isArray(value.rows) || value.rows.length > 32 || value.rows.some((row) => !isRecord(row) || !Array.isArray(row.columns) || row.columns.length > 24))) ||
      (value.groups !== undefined && (!Array.isArray(value.groups) || value.groups.length > 32 || value.groups.some((group) => !isRecord(group) || !Array.isArray(group.cells) || group.cells.length > 24))) ||
      (value.layouts !== undefined && !isRecord(value.layouts)) ||
      (value.filters !== undefined && (!Array.isArray(value.filters) || value.filters.length > 32 || value.filters.some((filter) => !isRecord(filter)))) ||
      (value.eagerLoad !== undefined && typeof value.eagerLoad !== "boolean") ||
      (value.colorPalette !== undefined && !boundedString(value.colorPalette, 80))) return false;
  if (value.thumbnailUrl !== undefined && (!boundedString(value.thumbnailUrl, 500) || /^(?:data|javascript):/i.test(value.thumbnailUrl))) return false;
  return JSON.stringify(value).length <= 32_000;
}

export function isPersistedDashboardConfig(value: unknown): boolean {
  return isDashboardConfig(value) || isSavedViewConfig(value);
}
