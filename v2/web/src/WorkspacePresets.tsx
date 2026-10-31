import { useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

/* ── preset types ──────────────────────────────────────────────────────── */

export interface WorkspacePreset {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  enabledStreams: string[];
  defaultView: string;
  regionFocus: string[];
  priorityCategories: string[];
}

export const WORKSPACE_PRESETS: WorkspacePreset[] = [
  {
    id: "world",
    name: "Full World",
    description: "Complete global intelligence coverage across all signal streams.",
    icon: "🌍",
    color: "#086E68",
    enabledStreams: ["military", "economic", "disaster", "cyber", "political", "infrastructure", "environment", "humanitarian"],
    defaultView: "signals",
    regionFocus: ["all"],
    priorityCategories: ["conflict", "disaster", "political"],
  },
  {
    id: "technology",
    name: "Technology",
    description: "Cyber threats, tech industry signals, supply chains, and infrastructure.",
    icon: "💻",
    color: "#3B82F6",
    enabledStreams: ["cyber", "infrastructure", "economic"],
    defaultView: "signals",
    regionFocus: ["North America", "East Asia", "Europe"],
    priorityCategories: ["cyber", "infrastructure"],
  },
  {
    id: "finance",
    name: "Finance",
    description: "Markets, commodities, trade, central banks, and economic indicators.",
    icon: "📊",
    color: "#10B981",
    enabledStreams: ["economic", "political"],
    defaultView: "regions",
    regionFocus: ["North America", "Europe", "East Asia"],
    priorityCategories: ["economic", "political"],
  },
  {
    id: "commodity",
    name: "Commodity",
    description: "Energy, metals, agriculture, supply chains, and commodity markets.",
    icon: "🛢️",
    color: "#B45309",
    enabledStreams: ["economic", "infrastructure", "environment"],
    defaultView: "signals",
    regionFocus: ["Middle East", "Sub-Saharan Africa", "Latin America", "Eastern Europe"],
    priorityCategories: ["economic", "infrastructure"],
  },
  {
    id: "energy",
    name: "Energy",
    description: "Oil, gas, renewables, power grids, pipelines, and energy infrastructure.",
    icon: "⚡",
    color: "#EAB308",
    enabledStreams: ["infrastructure", "economic", "environment"],
    defaultView: "signals",
    regionFocus: ["Middle East", "Eastern Europe", "North America"],
    priorityCategories: ["infrastructure", "economic"],
  },
  {
    id: "positive",
    name: "Positive Events",
    description: "Peace agreements, cooperation, humanitarian progress, and recovery.",
    icon: "✅",
    color: "#22C55E",
    enabledStreams: ["political", "humanitarian"],
    defaultView: "signals",
    regionFocus: ["all"],
    priorityCategories: ["positive", "humanitarian"],
  },
  {
    id: "custom",
    name: "Custom",
    description: "Build your own workspace with selected streams, regions, and priorities.",
    icon: "⚙️",
    color: "#8B5CF6",
    enabledStreams: [],
    defaultView: "signals",
    regionFocus: [],
    priorityCategories: [],
  },
];

/* ── component ─────────────────────────────────────────────────────────── */

export default function WorkspacePresets({ activePreset, onPresetChange }: {
  activePreset: string;
  onPresetChange: (presetId: string) => void;
}) {
  const [selected, setSelected] = useState<WorkspacePreset | null>(
    WORKSPACE_PRESETS.find((p) => p.id === activePreset) || null
  );

  return <Stack spacing={2}>
    <Box>
      <Typography variant="h5" component="h2">Workspace presets</Typography>
      <Typography color="text.secondary" variant="body2">
        Choose a workspace configuration optimized for your intelligence focus. Presets control which signal streams, regions, and categories are prioritized.
      </Typography>
    </Box>

    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "1fr 1fr 1fr" }, gap: 1.5 }}>
      {WORKSPACE_PRESETS.map((preset) => {
        const isActive = activePreset === preset.id;
        const isSelected = selected?.id === preset.id;
        return <Card key={preset.id} variant="outlined"
          sx={{
            cursor: "pointer",
            borderLeft: 4, borderLeftColor: preset.color,
            bgcolor: isActive ? "action.selected" : isSelected ? "action.hover" : undefined,
            "&:hover": { bgcolor: "action.hover" },
          }}
          onClick={() => setSelected(preset)}>
          <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography fontSize={24}>{preset.icon}</Typography>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" fontWeight={700}>{preset.name}</Typography>
                {isActive && <Chip size="small" color="primary" label="Active" sx={{ mt: 0.5 }} />}
              </Box>
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
              {preset.description}
            </Typography>
          </CardContent>
        </Card>;
      })}
    </Box>

    {/* Preset detail */}
    {selected && <Card variant="outlined">
      <CardContent>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography fontSize={28}>{selected.icon}</Typography>
          <Box>
            <Typography variant="h6">{selected.name}</Typography>
            <Typography variant="body2" color="text.secondary">{selected.description}</Typography>
          </Box>
        </Stack>
        <Divider sx={{ my: 1.5 }} />

        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2">Signal streams</Typography>
            <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mt: 0.5 }}>
              {selected.enabledStreams.length > 0 ? selected.enabledStreams.map((s) => (
                <Chip key={s} size="small" label={s} variant="outlined" />
              )) : <Typography variant="caption" color="text.secondary">Select streams for custom preset</Typography>}
            </Stack>
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2">Region focus</Typography>
            <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mt: 0.5 }}>
              {selected.regionFocus.map((r) => (
                <Chip key={r} size="small" label={r === "all" ? "Global" : r} variant="outlined" color="info" />
              ))}
            </Stack>
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2">Priority categories</Typography>
            <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mt: 0.5 }}>
              {selected.priorityCategories.map((c) => (
                <Chip key={c} size="small" label={c} variant="outlined" color="warning" />
              ))}
            </Stack>
          </Box>
        </Stack>

        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
          <Button variant="contained" onClick={() => onPresetChange(selected.id)} disabled={activePreset === selected.id}>
            {activePreset === selected.id ? "Active" : "Apply preset"}
          </Button>
          {selected.id !== "custom" && (
            <Button variant="outlined" onClick={() => setSelected(WORKSPACE_PRESETS.find((p) => p.id === "custom")!)}>
              Customize
            </Button>
          )}
        </Stack>
      </CardContent>
    </Card>}

    {selected?.id === "custom" && (
      <Alert severity="info">
        Custom presets allow you to select specific signal streams, regions, and priority categories.
        Configuration will be saved to your workspace profile.
      </Alert>
    )}
  </Stack>;
}
