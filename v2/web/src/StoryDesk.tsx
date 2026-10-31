import { useEffect, useMemo, useRef, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { getEvent, type Evidence, type HarvyEvent } from "./api";

type StoryPhase = "monitoring" | "developing" | "verified" | "published" | "archived";

interface StoryNote {
  id: string;
  text: string;
  author: string;
  createdAt: number;
}

interface TimelineEntry {
  id: string;
  timestamp: number;
  kind: "evidence" | "status" | "note" | "assignment";
  label: string;
  detail: string;
  publisher?: string;
  sourceUrl?: string;
}

const PHASE_LABEL: Record<StoryPhase, string> = {
  monitoring: "Monitoring",
  developing: "Developing",
  verified: "Verified",
  published: "Published",
  archived: "Archived",
};

const PHASE_COLOR: Record<StoryPhase, "default" | "info" | "warning" | "success" | "secondary"> = {
  monitoring: "default",
  developing: "info",
  verified: "success",
  published: "secondary",
  archived: "default",
};

function evidenceToTimeline(evidence: Evidence[], event: HarvyEvent): TimelineEntry[] {
  const entries: TimelineEntry[] = evidence.map((item) => ({
    id: `ev-${item.id}`,
    timestamp: item.captured_at,
    kind: "evidence" as const,
    label: item.headline,
    detail: item.excerpt || "No excerpt available.",
    publisher: item.publisher,
    sourceUrl: item.source_url,
  }));
  entries.push({
    id: `first-${event.id}`,
    timestamp: event.first_seen_at,
    kind: "status",
    label: "Event first observed",
    detail: `Event first seen in ${event.product} workspace.`,
  });
  entries.push({
    id: `last-${event.id}`,
    timestamp: event.last_seen_at,
    kind: "status",
    label: "Latest update",
    detail: `Status: ${event.status}`,
  });
  return entries.sort((a, b) => b.timestamp - a.timestamp);
}

function groupEvidenceByPublisher(evidence: Evidence[]): Map<string, Evidence[]> {
  const groups = new Map<string, Evidence[]>();
  for (const item of evidence) {
    const key = item.publisher || "Unknown";
    const list = groups.get(key) || [];
    list.push(item);
    groups.set(key, list);
  }
  return groups;
}

function VerificationPanel({ evidence, onFlag }: { evidence: Evidence[]; onFlag: (id: string, flag: string) => void }) {
  const [flags, setFlags] = useState<Record<string, string>>({});
  const uniquePublishers = useMemo(() => [...new Set(evidence.map((e) => e.publisher))], [evidence]);
  const contradictions = useMemo(() => {
    const headlines = evidence.map((e) => e.headline.toLowerCase());
    return headlines.filter((h, i) => headlines.indexOf(h) !== i).length;
  }, [evidence]);
  return <Stack spacing={2}>
    <Typography variant="body2" color="text.secondary">
      Cross-reference evidence from {uniquePublishers.length} source{uniquePublishers.length !== 1 ? "s" : ""}.
      {contradictions > 0 && ` ${contradictions} potential duplicate headline${contradictions !== 1 ? "s" : ""} detected.`}
    </Typography>
    {evidence.map((item) => (
      <Card key={item.id} variant="outlined">
        <CardContent sx={{ py: 1.5 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" fontWeight={700} noWrap>{item.headline}</Typography>
              <Typography variant="caption" color="text.secondary">{item.publisher} · {new Date(item.captured_at).toLocaleString()}</Typography>
            </Box>
            <Stack direction="row" spacing={0.5} flexShrink={0}>
              {["confirmed", "contradicted", "needs_context"].map((flag) => (
                <Button key={flag} size="small" variant={flags[item.id] === flag ? "contained" : "outlined"}
                  onClick={() => {
                    const next = flags[item.id] === flag ? "" : flag;
                    setFlags((f) => ({ ...f, [item.id]: next }));
                    if (next) onFlag(item.id, next);
                  }}>
                  {flag.replace("_", " ")}
                </Button>
              ))}
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    ))}
  </Stack>;
}

function StoryTimeline({ entries }: { entries: TimelineEntry[] }) {
  return <Stack spacing={0} sx={{ position: "relative", pl: 2, borderLeft: 2, borderColor: "divider" }}>
    {entries.map((entry) => (
      <Box key={entry.id} sx={{ position: "relative", pb: 2.5, pl: 2 }}>
        <Box sx={{ position: "absolute", left: -6.5, top: 4, width: 11, height: 11, borderRadius: "50%",
          bgcolor: entry.kind === "evidence" ? "primary.main" : entry.kind === "note" ? "warning.main" : "grey.500",
          border: 2, borderColor: "background.paper" }} />
        <Typography variant="caption" color="text.secondary">
          {new Date(entry.timestamp).toLocaleString()}
          {entry.publisher && ` · ${entry.publisher}`}
        </Typography>
        <Typography variant="body2" fontWeight={700}>{entry.label}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ wordBreak: "break-word" }}>{entry.detail}</Typography>
        {entry.sourceUrl && (
          <Button component="a" href={entry.sourceUrl} target="_blank" rel="noreferrer" size="small" sx={{ px: 0, mt: 0.5 }}>
            View source
          </Button>
        )}
      </Box>
    ))}
  </Stack>;
}

function MediaReferences({ evidence }: { evidence: Evidence[] }) {
  const mediaEvidence = useMemo(() => evidence.filter((item) => {
    const url = item.source_url?.toLowerCase() || "";
    return url.includes("video") || url.includes("youtube") || url.includes("vimeo") ||
      url.includes("podcast") || url.includes("audio") || url.includes(".mp4") ||
      url.includes(".mp3") || url.includes("live") || url.includes("stream");
  }), [evidence]);
  const linksWithImages = useMemo(() => evidence.filter((item) => item.source_url).slice(0, 10), [evidence]);
  return <Stack spacing={1.5}>
    {mediaEvidence.length === 0 && (
      <Typography variant="body2" color="text.secondary">
        No video, audio, or live-stream references detected in current evidence. Showing source links instead.
      </Typography>
    )}
    {mediaEvidence.map((item) => (
      <Card key={item.id} variant="outlined">
        <CardContent sx={{ py: 1.5 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip size="small" color="info" label="Media" />
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" fontWeight={700} noWrap>{item.headline}</Typography>
              <Typography variant="caption" color="text.secondary">{item.publisher}</Typography>
            </Box>
          </Stack>
          {item.source_url && (
            <Button component="a" href={item.source_url} target="_blank" rel="noreferrer" size="small" sx={{ px: 0, mt: 0.5 }}>
              Open media
            </Button>
          )}
        </CardContent>
      </Card>
    ))}
    <Divider />
    <Typography variant="subtitle2">All source links ({linksWithImages.length})</Typography>
    {linksWithImages.map((item) => (
      <Button key={item.id} component="a" href={item.source_url!} target="_blank" rel="noreferrer"
        size="small" sx={{ justifyContent: "flex-start", textTransform: "none", px: 1 }} variant="text">
        <Box sx={{ minWidth: 0, textAlign: "left" }}>
          <Typography variant="body2" noWrap>{item.headline}</Typography>
          <Typography variant="caption" color="text.secondary">{item.publisher}</Typography>
        </Box>
      </Button>
    ))}
  </Stack>;
}

export default function StoryDesk({ eventId, product }: { eventId: string; product: string }) {
  const [event, setEvent] = useState<(HarvyEvent & { evidence: Evidence[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [phase, setPhase] = useState<StoryPhase>("developing");
  const [view, setView] = useState<"grouped" | "timeline" | "verification" | "media">("grouped");
  const [notes, setNotes] = useState<StoryNote[]>([]);
  const [draftNote, setDraftNote] = useState("");
  const requestRef = useRef<string>("");

  useEffect(() => {
    const requestKey = `${eventId}:${product}`;
    if (requestRef.current === requestKey) return;
    requestRef.current = requestKey;
    setLoading(true);
    setError("");
    getEvent(eventId, product).then((result) => {
      if (requestRef.current !== requestKey) return;
      setEvent(result);
    }).catch((cause: unknown) => {
      if (requestRef.current !== requestKey) return;
      setError(cause instanceof Error ? cause.message : "Story could not load.");
    }).finally(() => {
      if (requestRef.current === requestKey) setLoading(false);
    });
  }, [eventId, product]);

  const addNote = () => {
    const text = draftNote.trim();
    if (!text) return;
    setNotes((current) => [...current, {
      id: crypto.randomUUID(),
      text,
      author: "You",
      createdAt: Date.now(),
    }]);
    setDraftNote("");
  };

  const timeline = useMemo(() => event ? evidenceToTimeline(event.evidence, event) : [], [event]);
  const evidenceGroups = useMemo(() => event ? groupEvidenceByPublisher(event.evidence) : new Map(), [event]);

  if (loading) return <CircularProgress aria-label="Loading story" />;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!event) return <Alert severity="info">No event found.</Alert>;

  return <Stack spacing={2}>
    <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} gap={1}>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="h5" component="h2">{event.title}</Typography>
        <Typography color="text.secondary" variant="body2">
          {event.product} workspace · {event.evidence.length} evidence item{event.evidence.length !== 1 ? "s" : ""} ·
          first seen {new Date(event.first_seen_at).toLocaleString()}
        </Typography>
      </Box>
      <Stack direction="row" spacing={1} alignItems="center">
        <Chip size="small" color={PHASE_COLOR[phase]} label={PHASE_LABEL[phase]} />
        <ToggleButtonGroup size="small" exclusive value={view} onChange={(_e, next) => { if (next) setView(next); }} aria-label="Story view">
          <ToggleButton value="grouped">Evidence</ToggleButton>
          <ToggleButton value="timeline">Timeline</ToggleButton>
          <ToggleButton value="verification">Verify</ToggleButton>
          <ToggleButton value="media">Media</ToggleButton>
        </ToggleButtonGroup>
      </Stack>
    </Stack>

    {view === "grouped" && <Stack spacing={2}>
      {[...evidenceGroups.entries()].map(([publisher, items]) => (
        <Box key={publisher}>
          <Typography variant="subtitle2" color="text.secondary">{publisher} ({items.length})</Typography>
          <Stack spacing={1} sx={{ mt: 0.5 }}>
            {items.map((item) => (
              <Card key={item.id} variant="outlined">
                <CardContent sx={{ py: 1.5 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={700}>{item.headline}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(item.captured_at).toLocaleString()}
                        {item.artifact_id && ` · artifact ${item.artifact_id.slice(0, 8)}`}
                      </Typography>
                      {item.excerpt && <Typography variant="body2" sx={{ mt: 0.5 }}>{item.excerpt}</Typography>}
                    </Box>
                    {item.source_url && (
                      <Button component="a" href={item.source_url} target="_blank" rel="noreferrer" size="small" flexShrink={0}>
                        Source
                      </Button>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        </Box>
      ))}
      {evidenceGroups.size === 0 && <Alert severity="info">No evidence attached to this event yet.</Alert>}
    </Stack>}

    {view === "timeline" && <StoryTimeline entries={timeline} />}

    {view === "verification" && (
      <VerificationPanel evidence={event.evidence} onFlag={(id, flag) => console.log("flag", id, flag)} />
    )}

    {view === "media" && <MediaReferences evidence={event.evidence} />}

    <Divider />

    <Box>
      <Typography variant="h6" component="h3">Desk notes</Typography>
      <Stack spacing={1} sx={{ mt: 1 }}>
        {notes.map((note) => (
          <Card key={note.id} variant="outlined">
            <CardContent sx={{ py: 1.5 }}>
              <Typography variant="caption" color="text.secondary">{note.author} · {new Date(note.createdAt).toLocaleString()}</Typography>
              <Typography variant="body2">{note.text}</Typography>
            </CardContent>
          </Card>
        ))}
        <Stack direction="row" spacing={1}>
          <TextField size="small" fullWidth placeholder="Add an editorial note…" value={draftNote} onChange={(e) => setDraftNote(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addNote(); } }} />
          <Button variant="contained" onClick={addNote} disabled={!draftNote.trim()}>Add</Button>
        </Stack>
      </Stack>
    </Box>
  </Stack>;
}
