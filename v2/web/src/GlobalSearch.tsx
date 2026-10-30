import { useEffect, useState } from "react";
import Autocomplete from "@mui/material/Autocomplete";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { searchWorkspace, type WorkspaceSearchResult } from "./api";

const kindLabel: Record<WorkspaceSearchResult["type"], string> = {
  event: "Event",
  evidence: "Source evidence",
  story: "Story",
  dashboard: "Saved view",
  action: "Ops action",
};

export default function GlobalSearch({ product, from, to, onSelect }: {
  product: string;
  from?: string;
  to?: string;
  onSelect: (result: WorkspaceSearchResult) => void;
}) {
  const [input, setInput] = useState("");
  const [items, setItems] = useState<WorkspaceSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const query = input.trim();
    if (query.length < 2) {
      setItems([]);
      setLoading(false);
      setError("");
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError("");
      void searchWorkspace(query, product, controller.signal, from, to).then((result) => {
        if (!controller.signal.aborted) setItems(result.items);
      }).catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setItems([]);
          setError(cause instanceof Error ? cause.message : "Search failed.");
        }
      }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [input, product, from, to]);

  return <Autocomplete<WorkspaceSearchResult, false, false, false>
    sx={{ width: { xs: "100%", sm: 320 }, minWidth: 0 }}
    options={items}
    value={null}
    inputValue={input}
    loading={loading}
    filterOptions={(options) => options}
    getOptionLabel={(item) => item.title}
    isOptionEqualToValue={(left, right) => left.type === right.type && left.id === right.id}
    noOptionsText={error || (input.trim().length < 2 ? "Type at least 2 characters" : "No matching workspace items.")}
    onInputChange={(_event, value, reason) => { if (reason === "input" || reason === "clear") setInput(value); }}
    onChange={(_event, result) => {
      if (!result) return;
      onSelect(result);
      setInput("");
    }}
    renderOption={(props, item) => <li {...props} key={`${item.type}:${item.id}`}>
      <Stack sx={{ minWidth: 0 }}>
        <Typography variant="body2" fontWeight={700} noWrap>{item.title}</Typography>
        <Typography variant="caption" color="text.secondary" noWrap>{kindLabel[item.type]} · {item.description || item.product}</Typography>
      </Stack>
    </li>}
     renderInput={(params) => <TextField {...params} size="small" label="Search workspace" placeholder="Events, evidence, stories, saved views" helperText={from || to ? "Using the current date range" : undefined} InputProps={{ ...params.InputProps, endAdornment: <>{loading ? <CircularProgress size={16} color="inherit" /> : null}{params.InputProps.endAdornment}</> }} />}
  />;
}
