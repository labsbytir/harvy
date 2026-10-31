import { useMemo, useState } from "react";
import Alert from "@mui/material/Alert";
import Badge from "@mui/material/Badge";
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

type TriagePriority = "urgent" | "high" | "normal" | "low";
type TriageDecision = "investigate" | "monitor" | "dismiss" | "escalate";

interface TriageItem {
  event: HarvyEvent;
  priority: TriagePriority;
  reason: string;
}

const PRIORITY_COLOR: Record<TriagePriority, "error" | "warning" | "info" | "default"> = {
  urgent: "error",
  high: "warning",
  normal: "info",
  low: "default",
};

function computePriority(event: HarvyEvent): { priority: TriagePriority; reason: string } {
  const now = Date.now();
  const ageMs = now - event.last_seen_at;
  const ageHours = ageMs / (1000 * 60 * 60);
  const evidenceCount = event.evidence_count || 0;

  if (ageHours < 1 && evidenceCount >= 3) return { priority: "urgent", reason: "Breaking: multiple sources within the last hour" };
  if (ageHours < 2 && evidenceCount >= 2) return { priority: "urgent", reason: "Fresh event with corroboration" };
  if (ageHours < 6 && evidenceCount >= 2) return { priority: "high", reason: "Recent event with multiple sources" };
  if (ageHours < 24 && evidenceCount >= 1) return { priority: "high", reason: "New within last 24 hours" };
  if (evidenceCount >= 5) return { priority: "high", reason: "High source count suggests significance" };
  if (ageHours > 72) return { priority: "low", reason: "Older event; lower urgency" };
  return { priority: "normal", reason: "Standard monitoring priority" };
}

function assignPriority(events: HarvyEvent[]): TriageItem[] {
  return events
    .map((event) => ({ event, ...computePriority(event) }))
    .sort((a, b) => {
      const order: Record<TriagePriority, number> = { urgent: 0, high: 1, normal: 2, low: 3 };
      return order[a.priority] - order[b.priority] || b.event.last_seen_at - a.event.last_seen_at;
    });
}

export default function BreakingNewsTriage({ events, onSelectEvent }: { events: HarvyEvent[]; onSelectEvent: (event: HarvyEvent) => void }) {
  const [filter, setFilter] = useState<TriagePriority | "all">("all");
  const [decisions, setDecisions] = useState<Record<string, TriageDecision>>({});

  const triageItems = useMemo(() => assignPriority(events), [events]);
  const counts = useMemo(() => {
    const c: Record<TriagePriority, number> = { urgent: 0, high: 0, normal: 0, low: 0 };
    for (const item of triageItems) c[item.priority]++;
    return c;
  }, [triageItems]);

  const visible = filter === "all" ? triageItems : triageItems.filter((item) => item.priority === filter);

  return <Stack spacing={2}>
    <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} gap={1}>
      <Box>
        <Typography variant="h5" component="h2">Breaking news triage</Typography>
        <Typography color="text.secondary" variant="body2">
          Events ranked by recency and source corroboration. Assign decisions to route work.
        </Typography>
      </Box>
      <ToggleButtonGroup size="small" exclusive value={filter} onChange={(_e, next) => { if (next) setFilter(next); }} aria-label="Priority filter">
        <ToggleButton value="all">All ({triageItems.length})</ToggleButton>
        <ToggleButton value="urgent"><Badge color="error" badgeContent={counts.urgent} max={99}>Urgent</Badge></ToggleButton>
        <ToggleButton value="high"><Badge color="warning" badgeContent={counts.high} max={99}>High</Badge></ToggleButton>
        <ToggleButton value="normal"><Badge color="info" badgeContent={counts.normal} max={99}>Normal</Badge></ToggleButton>
        <ToggleButton value="low">Low</ToggleButton>
      </ToggleButtonGroup>
    </Stack>

    {counts.urgent > 0 && <Alert severity="warning">
      {counts.urgent} urgent event{counts.urgent !== 1 ? "s" : ""} need immediate review.
    </Alert>}

    {visible.length === 0 && <Alert severity="info">No events match this priority filter.</Alert>}

    {visible.map(({ event, priority, reason }) => {
      const decision = decisions[event.id];
      return <Card key={event.id} variant="outlined" sx={{ borderLeft: 4, borderLeftColor: `${PRIORITY_COLOR[priority]}.main` }}>
        <CardContent sx={{ py: 1.5 }}>
          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "flex-start" }} gap={1}>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                <Chip size="small" color={PRIORITY_COLOR[priority]} label={priority.toUpperCase()} />
                <Chip size="small" variant="outlined" label={event.status} />
                <Chip size="small" variant="outlined" label={`${event.evidence_count} sources`} />
              </Stack>
              <Typography variant="body2" fontWeight={700} sx={{ mt: 0.5 }}>{event.title}</Typography>
              <Typography variant="caption" color="text.secondary">{reason}</Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                Last seen {new Date(event.last_seen_at).toLocaleString()}
              </Typography>
            </Box>
            <Stack direction="row" spacing={0.5} flexShrink={0}>
              {(["investigate", "monitor", "escalate", "dismiss"] as const).map((d) => (
                <Button key={d} size="small" variant={decision === d ? "contained" : "outlined"}
                  color={d === "escalate" ? "warning" : d === "dismiss" ? "inherit" : "primary"}
                  onClick={() => setDecisions((c) => ({ ...c, [event.id]: c[event.id] === d ? undefined as never : d }))}>
                  {d}
                </Button>
              ))}
              <Button size="small" onClick={() => onSelectEvent(event)}>Open</Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>;
    })}

    <Divider />
    <Typography variant="caption" color="text.secondary">
      Priority is derived from event age and evidence count. It is not a risk or severity score.
      Decisions are local to this session and are not persisted.
    </Typography>
  </Stack>;
}
