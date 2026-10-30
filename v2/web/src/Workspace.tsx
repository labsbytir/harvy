import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import Alert from "@mui/material/Alert";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardActionArea from "@mui/material/CardActionArea";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Container from "@mui/material/Container";
import Divider from "@mui/material/Divider";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { createBrief, createDashboard, createStory, getContext, getEvent, getStory, handoffEventToOps, handoffStory, HarvyApiError, listAdminAudit, listDashboards, listEvents, listProductEntitlements, listRuns, listSources, listStories, saveStory, startRun, updateEventState, updateProductEntitlement, updateSourceState, type AdminAuditEntry, type DashboardView, type EventActivity, type HarvyContext, type HarvyEvent, type HarvyRun, type ProductEntitlement, type Source, type Story, type WorkspaceSearchResult } from "./api";
import GlobalSearch from "./GlobalSearch";
import { isSavedViewConfig } from "../../shared/dashboard-config";
import type { HarvyProduct } from "./modes";
const AnalysisDesk = lazy(() => import("./AnalysisDesk"));
const OpsDesk = lazy(() => import("./OpsDesk"));

interface AuthUser { id: string; name?: string; email?: string; activeOrganizationId?: string | null }
interface AuthGlobals {
  harvyAuthReady?: Promise<void>;
  harvyAuthClient?: { getSession: () => Promise<{ data?: { user?: AuthUser; session?: { activeOrganizationId?: string | null } } | null }>; signOut: () => Promise<unknown> };
  harvyAuthUI?: (container: HTMLElement, user: AuthUser | null, refresh: () => Promise<void>) => void;
}

function isFilterDashboard(view: DashboardView): boolean {
  try {
    const value: unknown = JSON.parse(view.config_json);
    return isSavedViewConfig(value);
  } catch { return false; }
}

function AuthGate({ onUser }: { onUser: (user: AuthUser | null) => void }) {
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authMessage, setAuthMessage] = useState("");
  const panel = useRef<HTMLDivElement>(null);
  const refresh = useCallback(async () => {
    const auth = window as Window & AuthGlobals;
    if (!auth.harvyAuthClient) { setUser(null); return; }
    try {
      const result = await auth.harvyAuthClient.getSession();
      const current = result.data?.user;
      const session = result.data?.session as { activeOrganizationId?: string | null } | undefined;
      const next = current ? { ...current, activeOrganizationId: session?.activeOrganizationId || null } : null;
      setUser(next);
      onUser(next);
    } catch {
      setUser(null);
      onUser(null);
    }
  }, [onUser]);
  useEffect(() => {
    let live = true;
    const auth = window as Window & AuthGlobals;
    void (async () => {
      await import("../../auth/client");
      await auth.harvyAuthReady;
      if (!live) return;
      setAuthReady(true);
      if (!auth.harvyAuthClient) setAuthMessage("Sign-in is not configured for this local preview. Harvy identity services must be deployed and verified before sign-in is available.");
      await refresh();
    })();
    return () => { live = false; };
  }, [refresh]);
  useEffect(() => {
    if (!panel.current || !authReady) return;
    (window as Window & AuthGlobals).harvyAuthUI?.(panel.current, user, refresh);
  }, [authReady, refresh, user]);
  return <Stack spacing={2}><Box ref={panel} id="auth-panel" aria-live="polite">{!authReady && <CircularProgress size={20} aria-label="Loading sign-in" />}</Box>{authMessage && <Alert severity="warning">{authMessage}</Alert>}</Stack>;
}

