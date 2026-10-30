import { useEffect, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CircularProgress from "@mui/material/CircularProgress";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { listOpsActions, updateOpsAction, type OpsAction } from "./api";

export default function OpsDesk({ canEdit, focusActionId }: { canEdit: boolean; focusActionId?: string | null }) {
  const [actions, setActions] = useState<OpsAction[]>([]);
  const [drafts, setDrafts] = useState<Record<string, OpsAction["status"]>>({});
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const reload = async () => {
    setBusy(true);
    try {
      const result = await listOpsActions();
      setActions(result.items);
      setDrafts(Object.fromEntries(result.items.map((item) => [item.id, item.status])));
      setNotice("");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Ops actions could not load."); }
    finally { setBusy(false); }
  };

  useEffect(() => { void reload(); }, []);
  useEffect(() => {
    if (!focusActionId || !actions.some((action) => action.id === focusActionId)) return;
    document.getElementById(`ops-action-${focusActionId}`)?.scrollIntoView({ block: "center" });
  }, [focusActionId, actions]);

  const save = async (action: OpsAction) => {
    setBusy(true);
    try {
      await updateOpsAction({ ...action, status: drafts[action.id] || action.status });
      await reload();
      setNotice("Action updated.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Action could not be updated."); }
    finally { setBusy(false); }
  };

  return <Stack spacing={2}>
    <Stack direction="row" justifyContent="space-between" alignItems="center"><Box><Typography variant="h5" component="h2">Ops action queue</Typography><Typography color="text.secondary">Work handed over from source-backed Harvy analysis.</Typography></Box><Button onClick={() => void reload()} disabled={busy}>Refresh</Button></Stack>
    {notice && <Alert severity="info" onClose={() => setNotice("")}>{notice}</Alert>}
    {busy && actions.length === 0 ? <CircularProgress aria-label="Loading Ops actions" /> : actions.length === 0 ? <Alert severity="info">No actions have been handed off to this workspace.</Alert> : actions.map((action) => <Card key={action.id} id={`ops-action-${action.id}`}><CardContent><Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2} alignItems={{ md: "center" }}>
      <Box><Typography variant="h6">{action.event_title}</Typography><Typography color="text.secondary">{action.story_title ? `Story: ${action.story_title}` : `Handoff from ${action.source_product}`}</Typography>{action.source_url && <Button component="a" href={action.source_url} target="_blank" rel="noreferrer" size="small" sx={{ px: 0 }}>{action.publisher ? `Source: ${action.publisher}` : "Open source evidence"}</Button>}<Typography variant="caption" display="block" color="text.secondary">Created {new Date(action.created_at).toLocaleString()} · revision {action.revision}</Typography></Box>
      <Stack direction="row" spacing={1} alignItems="center"><FormControl size="small" sx={{ minWidth: 150 }}><InputLabel id={`action-status-${action.id}`}>Status</InputLabel><Select labelId={`action-status-${action.id}`} label="Status" value={drafts[action.id] || action.status} disabled={!canEdit || busy} onChange={(event) => setDrafts((current) => ({ ...current, [action.id]: event.target.value as OpsAction["status"] }))}><MenuItem value="open">Open</MenuItem><MenuItem value="in_progress">In progress</MenuItem><MenuItem value="done">Done</MenuItem><MenuItem value="cancelled">Cancelled</MenuItem></Select></FormControl><Button variant="contained" disabled={!canEdit || busy || (drafts[action.id] || action.status) === action.status} onClick={() => void save(action)}>Save</Button></Stack>
    </Stack></CardContent></Card>)}
    {!canEdit && actions.length > 0 && <Alert severity="info">You have read-only access to Ops actions.</Alert>}
  </Stack>;
}
