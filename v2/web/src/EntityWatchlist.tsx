import { useMemo, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type { HarvyEvent, Source } from "./api";

interface WatchEntry {
  id: string;
  label: string;
  keywords: string[];
  addedAt: number;
}

interface SignalScore {
  eventId: string;
  score: number;
  factors: string[];
}

function scoreEvent(event: HarvyEvent, keywords: string[]): SignalScore {
  const factors: string[] = [];
  let score = 0;

  const text = `${event.title} ${event.summary}`.toLowerCase();
  const matchedKeywords = keywords.filter((kw) => text.includes(kw.toLowerCase()));
  if (matchedKeywords.length > 0) {
    score += matchedKeywords.length * 15;
    factors.push(`Keyword match: ${matchedKeywords.join(", ")}`);
  }

  const evidenceCount = event.evidence_count || 0;
  if (evidenceCount >= 5) { score += 25; factors.push("High source count (5+)"); }
  else if (evidenceCount >= 3) { score += 15; factors.push("Multiple sources (3+)"); }
  else if (evidenceCount >= 1) { score += 5; factors.push("Source attached"); }

  const ageMs = Date.now() - event.last_seen_at;
  const ageHours = ageMs / (1000 * 60 * 60);
  if (ageHours < 6) { score += 20; factors.push("Updated within 6 hours"); }
  else if (ageHours < 24) { score += 10; factors.push("Updated within 24 hours"); }

  if (event.status === "reviewing") { score += 5; factors.push("Under review"); }

  return { eventId: event.id, score: Math.min(score, 100), factors };
}

function scoreLevel(score: number): { label: string; color: "error" | "warning" | "info" | "default" } {
  if (score >= 60) return { label: "High signal", color: "error" };
  if (score >= 35) return { label: "Medium signal", color: "warning" };
  if (score >= 15) return { label: "Low signal", color: "info" };
  return { label: "Background", color: "default" };
}

export default function EntityWatchlist({ events, sources, onSelectEvent }: {
  events: HarvyEvent[];
  sources: Source[];
  onSelectEvent: (event: HarvyEvent) => void;
}) {
  const [watchEntries, setWatchEntries] = useState<WatchEntry[]>([
    { id: "w1", label: "Supply chain disruption", keywords: ["supply", "shortage", "disruption", "logistics", "port"], addedAt: Date.now() - 86400000 },
    { id: "w2", label: "Financial instability", keywords: ["bank", "default", "inflation", "recession", "market"], addedAt: Date.now() - 172800000 },
  ]);
  const [newLabel, setNewLabel] = useState("");
  const [newKeywords, setNewKeywords] = useState("");
  const [activeWatch, setActiveWatch] = useState<string | null>("w1");

  const addWatch = () => {
    const label = newLabel.trim();
    const keywords = newKeywords.split(",").map((k) => k.trim()).filter(Boolean);
    if (!label || keywords.length === 0) return;
    setWatchEntries((entries) => [...entries, { id: crypto.randomUUID(), label, keywords, addedAt: Date.now() }]);
    setNewLabel("");
    setNewKeywords("");
  };

  const removeWatch = (id: string) => {
    setWatchEntries((entries) => entries.filter((e) => e.id !== id));
    if (activeWatch === id) setActiveWatch(null);
  };

  const scored = useMemo(() => {
    const watch = watchEntries.find((w) => w.id === activeWatch);
    if (!watch) return [];
    return events
      .map((event) => ({ event, ...scoreEvent(event, watch.keywords) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);
  }, [events, activeWatch, watchEntries]);

  const activeEntry = watchEntries.find((w) => w.id === activeWatch);

  return <Stack spacing={2}>
    <Box>
      <Typography variant="h5" component="h2">Entity watchlists</Typography>
      <Typography color="text.secondary" variant="body2">
        Track keywords and themes across events. Signal scores are heuristic, not risk assessments.
      </Typography>
    </Box>

    <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
      <Box sx={{ minWidth: { md: 280 }, maxWidth: { md: 320 } }}>
        <Typography variant="subtitle2">Watchlists</Typography>
        <Stack spacing={1} sx={{ mt: 1 }}>
          {watchEntries.map((entry) => (
            <Card key={entry.id} variant="outlined"
              sx={{ cursor: "pointer", bgcolor: activeWatch === entry.id ? "action.selected" : undefined }}
              onClick={() => setActiveWatch(entry.id)}>
              <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={700}>{entry.label}</Typography>
                    <Typography variant="caption" color="text.secondary">{entry.keywords.length} keywords</Typography>
                  </Box>
                  <Button size="small" color="error" onClick={(e) => { e.stopPropagation(); removeWatch(entry.id); }}>Remove</Button>
                </Stack>
              </CardContent>
            </Card>
          ))}
          <Card variant="outlined">
            <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
              <Typography variant="subtitle2">New watchlist</Typography>
              <TextField size="small" fullWidth label="Label" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} sx={{ mt: 1 }} />
              <TextField size="small" fullWidth label="Keywords (comma-separated)" value={newKeywords} onChange={(e) => setNewKeywords(e.target.value)} sx={{ mt: 1 }} />
              <Button size="small" variant="contained" onClick={addWatch} disabled={!newLabel.trim() || !newKeywords.trim()} sx={{ mt: 1 }}>Add</Button>
            </CardContent>
          </Card>
        </Stack>
      </Box>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        {!activeEntry ? (
          <Alert severity="info">Select or create a watchlist to see scored signals.</Alert>
        ) : (
          <Stack spacing={1.5}>
            <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
              <Typography variant="h6">{activeEntry.label}</Typography>
              {activeEntry.keywords.map((kw) => <Chip key={kw} size="small" label={kw} variant="outlined" />)}
            </Stack>
            <Typography variant="caption" color="text.secondary">
              {scored.length} event{scored.length !== 1 ? "s" : ""} matched from {events.length} loaded.
            </Typography>
            {scored.length === 0 && <Alert severity="info">No events match these keywords in the loaded page.</Alert>}
            {scored.map(({ event, score, factors }) => {
              const level = scoreLevel(score);
              return <Card key={event.id} variant="outlined">
                <CardContent sx={{ py: 1.5 }}>
                  <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "flex-start" }} gap={1}>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip size="small" color={level.color} label={`${level.label} · ${score}`} />
                        <Chip size="small" variant="outlined" label={event.status} />
                      </Stack>
                      <Typography variant="body2" fontWeight={700} sx={{ mt: 0.5 }}>{event.title}</Typography>
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mt: 0.5 }}>
                        {factors.map((f) => <Chip key={f} size="small" variant="outlined" label={f} />)}
                      </Stack>
                    </Box>
                    <Button size="small" onClick={() => onSelectEvent(event)}>Open</Button>
                  </Stack>
                </CardContent>
              </Card>;
            })}
          </Stack>
        )}
      </Box>
    </Stack>

    <Divider />
    <Typography variant="caption" color="text.secondary">
      Signal scores combine keyword matches, source count, and recency. They are heuristic indicators for triage, not risk or confidence scores.
    </Typography>
  </Stack>;
}
