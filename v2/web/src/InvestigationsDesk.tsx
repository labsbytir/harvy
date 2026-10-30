import { useEffect, useMemo, useRef, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import {
  addInvestigationItem, createEntity, createInvestigation, createRelationship, deleteInvestigationItem,
  getEntity, getEvent, getInvestigation, listEntities, listEvents, listInvestigations, loadInvestigationGraph,
  type Evidence, type HarvyEvent, type Investigation, type InvestigationGraph, type InvestigationItem,
  type OsintEntity,
} from "./api";
import { EventRequestGuard } from "./event-scope";

const types: OsintEntity["entity_type"][] = ["organization", "person", "public_body", "place", "asset", "other"];
const relationBasis: Array<"observed" | "inferred" | "disputed"> = ["observed", "inferred", "disputed"];

function Graph({ graph, onSelect }: { graph: InvestigationGraph; onSelect: (id: string) => void }) {
  const positions = useMemo(() => {
    const count = graph.nodes.length;
    return new Map(graph.nodes.map((node, index) => {
      if (count === 1) return [node.id, { x: 360, y: 205 }];
      if (count === 2) return [node.id, { x: index === 0 ? 220 : 500, y: 205 }];
      const angle = (Math.PI * 2 * index) / count - Math.PI / 2;
      return [node.id, { x: 360 + Math.cos(angle) * 250, y: 205 + Math.sin(angle) * 142 }];
    }));
  }, [graph.nodes]);
  if (!graph.nodes.length) return <Alert severity="info">No evidence-backed relationships yet. Add entities, then connect them to a source evidence item.</Alert>;
  return <>
    <Box sx={{ width: "100%", overflowX: "auto", color: "text.primary" }}>
      <svg viewBox="0 0 720 410" role="img" aria-label="Evidence-backed entity relationship graph" style={{ width: "100%", minWidth: 420, height: 410, display: "block" }}>
        {graph.edges.map((edge) => {
          const from = positions.get(edge.from_entity_id);
          const to = positions.get(edge.to_entity_id);
          if (!from || !to) return null;
          return <g key={edge.id}>
            <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={edge.interpretation === "disputed" ? "#9A5A17" : "#8A9894"} strokeWidth="2" strokeDasharray={edge.interpretation === "inferred" ? "6 5" : undefined} />
            <title>{`${edge.relationship_type} · ${edge.interpretation} · ${edge.publisher}`}</title>
          </g>;
        })}
        {graph.nodes.map((node) => {
          const point = positions.get(node.id)!;
          return <g key={node.id} role="button" tabIndex={0} aria-label={`${node.display_name}, ${node.entity_type}`} onClick={() => onSelect(node.id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(node.id); } }} style={{ cursor: "pointer" }}>
            <circle cx={point.x} cy={point.y} r="31" fill="#F8F7F4" stroke="#086E68" strokeWidth="3" />
            <text x={point.x} y={point.y + 48} textAnchor="middle" fill="currentColor" fontSize="12" fontWeight="600">{node.display_name.slice(0, 28)}</text>
            <text x={point.x} y={point.y + 4} textAnchor="middle" fill="#17212B" fontSize="9">{node.entity_type.replace("_", " ")}</text>
          </g>;
        })}
      </svg>
    </Box>
    <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1 }}>
      <Chip size="small" label="Solid · observed" />
      <Chip size="small" label="Dashed · inferred" variant="outlined" />
      <Chip size="small" label="Amber · disputed" color="warning" variant="outlined" />
    </Stack>
    {graph.capped && <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>Showing the 100 most recent evidence-backed relationships. Narrow to a casebook for more context.</Typography>}
  </>;
}

