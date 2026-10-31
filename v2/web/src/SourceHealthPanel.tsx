import { useMemo } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { HarvyRun, Source } from "./api";

interface SourceHealth {
  source: Source;
  lastRun: HarvyRun | null;
  runCount: number;
  successRate: number;
  avgAgeHours: number | null;
  state: "healthy" | "degraded" | "stale" | "unknown";
}

function computeHealth(source: Source, runs: HarvyRun[]): SourceHealth {
  const sourceRuns = runs.filter((r) => r.source_id === source.id);
  const lastRun = sourceRuns[0] || null;
  const runCount = sourceRuns.length;
  const succeeded = sourceRuns.filter((r) => r.status === "succeeded" || r.status === "partial").length;
  const successRate = runCount > 0 ? succeeded / runCount : 0;
  const avgAgeHours = lastRun
    ? (Date.now() - lastRun.updated_at) / (1000 * 60 * 60)
    : null;

  let state: SourceHealth["state"] = "unknown";
  if (!lastRun) state = "unknown";
  else if (lastRun.status === "failed" && successRate < 0.5) state = "degraded";
  else if (avgAgeHours !== null && avgAgeHours > 48) state = "stale";
  else if (lastRun.status === "succeeded" || lastRun.status === "partial") state = "healthy";
  else state = "degraded";

  return { source, lastRun, runCount, successRate, avgAgeHours, state };
}

const STATE_COLOR: Record<SourceHealth["state"], "success" | "warning" | "error" | "default"> = {
  healthy: "success",
  degraded: "warning",
  stale: "error",
  unknown: "default",
};

const STATE_LABEL: Record<SourceHealth["state"], string> = {
  healthy: "Healthy",
  degraded: "Degraded",
  stale: "Stale",
  unknown: "Unknown",
};

export default function SourceHealthPanel({ sources, runs }: { sources: Source[]; runs: HarvyRun[] }) {
  const health = useMemo(() => sources.map((s) => computeHealth(s, runs)), [sources, runs]);
  const healthy = health.filter((h) => h.state === "healthy").length;
  const degraded = health.filter((h) => h.state === "degraded").length;
  const stale = health.filter((h) => h.state === "stale").length;
  const unknown = health.filter((h) => h.state === "unknown").length;

  return <Stack spacing={2}>
    <Box>
      <Typography variant="h5" component="h2">Source health & coverage</Typography>
      <Typography color="text.secondary" variant="body2">
        Monitor freshness, run success rates, and known gaps. Never treat an incomplete feed as comprehensive.
      </Typography>
    </Box>

    <Stack direction="row" spacing={1} flexWrap="wrap">
      <Chip size="small" color="success" label={`${healthy} healthy`} />
      <Chip size="small" color="warning" label={`${degraded} degraded`} />
      <Chip size="small" color="error" label={`${stale} stale`} />
      <Chip size="small" variant="outlined" label={`${unknown} unknown`} />
    </Stack>

    {stale > 0 && <Alert severity="warning">
      {stale} source{stale !== 1 ? "s have" : " has"} not run in over 48 hours. Coverage gaps may exist.
    </Alert>}

    {health.length === 0 && <Alert severity="info">No approved monitors are configured for this workspace.</Alert>}

    {health.map(({ source, lastRun, runCount, successRate, avgAgeHours, state }) => (
      <Box key={source.id} sx={{ border: 1, borderColor: "divider", borderRadius: 1, p: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <Typography variant="body2" fontWeight={700}>{source.label}</Typography>
              <Chip size="small" color={STATE_COLOR[state]} label={STATE_LABEL[state]} />
              <Chip size="small" variant="outlined" label={source.enabled ? "Enabled" : "Paused"} />
              <Chip size="small" variant="outlined" label={source.product} />
            </Stack>
            <Typography variant="caption" color="text.secondary">{source.publisher} · {source.id}</Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={2} sx={{ mt: 1.5 }} flexWrap="wrap">
          <Box sx={{ minWidth: 120 }}>
            <Typography variant="caption" color="text.secondary">Run success</Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <LinearProgress variant="determinate" value={successRate * 100} sx={{ flex: 1, height: 6, borderRadius: 3 }} />
              <Typography variant="caption">{Math.round(successRate * 100)}%</Typography>
            </Stack>
            <Typography variant="caption" color="text.secondary">{runCount} run{runCount !== 1 ? "s" : ""}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">Last run</Typography>
            <Typography variant="body2">{lastRun ? `${lastRun.status} · ${new Date(lastRun.updated_at).toLocaleString()}` : "Never"}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">Age</Typography>
            <Typography variant="body2">{avgAgeHours !== null ? `${Math.round(avgAgeHours)}h ago` : "N/A"}</Typography>
          </Box>
        </Stack>

        {lastRun?.error_code && (
          <Alert severity="error" sx={{ mt: 1 }}>Last error: {lastRun.error_code}</Alert>
        )}
      </Box>
    ))}

    <Typography variant="caption" color="text.secondary">
      Coverage status is derived from run history in the loaded page. Quota limits and rate limits are tracked in the run dispatch layer.
    </Typography>
  </Stack>;
}
