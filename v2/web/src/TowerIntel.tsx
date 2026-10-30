import { Suspense, useMemo } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import RadarMap from "./RadarMap";
import { formatAge, formatLocatedCount, freshnessStrip, rankRegions, REGION_CELL_DEGREES, type FreshnessEntry } from "./tower-intel";
import type { HarvyEvent, HarvyRun, Source } from "./api";

const STATUS_COLOR: Record<string, "success" | "warning" | "error" | "info" | "default"> = {
  succeeded: "success",
  partial: "warning",
  failed: "error",
  cancelled: "error",
  queued: "info",
  running: "info",
  never: "default",
};

const MAX_REGIONS = 8;

// Pure derivation from guard-loaded runs/sources; no requests of its own.
function FreshnessStrip({ sources, runs }: { sources: Source[]; runs: HarvyRun[] }) {
  const entries = useMemo(() => freshnessStrip(sources, runs), [sources, runs]);
  if (!entries.length) return <Alert severity="info">No approved monitors are configured for this workspace, so there is no stream freshness to show.</Alert>;
  return <Stack direction="row" flexWrap="wrap" gap={1} aria-label="Source stream freshness">
    {entries.map((entry: FreshnessEntry) => (
      <Box key={entry.sourceId} sx={{ border: 1, borderColor: "divider", borderRadius: 1, px: 1.5, py: 1 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="body2" fontWeight={700}>{entry.label}</Typography>
          <Chip size="small" variant="outlined" label={entry.enabled ? "Active" : "Paused"} color={entry.enabled ? "success" : "default"} />
          <Chip size="small" label={entry.state} color={STATUS_COLOR[entry.state] ?? "default"} />
        </Stack>
        <Typography variant="caption" color="text.secondary">
          {entry.lastRun ? `Latest run ${entry.lastRun.status} · ${formatAge(entry.ageMs ?? 0)}` : "No runs recorded yet"}
        </Typography>
      </Box>
    ))}
  </Stack>;
}

export default function TowerIntel({ product, events, runs, sources, hasMoreEvents, from, to, selectedEventId, onSelectEvent }: {
  product: string;
  events: HarvyEvent[];
  runs: HarvyRun[];
  sources: Source[];
  hasMoreEvents: boolean;
  from: string;
  to: string;
  selectedEventId?: string | null;
  onSelectEvent: (event: HarvyEvent) => void;
}) {
  const ranking = useMemo(() => rankRegions(events), [events]);
  const topRegions = ranking.regions.slice(0, MAX_REGIONS);
  return <Stack spacing={3}>
    <Box component="section" aria-label="Source stream freshness">
      <Typography variant="h6" component="h3">Stream freshness</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Latest run outcome and age per approved monitor. The API does not expose each source's expected cadence, so no fresh/stale verdict is computed.</Typography>
      <Box sx={{ mt: 1.5 }}><FreshnessStrip sources={sources} runs={runs} /></Box>
    </Box>
    <Box component="section" aria-label="Event map">
      <Suspense fallback={<Stack alignItems="center" sx={{ py: 8 }}><CircularProgress aria-label="Loading event map" /></Stack>}>
        <RadarMap product={product} events={events} hasMoreEvents={hasMoreEvents} from={from} to={to} selectedEventId={selectedEventId} onSelectEvent={onSelectEvent} />
      </Suspense>
    </Box>
    <Box component="section" aria-label="Regional concentration of located events">
      <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
        <Typography variant="h6" component="h3">Regional concentration</Typography>
        <Chip size="small" label={formatLocatedCount(ranking)} />
        {hasMoreEvents && <Chip size="small" color="warning" variant="outlined" label="More events not loaded; ranking covers the loaded page" />}
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
        Ranked by how many located events fall in each {REGION_CELL_DEGREES}° grid cell of the loaded results. Concentration is relative to this page only — not a risk, severity, or confidence score.
      </Typography>
      {topRegions.length === 0 ? <Alert severity="info" sx={{ mt: 1.5 }}>No loaded events carry a validated coordinate pair yet, so there is no regional concentration to rank.</Alert> : <Stack spacing={1.5} sx={{ mt: 1.5 }}>
        {topRegions.map((region, index) => (
          <Box key={region.key}>
            <Stack direction="row" justifyContent="space-between" alignItems="baseline" gap={1}>
              <Typography variant="body2" fontWeight={700}>{index + 1}. {region.label}</Typography>
              <Typography variant="body2" color="text.secondary">{region.count} {region.count === 1 ? "event" : "events"} · {Math.round(region.share * 100)}% of located</Typography>
            </Stack>
            <Box aria-hidden="true" sx={{ mt: 0.5, height: 6, borderRadius: 3, bgcolor: "action.hover" }}>
              <Box sx={{ width: `${Math.max(region.share * 100, 2)}%`, height: "100%", borderRadius: 3, bgcolor: "primary.main" }} />
            </Box>
          </Box>
        ))}
        {ranking.regions.length > topRegions.length && <Typography variant="caption" color="text.secondary">Showing top {topRegions.length} of {ranking.regions.length} regions.</Typography>}
      </Stack>}
    </Box>
    <Typography variant="caption" color="text.secondary">Select an event in the map list to open the same evidence panel used by the event feed. Base-map tiles come from OpenFreeMap; attribution appears on the map.</Typography>
  </Stack>;
}
