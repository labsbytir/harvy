/** HarvyDex stable identity: one UUID per persisted record, source IDs stay external. */
export interface HarvyDexRecord {
  harvydex_id: string;
  scope_id: string;
  entity_type: string;
  external_ids: Record<string, string>;
  created_at: string;
}

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isHarvyDexId(value: unknown): value is string {
  return typeof value === "string" && UUID_V4.test(value);
}

export function isScopeId(value: unknown): value is string {
  return typeof value === "string" && (value === "shared" ||
    /^tenant-[a-zA-Z0-9._:-]{1,118}$/.test(value) ||
    /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value));
}

export function parseHarvyDexRecord(value: unknown): HarvyDexRecord | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  if (!isHarvyDexId(v.harvydex_id) || !isScopeId(v.scope_id)) return null;
  if (typeof v.entity_type !== "string" || v.entity_type.length < 1 || v.entity_type.length > 64) return null;
  if (typeof v.external_ids !== "object" || v.external_ids === null || Array.isArray(v.external_ids)) return null;
  for (const [k, id] of Object.entries(v.external_ids as Record<string, unknown>)) {
    if (typeof k !== "string" || k.length === 0 || typeof id !== "string" || id.length === 0) return null;
  }
  if (typeof v.created_at !== "string" || Number.isNaN(Date.parse(v.created_at))) return null;
  return value as HarvyDexRecord;
}
