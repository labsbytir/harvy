import { useMemo, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { executeHql, type HqlQuery, type HqlResult } from "./api";

// Canned queries use only registered cubes/fields (v2/shared/cubes.ts + hql.ts):
// cubes `events` | `evidence`, measure `count`, fields validated server-side.
export const CANNED_QUERIES: { label: string; description: string; query: HqlQuery }[] = [
  {
    label: "Evidence by source",
    description: "Which sources are feeding Tower right now, biggest first.",
    query: { hql_version: 1, cube: "evidence", product: "Tower", dimensions: ["source_id"], measures: ["count"], filters: [], order_by: [{ field: "count", direction: "desc" }], limit: 25 },
  },
  {
    label: "Evidence by publisher",
    description: "Evidence volume grouped by publisher.",
    query: { hql_version: 1, cube: "evidence", product: "Tower", dimensions: ["publisher"], measures: ["count"], filters: [], order_by: [{ field: "count", direction: "desc" }], limit: 25 },
  },
  {
    label: "Events by status",
    description: "Pipeline health: how many events sit in each status.",
    query: { hql_version: 1, cube: "events", product: "Tower", dimensions: ["status"], measures: ["count"], filters: [], order_by: [{ field: "count", direction: "desc" }], limit: 25 },
  },
  {
    label: "New events to review",
    description: "Events still in `new` status, grouped by source.",
    query: { hql_version: 1, cube: "events", product: "Tower", dimensions: ["source_id"], measures: ["count"], filters: [{ field: "status", operator: "eq", value: "new" }], order_by: [{ field: "count", direction: "desc" }], limit: 25 },
  },
  {
    label: "Recent evidence (7d)",
    description: "Evidence captured in the last 7 days, by publisher.",
    query: {
      hql_version: 1, cube: "evidence", product: "Tower", dimensions: ["publisher"], measures: ["count"], filters: [],
      order_by: [{ field: "count", direction: "desc" }], limit: 25,
      time_range: { from: new Date(Date.now() - 7 * 86400000).toISOString(), to: new Date().toISOString() },
    },
  },
];

const CHART_COLORS = ["#00F0FF", "#10B981", "#F59E0B", "#A1A1AA", "#F472B6", "#818CF8"];

function parseQuery(text: string): HqlQuery {
  const parsed: unknown = JSON.parse(text);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) throw new Error("Query must be a JSON object.");
  return parsed as HqlQuery;
}

export default function AnalyticsPage() {
  const [text, setText] = useState(() => JSON.stringify(CANNED_QUERIES[0].query, null, 2));
  const [result, setResult] = useState<HqlResult | null>(null);
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);

  const columns = useMemo(() => {
    const first = result?.rows[0];
    return first ? Object.keys(first) : [];
  }, [result]);

  // Chart the first numeric column against the first dimension, when present.
  const chart = useMemo(() => {
    if (!result || result.rows.length < 2 || columns.length < 2) return null;
    const numeric = columns.find((c) => typeof result.rows[0][c] === "number");
    const label = columns.find((c) => c !== numeric);
    if (!numeric || !label) return null;
    return { label, numeric, data: result.rows.slice(0, 12) };
  }, [result, columns]);

  const run = async (queryText: string) => {
    setRunning(true); setError("");
    try {
      const query = parseQuery(queryText);
      // The server binds scope from the session and requires an entitled product;
      // default this Tower desk to Tower when the editor omitted it.
      if (!query.product) query.product = "Tower";
      setResult(await executeHql(query));
    } catch (e) {
      setResult(null);
      setError(e instanceof Error ? e.message : "Query failed.");
    } finally { setRunning(false); }
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", color: "text.primary" }}>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
          <Box>
            <Typography variant="h4" component="h1">Tower — Analytics desk</Typography>
            <Typography color="text.secondary">Type a Harvy HQL query (typed JSON, no raw SQL) or click an example. Results are scoped to your organization by the server.</Typography>
          </Box>
          <Stack direction="row" spacing={1}><Chip label="POST /api/v1/query" variant="outlined" /><Chip label="query.view" variant="outlined" /></Stack>
        </Stack>

        <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 3 }} role="group" aria-label="Example queries">
          {CANNED_QUERIES.map((c) => (
            <Button key={c.label} variant="outlined" size="small" disabled={running}
              onClick={() => { const t = JSON.stringify(c.query, null, 2); setText(t); void run(t); }}>
              {c.label}
            </Button>
          ))}
        </Stack>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
          {CANNED_QUERIES.map((c) => `${c.label}: ${c.description}`).join("  ·  ")}
        </Typography>

        <Card sx={{ mt: 2 }}><CardContent>
          <TextField label="HQL query (JSON)" value={text} onChange={(e) => setText(e.target.value)}
            multiline minRows={8} fullWidth spellCheck={false}
            sx={{ fontFamily: "'IBM Plex Mono', monospace" }} inputProps={{ "aria-label": "HQL query JSON" }} />
          <Stack direction="row" spacing={1} sx={{ mt: 2 }} alignItems="center">
            <Button variant="contained" onClick={() => void run(text)} disabled={running}>
              {running ? "Running…" : "Run query"}
            </Button>
            {running && <CircularProgress size={20} aria-label="Running query" />}
            {result && <Typography variant="body2" color="text.secondary">{result.rows.length} row(s){result.trace_id ? ` · trace ${result.trace_id}` : ""}</Typography>}
          </Stack>
          {error && <Alert severity="error" sx={{ mt: 2 }}>{error} — check the cube/field names against the registered cubes (`events`, `evidence`; measure `count`) and that Tower + `query.view` are enabled for your organization.</Alert>}
        </CardContent></Card>

        {result && result.rows.length === 0 && <Alert severity="info" sx={{ mt: 2 }}>Query succeeded with 0 rows. For Basin-backed cubes, newly ingested rows can take ~5 minutes to become queryable.</Alert>}

        {chart && (
          <Card sx={{ mt: 2 }}><CardContent>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>{chart.numeric} by {chart.label}</Typography>
            <Box sx={{ width: "100%", height: 300 }}>
              <ResponsiveContainer>
                <BarChart data={chart.data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey={chart.label} tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={70} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey={chart.numeric}>
                    {chart.data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </CardContent></Card>
        )}

        {result && result.rows.length > 0 && (
          <TableContainer component={Card} sx={{ mt: 2 }}><Table size="small" aria-label="Query results">
            <TableHead><TableRow>{columns.map((c) => <TableCell key={c} sx={{ fontWeight: 700 }}>{c}</TableCell>)}</TableRow></TableHead>
            <TableBody>
              {result.rows.map((row, i) => (
                <TableRow key={i}>{columns.map((c) => <TableCell key={c}>{row[c] === null || row[c] === undefined ? "—" : String(row[c])}</TableCell>)}</TableRow>
              ))}
            </TableBody>
          </Table></TableContainer>
        )}
      </Container>
    </Box>
  );
}
