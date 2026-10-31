import { useMemo, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type { HarvyEvent } from "./api";

interface Brief {
  id: string;
  title: string;
  summary: string;
  eventIds: string[];
  classification: "routine" | "priority" | "flash";
  createdAt: number;
  status: "draft" | "review" | "approved" | "published";
}

const CLASSIFICATION_COLOR: Record<Brief["classification"], "default" | "warning" | "error"> = {
  routine: "default",
  priority: "warning",
  flash: "error",
};

const STATUS_COLOR: Record<Brief["status"], "default" | "info" | "success" | "secondary"> = {
  draft: "default",
  review: "info",
  approved: "success",
  published: "secondary",
};

export default function IntelligenceBriefs({ events, onSelectEvent }: {
  events: HarvyEvent[];
  onSelectEvent: (event: HarvyEvent) => void;
}) {
  const [briefs, setBriefs] = useState<Brief[]>([
    {
      id: "b1",
      title: "Weekly intelligence summary",
      summary: "Consolidated overview of key events from approved sources this week. Focus on cross-source patterns and emerging themes.",
      eventIds: events.slice(0, 3).map((e) => e.id),
      classification: "routine",
      createdAt: Date.now() - 3600000,
      status: "draft",
    },
  ]);
  const [selectedBrief, setSelectedBrief] = useState<string | null>("b1");
  const [draftTitle, setDraftTitle] = useState("");
  const [draftSummary, setDraftSummary] = useState("");
  const [draftClassification, setDraftClassification] = useState<Brief["classification"]>("routine");
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set());

  const createBrief = () => {
    const title = draftTitle.trim();
    if (!title) return;
    const brief: Brief = {
      id: crypto.randomUUID(),
      title,
      summary: draftSummary.trim(),
      eventIds: [...selectedEvents],
      classification: draftClassification,
      createdAt: Date.now(),
      status: "draft",
    };
    setBriefs((b) => [brief, ...b]);
    setSelectedBrief(brief.id);
    setDraftTitle("");
    setDraftSummary("");
    setSelectedEvents(new Set());
  };

  const updateStatus = (id: string, status: Brief["status"]) => {
    setBriefs((b) => b.map((brief) => brief.id === id ? { ...brief, status } : brief));
  };

  const generateSummary = useMemo(() => {
    const brief = briefs.find((b) => b.id === selectedBrief);
    if (!brief) return "";
    const briefEvents = events.filter((e) => brief.eventIds.includes(e.id));
    const publishers = new Set(briefEvents.map((e) => e.id));
    return `${briefEvents.length} events from ${publishers.size} unique event${publishers.size !== 1 ? "s" : ""} included. ${brief.summary || "No summary provided."}`;
  }, [briefs, selectedBrief, events]);

  return <Stack spacing={2}>
    <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} gap={1}>
      <Box>
        <Typography variant="h5" component="h2">Intelligence briefs</Typography>
        <Typography color="text.secondary" variant="body2">
          Create attributed briefs from source-backed events. Every claim must trace to a citation.
        </Typography>
      </Box>
    </Stack>

    <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
      <Box sx={{ minWidth: { md: 280 }, maxWidth: { md: 340 } }}>
        <Typography variant="subtitle2">Briefs ({briefs.length})</Typography>
        <Stack spacing={1} sx={{ mt: 1 }}>
          {briefs.map((brief) => (
            <Card key={brief.id} variant="outlined"
              sx={{ cursor: "pointer", bgcolor: selectedBrief === brief.id ? "action.selected" : undefined }}
              onClick={() => setSelectedBrief(brief.id)}>
              <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
                <Stack direction="row" spacing={0.5} flexWrap="wrap">
                  <Chip size="small" color={CLASSIFICATION_COLOR[brief.classification]} label={brief.classification.toUpperCase()} />
                  <Chip size="small" color={STATUS_COLOR[brief.status]} label={brief.status} />
                </Stack>
                <Typography variant="body2" fontWeight={700} sx={{ mt: 0.5 }}>{brief.title}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {brief.eventIds.length} event{brief.eventIds.length !== 1 ? "s" : ""} · {new Date(brief.createdAt).toLocaleString()}
                </Typography>
              </CardContent>
            </Card>
          ))}

          <Card variant="outlined">
            <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
              <Typography variant="subtitle2">New brief</Typography>
              <TextField size="small" fullWidth label="Title" value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)} sx={{ mt: 1 }} />
              <TextField size="small" fullWidth label="Summary" value={draftSummary} onChange={(e) => setDraftSummary(e.target.value)} sx={{ mt: 1 }} multiline rows={2} />
              <FormControl size="small" fullWidth sx={{ mt: 1 }}>
                <InputLabel>Classification</InputLabel>
                <Select label="Classification" value={draftClassification} onChange={(e) => setDraftClassification(e.target.value as Brief["classification"])}>
                  <MenuItem value="routine">Routine</MenuItem>
                  <MenuItem value="priority">Priority</MenuItem>
                  <MenuItem value="flash">Flash</MenuItem>
                </Select>
              </FormControl>
              <Button size="small" variant="contained" onClick={createBrief} disabled={!draftTitle.trim()} sx={{ mt: 1 }}>Create</Button>
            </CardContent>
          </Card>
        </Stack>
      </Box>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        {!selectedBrief ? (
          <Alert severity="info">Select or create a brief to edit.</Alert>
        ) : (() => {
          const brief = briefs.find((b) => b.id === selectedBrief);
          if (!brief) return <Alert severity="error">Brief not found.</Alert>;
          return <Stack spacing={1.5}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <Chip size="small" color={CLASSIFICATION_COLOR[brief.classification]} label={brief.classification.toUpperCase()} />
              <Chip size="small" color={STATUS_COLOR[brief.status]} label={brief.status} />
              <Chip size="small" variant="outlined" label={`${brief.eventIds.length} events`} />
            </Stack>
            <Typography variant="h6">{brief.title}</Typography>
            <Typography variant="body2">{brief.summary || "No summary provided."}</Typography>
            <Typography variant="caption" color="text.secondary">{generateSummary}</Typography>
            <Divider />
            <Typography variant="subtitle2">Included events</Typography>
            {brief.eventIds.length === 0 && <Alert severity="info">No events included. Select events below to add them.</Alert>}
            {brief.eventIds.map((eid) => {
              const event = events.find((e) => e.id === eid);
              return event ? (
                <Card key={eid} variant="outlined">
                  <CardContent sx={{ py: 1 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={700}>{event.title}</Typography>
                        <Typography variant="caption" color="text.secondary">{event.evidence_count} sources · {new Date(event.last_seen_at).toLocaleString()}</Typography>
                      </Box>
                      <Button size="small" onClick={() => onSelectEvent(event)}>Open</Button>
                    </Stack>
                  </CardContent>
                </Card>
              ) : null;
            })}
            <Divider />
            <Typography variant="subtitle2">Available events</Typography>
            <Box sx={{ maxHeight: 300, overflowY: "auto" }}>
              {events.slice(0, 20).map((event) => (
                <Box key={event.id} sx={{ display: "flex", alignItems: "center", py: 0.5 }}>
                  <Chip size="small" variant={brief.eventIds.includes(event.id) ? "filled" : "outlined"}
                    label={event.title.slice(0, 50)}
                    onClick={() => {
                      setBriefs((b) => b.map((br) => {
                        if (br.id !== selectedBrief) return br;
                        const ids = br.eventIds.includes(event.id)
                          ? br.eventIds.filter((id) => id !== event.id)
                          : [...br.eventIds, event.id];
                        return { ...br, eventIds: ids };
                      }));
                    }} />
                </Box>
              ))}
            </Box>
            <Divider />
            <Stack direction="row" spacing={1}>
              {brief.status !== "published" && (
                <Button variant="contained" onClick={() => updateStatus(brief.id, brief.status === "draft" ? "review" : brief.status === "review" ? "approved" : "published")}>
                  {brief.status === "draft" ? "Submit for review" : brief.status === "review" ? "Approve" : "Publish"}
                </Button>
              )}
              {brief.status === "published" && <Chip color="secondary" label="Published" />}
            </Stack>
          </Stack>;
        })()}
      </Box>
    </Stack>

    <Divider />
    <Typography variant="caption" color="text.secondary">
      Briefs are draft artifacts. Every summary must be traceable to evidence citations. Briefs do not publish automatically; editorial review is required before publication.
    </Typography>
  </Stack>;
}
