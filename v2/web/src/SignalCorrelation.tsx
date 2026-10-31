import { useMemo, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import type { HarvyEvent } from "./api";

/* ── correlation types ─────────────────────────────────────────────────── */

export type StreamType = "military" | "economic" | "disaster" | "cyber" | "political" | "infrastructure";

export interface CorrelationCluster {
  id: string;
  streams: StreamType[];
  events: HarvyEvent[];
  sharedThemes: string[];
  convergenceScore: number; // 0-100
  interpretation: string;
  firstSeen: number;
  lastSeen: number;
}

const STREAM_META: Record<StreamType, { label: string; color: string; icon: string }> = {
  military:       { label: "Military",       color: "#B33B36", icon: "⚔️" },
  economic:       { label: "Economic",       color: "#086E68", icon: "📊" },
  disaster:       { label: "Disaster",       color: "#9A5A17", icon: "⚠️" },
  cyber:          { label: "Cyber",          color: "#3B82F6", icon: "🔒" },
  political:      { label: "Political",      color: "#8B5CF6", icon: "🏛️" },
  infrastructure: { label: "Infrastructure", color: "#6B7280", icon: "🏗️" },
};

const STREAM_KEYWORDS: Record<StreamType, string[]> = {
  military:       ["military", "troops", "weapon", "missile", "navy", "air force", "nato", "army", "defense", "nuclear", "drone", "airstrike", "strike"],
  economic:       ["market", "trade", "tariff", "sanction", "oil", "gas", "currency", "bank", "inflation", "supply chain", "export", "import", "commodity"],
  disaster:       ["earthquake", "hurricane", "flood", "wildfire", "tsunami", "volcanic", "drought", "famine", "outbreak", "emergency", "evacuation"],
  cyber:          ["cyber", "hack", "breach", "ransomware", "malware", "data leak", "ddos", "vulnerability", "exploit"],
  political:      ["election", "government", "sanction", "diplomatic", "protest", "coup", "parliament", "minister", "treaty", "resolution"],
  infrastructure: ["pipeline", "port", "bridge", "power", "grid", "telecom", "railway", "airport", "refinery", "utility"],
};

function classifyStream(event: HarvyEvent): StreamType[] {
  const text = `${event.title} ${event.summary}`.toLowerCase();
  const matched: StreamType[] = [];
  for (const [stream, keywords] of Object.entries(STREAM_KEYWORDS) as [StreamType, string[]][]) {
    if (keywords.some((kw) => text.includes(kw))) matched.push(stream);
  }
  return matched.length > 0 ? matched : ["political"];
}

function extractThemes(event: HarvyEvent): string[] {
  const text = `${event.title} ${event.summary}`.toLowerCase();
  const themes: string[] = [];
  const themeKeywords: [string, string[]][] = [
    ["energy", ["oil", "gas", "pipeline", "energy", "opec", "refinery", "power plant"]],
    ["trade", ["trade", "tariff", "export", "import", "supply chain", "shipping"]],
    ["territorial", ["border", "territory", "occupation", "annexation", "sovereignty"]],
    ["nuclear", ["nuclear", "uranium", "enrichment", "reactor", "radiation"]],
    ["migration", ["refugee", "migrant", "displacement", "asylum", "border crossing"]],
    ["climate", ["climate", "emission", "renewable", "carbon", "drought", "flood"]],
    ["cyber_war", ["cyber", "hack", "breach", "espionage", "surveillance"]],
    ["election", ["election", "vote", "ballot", "campaign", "opposition"]],
    ["terrorism", ["terror", "attack", "bombing", "extremist", "militant"]],
  ];
  for (const [theme, keywords] of themeKeywords) {
    if (keywords.some((kw) => text.includes(kw))) themes.push(theme);
  }
  return themes;
}

function findClusters(events: HarvyEvent[]): CorrelationCluster[] {
  const themedEvents = events.map((event) => ({
    event,
    streams: classifyStream(event),
    themes: extractThemes(event),
  }));

  // Group by shared themes
  const themeGroups = new Map<string, typeof themedEvents>();
  for (const item of themedEvents) {
    for (const theme of item.themes) {
      const group = themeGroups.get(theme) || [];
      group.push(item);
      themeGroups.set(theme, group);
    }
  }

  const clusters: CorrelationCluster[] = [];
  for (const [theme, group] of themeGroups) {
    if (group.length < 2) continue;

    const allStreams = new Set<StreamType>();
    for (const item of group) for (const s of item.streams) allStreams.add(s);
    const streamCount = allStreams.size;

    // Convergence score: more streams + more events + recency = higher
    const eventCount = group.length;
    const newest = Math.max(...group.map((g) => g.event.last_seen_at));
    const oldest = Math.min(...group.map((g) => g.event.last_seen_at));
    const ageHours = (Date.now() - newest) / (1000 * 60 * 60);
    const recencyBonus = ageHours < 6 ? 25 : ageHours < 24 ? 15 : 5;
    const convergenceScore = Math.min(
      streamCount * 20 + Math.min(eventCount, 5) * 8 + recencyBonus,
      100
    );

    // Generate interpretation
    const interpretations: string[] = [];
    if (streamCount >= 3) interpretations.push(`${streamCount} streams converging on "${theme}"`);
    if (eventCount >= 3) interpretations.push(`${eventCount} correlated events`);
    if (ageHours < 6) interpretations.push("active in last 6 hours");

    clusters.push({
      id: `cluster-${theme}`,
      streams: [...allStreams],
      events: group.map((g) => g.event),
      sharedThemes: [theme],
      convergenceScore,
      interpretation: interpretations.join(" · ") || `Theme "${theme}" with ${eventCount} events`,
      firstSeen: oldest,
      lastSeen: newest,
    });
  }

  return clusters.sort((a, b) => b.convergenceScore - a.convergenceScore);
}

/* ── component ─────────────────────────────────────────────────────────── */

export default function SignalCorrelation({ events, onSelectEvent }: {
  events: HarvyEvent[];
  onSelectEvent: (event: HarvyEvent) => void;
}) {
  const [filter, setFilter] = useState<StreamType | "all">("all");
  const [expandedCluster, setExpandedCluster] = useState<string | null>(null);

  const clusters = useMemo(() => findClusters(events), [events]);

  const filteredClusters = filter === "all"
    ? clusters
    : clusters.filter((c) => c.streams.includes(filter));

  const streamCounts = useMemo(() => {
    const counts: Record<StreamType, number> = { military: 0, economic: 0, disaster: 0, cyber: 0, political: 0, infrastructure: 0 };
    for (const cluster of clusters) {
      for (const stream of cluster.streams) counts[stream]++;
    }
    return counts;
  }, [clusters]);

  return <Stack spacing={2}>
    <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} gap={1}>
      <Box>
        <Typography variant="h5" component="h2">Cross-stream signal correlation</Typography>
        <Typography color="text.secondary" variant="body2">
          Detect when military, economic, disaster, and cyber signals converge on the same theme or region.
          Convergence scores are heuristic, not predictive.
        </Typography>
      </Box>
    </Stack>

    {/* Stream filter */}
    <ToggleButtonGroup size="small" exclusive value={filter} onChange={(_e, v) => { if (v) setFilter(v); }} aria-label="Stream filter" sx={{ flexWrap: "wrap" }}>
      <ToggleButton value="all">All ({clusters.length})</ToggleButton>
      {(Object.entries(STREAM_META) as [StreamType, typeof STREAM_META.military][]).map(([stream, meta]) => (
        <ToggleButton key={stream} value={stream}>
          {meta.icon} {meta.label} ({streamCounts[stream]})
        </ToggleButton>
      ))}
    </ToggleButtonGroup>

    {/* High-convergence alert */}
    {filteredClusters.filter((c) => c.convergenceScore >= 70).length > 0 && (
      <Alert severity="warning">
        {filteredClusters.filter((c) => c.convergenceScore >= 70).length} high-convergence cluster(s) detected — multiple signal streams are converging.
      </Alert>
    )}

    {/* Clusters */}
    {filteredClusters.length === 0 && (
      <Alert severity="info">No cross-stream correlations detected in the loaded events. Try loading more events or a broader date range.</Alert>
    )}

    {filteredClusters.map((cluster) => (
      <Card key={cluster.id} variant="outlined"
        sx={{ borderLeft: 4, borderLeftColor: cluster.convergenceScore >= 70 ? "warning.main" : cluster.convergenceScore >= 40 ? "info.main" : "divider" }}>
        <CardContent sx={{ py: 1.5 }}>
          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "flex-start" }} gap={1}>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Stack direction="row" spacing={0.5} flexWrap="wrap">
                {cluster.streams.map((stream) => (
                  <Chip key={stream} size="small" color="default" variant="outlined"
                    label={`${STREAM_META[stream].icon} ${STREAM_META[stream].label}`} />
                ))}
                <Chip size="small" label={`Convergence: ${cluster.convergenceScore}`}
                  color={cluster.convergenceScore >= 70 ? "warning" : cluster.convergenceScore >= 40 ? "info" : "default"} />
                <Chip size="small" variant="outlined" label={`${cluster.events.length} events`} />
              </Stack>
              <Typography variant="body2" fontWeight={700} sx={{ mt: 0.5 }}>{cluster.interpretation}</Typography>
              <Typography variant="caption" color="text.secondary">
                First seen {new Date(cluster.firstSeen).toLocaleString()} · Last update {new Date(cluster.lastSeen).toLocaleString()}
              </Typography>
            </Box>
            <Button size="small" onClick={() => setExpandedCluster(expandedCluster === cluster.id ? null : cluster.id)}>
              {expandedCluster === cluster.id ? "Collapse" : "Expand"}
            </Button>
          </Stack>

          {/* Convergence bar */}
          <Box sx={{ mt: 1, height: 6, borderRadius: 3, bgcolor: "action.hover" }}>
            <Box sx={{
              width: `${cluster.convergenceScore}%`, height: "100%", borderRadius: 3,
              bgcolor: cluster.convergenceScore >= 70 ? "warning.main" : cluster.convergenceScore >= 40 ? "info.main" : "primary.main",
            }} />
          </Box>

          {/* Expanded events */}
          {expandedCluster === cluster.id && (
            <Box sx={{ mt: 1.5 }}>
              <Divider sx={{ mb: 1 }} />
              <Typography variant="caption" color="text.secondary" gutterBottom>Correlated events:</Typography>
              <Stack spacing={0.5}>
                {cluster.events.slice(0, 10).map((event) => {
                  const streams = classifyStream(event);
                  return <Box key={event.id} sx={{
                    p: 1, border: 1, borderColor: "divider", borderRadius: 1,
                    cursor: "pointer", "&:hover": { bgcolor: "action.hover" },
                  }} onClick={() => onSelectEvent(event)}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" noWrap>{event.title}</Typography>
                        <Stack direction="row" spacing={0.5}>
                          {streams.map((s) => <Chip key={s} size="small" label={STREAM_META[s].icon} sx={{ minWidth: 28 }} />)}
                          <Typography variant="caption" color="text.secondary">
                            {event.evidence_count} sources · {new Date(event.last_seen_at).toLocaleString()}
                          </Typography>
                        </Stack>
                      </Box>
                    </Stack>
                  </Box>;
                })}
                {cluster.events.length > 10 && (
                  <Typography variant="caption" color="text.secondary">
                    + {cluster.events.length - 10} more events in this cluster
                  </Typography>
                )}
              </Stack>
            </Box>
          )}
        </CardContent>
      </Card>
    ))}

    <Divider />
    <Typography variant="caption" color="text.secondary">
      Correlation is based on shared keywords and themes in the loaded event page. It identifies potential convergence for analyst review — it does not establish causation or predict outcomes.
    </Typography>
  </Stack>;
}
