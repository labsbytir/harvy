/** R2 artifact manifest contract: raw captures and validated processed records. */
export type ArtifactStage = "raw" | "processed";

export interface ArtifactManifest {
  artifact_id: string;
  stage: ArtifactStage;
  source_scope_id: string;
  access_scope_id: string;
  run_id: string;
  storage_uri: string;
  sha256: string;
  byte_count: number;
  capture_time: string;
}

const ID = /^[a-z][a-z0-9-]{0,95}$/;

export function parseArtifactManifest(value: unknown): ArtifactManifest | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  if (typeof v.artifact_id !== "string" || v.artifact_id.length < 1) return null;
  if (v.stage !== "raw" && v.stage !== "processed") return null;
  if (!ID.test(String(v.source_scope_id)) || !ID.test(String(v.access_scope_id))) return null;
  if (typeof v.run_id !== "string" || v.run_id.length < 1) return null;
  if (typeof v.storage_uri !== "string" || !v.storage_uri.startsWith("r2://")) return null;
  if (typeof v.sha256 !== "string" || !/^[0-9a-f]{64}$/i.test(v.sha256)) return null;
  if (!Number.isInteger(v.byte_count) || (v.byte_count as number) < 0) return null;
  if (typeof v.capture_time !== "string" || Number.isNaN(Date.parse(v.capture_time))) return null;
  return value as unknown as ArtifactManifest;
}
