import { useMemo, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import type { HarvyEvent, Source } from "./api";

/* ── types ─────────────────────────────────────────────────────────────── */

export type SituationCategory =
  | "conflict"
  | "political"
  | "economic"
  | "disaster"
  | "cyber"
  | "infrastructure"
  | "environment"
  | "humanitarian"
  | "positive"
  | "other";

export interface SituationSignal {
  id: string;
  category: SituationCategory;
  label: string;
  detail: string;
  eventIds: string[];
  intensity: number; // 0-100 derived heuristic
  trend: "rising" | "stable" | "declining" | "unknown";
  updatedAt: number;
}

export interface RegionSummary {
  region: string;
  signalCount: number;
  topCategory: SituationCategory;
  maxIntensity: number;
}

/* ── category metadata ─────────────────────────────────────────────────── */

const CATEGORY_META: Record<SituationCategory, { label: string; color: string; icon: string }> = {
  conflict:       { label: "Conflict & Unrest",   color: "#B33B36", icon: "⚔️" },
  political:      { label: "Political",           color: "#8B5CF6", icon: "🏛️" },
  economic:       { label: "Economic",            color: "#086E68", icon: "📊" },
  disaster:       { label: "Disaster",            color: "#9A5A17", icon: "⚠️" },
  cyber:          { label: "Cyber",               color: "#3B82F6", icon: "🔒" },
  infrastructure: { label: "Infrastructure",      color: "#6B7280", icon: "🏗️" },
  environment:    { label: "Environment",         color: "#10B981", icon: "🌍" },
  humanitarian:   { label: "Humanitarian",        color: "#F59E0B", icon: "🤝" },
  positive:       { label: "Positive",            color: "#22C55E", icon: "✅" },
  other:          { label: "Other",               color: "#9CA3AF", icon: "📋" },
};

/* ── keyword → category classifier (heuristic, not ML) ─────────────────── */

const CATEGORY_KEYWORDS: Record<SituationCategory, string[]> = {
  conflict:       ["war", "conflict", "military", "strike", "airstrike", "invasion", "ceasefire", "troops", "weapon", "attack", "battle", "siege", "missile", "drone strike", "armed"],
  political:      ["election", "government", "parliament", "minister", "president", "coup", "protest", "sanction", "diplomatic", "treaty", "legislation", "resignation", "impeach"],
  economic:       ["market", "stock", "trade", "tariff", "inflation", "gdp", "currency", "bank", "recession", "commodity", "oil price", "interest rate", "debt", "default"],
  disaster:       ["earthquake", "hurricane", "typhoon", "flood", "wildfire", "tsunami", "volcanic", "tornado", "landslide", "drought", "famine", "outbreak", "epidemic", "pandemic"],
  cyber:          ["cyber", "hack", "breach", "ransomware", "malware", "vulnerability", "data leak", "ddos", "phishing", "zero-day", "exploit"],
  infrastructure: ["power outage", "pipeline", "bridge", "grid", "telecom", "railway", "airport", "port", "explosion", "infrastructure", "construction", "utility"],
  environment:    ["climate", "pollution", "emission", "deforestation", "wildfire", "heat wave", "air quality", "water", "renewable", "carbon", "biodiversity"],
  humanitarian:   ["refugee", "displaced", "humanitarian", "aid", "famine", "displacement", "asylum", "migrant", "red cross", "unhcr", "relief"],
  positive:       ["agreement", "peace", "ceasefire", "cooperation", "recovery", "development", "aid delivered", "vaccination", "milestone", "breakthrough"],
  other: [],
};

function classifyEvent(event: HarvyEvent): SituationCategory {
  const text = `${event.title} ${event.summary}`.toLowerCase();
  let bestCategory: SituationCategory = "other";
  let bestScore = 0;
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS) as [SituationCategory, string[]][]) {
    const score = keywords.reduce((sum, kw) => sum + (text.includes(kw) ? 1 : 0), 0);
    if (score > bestScore) { bestScore = score; bestCategory = category; }
  }
  return bestCategory;
}

function computeIntensity(event: HarvyEvent): number {
  let score = 20;
  score += Math.min((event.evidence_count || 0) * 10, 40);
  const ageHours = (Date.now() - event.last_seen_at) / (1000 * 60 * 60);
  if (ageHours < 3) score += 25;
  else if (ageHours < 12) score += 15;
  else if (ageHours < 48) score += 5;
  return Math.min(score, 100);
}

/* ── signal aggregation ────────────────────────────────────────────────── */