export default function Workspace() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [context, setContext] = useState<HarvyContext | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [product, setProduct] = useState<HarvyProduct>("Newsk");
  const [surface, setSurface] = useState<"events" | "analysis" | "actions">("events");
  const [searchTargetDashboard, setSearchTargetDashboard] = useState<string | null>(null);
  const [searchTargetAction, setSearchTargetAction] = useState<string | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [events, setEvents] = useState<HarvyEvent[]>([]);
  const [selected, setSelected] = useState<(HarvyEvent & { evidence: Awaited<ReturnType<typeof getEvent>>["evidence"]; activity: EventActivity[] }) | null>(null);
  const [stories, setStories] = useState<Story[]>([]);
  const [runs, setRuns] = useState<HarvyRun[]>([]);
  const [dashboards, setDashboards] = useState<DashboardView[]>([]);
  const [productEntitlements, setProductEntitlements] = useState<ProductEntitlement[]>([]);
  const [entitlementError, setEntitlementError] = useState("");
  const [adminAudit, setAdminAudit] = useState<AdminAuditEntry[]>([]);
  const [auditError, setAuditError] = useState("");
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditRevision, setAuditRevision] = useState(0);
  const [story, setStory] = useState<Story | null>(null);
  const [query, setQuery] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [workspaceError, setWorkspaceError] = useState("");
  const [needsOrganization, setNeedsOrganization] = useState(false);
  const activeOrganizationRef = useRef<string | null>(null);
  const activePrincipalRef = useRef<string | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [notice, setNoticeText] = useState("");
  const [noticeKind, setNoticeKind] = useState<"error" | "info" | "success" | "warning">("error");
  const [brief, setBrief] = useState<{ title: string; body: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const setNotice = (message: string) => { setNoticeKind("error"); setNoticeText(message); };
  const setSuccessNotice = (message: string) => { setNoticeKind("success"); setNoticeText(message); };

  const reload = useCallback(async () => {
    if (!user) return;
    setBusy(true);
    try {
      const ctx = await getContext();
      setContext(ctx);
      if (!ctx.allowedProducts.length) {
        setSources([]); setStories([]); setRuns([]); setDashboards([]); setEvents([]);
        setWorkspaceError("");
        return;
      }
      if (!ctx.allowedProducts.includes(product)) {
        setProduct((ctx.allowedProducts[0] as HarvyProduct) || "Newsk");
        return;
      }
      const [sourceResult, storyResult, runResult, dashboardResult] = await Promise.all([
        listSources(product), product === "Newsk" ? listStories() : Promise.resolve({ items: [] as Story[] }), listRuns(product), listDashboards(),
      ]);
      setSources(sourceResult.items);
      setStories(storyResult.items);
      setRuns(runResult.items);
      setDashboards(dashboardResult.results);
      const filters = new URLSearchParams();
      filters.set("product", product);
      if (searchTerm) filters.set("q", searchTerm);
      if (from) filters.set("from", new Date(from).toISOString());
      if (to) filters.set("to", new Date(to).toISOString());
      if (sourceFilter) filters.set("source_id", sourceFilter);
      if (statusFilter !== "all") filters.set("status", statusFilter);
      const eventResult = await listEvents(filters);
      setEvents(eventResult.items);
      setNextCursor(eventResult.next_cursor);
      setNotice("");
      setWorkspaceError("");
      setNeedsOrganization(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "The workspace could not load.";
      if (error instanceof HarvyApiError && [401, 403].includes(error.status)) {
        setContext(null); setSources([]); setEvents([]); setSelected(null); setStories([]); setRuns([]); setDashboards([]); setStory(null); setBrief(null);
      }
      setNotice(message);
      setWorkspaceError(message);
      setNeedsOrganization(error instanceof HarvyApiError && [401, 403].includes(error.status));
    } finally { setBusy(false); }
  }, [user, product, searchTerm, from, to, sourceFilter, statusFilter]);

  useEffect(() => { if (user) void reload(); }, [user, reload]);
  useEffect(() => {
    if (!accountOpen || !context?.capabilities.includes("entitlements.manage")) { setProductEntitlements([]); setEntitlementError(""); return; }
    let active = true;
    void listProductEntitlements().then((result) => { if (active) { setProductEntitlements(result.items); setEntitlementError(""); } }).catch((error) => {
      if (active) setEntitlementError(error instanceof Error ? error.message : "Product access could not load.");
    });
    return () => { active = false; };
  }, [accountOpen, context?.tenantId, context?.featureRevision, context?.role]);
  useEffect(() => {
    if (!accountOpen || !context?.capabilities.includes("entitlements.manage")) { setAdminAudit([]); setAuditError(""); setAuditLoading(false); return; }
    let active = true;
    setAuditLoading(true);
    void listAdminAudit().then((result) => { if (active) { setAdminAudit(result.items); setAuditError(""); } }).catch((error) => {
      if (active) setAuditError(error instanceof Error ? error.message : "The audit history could not load.");
    }).finally(() => { if (active) setAuditLoading(false); });
    return () => { active = false; };
  }, [accountOpen, context?.principalId, context?.tenantId, context?.featureRevision, context?.capabilities.includes("entitlements.manage"), auditRevision]);
  useEffect(() => {
    const timer = window.setTimeout(() => setSearchTerm(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);
  useEffect(() => { setSourceFilter(""); setSelected(null); setStory(null); setSources([]); setEvents([]); setRuns([]); setDashboards([]); setSurface(product === "Ops" ? "actions" : "events"); }, [product]);
  useEffect(() => {
    if (!user || !runs.some((run) => run.status === "queued" || run.status === "running")) return;
    const timer = window.setInterval(() => void listRuns(product).then((result) => setRuns(result.items)).catch(() => {}), 5000);
    return () => window.clearInterval(timer);
  }, [user, runs, product]);
  const onUser = useCallback((next: AuthUser | null) => {
    if (activePrincipalRef.current !== (next?.id || null) || activeOrganizationRef.current !== (next?.activeOrganizationId || null)) {
      setContext(null); setWorkspaceError(""); setNeedsOrganization(false); setNotice("");
      setProduct("Newsk"); setAccountOpen(false); setQuery(""); setSearchTerm(""); setFrom(""); setTo(""); setSourceFilter(""); setStatusFilter("all");
      setSources([]); setEvents([]); setSelected(null); setStories([]); setRuns([]); setDashboards([]); setStory(null); setBrief(null); setProductEntitlements([]); setEntitlementError(""); setAdminAudit([]); setAuditError("");
      setSearchTargetDashboard(null); setSearchTargetAction(null);
    }
    activePrincipalRef.current = next?.id || null;
    activeOrganizationRef.current = next?.activeOrganizationId || null;
    setUser(next);
  }, []);
  useEffect(() => { if (context) { activeOrganizationRef.current = context.tenantId; activePrincipalRef.current = context.principalId; } }, [context?.tenantId, context?.principalId]);

  const loadMoreEvents = async () => {
    if (!nextCursor) return;
    const filters = new URLSearchParams({ before: nextCursor });
    filters.set("product", product);
    if (searchTerm) filters.set("q", searchTerm);
    if (from) filters.set("from", new Date(from).toISOString());
    if (to) filters.set("to", new Date(to).toISOString());
    if (sourceFilter) filters.set("source_id", sourceFilter);
    if (statusFilter !== "all") filters.set("status", statusFilter);
    try {
      const page = await listEvents(filters);
      setEvents((current) => [...current, ...page.items]);
      setNextCursor(page.next_cursor);
    } catch (error) { setNotice(error instanceof Error ? error.message : "More events could not load."); }
  };

  const openStory = async (id: string) => {
    setBusy(true);
    try {
      const saved = await getStory(id);
      setStory(saved);
      setSelected(await getEvent(saved.event_id, "Newsk"));
    } catch (error) { setNotice(error instanceof Error ? error.message : "Story could not load."); }
    finally { setBusy(false); }
  };

  const openSearchResult = async (result: WorkspaceSearchResult) => {
    setNotice("");
    if (result.type === "dashboard") {
      setSearchTargetAction(null);
      setSearchTargetDashboard(result.id);
      setSurface("analysis");
      return;
    }
    if (result.type === "action") {
      setSearchTargetDashboard(null);
      setSearchTargetAction(result.id);
      setProduct("Ops");
      setSurface("actions");
      return;
    }
    setSearchTargetDashboard(null);
    setSearchTargetAction(null);
    setSurface("events");
    if (result.type === "story") {
      await openStory(result.id);
      return;
    }
    const eventId = result.type === "evidence" ? result.event_id : result.id;
    if (!eventId) return;
    setBusy(true);
    try {
      setStory(null);
      setSelected(await getEvent(eventId, result.product));
    } catch (error) { setNotice(error instanceof Error ? error.message : "Search result could not load."); }
    finally { setBusy(false); }
  };

  const saveCurrentView = async () => {
    setBusy(true);
    try {
      await createDashboard({
        title: product === "Tower" ? "Business watchlist" : "Newsroom event feed", product,
        config: { kind: "saved_view", hql_version: 1, filters: { query, source_id: sourceFilter, from, to, status: statusFilter } },
      });
      setDashboards((await listDashboards()).results);
      setSuccessNotice(product === "Tower" ? "Saved this filter as a watchlist." : "Saved this newsroom view.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "View could not be saved."); }
    finally { setBusy(false); }
  };

  const loadSavedView = (view: DashboardView) => {
    try {
      const config = JSON.parse(view.config_json) as { filters?: Record<string, unknown> };
      if (!isSavedViewConfig(config)) throw new Error("invalid_saved_view");
      const filters = config.filters;
      setQuery(typeof filters.query === "string" ? filters.query : "");
      setSourceFilter(typeof filters.source_id === "string" ? filters.source_id : "");
      setFrom(typeof filters.from === "string" ? filters.from : "");
      setTo(typeof filters.to === "string" ? filters.to : "");
      setStatusFilter(typeof filters.status === "string" ? filters.status : "all");
      setSuccessNotice(`Loaded ${view.title}.`);
    } catch { setNotice("Saved view could not be read."); }
  };

  const selectEvent = async (event: HarvyEvent) => {
    setSelected(null);
    try { setSelected(await getEvent(event.id, product)); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Evidence could not load."); }
  };

  const updateSelectedEvent = async (update: { status?: HarvyEvent["status"]; assigned_to?: string | null }) => {
    if (!selected) return;
    setBusy(true);
    try {
      const saved = await updateEventState(selected, update);
      setSelected(saved);
      setEvents((items) => items.map((item) => item.id === saved.id ? { ...item, status: saved.status, assigned_to: saved.assigned_to, revision: saved.revision } : item));
      setSuccessNotice("Event updated.");
    } catch (error) {
      setNotice(error instanceof HarvyApiError && error.status === 409 ? "This event changed in another session. Reload it before saving." : error instanceof Error ? error.message : "Event could not be updated.");
    } finally { setBusy(false); }
  };

  const runSource = async (sourceId: string, idempotencyKey?: string | null) => {
    setBusy(true);
    try {
      const submitted = await startRun(sourceId, idempotencyKey || undefined);
      if (submitted.error_code === "dispatch_unconfirmed") {
        setNoticeKind("warning");
        setNoticeText("Dispatch is unconfirmed. Retry this same run after its lease expires; do not start a duplicate.");
      } else setSuccessNotice(`Run ${submitted.status}. Waiting for Automation status; submission is not completion.`);
      const result = await listRuns(product);
      setRuns(result.items);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Run could not be submitted."); }
    finally { setBusy(false); }
  };

  const setSourceEnabled = async (source: Source) => {
    const enabled = !source.enabled;
    setBusy(true);
    try {
      await updateSourceState(source, enabled);
      setSources((await listSources(product)).items);
      setAuditRevision((revision) => revision + 1);
      if (!enabled && sourceFilter === source.id) setSourceFilter("");
      setSuccessNotice(enabled ? `${source.label} resumed.` : `${source.label} paused. Already submitted jobs will continue.`);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Monitor state could not be updated."); }
    finally { setBusy(false); }
  };

  const sendToOps = async () => {
    if (!story) return;
    setBusy(true);
    try {
      const action = await handoffStory(story.id);
      const handedOff = { ...story, status: "handed_off" as const, revision: story.revision + 1 };
      setStory(handedOff);
      setStories((items) => items.map((item) => item.id === handedOff.id ? handedOff : item));
      setSuccessNotice(`Handed off to Ops. Action ${action.action_id} is open.`);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Handoff could not be completed."); }
    finally { setBusy(false); }
  };

  const handoffEvent = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      const action = await handoffEventToOps(selected.id, product);
      setSuccessNotice(`Handed off to Ops. Action ${action.action_id} is ${action.status}.`);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Event handoff could not be completed."); }
    finally { setBusy(false); }
  };

  const startStory = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      const saved = await createStory({ event_id: selected.id, title: selected.title, notes: "" });
      setStory(saved);
      setStories((items) => [saved, ...items]);
      setSuccessNotice("Story saved as a draft.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Story could not be saved."); }
    finally { setBusy(false); }
  };

  const persistStory = async () => {
    if (!story) return;
    setBusy(true);
    try {
      const saved = await saveStory(story);
      setStory(saved);
      setStories((items) => items.map((item) => item.id === saved.id ? saved : item));
      setSuccessNotice("Story updated.");
    } catch (error) {
      setNotice(error instanceof HarvyApiError && error.status === 409 ? "This story changed in another session. Reload it before saving." : error instanceof Error ? error.message : "Story could not be saved.");
    } finally { setBusy(false); }
  };

  const makeBrief = async () => {
    if (!story) return;
    setBusy(true);
    try {
      const brief = await createBrief(story.id);
      setBrief({ title: brief.title, body: brief.body });
      setSuccessNotice(`Source-linked brief saved: ${brief.title}`);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Brief could not be generated."); }
    finally { setBusy(false); }
  };

  const changeEntitlement = async (current: ProductEntitlement, enabled: boolean) => {
    setBusy(true);
    try {
      const updated = await updateProductEntitlement({ ...current, enabled });
      setProductEntitlements((items) => items.map((item) => item.product === updated.product ? updated : item));
      setAuditRevision((revision) => revision + 1);
      const nextContext = await getContext();
      setContext(nextContext);
      if (!nextContext.allowedProducts.includes(product)) setProduct((nextContext.allowedProducts[0] as HarvyProduct) || "Newsk");
      await reload();
      setSuccessNotice(`${updated.product} access ${enabled ? "enabled" : "disabled"}.`);
    } catch (error) {
      setNotice(error instanceof HarvyApiError && error.status === 409 ? "Product access changed in another session. Reopen the account panel." : error instanceof Error ? error.message : "Product access could not be changed.");
    } finally { setBusy(false); }
  };

  return <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
    <AppBar position="sticky" color="default" elevation={0} sx={{ borderBottom: 1, borderColor: "divider" }}>
      <Container maxWidth="xl"><Toolbar disableGutters sx={{ gap: 2, minHeight: 64, flexWrap: "wrap" }}>
        <Typography component="a" href="/" variant="h5" color="text.primary" sx={{ textDecoration: "none", fontWeight: 800 }}>Harvy</Typography>
        {context && context.allowedProducts.length > 0 && <FormControl size="small" sx={{ minWidth: 145 }}>
          <InputLabel id="product-select-label">Mode</InputLabel>
          <Select labelId="product-select-label" value={product} label="Mode" onChange={(e) => setProduct(e.target.value as HarvyProduct)}>
            {context.allowedProducts.map((name) => <MenuItem key={name} value={name}>{name}</MenuItem>)}
          </Select>
        </FormControl>}
        {context?.allowedProducts.includes(product) && <GlobalSearch key={[context.principalId, context.tenantId, context.workspaceId, context.featureRevision, context.capabilities.join(","), product].join(":")} product={product} from={from ? new Date(from).toISOString() : undefined} to={to ? new Date(to).toISOString() : undefined} onSelect={(result) => { void openSearchResult(result); }} />}
        <Box sx={{ flex: 1 }} />
        {context?.allowedProducts.includes(product) && <Stack direction="row" spacing={0.5} role="tablist" aria-label={`${product} workspace views`}>
          {product === "Ops" ? <Button role="tab" aria-selected={surface === "actions"} onClick={() => setSurface("actions")}>Actions</Button> : <Button role="tab" aria-selected={surface === "events"} onClick={() => setSurface("events")}>Events</Button>}
          {product === "Ops" && <Button role="tab" aria-selected={surface === "events"} onClick={() => setSurface("events")}>Signals</Button>}
          <Button role="tab" aria-selected={surface === "analysis"} onClick={() => setSurface("analysis")}>Analysis</Button>
        </Stack>}
        {user && <Button variant="text" onClick={() => setAccountOpen((open) => !open)} aria-expanded={accountOpen} aria-controls="account-panel">{user.name || user.email || "Account"}</Button>}
      </Toolbar></Container>
    </AppBar>
    {user && accountOpen && <Container id="account-panel" maxWidth="md" sx={{ pt: 2 }}><Card><CardContent>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}><Typography variant="h6">Account and organization</Typography><Button onClick={() => setAccountOpen(false)}>Close</Button></Stack>
      <AuthGate onUser={onUser} />
      {context?.capabilities.includes("entitlements.manage") && <>
        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle1" fontWeight={700}>Product mode access</Typography>
        <Typography variant="body2" color="text.secondary">Harvy platform admins can grant only the modes an organization is authorized to use. Changes are revision-checked and audited.</Typography>
        {entitlementError && <Alert severity="error" sx={{ mt: 1 }}>{entitlementError}</Alert>}
        <Stack sx={{ mt: 1 }}>{productEntitlements.map((item) => <FormControlLabel key={item.product} label={item.product} control={<Switch checked={item.enabled} disabled={busy} onChange={(event) => void changeEntitlement(item, event.target.checked)} inputProps={{ "aria-label": `${item.enabled ? "Disable" : "Enable"} ${item.product}` }} />}/>)}</Stack>
        <Divider sx={{ my: 2 }} />
        <Stack direction="row" justifyContent="space-between" alignItems="center"><Typography variant="subtitle1" fontWeight={700}>Recent platform, monitor, and dashboard changes</Typography><Button size="small" onClick={() => setAuditRevision((revision) => revision + 1)} disabled={auditLoading}>Refresh</Button></Stack>
        {auditError && <Alert severity="error" sx={{ mt: 1 }}>{auditError}</Alert>}
        {auditLoading ? <CircularProgress size={20} aria-label="Loading audit history" /> : adminAudit.length === 0 ? <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>No platform access, monitor, or dashboard changes recorded.</Typography> : <Stack spacing={1} sx={{ mt: 1 }}>{adminAudit.map((entry) => <Box key={`${entry.kind}:${entry.id}`} sx={{ p: 1.5, border: 1, borderColor: "divider", borderRadius: 1 }}><Typography variant="body2" fontWeight={600}>{entry.kind === "product_entitlement" ? `${entry.product} access ${entry.action}` : entry.kind === "monitor_state" ? `${entry.product} monitor ${entry.subject_label} ${entry.action}` : `${entry.product} dashboard ${entry.subject_label} ${entry.action}`}</Typography><Typography variant="caption" color="text.secondary">Organization {entry.tenant_id} · {entry.changed_by} · revision {entry.revision} · {new Date(entry.changed_at).toLocaleString()}</Typography></Box>)}</Stack>}
      </>}
    </CardContent></Card></Container>}
    <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 } }}>
      {!user ? <Card sx={{ maxWidth: 560, mx: "auto", mt: { xs: 3, md: 8 } }}>
        <CardContent sx={{ p: { xs: 3, md: 5 } }}>
          <Typography variant="h4" component="h1">Sign in to Harvy</Typography>
          <Typography color="text.secondary" sx={{ mt: 1, mb: 3 }}>Use your organization account to open your workspace.</Typography>
          <AuthGate onUser={onUser} />
        </CardContent>
      </Card> : !context ? workspaceError ? <Stack spacing={2} sx={{ maxWidth: 720, mx: "auto", mt: 4 }}><Alert severity="warning">{workspaceError}{needsOrganization ? " Select or create an organization workspace to continue." : " Check the local Worker bindings and retry."}</Alert>{needsOrganization && <Card><CardContent><Typography variant="h6" sx={{ mb: 2 }}>Organization access</Typography><AuthGate onUser={onUser} /></CardContent></Card>}<Button onClick={() => void reload()}>Retry</Button></Stack> : <Stack alignItems="center" spacing={2} sx={{ py: 8 }}><CircularProgress /><Typography>Loading your workspace…</Typography></Stack> : context.allowedProducts.length === 0 ? <Alert severity="warning">No Harvy modes are enabled for this organization. A Harvy platform administrator must grant access.</Alert> : <>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ md: "center" }} spacing={2} sx={{ mb: 3 }}>
          <Box><Typography variant="h3" component="h1">{{ Newsk: "Newsroom desk", Tower: "Business intelligence", Ops: "Operations desk", Civic: "Civic monitoring" }[product]}</Typography><Typography color="text.secondary" sx={{ mt: 0.5 }}>{product === "Newsk" ? "Review incoming events, inspect evidence, and prepare attributed briefs." : product === "Tower" ? "Review source-grounded business and risk events, then compare the evidence." : product === "Ops" ? "Review operational signals and evidence linked to work." : "Review civic and legislative events from approved sources."}</Typography></Box>
          <Stack direction="row" spacing={1}><Chip label={context.tenantName} variant="outlined" /><Chip label={context.role} variant="outlined" /><Chip label="Organization scoped" color="success" variant="outlined" /></Stack>
        </Stack>
        {notice && <Alert severity={noticeKind} onClose={() => setNotice("")} sx={{ mb: 2 }}>{notice}</Alert>}
        {surface === "analysis" ? <Suspense fallback={<Stack alignItems="center" sx={{ py: 8 }}><CircularProgress aria-label="Loading analytics" /></Stack>}><AnalysisDesk key={`${context.principalId}:${context.tenantId}:${context.workspaceId}:${context.featureRevision}:${context.capabilities.join(",")}:${product}`} context={context} product={product} openDashboardId={searchTargetDashboard} /></Suspense> : surface === "actions" ? <Suspense fallback={<Stack alignItems="center" sx={{ py: 8 }}><CircularProgress aria-label="Loading Ops actions" /></Stack>}><OpsDesk key={`${context.principalId}:${context.tenantId}:${context.workspaceId}:${context.featureRevision}:${context.capabilities.join(",")}`} canEdit={context.capabilities.includes("ops.actions.edit")} focusActionId={searchTargetAction} /></Suspense> : <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "minmax(220px, 0.72fr) minmax(310px, 1.2fr) minmax(320px, 1.1fr)" }, gap: 2, alignItems: "start" }}>
          <Card><CardContent>
            <Stack direction="row" alignItems="center" justifyContent="space-between"><Typography variant="h6">Monitored sources</Typography><Button size="small" onClick={() => void reload()} disabled={busy}>Refresh</Button></Stack>
            {sources.length === 0 ? <Alert severity="info" sx={{ mt: 2 }}>No approved monitors are configured for this workspace.</Alert> : <Stack spacing={1} sx={{ mt: 2 }}>{sources.map((source) => <Box key={source.id} sx={{ display: "flex", gap: 1, alignItems: "center" }}><Button fullWidth disabled={!source.enabled} variant={sourceFilter === source.id ? "contained" : "outlined"} onClick={() => setSourceFilter(sourceFilter === source.id ? "" : source.id)} sx={{ justifyContent: "flex-start", textAlign: "left" }}><Box><Typography variant="body2" fontWeight={700}>{source.label}</Typography><Typography variant="caption">{source.publisher}</Typography></Box></Button><Chip size="small" label={source.enabled ? "Active" : "Paused"} color={source.enabled ? "success" : "default"} />{source.enabled && <Button size="small" onClick={() => void runSource(source.id)} disabled={busy || !context.capabilities.includes("runs.manage")} aria-label={`Run ${source.label}`}>Run</Button>}{context.capabilities.includes("monitors.manage") && <Button size="small" onClick={() => void setSourceEnabled(source)} disabled={busy} aria-label={`${source.enabled ? "Pause" : "Resume"} ${source.label}`}>{source.enabled ? "Pause" : "Resume"}</Button>}</Box>)}</Stack>}
            {context.capabilities.includes("monitors.manage") && <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>Pausing prevents new runs; already submitted jobs continue.</Typography>}
            {sourceFilter && <Button size="small" onClick={() => setSourceFilter("")} sx={{ mt: 1 }}>Clear source filter</Button>}
            {(["Newsk", "Tower"].includes(product)) && context.capabilities.includes("dashboards.edit") && <Box sx={{ mt: 3 }}><Stack direction="row" justifyContent="space-between" alignItems="center"><Typography variant="subtitle2">{product === "Tower" ? "Business watchlists" : "Saved views"}</Typography><Button size="small" onClick={() => void saveCurrentView()} disabled={busy}>{product === "Tower" ? "Save watchlist" : "Save current"}</Button></Stack><Stack spacing={0.5} sx={{ mt: 1 }}>{dashboards.filter((view) => view.product === product && isFilterDashboard(view)).map((view) => <Button key={view.id} size="small" onClick={() => loadSavedView(view)} sx={{ justifyContent: "flex-start" }}>{view.title}</Button>)}</Stack></Box>}
            {product === "Newsk" && !!stories.length && <Box sx={{ mt: 3 }}><Typography variant="subtitle2">Saved stories</Typography><Stack spacing={0.5} sx={{ mt: 1 }}>{stories.slice(0, 10).map((item) => <Button key={item.id} size="small" onClick={() => void openStory(item.id)} sx={{ justifyContent: "flex-start", textAlign: "left" }}>{item.title} · {item.status}</Button>)}</Stack></Box>}
            {!!runs.length && <Box sx={{ mt: 3 }}><Typography variant="subtitle2">Recent runs</Typography><Stack spacing={0.5} sx={{ mt: 1 }}>{runs.slice(0, 5).map((run) => <Box key={run.id} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}><Typography variant="caption">{run.status}{run.error_code ? ` · ${run.error_code}` : ""} · {new Date(run.updated_at).toLocaleTimeString()}</Typography>{run.status === "queued" && run.error_code === "dispatch_unconfirmed" && context.capabilities.includes("runs.manage") && <Button size="small" disabled={busy || !run.idempotency_key} onClick={() => void runSource(run.source_id, run.idempotency_key)}>Retry same run</Button>}</Box>)}</Stack></Box>}
          </CardContent></Card>
          <Card><CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center"><Typography variant="h6">Incoming events</Typography>{busy && <CircularProgress size={18} />}</Stack>
            <Stack spacing={1.5} sx={{ mt: 2 }}>
              <TextField size="small" label="Search title and summary" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") setSearchTerm(query.trim()); }} />
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                <TextField size="small" type="datetime-local" label="From" InputLabelProps={{ shrink: true }} value={from} onChange={(e) => setFrom(e.target.value)} />
                <TextField size="small" type="datetime-local" label="To" InputLabelProps={{ shrink: true }} value={to} onChange={(e) => setTo(e.target.value)} />
              </Stack>
              <FormControl size="small"><InputLabel id="event-status-label">Status</InputLabel><Select labelId="event-status-label" label="Status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><MenuItem value="all">All events</MenuItem><MenuItem value="new">New</MenuItem><MenuItem value="reviewing">Reviewing</MenuItem><MenuItem value="saved">Saved</MenuItem><MenuItem value="closed">Closed</MenuItem></Select></FormControl>
            </Stack>
            {events.length === 0 ? <Alert severity="info" sx={{ mt: 2 }}>{sources.length ? "No events match these filters. Try another search or wait for a verified run." : "Events appear here after an approved source completes a run."}</Alert> : <Stack divider={<Divider flexItem />} sx={{ mt: 1 }}>{events.map((event) => <Button key={event.id} onClick={() => void selectEvent(event)} aria-current={selected?.id === event.id ? "true" : undefined} sx={{ display: "block", textAlign: "left", py: 1.5, px: 1, color: "text.primary" }}><Stack direction="row" justifyContent="space-between" alignItems="start" gap={1}><Typography fontWeight={700}>{event.title}</Typography><Chip size="small" label={event.status} /></Stack><Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{event.summary || "No summary provided."}</Typography><Typography variant="caption" color="text.secondary">{new Date(event.last_seen_at).toLocaleString()} · {event.evidence_count} sources</Typography></Button>)}</Stack>}
          </CardContent></Card>
          <Stack spacing={2}>
            {!selected ? <Card><CardContent><Typography variant="h6">Evidence</Typography><Typography color="text.secondary" sx={{ mt: 1 }}>Select an event to review source links, capture times, and evidence.</Typography></CardContent></Card> : <Card><CardContent>
              <Chip label={selected.status} size="small" color={selected.status === "closed" ? "default" : "primary"} />
              <Typography variant="h5" sx={{ mt: 1.5 }}>{selected.title}</Typography><Typography color="text.secondary" sx={{ mt: 1 }}>{selected.summary}</Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }} sx={{ mt: 2 }}>
                <FormControl size="small" sx={{ minWidth: 150 }} disabled={busy || !context.capabilities.includes("events.edit")}>
                  <InputLabel id="selected-event-status-label">Status</InputLabel>
                  <Select labelId="selected-event-status-label" label="Status" value={selected.status} onChange={(e) => void updateSelectedEvent({ status: e.target.value as HarvyEvent["status"] })}>
                    <MenuItem value="new">New</MenuItem><MenuItem value="reviewing">Reviewing</MenuItem><MenuItem value="saved">Saved</MenuItem><MenuItem value="closed">Closed</MenuItem>
                  </Select>
                </FormControl>
                <Button size="small" variant="outlined" onClick={() => void updateSelectedEvent({ assigned_to: selected.assigned_to === context.principalId ? null : context.principalId })} disabled={busy || !context.capabilities.includes("events.edit")}>
                  {selected.assigned_to === context.principalId ? "Unassign me" : "Assign to me"}
                </Button>
                <Typography variant="caption" color="text.secondary">{selected.assigned_to === context.principalId ? "Assigned to you" : selected.assigned_to ? "Assigned to a teammate" : "Unassigned"}</Typography>
              </Stack>
              <Stack direction="row" spacing={1} sx={{ mt: 2 }}>{product === "Newsk" && <Button size="small" variant="outlined" onClick={() => void startStory()} disabled={busy || !context.capabilities.includes("stories.edit")}>Save story</Button>}{["Tower", "Civic"].includes(product) && context.allowedProducts.includes("Ops") && <Button size="small" variant="outlined" onClick={() => void handoffEvent()} disabled={busy || !context.capabilities.includes("events.handoff")}>Hand off to Ops</Button>}<Button size="small" variant="outlined" onClick={() => void selectEvent(selected)} disabled={busy}>Reload evidence</Button></Stack>
              <Divider sx={{ my: 2 }} /><Typography variant="subtitle2">Ontoly object</Typography>
              <Stack spacing={0.5} sx={{ mt: 1 }} aria-label="Ontoly event object">
                <Typography variant="caption" color="text.secondary">Type</Typography><Typography>Event</Typography>
                <Typography variant="caption" color="text.secondary">HarvyDex ID</Typography><Typography sx={{ fontFamily: "monospace", overflowWrap: "anywhere" }}>{selected.id}</Typography>
                <Typography variant="caption" color="text.secondary">Observed</Typography><Typography variant="body2">{new Date(selected.first_seen_at).toLocaleString()} – {new Date(selected.last_seen_at).toLocaleString()}</Typography>
              </Stack>
              <Alert severity="info" sx={{ mt: 1 }}>This record is workspace-scoped. Source observations are listed below; correction history is not yet available.</Alert>
              <Divider sx={{ my: 2 }} /><Typography variant="subtitle2">Activity</Typography>
              {!selected.activity.length ? <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>No status or assignment changes yet.</Typography> : <Stack spacing={1} sx={{ mt: 1 }}>{selected.activity.map((entry) => <Box key={entry.revision}><Typography variant="body2">Revision {entry.revision} · {entry.status} · {entry.assigned_to === context.principalId ? "assigned to you" : entry.assigned_to ? "assigned to a teammate" : "unassigned"}</Typography><Typography variant="caption" color="text.secondary">{entry.changed_by === context.principalId ? "You" : "A teammate"} · {new Date(entry.changed_at).toLocaleString()}</Typography></Box>)}</Stack>}
              <Divider sx={{ my: 2 }} /><Typography variant="subtitle2">Source observations</Typography>
              {!selected.evidence?.length ? <Alert severity="warning" sx={{ mt: 1 }}>No source evidence is attached. This event cannot support a brief yet.</Alert> : <Stack spacing={1.5} sx={{ mt: 1 }}>{selected.evidence.map((evidence) => <Box key={evidence.id}><Typography fontWeight={700}>{evidence.headline}</Typography><Typography variant="body2" color="text.secondary">{evidence.publisher} · captured {new Date(evidence.captured_at).toLocaleString()}</Typography>{evidence.excerpt && <Typography variant="body2" sx={{ mt: 0.5 }}>{evidence.excerpt}</Typography>}<Button component="a" href={evidence.source_url} target="_blank" rel="noreferrer" size="small" sx={{ px: 0 }}>Open source</Button></Box>)}</Stack>}
            </CardContent></Card>}
            {product === "Newsk" && story && <Card><CardContent><Typography variant="h6">Story draft</Typography>{story.status === "handed_off" && <Alert severity="success" sx={{ mt: 1 }}>This story has been handed to Ops and is now read-only.</Alert>}<TextField fullWidth size="small" label="Title" value={story.title} disabled={story.status === "handed_off"} sx={{ mt: 2 }} onChange={(e) => setStory({ ...story, title: e.target.value })} /><TextField fullWidth multiline minRows={4} label="Notes" value={story.notes} disabled={story.status === "handed_off"} sx={{ mt: 2 }} onChange={(e) => setStory({ ...story, notes: e.target.value })} />{story.status !== "handed_off" && <FormControl fullWidth size="small" sx={{ mt: 2 }}><InputLabel id="story-status-label">Status</InputLabel><Select labelId="story-status-label" label="Status" value={story.status} onChange={(e) => setStory({ ...story, status: e.target.value as Story["status"] })}><MenuItem value="draft">Draft</MenuItem><MenuItem value="ready">Ready</MenuItem><MenuItem value="archived">Archived</MenuItem></Select></FormControl>}<Stack direction="row" spacing={1} sx={{ mt: 2 }}>{story.status !== "handed_off" && <Button variant="contained" onClick={() => void persistStory()} disabled={busy}>Save changes</Button>}<Button variant="outlined" onClick={() => void makeBrief()} disabled={busy}>Create cited brief</Button>{story.status === "ready" && context.allowedProducts.includes("Ops") && <Button variant="outlined" onClick={() => void sendToOps()} disabled={busy}>Hand off to Ops</Button>}</Stack></CardContent></Card>}
          </Stack>
        </Box>}
        {brief && <Card sx={{ mt: 3 }}><CardContent><Typography variant="h6">{brief.title}</Typography><Typography component="pre" sx={{ whiteSpace: "pre-wrap", font: "inherit", mt: 2 }}>{brief.body}</Typography></CardContent></Card>}
        <Box sx={{ mt: 3 }}><Typography variant="caption" color="text.secondary">Data is organization-scoped. Empty or unavailable sources are shown as such; no fixture is presented as live data.</Typography></Box>
      </>}
    </Container>
  </Box>;
}
