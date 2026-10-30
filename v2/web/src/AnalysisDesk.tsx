import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { QueryClient } from "@tanstack/react-query";
import Alert from "@mui/material/Alert";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Chip from "@mui/material/Chip";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";
import type { DashboardConfig } from "drizzle-cube/client/components";
import { CubeProvider } from "drizzle-cube/client/providers";
import { useCubeMetaQuery } from "drizzle-cube/client/hooks";
import "drizzle-cube/client/styles.css";
import { createDashboard, deleteDashboard, listDashboards, updateDashboard, type DashboardView, type HarvyContext } from "./api";
import { isDashboardConfig } from "../../shared/dashboard-config";

const DataBrowser = lazy(() => import("drizzle-cube/client").then(({ DataBrowser }) => ({ default: DataBrowser })));
const AnalyticsDashboard = lazy(() => import("drizzle-cube/client/components").then(({ AnalyticsDashboard }) => ({ default: AnalyticsDashboard })));

const DEFAULT_CONFIG: DashboardConfig = {
  portlets: [
    { id: "events-by-status", title: "Events by status", query: JSON.stringify({ measures: ["Events.count"], dimensions: ["Events.status"] }), chartType: "bar", w: 6, h: 4, x: 0, y: 0 },
    { id: "evidence-by-publisher", title: "Evidence by publisher", query: JSON.stringify({ measures: ["Evidence.count"], dimensions: ["Evidence.publisher"] }), chartType: "bar", w: 6, h: 4, x: 6, y: 0 },
    { id: "recent-events", title: "Recent event activity", query: JSON.stringify({ measures: ["Events.count"], timeDimensions: [{ dimension: "Events.lastSeenAt", granularity: "day" }] }), chartType: "line", w: 12, h: 4, x: 0, y: 4 },
  ],
  layoutMode: "grid",
  grid: { cols: 12, rowHeight: 80, minW: 2, minH: 2 },
};

const CUBE_FEATURES = { xlsExport: { enabled: false }, dashboardImportExport: { enabled: false } };

function SchemaExplorer() {
  const { meta, isLoading: metaLoading, error: metaError } = useCubeMetaQuery();
  const [search, setSearch] = useState("");
  const term = search.trim().toLocaleLowerCase();
  const cubes = meta?.cubes.filter((cube) => {
    const fields = [...cube.dimensions, ...cube.measures];
    return !term || cube.title.toLocaleLowerCase().includes(term) || fields.some((field) =>
      field.title.toLocaleLowerCase().includes(term) || field.name.toLocaleLowerCase().includes(term)) ||
      cube.relationships?.some((relationship) => relationship.targetCube.toLocaleLowerCase().includes(term));
  }) || [];
  return <Stack spacing={2} aria-label="Analytics schema explorer">
    <TextField size="small" label="Search cubes and fields" value={search} onChange={(event) => setSearch(event.target.value)} />
    {metaLoading && <CircularProgress size={22} aria-label="Loading schema" />}
    {metaError && <Alert severity="error">{metaError.message}</Alert>}
    {cubes.map((cube) => {
      const dimensions = cube.dimensions.filter((field) => !term || field.title.toLocaleLowerCase().includes(term) || field.name.toLocaleLowerCase().includes(term));
      const measures = cube.measures.filter((field) => !term || field.title.toLocaleLowerCase().includes(term) || field.name.toLocaleLowerCase().includes(term));
      const relationships = cube.relationships?.filter((relationship) => !term || relationship.targetCube.toLocaleLowerCase().includes(term));
      return <Accordion key={cube.name} defaultExpanded={!term}>
        <AccordionSummary expandIcon={<span aria-hidden="true">⌄</span>}><Stack><Typography fontWeight={700}>{cube.title}</Typography><Typography variant="body2" color="text.secondary">{cube.description}</Typography></Stack></AccordionSummary>
        <AccordionDetails><Stack spacing={1}>
          {[...dimensions.map((field) => ({ ...field, kind: "Dimension" })), ...measures.map((field) => ({ ...field, kind: "Measure" }))].map((field) => <Stack key={field.name} direction="row" justifyContent="space-between" alignItems="center" sx={{ py: 0.5, borderBottom: 1, borderColor: "divider" }}><Box><Typography>{field.title}</Typography><Typography variant="caption" color="text.secondary">{field.name}</Typography></Box><Stack direction="row" spacing={1}><Chip size="small" label={field.kind} variant="outlined" /><Chip size="small" label={field.type} /></Stack></Stack>)}
          {relationships?.map((relationship) => <Typography key={relationship.targetCube} variant="body2" color="text.secondary">Related to {relationship.targetCube} ({relationship.relationship})</Typography>)}
        </Stack></AccordionDetails>
      </Accordion>;
    })}
    {!metaLoading && meta && !cubes.length && <Alert severity="info">No matching analytics fields are available.</Alert>}
  </Stack>;
}