function buildSignals(events: HarvyEvent[]): SituationSignal[] {
  const byCategory = new Map<SituationCategory, HarvyEvent[]>();
  for (const event of events) {
    const cat = classifyEvent(event);
    const list = byCategory.get(cat) || [];
    list.push(event);
    byCategory.set(cat, list);
  }
  const signals: SituationSignal[] = [];
  for (const [category, catEvents] of byCategory) {
    const sorted = [...catEvents].sort((a, b) => b.last_seen_at - a.last_seen_at);
    const maxIntensity = Math.max(...sorted.map(computeIntensity), 0);
    const newest = sorted[0]?.last_seen_at ?? 0;
    const oldest = sorted[sorted.length - 1]?.last_seen_at ?? 0;
    const mid = (newest + oldest) / 2;
    const halfCount = Math.floor(sorted.length / 2);
    const recentHalf = sorted.slice(0, halfCount).reduce((sum, e) => sum + e.evidence_count, 0);
    const olderHalf = sorted.slice(halfCount).reduce((sum, e) => sum + e.evidence_count, 0);
    const trend = recentHalf > olderHalf * 1.3 ? "rising" : recentHalf < olderHalf * 0.7 ? "declining" : "stable";
    signals.push({
      id: `sig-${category}`,
      category,
      label: CATEGORY_META[category].label,
      detail: `${catEvents.length} events · ${sorted.reduce((s, e) => s + e.evidence_count, 0)} sources`,
      eventIds: sorted.map((e) => e.id),
      intensity: maxIntensity,
      trend,
      updatedAt: mid,
    });
  }
  return signals.sort((a, b) => b.intensity - a.intensity);
}

/* ── region ranking (from event titles / lat-lng) ──────────────────────── */

const REGION_KEYWORDS: Record<string, string[]> = {
  "Middle East":    ["iran", "iraq", "syria", "israel", "palestine", "lebanon", "yemen", "saudi", "uae", "gulf"],
  "Eastern Europe": ["ukraine", "russia", "belarus", "moldova", "poland", "baltic", "nato"],
  "East Asia":      ["china", "taiwan", "north korea", "japan", "korea", "south china sea"],
  "South Asia":     ["india", "pakistan", "afghanistan", "bangladesh", "sri lanka"],
  "Sub-Saharan Africa": ["nigeria", "ethiopia", "sudan", "somalia", "congo", "mali", "sahel", "kenya"],
  "Latin America":  ["brazil", "mexico", "venezuela", "colombia", "argentina", "chile", "peru"],
  "Southeast Asia": ["myanmar", "thailand", "philippines", "indonesia", "vietnam"],
  "Europe":         ["france", "germany", "uk", "britain", "italy", "spain", "europe"],
  "North America":  ["united states", "usa", "canada", "america"],
};

