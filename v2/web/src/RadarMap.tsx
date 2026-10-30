import { useEffect, useMemo, useRef, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import FormControlLabel from "@mui/material/FormControlLabel";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { Map as MapLibreMap, NavigationControl, setWorkerUrl, type GeoJSONSource } from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import "maplibre-gl/dist/maplibre-gl.css";
import type { HarvyEvent } from "./api";
import { syntheticRadarPreview, toEventPoints } from "./event-map-data";

const styles = {
  light: "https://tiles.openfreemap.org/styles/positron",
  dark: "https://tiles.openfreemap.org/styles/dark",
} as const;
type MapStyle = keyof typeof styles;

function timeframe(from: string, to: string): string {
  const format = (value: string) => {
    const date = new Date(value);
    return Number.isNaN(date.valueOf()) ? value : date.toLocaleString();
  };
  if (from && to) return `${format(from)} – ${format(to)}`;
  if (from) return `Since ${format(from)}`;
  if (to) return `Through ${format(to)}`;
  return "No date bounds · latest loaded events";
}

export default function RadarMap({ product, events, hasMoreEvents, from, to, onSelectEvent }: {
  product: string;
  events: HarvyEvent[];
  hasMoreEvents: boolean;
  from: string;
  to: string;
  onSelectEvent: (event: HarvyEvent) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const eventPoints = useMemo(() => toEventPoints(events), [events]);
  const previewPoints = useMemo(() => toEventPoints(syntheticRadarPreview), []);
  const [mapStyle, setMapStyle] = useState<MapStyle>("light");
  const [radar, setRadar] = useState(true);
  const [preview, setPreview] = useState(false);
  const [mapError, setMapError] = useState("");
  const [mapReady, setMapReady] = useState(false);
  const points = preview ? previewPoints : eventPoints;
  const pointsRef = useRef(points);
  const radarRef = useRef(radar);
  pointsRef.current = points;
  radarRef.current = radar;

  useEffect(() => {
    if (!container.current) return;
    let instance: MapLibreMap;
    let observer: ResizeObserver | undefined;
    const onError = () => setMapError("Map tiles could not be loaded. The event list below remains available.");
    const onContextLost = (event: Event) => {
      event.preventDefault();
      setMapError("Map graphics are unavailable in this browser. Use the event list below.");
    };
    const installEvents = () => {
      if (!instance.getSource("harvy-event-points")) {
        instance.addSource("harvy-event-points", { type: "geojson", data: pointsRef.current });
      } else {
        (instance.getSource("harvy-event-points") as GeoJSONSource).setData(pointsRef.current);
      }
      if (!instance.getLayer("harvy-event-density")) {
        instance.addLayer({
          id: "harvy-event-density",
          type: "heatmap",
          source: "harvy-event-points",
          layout: { visibility: radarRef.current ? "visible" : "none" },
          paint: {
            "heatmap-weight": ["get", "weight"],
            "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 0.8, 8, 2],
            "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 14, 8, 34, 12, 52],
            "heatmap-opacity": 0.78,
            "heatmap-color": ["interpolate", ["linear"], ["heatmap-density"], 0, "rgba(8,110,104,0)", 0.25, "#9CCFC0", 0.5, "#EBCB70", 0.75, "#E38357", 1, "#B33B36"],
          },
        });
      }
      if (!instance.getLayer("harvy-event-points")) {
        instance.addLayer({
          id: "harvy-event-points",
          type: "circle",
          source: "harvy-event-points",
          paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 2, 2, 8, 5], "circle-color": "#086E68", "circle-stroke-color": "#FFFFFF", "circle-stroke-width": 1.5 },
        });
      }
      (instance.getSource("harvy-event-points") as GeoJSONSource).setData(pointsRef.current);
      setMapReady(true);
      setMapError("");
    };

    try {
      setWorkerUrl(workerUrl);
      instance = new MapLibreMap({
        container: container.current,
        style: styles.light,
        center: [-98, 39],
        zoom: 2.7,
        minZoom: 1.5,
        maxZoom: 16,
        fadeDuration: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 300,
        attributionControl: { compact: true },
      });
      map.current = instance;
      instance.addControl(new NavigationControl({ showCompass: false }), "top-right");
      instance.on("style.load", installEvents);
      instance.on("error", onError);
      instance.getCanvas().addEventListener("webglcontextlost", onContextLost);
      observer = new ResizeObserver(() => instance.resize());
      observer.observe(container.current);
    } catch {
      setMapError("Map graphics could not start in this browser. Use the event list below.");
    }

    return () => {
      observer?.disconnect();
      if (map.current) {
        map.current.getCanvas().removeEventListener("webglcontextlost", onContextLost);
        map.current.remove();
        map.current = null;
      }
      setMapReady(false);
    };
  }, []);

  useEffect(() => {
    if (!map.current) return;
    map.current.setStyle(styles[mapStyle]);
  }, [mapStyle]);

  useEffect(() => {
    const source = map.current?.getSource("harvy-event-points") as GeoJSONSource | undefined;
    source?.setData(points);
  }, [points]);

  useEffect(() => {
    const instance = map.current;
    if (!instance?.getLayer("harvy-event-density")) return;
    instance.setLayoutProperty("harvy-event-density", "visibility", radar ? "visible" : "none");
  }, [radar, mapReady]);

  const selectStyle = (_: React.MouseEvent<HTMLElement>, value: MapStyle | null) => {
    if (value) setMapStyle(value);
  };

  return <Stack spacing={1.5}>
    <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ sm: "center" }} justifyContent="space-between" gap={1}>
      <Box><Typography variant="h5">Event map</Typography><Typography variant="body2" color="text.secondary">{product} · {timeframe(from, to)}</Typography></Box>
      <Stack direction="row" alignItems="center" flexWrap="wrap" gap={1}>
        <ToggleButtonGroup size="small" exclusive value={mapStyle} onChange={selectStyle} aria-label="Map appearance">
          <ToggleButton value="light">Light</ToggleButton><ToggleButton value="dark">Dark</ToggleButton>
        </ToggleButtonGroup>
        <FormControlLabel control={<Switch checked={radar} onChange={(event) => setRadar(event.target.checked)} />} label="Density radar" />
        <Button size="small" variant={preview ? "contained" : "outlined"} onClick={() => setPreview((value) => !value)}>{preview ? "Hide synthetic preview" : "Preview synthetic density"}</Button>
      </Stack>
    </Stack>

    {preview && <Alert severity="warning">Synthetic preview only — these sample points are not collected events, locations, or risk signals.</Alert>}
    {mapError && <Alert severity="warning">{mapError}</Alert>}

    <Box ref={container} role="region" aria-label={`${product} event map`} sx={{ height: { xs: 420, md: 620 }, minHeight: 360, overflow: "hidden", border: 1, borderColor: "divider", borderRadius: 2, bgcolor: "#E7ECE9", position: "relative" }}>
      {radar && <Box sx={{ position: "absolute", zIndex: 1, left: 12, bottom: 12, bgcolor: "background.paper", border: 1, borderColor: "divider", borderRadius: 1, px: 1.5, py: 1, pointerEvents: "none" }}>
        <Typography variant="caption" fontWeight={700} display="block">Event density · one equal contribution per event</Typography>
        <Stack direction="row" spacing={1.5} sx={{ mt: 0.5 }}><Typography variant="caption">Lower</Typography><Box aria-hidden="true" sx={{ width: 88, height: 8, borderRadius: 4, background: "linear-gradient(90deg,#9CCFC0,#EBCB70,#E38357,#B33B36)" }} /><Typography variant="caption">Higher</Typography></Stack>
      </Box>}
    </Box>

    <Stack direction="row" flexWrap="wrap" gap={1} alignItems="center" aria-live="polite">
      <Chip size="small" label={`${preview ? previewPoints.features.length : eventPoints.features.length} located ${preview ? "preview points" : "events"}`} />
      <Chip size="small" variant="outlined" label={`${events.length} events loaded`} />
      {hasMoreEvents && <Chip size="small" color="warning" variant="outlined" label="More events not loaded; radar is partial" />}
      {!preview && eventPoints.features.length === 0 && <Typography variant="body2" color="text.secondary">No loaded events carry a validated coordinate pair yet, so there are no points to plot.</Typography>}
      {!radar && <Typography variant="body2" color="text.secondary">Density overlay is off.</Typography>}
    </Stack>
    <Typography variant="caption" color="text.secondary">Density shows the concentration of located events in the loaded results, not event severity, risk, or weather radar. Map overlays stay in this browser; only base-map view requests go to the tile service. Base-map source attribution appears on the map.</Typography>

    <Box component="details" sx={{ borderTop: 1, borderColor: "divider", pt: 1 }}>
      <Box component="summary" sx={{ cursor: "pointer", color: "primary.main", fontWeight: 700, py: 1 }}>View events as a list ({events.length} loaded)</Box>
      {events.length ? <Stack spacing={0.5} sx={{ pt: 1 }}>
        {events.map((event) => <Button key={event.id} onClick={() => onSelectEvent(event)} sx={{ textAlign: "left", justifyContent: "flex-start" }}>
          <Box><Typography variant="body2" fontWeight={700}>{event.title}</Typography><Typography variant="caption" color="text.secondary">{new Date(event.last_seen_at).toLocaleString()} · {event.evidence_count} sources</Typography></Box>
        </Button>)}
      </Stack> : <Typography variant="body2" color="text.secondary" sx={{ pt: 1 }}>No events in the current result page.</Typography>}
    </Box>
  </Stack>;
}
