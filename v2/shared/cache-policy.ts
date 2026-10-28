/** Cache scope policy: only public routes are cacheable. Tenant/private never. */
export type CacheScope = "public" | "tenant" | "none";

export function getCacheHeader(scope: CacheScope): string {
  if (scope === "public") return "public, max-age=300, stale-while-revalidate=60";
  return "private, no-cache, no-store";
}