function rankRegions(events: HarvyEvent[]): RegionSummary[] {
  const regionEvents = new Map<string, HarvyEvent[]>();
  for (const event of events) {
    const text = `${event.title} ${event.summary}`.toLowerCase();
    for (const [region, keywords] of Object.entries(REGION_KEYWORDS)) {
      if (keywords.some((kw) => text.includes(kw))) {
        const list = regionEvents.get(region) || [];
        list.push(event);
        regionEvents.set(region, list);
      }
    }
  }
  return [...regionEvents.entries()].map(([region, evts]) => {
    const catCounts = new Map<SituationCategory, number>();
    for (const e of evts) {
      const cat = classifyEvent(e);
      catCounts.set(cat, (catCounts.get(cat) || 0) + 1);
    }
    const topCategory = [...catCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "other";
    return {
      region,
      signalCount: evts.length,
      topCategory,
      maxIntensity: Math.max(...evts.map(computeIntensity), 0),
    };
  }).sort((a, b) => b.signalCount - a.signalCount);
}

/* ── main component ────────────────────────────────────────────────────── */

export default function GlobalSituationBoard({ events, sources, onSelectEvent }: {
  events: HarvyEvent[];
  sources: Source[];
  onSelectEvent: (event: HarvyEvent) => void;
}) {
  const [view, setView] = useState<"signals" | "regions" | "categories">("signals");
  const [selectedCategory, setSelectedCategory] = useState<SituationCategory | null>(null);

  const signals = useMemo(() => buildSignals(events), [events]);
  const regions = useMemo(() => rankRegions(events), [events]);

  const categoryStats = useMemo(() => {
    const stats = new Map<SituationCategory, { count: number; intensity: number }>();
    for (const event of events) {
      const cat = classifyEvent(event);
      const prev = stats.get(cat) || { count: 0, intensity: 0 };
      stats.set(cat, { count: prev.count + 1, intensity: Math.max(prev.intensity, computeIntensity(event)) });
    }
    return stats;
  }, [events]);

  const selectedEvents = selectedCategory
    ? events.filter((e) => classifyEvent(e) === selectedCategory)
    : [];

  return <Stack spacing={2}>
    {/* Header */}
    <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} gap={1}>
      <Box>
        <Typography variant="h5" component="h2">Global situation board</Typography>
        <Typography color="text.secondary" variant="body2">
          Cross-stream intelligence signals aggregated from {sources.length} source{sources.length !== 1 ? "s" : ""} · {events.length} loaded events.
          Category and intensity are heuristics, not risk scores.
        </Typography>
      </Box>
      <ToggleButtonGroup size="small" exclusive value={view} onChange={(_e, v) => { if (v) setView(v); }} aria-label="Board view">
        <ToggleButton value="signals">Signals</ToggleButton>
        <ToggleButton value="regions">Regions</ToggleButton>
        <ToggleButton value="categories">Categories</ToggleButton>
      </ToggleButtonGroup>
    </Stack>

    {/* Rising signals alert */}
    {signals.filter((s) => s.trend === "rising" && s.intensity >= 50).length > 0 && (
      <Alert severity="warning">
        {signals.filter((s) => s.trend === "rising" && s.intensity >= 50).length} rising signal(s) with elevated intensity detected.
      </Alert>
    )}

    {/* Signals view */}
    {view === "signals" && <Stack spacing={1.5}>
      {signals.map((signal) => {
        const meta = CATEGORY_META[signal.category];
        return <Card key={signal.id} variant="outlined" sx={{ borderLeft: 4, borderLeftColor: meta.color, cursor: "pointer" }}
          onClick={() => setSelectedCategory(signal.category === selectedCategory ? null : signal.category)}>
          <CardContent sx={{ py: 1.5 }}>
            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} gap={1}>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                <Typography>{meta.icon}</Typography>
                <Typography variant="body2" fontWeight={700}>{signal.label}</Typography>
                <Chip size="small" label={`${signal.intensity} intensity`} />
                <Chip size="small" variant="outlined" label={signal.trend}
                  color={signal.trend === "rising" ? "warning" : signal.trend === "declining" ? "success" : "default"} />
              </Stack>
              <Typography variant="caption" color="text.secondary">{signal.detail}</Typography>
            </Stack>
            <LinearProgress variant="determinate" value={signal.intensity} sx={{ mt: 1, height: 4, borderRadius: 2 }} />
          </CardContent>
        </Card>;
      })}
      {signals.length === 0 && <Alert severity="info">No events loaded to classify into signals.</Alert>}
    </Stack>}

    {/* Regions view */}
    {view === "regions" && <Stack spacing={1.5}>
      {regions.map((region) => {
        const meta = CATEGORY_META[region.topCategory];
        return <Card key={region.region} variant="outlined">
          <CardContent sx={{ py: 1.5 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                <Typography variant="body2" fontWeight={700}>{region.region}</Typography>
                <Chip size="small" label={`${region.signalCount} events`} />
                <Chip size="small" variant="outlined" label={`${meta.icon} ${meta.label}`} />
              </Stack>
              <Typography variant="caption" color="text.secondary">Peak intensity {region.maxIntensity}</Typography>
            </Stack>
            <LinearProgress variant="determinate" value={region.maxIntensity} sx={{ mt: 1, height: 4, borderRadius: 2 }} />
          </CardContent>
        </Card>;
      })}
      {regions.length === 0 && <Alert severity="info">No region keywords matched in the loaded events.</Alert>}
    </Stack>}

    {/* Categories view */}
    {view === "categories" && <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "1fr 1fr 1fr" }, gap: 1.5 }}>
      {(Object.entries(CATEGORY_META) as [SituationCategory, typeof CATEGORY_META.conflict][]).map(([cat, meta]) => {
        const stat = categoryStats.get(cat);
        return <Card key={cat} variant="outlined" sx={{ cursor: "pointer", bgcolor: selectedCategory === cat ? "action.selected" : undefined }}
          onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)}>
          <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography fontSize={20}>{meta.icon}</Typography>
              <Box>
                <Typography variant="body2" fontWeight={700}>{meta.label}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {stat ? `${stat.count} events · peak ${stat.intensity}` : "No events"}
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>;
      })}
    </Box>}

    {/* Selected category events */}
    {selectedCategory && <Box>
      <Divider sx={{ my: 1 }} />
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        {CATEGORY_META[selectedCategory].icon} {CATEGORY_META[selectedCategory].label} — {selectedEvents.length} event{selectedEvents.length !== 1 ? "s" : ""}
      </Typography>
      <Stack spacing={1}>
        {selectedEvents.slice(0, 15).map((event) => (
          <Card key={event.id} variant="outlined" sx={{ cursor: "pointer" }} onClick={() => onSelectEvent(event)}>
            <CardContent sx={{ py: 1 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={700}>{event.title}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {event.evidence_count} sources · {new Date(event.last_seen_at).toLocaleString()}
                  </Typography>
                </Box>
                <Chip size="small" label={`I:${computeIntensity(event)}`} />
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>
    </Box>}

    <Typography variant="caption" color="text.secondary">
      Signals are derived from keyword classification and evidence counts in the loaded page. They are triage aids, not risk assessments or predictive scores.
    </Typography>
  </Stack>;
}