export default function InvestigationsDesk({ product, canEdit, focusInvestigationId, focusEntityId, onShowWatchlists }: {
  product: string; canEdit: boolean; focusInvestigationId: string | null; focusEntityId: string | null; onShowWatchlists: () => void;
}) {
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(focusInvestigationId);
  const [casebook, setCasebook] = useState<(Investigation & { items: InvestigationItem[] }) | null>(null);
  const [entities, setEntities] = useState<OsintEntity[]>([]);
  const [graph, setGraph] = useState<InvestigationGraph>({ nodes: [], edges: [], capped: false });
  const [events, setEvents] = useState<HarvyEvent[]>([]);
  const [eventId, setEventId] = useState("");
  const [eventEvidence, setEventEvidence] = useState<Evidence[]>([]);
  const [entity, setEntity] = useState<Awaited<ReturnType<typeof getEntity>> | null>(null);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [entityName, setEntityName] = useState("");
  const [entityType, setEntityType] = useState<OsintEntity["entity_type"]>("organization");
  const [fromEntity, setFromEntity] = useState("");
  const [toEntity, setToEntity] = useState("");
  const [relationType, setRelationType] = useState("associated_with");
  const [interpretation, setInterpretation] = useState<"observed" | "inferred" | "disputed">("observed");
  const [evidenceId, setEvidenceId] = useState("");
  const [noteTitle, setNoteTitle] = useState("");
  const [noteText, setNoteText] = useState("");
  const [entitySearch, setEntitySearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const guardRef = useRef<EventRequestGuard | null>(null);
  if (!guardRef.current) guardRef.current = new EventRequestGuard();
  const guard = guardRef.current;

  const reload = async (preferredId = selectedId) => {
    const token = guard.begin(`${product}:${focusInvestigationId ?? ""}`);
    const [cases, page] = await Promise.all([
      listInvestigations(product), listEvents(new URLSearchParams({ product, limit: "30" })),
    ]);
    if (!guard.isCurrent(token)) return; // a newer reload or product/focus switch discards this response
    setInvestigations(cases.items);
    setEvents(page.items);
    const selected = cases.items.find((item) => item.id === preferredId) || cases.items[0] || null;
    setSelectedId(selected?.id || null);
    if (!selected) setCasebook(null);
  };

  useEffect(() => { void reload(focusInvestigationId).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "The investigation desk could not load.")); }, [product, focusInvestigationId]);
  useEffect(() => {
    if (!selectedId) {
      setCasebook(null);
      let live = true;
      void loadInvestigationGraph(product).then((nextGraph) => { if (live) setGraph(nextGraph); });
      return () => { live = false; };
    }
    let live = true;
    void Promise.all([getInvestigation(selectedId, product), loadInvestigationGraph(product, selectedId)]).then(([detail, nextGraph]) => {
      if (live) { setCasebook(detail); setGraph(nextGraph); }
    }).catch((cause: unknown) => { if (live) setError(cause instanceof Error ? cause.message : "The casebook could not load."); });
    return () => { live = false; };
  }, [selectedId, product]);
  useEffect(() => {
    let live = true;
    const timer = window.setTimeout(() => {
      void listEntities(product, entitySearch).then((result) => { if (live) setEntities(result.items); })
        .catch((cause: unknown) => { if (live) setError(cause instanceof Error ? cause.message : "Entity search failed."); });
    }, 180);
    return () => { live = false; window.clearTimeout(timer); };
  }, [entitySearch, product]);
  useEffect(() => {
    if (!eventId) { setEventEvidence([]); return; }
    let live = true;
    void getEvent(eventId, product).then((event) => { if (live) setEventEvidence(event.evidence); }).catch(() => { if (live) setEventEvidence([]); });
    return () => { live = false; };
  }, [eventId, product]);
  useEffect(() => {
    if (!focusEntityId) return;
    let live = true;
    void getEntity(focusEntityId, product).then((saved) => { if (live) setEntity(saved); }).catch((cause: unknown) => { if (live) setError(cause instanceof Error ? cause.message : "Entity could not load."); });
    return () => { live = false; };
  }, [focusEntityId, product]);

  const withBusy = async (work: () => Promise<void>) => {
    setBusy(true); setError("");
    try { await work(); } catch (cause) { setError(cause instanceof Error ? cause.message : "The change could not be saved."); }
    finally { setBusy(false); }
  };
  const createCasebook = () => withBusy(async () => {
    if (!title.trim()) return;
    const created = await createInvestigation(product, { title, summary });
    setTitle(""); setSummary(""); await reload(created.id);
  });
  const addNote = () => withBusy(async () => {
    if (!casebook || !noteTitle.trim()) return;
    await addInvestigationItem(casebook.id, product, { kind: "note", title: noteTitle, note: noteText, expected_revision: casebook.revision });
    setNoteTitle(""); setNoteText(""); await reload(casebook.id);
  });
  const pinEvent = () => withBusy(async () => {
    const event = events.find((item) => item.id === eventId);
    if (!casebook || !event) return;
    await addInvestigationItem(casebook.id, product, { kind: "event", target_id: event.id, title: event.title, expected_revision: casebook.revision });
    await reload(casebook.id);
  });
  const pinEvidence = (evidence: Evidence) => withBusy(async () => {
    if (!casebook) return;
    await addInvestigationItem(casebook.id, product, { kind: "evidence", target_id: evidence.id, title: evidence.headline, note: evidence.publisher, expected_revision: casebook.revision });
    await reload(casebook.id);
  });
  const addEntity = () => withBusy(async () => {
    if (!entityName.trim()) return;
    const created = await createEntity(product, { entity_type: entityType, display_name: entityName, description: "" });
    setEntityName(""); await reload(); setEntity(await getEntity(created.id, product));
    if (casebook) await addInvestigationItem(casebook.id, product, { kind: "entity", target_id: created.id, title: created.display_name, expected_revision: casebook.revision });
    await reload(casebook?.id || null);
  });
  const addRelationship = () => withBusy(async () => {
    if (!fromEntity || !toEntity || !evidenceId) return;
    const relation = await createRelationship(product, { from_entity_id: fromEntity, to_entity_id: toEntity, relationship_type: relationType, interpretation, evidence_id: evidenceId, notes: "" });
    if (casebook) await addInvestigationItem(casebook.id, product, { kind: "relationship", target_id: relation.id, title: relationType, expected_revision: casebook.revision });
    await reload(casebook?.id || null);
  });
  const removeItem = (item: InvestigationItem) => withBusy(async () => {
    if (!casebook) return;
    await deleteInvestigationItem(casebook.id, item.id, product, casebook.revision);
    await reload(casebook.id);
  });
  const selectEntity = (id: string) => {
    void getEntity(id, product).then(setEntity).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Entity could not load."));
  };

  return <Stack spacing={2}>
    {error && <Alert severity="error" onClose={() => setError("")}>{error}</Alert>}
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "minmax(230px, 0.72fr) minmax(380px, 1.45fr) minmax(280px, 0.9fr)" }, gap: 2, alignItems: "start" }}>
      <Stack spacing={2}>
        <Card><CardContent>
          <Typography variant="h6">Casebooks</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>Workspace-scoped investigations. Every linked claim keeps its source.</Typography>
          <Stack spacing={0.5}>{investigations.map((item) => <Button key={item.id} onClick={() => setSelectedId(item.id)} variant={selectedId === item.id ? "contained" : "text"} sx={{ justifyContent: "space-between", textAlign: "left" }}><span>{item.title}</span><Chip size="small" label={item.item_count ?? 0} /></Button>)}</Stack>
          {investigations.length === 0 && <Alert severity="info">No casebooks yet.</Alert>}
          {canEdit && <Stack spacing={1.5} sx={{ mt: 2 }}>
            <TextField size="small" label="New casebook" value={title} onChange={(event) => setTitle(event.target.value)} inputProps={{ maxLength: 240 }} />
            <TextField size="small" label="Purpose" value={summary} onChange={(event) => setSummary(event.target.value)} inputProps={{ maxLength: 2000 }} multiline minRows={2} />
            <Button variant="contained" onClick={() => void createCasebook()} disabled={busy || !title.trim()}>Create casebook</Button>
          </Stack>}
          <Divider sx={{ my: 2 }} />
          <Button size="small" onClick={onShowWatchlists}>{product === "Newsk" ? "Open saved views" : "Open saved watchlists"}</Button>
        </CardContent></Card>
        <Card><CardContent>
          <Typography variant="subtitle1" fontWeight={700}>Entity records</Typography>
          <TextField size="small" fullWidth label="Find an entity" value={entitySearch} onChange={(event) => setEntitySearch(event.target.value)} sx={{ mt: 1 }} />
          <Stack spacing={0.5} sx={{ mt: 1, maxHeight: 240, overflowY: "auto" }}>{entities.map((item) => <Button key={item.id} size="small" onClick={() => selectEntity(item.id)} sx={{ justifyContent: "flex-start", textAlign: "left" }}>{item.display_name} · {item.entity_type.replace("_", " ")}</Button>)}</Stack>
          {canEdit && <Stack spacing={1} sx={{ mt: 2 }}>
            <TextField size="small" label="Add entity candidate" value={entityName} onChange={(event) => setEntityName(event.target.value)} inputProps={{ maxLength: 200 }} />
            <FormControl size="small"><InputLabel id="entity-type-label">Type</InputLabel><Select labelId="entity-type-label" label="Type" value={entityType} onChange={(event) => setEntityType(event.target.value as OsintEntity["entity_type"])}>{types.map((type) => <MenuItem key={type} value={type}>{type.replace("_", " ")}</MenuItem>)}</Select></FormControl>
            <Button onClick={() => void addEntity()} disabled={busy || !entityName.trim()}>Add unverified record</Button>
          </Stack>}
        </CardContent></Card>
      </Stack>

      <Stack spacing={2}>
        <Card><CardContent>
          <Stack direction="row" alignItems="start" justifyContent="space-between" gap={1}>
            <Box><Typography variant="h6">Relationship map</Typography><Typography variant="body2" color="text.secondary">Edges require in-scope evidence; dashed links are explicitly inferred.</Typography></Box>
            <Button size="small" onClick={() => void reload()} disabled={busy}>Refresh</Button>
          </Stack>
          <Box sx={{ mt: 1.5 }}><Graph graph={graph} onSelect={selectEntity} /></Box>
        </CardContent></Card>
        {canEdit && <Card><CardContent>
          <Typography variant="subtitle1" fontWeight={700}>Connect entities to evidence</Typography>
          <Stack spacing={1.5} sx={{ mt: 1.5 }}>
            <FormControl size="small"><InputLabel id="from-entity-label">From entity</InputLabel><Select labelId="from-entity-label" label="From entity" value={fromEntity} onChange={(event) => setFromEntity(event.target.value)}>{entities.map((item) => <MenuItem key={item.id} value={item.id}>{item.display_name}</MenuItem>)}</Select></FormControl>
            <FormControl size="small"><InputLabel id="to-entity-label">To entity</InputLabel><Select labelId="to-entity-label" label="To entity" value={toEntity} onChange={(event) => setToEntity(event.target.value)}>{entities.filter((item) => item.id !== fromEntity).map((item) => <MenuItem key={item.id} value={item.id}>{item.display_name}</MenuItem>)}</Select></FormControl>
            <TextField size="small" label="Relationship" value={relationType} onChange={(event) => setRelationType(event.target.value)} inputProps={{ maxLength: 80 }} />
            <FormControl size="small"><InputLabel id="basis-label">Interpretation</InputLabel><Select labelId="basis-label" label="Interpretation" value={interpretation} onChange={(event) => setInterpretation(event.target.value as typeof interpretation)}>{relationBasis.map((basis) => <MenuItem key={basis} value={basis}>{basis}</MenuItem>)}</Select></FormControl>
            <FormControl size="small"><InputLabel id="source-event-label">Source event</InputLabel><Select labelId="source-event-label" label="Source event" value={eventId} onChange={(event) => setEventId(event.target.value)}><MenuItem value="">Select event</MenuItem>{events.map((event) => <MenuItem key={event.id} value={event.id}>{event.title}</MenuItem>)}</Select></FormControl>
            <FormControl size="small" disabled={!eventEvidence.length}><InputLabel id="source-evidence-label">Evidence</InputLabel><Select labelId="source-evidence-label" label="Evidence" value={evidenceId} onChange={(event) => setEvidenceId(event.target.value)}><MenuItem value="">Select evidence</MenuItem>{eventEvidence.map((item) => <MenuItem key={item.id} value={item.id}>{item.publisher} · {item.headline}</MenuItem>)}</Select></FormControl>
            <Button variant="contained" onClick={() => void addRelationship()} disabled={busy || !fromEntity || !toEntity || fromEntity === toEntity || !evidenceId}>Add evidence-backed relationship</Button>
          </Stack>
        </CardContent></Card>}
      </Stack>

      <Stack spacing={2}>
        <Card><CardContent>
          <Typography variant="h6">Casebook detail</Typography>
          {!casebook ? <Typography color="text.secondary" sx={{ mt: 1 }}>Create or select a casebook to pin evidence and notes.</Typography> : <>
            <Typography variant="h5" sx={{ mt: 1 }}>{casebook.title}</Typography>
            <Typography color="text.secondary" sx={{ mt: 0.5 }}>{casebook.summary || "No purpose recorded."}</Typography>
            <Chip size="small" sx={{ mt: 1 }} label={`${casebook.status} · revision ${casebook.revision}`} />
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" fontWeight={700}>Pin a source event</Typography>
            <FormControl fullWidth size="small" sx={{ mt: 1 }}><InputLabel id="pin-event-label">Event</InputLabel><Select labelId="pin-event-label" label="Event" value={eventId} onChange={(event) => setEventId(event.target.value)}><MenuItem value="">Select event</MenuItem>{events.map((event) => <MenuItem key={event.id} value={event.id}>{event.title}</MenuItem>)}</Select></FormControl>
            <Button size="small" onClick={() => void pinEvent()} disabled={busy || !eventId} sx={{ mt: 1 }}>Pin event</Button>
            {!!eventEvidence.length && <Stack spacing={0.5} sx={{ mt: 1 }}>{eventEvidence.map((item) => <Button key={item.id} size="small" onClick={() => void pinEvidence(item)} disabled={busy} sx={{ justifyContent: "flex-start", textAlign: "left" }}>Pin evidence · {item.publisher} · {item.headline}</Button>)}</Stack>}
            {canEdit && <Stack spacing={1} sx={{ mt: 2 }}>
              <TextField size="small" label="Note title" value={noteTitle} onChange={(event) => setNoteTitle(event.target.value)} inputProps={{ maxLength: 240 }} />
              <TextField size="small" label="Analyst note" value={noteText} onChange={(event) => setNoteText(event.target.value)} multiline minRows={2} inputProps={{ maxLength: 5000 }} />
              <Button onClick={() => void addNote()} disabled={busy || !noteTitle.trim()}>Add note</Button>
            </Stack>}
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" fontWeight={700}>Evidence trail · {casebook.items.length}</Typography>
            <Stack divider={<Divider flexItem />} sx={{ mt: 1 }}>
              {casebook.items.map((item) => <Box key={item.id} sx={{ py: 1 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="start" gap={1}>
                  <Box><Typography variant="body2" fontWeight={700}>{item.title}</Typography><Typography variant="caption" color="text.secondary">{item.item_kind} · {new Date(item.created_at).toLocaleString()}</Typography></Box>
                  {canEdit && <Button size="small" onClick={() => void removeItem(item)} disabled={busy} aria-label={`Remove ${item.title}`}>Remove</Button>}
                </Stack>
                {item.note && <Typography variant="body2" sx={{ mt: 0.5 }}>{item.note}</Typography>}
                {(item.publisher || item.source_url) && <Typography variant="caption" display="block" color="text.secondary">{item.publisher}{item.captured_at ? ` · captured ${new Date(item.captured_at).toLocaleString()}` : ""}</Typography>}
                {item.source_url && <Button size="small" href={item.source_url} target="_blank" rel="noreferrer">Open source</Button>}
              </Box>)}
              {casebook.items.length === 0 && <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>No evidence or notes pinned.</Typography>}
            </Stack>
          </>}
        </CardContent></Card>
        <Card><CardContent>
          <Typography variant="h6">Selected entity</Typography>
          {!entity ? <Typography color="text.secondary" sx={{ mt: 1 }}>Select a graph node or entity record to inspect its source-backed links.</Typography> : <>
            <Typography variant="h5" sx={{ mt: 1 }}>{entity.display_name}</Typography><Chip size="small" label={`${entity.entity_type.replace("_", " ")} · unverified record`} sx={{ mt: 1 }} />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{entity.description || "No description recorded."}</Typography>
            <Divider sx={{ my: 1.5 }} />
            <Stack spacing={1}>{entity.relationships.map((relation) => <Box key={relation.id}><Typography variant="body2" fontWeight={700}>{relation.relationship_type} · {relation.interpretation}</Typography><Typography variant="caption" color="text.secondary">{relation.publisher} · {relation.headline} · {new Date(relation.captured_at).toLocaleString()}</Typography><Button size="small" href={relation.source_url} target="_blank" rel="noreferrer">View evidence source</Button></Box>)}</Stack>
          </>}
        </CardContent></Card>
      </Stack>
    </Box>
    {busy && <Stack direction="row" spacing={1} alignItems="center"><CircularProgress size={16} /><Typography variant="caption">Saving…</Typography></Stack>}
  </Stack>;
}