export default function AnalysisDesk({ context, product, openDashboardId }: { context: HarvyContext; product: string; openDashboardId?: string | null }) {
  const theme = useTheme();
  const queryClient = useMemo(() => new QueryClient(), [context.principalId, context.tenantId, context.workspaceId, context.featureRevision, context.capabilities.join(","), product]);
  const [config, setConfig] = useState<DashboardConfig>(DEFAULT_CONFIG);
  const [title, setTitle] = useState(`${product} analysis`);
  const [visibility, setVisibility] = useState<"private" | "workspace">("private");
  const [dashboards, setDashboards] = useState<DashboardView[]>([]);
  const [selected, setSelected] = useState<DashboardView | null>(null);
  const [view, setView] = useState<"dashboard" | "records" | "schema">("dashboard");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const canEdit = context.capabilities.includes("dashboards.edit");
  const canEditDashboard = canEdit && (!selected || selected.can_edit);

  useEffect(() => () => queryClient.clear(), [queryClient]);

  useEffect(() => {
    let live = true;
    setSelected(null);
    setConfig(DEFAULT_CONFIG);
    setTitle(`${product} analysis`);
    setVisibility("private");
    void listDashboards().then((result) => {
      if (live) setDashboards(result.results.filter((item) => item.product === product));
    }).catch((error: unknown) => {
      if (live) setNotice(error instanceof Error ? error.message : "Dashboards could not load.");
    }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [product]);

  useEffect(() => {
    if (!openDashboardId) return;
    const dashboard = dashboards.find((item) => item.id === openDashboardId);
    if (!dashboard) return;
    try {
      const parsed: unknown = JSON.parse(dashboard.config_json);
      if (!isDashboardConfig<DashboardConfig>(parsed)) return;
      setConfig(parsed);
      setTitle(dashboard.title);
      setVisibility(dashboard.visibility);
      setSelected(dashboard);
      setNotice(`Opened ${dashboard.title}.`);
    } catch { setNotice("This saved dashboard has an unsupported configuration."); }
  }, [openDashboardId, dashboards]);

  const load = (id: string) => {
    const dashboard = dashboards.find((item) => item.id === id);
    if (!dashboard) return;
    try {
      const parsed: unknown = JSON.parse(dashboard.config_json);
      if (!isDashboardConfig<DashboardConfig>(parsed)) throw new Error("Invalid dashboard config");
      setConfig(parsed);
      setTitle(dashboard.title);
      setVisibility(dashboard.visibility);
      setSelected(dashboard);
      setNotice(`Loaded ${dashboard.title}.`);
    } catch { setNotice("This saved dashboard has an unsupported configuration."); }
  };

  const save = async () => {
    try {
      const record = selected
        ? await updateDashboard(selected.id, { revision: selected.revision, title: title.trim(), config, visibility })
        : await createDashboard({ title: title.trim(), product, config, visibility });
      const result = await listDashboards();
      const updated = result.results.find((item) => item.id === record.id);
      setDashboards(result.results.filter((item) => item.product === product));
      if (updated) setSelected(updated);
      setNotice("Dashboard saved.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Dashboard could not be saved.");
    }
  };

  const remove = async () => {
    if (!selected || !window.confirm(`Delete “${selected.title}”? This removes it from dashboard lists.`)) return;
    try {
      await deleteDashboard(selected.id, selected.revision);
      setDashboards((await listDashboards()).results.filter((item) => item.product === product));
      setSelected(null);
      setConfig(DEFAULT_CONFIG);
      setTitle(`${product} analysis`);
      setVisibility("private");
      setNotice("Dashboard deleted.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Dashboard could not be deleted.");
    }
  };

  return <Stack spacing={2}>
    <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ md: "center" }} spacing={1}>
      <Box><Typography variant="h5" component="h2">Analysis workbench</Typography><Typography color="text.secondary">Explore event and evidence records through the approved analytics schema.</Typography></Box>
      <Stack direction="row" spacing={1} flexWrap="wrap">
        <Select size="small" displayEmpty value={selected?.id || ""} onChange={(event) => load(event.target.value)} aria-label="Saved dashboard">
          <MenuItem value="" disabled>Saved dashboards</MenuItem>
          {dashboards.map((dashboard) => <MenuItem key={dashboard.id} value={dashboard.id}>{dashboard.title}</MenuItem>)}
        </Select>
        {canEdit && <Button size="small" variant="outlined" onClick={() => { setSelected(null); setConfig(DEFAULT_CONFIG); setTitle(`${product} analysis`); setVisibility("private"); }}>New dashboard</Button>}
        {canEditDashboard && <><TextField size="small" aria-label="Dashboard title" value={title} onChange={(event) => setTitle(event.target.value)} sx={{ width: 190 }} /><Select size="small" value={visibility} onChange={(event) => setVisibility(event.target.value as "private" | "workspace")} aria-label="Dashboard visibility"><MenuItem value="private">Private</MenuItem><MenuItem value="workspace">Share with workspace</MenuItem></Select><Button variant="contained" onClick={() => void save()} disabled={!title.trim()}>Save dashboard</Button>{selected && <Button color="error" onClick={() => void remove()}>Delete dashboard</Button>}</>}
      </Stack>
    </Stack>
    <Stack direction="row" spacing={1} role="tablist" aria-label="Analysis tools">
      <Button role="tab" aria-selected={view === "dashboard"} variant={view === "dashboard" ? "contained" : "outlined"} onClick={() => setView("dashboard")}>Dashboards</Button>
      <Button role="tab" aria-selected={view === "records"} variant={view === "records" ? "contained" : "outlined"} onClick={() => setView("records")}>Data browser</Button>
      <Button role="tab" aria-selected={view === "schema"} variant={view === "schema" ? "contained" : "outlined"} onClick={() => setView("schema")}>Schema explorer</Button>
    </Stack>
    {notice && <Alert severity="info" onClose={() => setNotice("")}>{notice}</Alert>}
    {loading ? <CircularProgress size={22} aria-label="Loading dashboards" /> : <Box sx={{
      "--dc-surface": theme.palette.background.paper,
      "--dc-surface-secondary": theme.palette.background.default,
      "--dc-surface-tertiary": theme.palette.background.default,
      "--dc-surface-hover": theme.palette.action.hover,
      "--dc-text": theme.palette.text.primary,
      "--dc-text-secondary": theme.palette.text.secondary,
      "--dc-text-muted": theme.palette.text.secondary,
      "--dc-border": theme.palette.divider,
      "--dc-border-secondary": theme.palette.divider,
      "--dc-card-bg": theme.palette.background.paper,
      "--dc-card-bg-hover": theme.palette.action.hover,
      "--dc-card-border": theme.palette.divider,
      "--dc-primary": theme.palette.primary.main,
      "--dc-primary-hover": theme.palette.primary.dark,
      "--dc-primary-content": theme.palette.primary.contrastText,
      minHeight: 620,
      border: 1,
      borderColor: "divider",
      borderRadius: 2,
      overflow: "hidden",
      p: { xs: 1, md: 2 },
    }}>
      <CubeProvider queryClient={queryClient} features={CUBE_FEATURES} apiOptions={{ apiUrl: "/api/v1/cube", credentials: "same-origin", headers: { "x-harvy-product": product } }} enableBatching={false}>
        {loading && view === "dashboard" ? <CircularProgress size={22} aria-label="Loading dashboards" /> : view === "dashboard" ? <Suspense fallback={<CircularProgress size={22} aria-label="Loading dashboard" />}><AnalyticsDashboard config={config} editable={canEditDashboard} onConfigChange={setConfig} /></Suspense> : view === "records" ? <Suspense fallback={<CircularProgress size={22} aria-label="Loading data browser" />}><DataBrowser defaultCube="Events" defaultPageSize={25} maxHeight="64rem" /></Suspense> : <SchemaExplorer />}
      </CubeProvider>
    </Box>}
    <Typography variant="caption" color="text.secondary">Every query is tenant-scoped by the server. Charts use only registered fields; saved views remain private to this organization and owner.</Typography>
  </Stack>;
}
