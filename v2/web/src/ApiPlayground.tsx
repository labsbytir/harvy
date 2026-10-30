import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { TacticalPanel } from "./TacticalPanel";

export function ApiPlayground() {
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>("/api/v1/events?product=tower&limit=5");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    status: number;
    statusText: string;
    durationMs: number;
    payload: string;
    isError: boolean;
    is401: boolean;
  } | null>(null);

  async function executeQuery() {
    setIsLoading(true);
    const start = performance.now();
    try {
      const response = await fetch(selectedEndpoint, {
        method: "GET",
        headers: {
          "x-harvy-product": "tower",
          "Accept": "application/json"
        }
      });
      const durationMs = Math.round(performance.now() - start);
      let payloadText = "";
      try {
        const json = await response.json();
        payloadText = JSON.stringify(json, null, 2);
      } catch {
        payloadText = await response.text();
      }

      // Truncate payload if exceptionally large (keeps display crisp)
      const lines = payloadText.split("\n");
      const truncated = lines.length > 50 ? [...lines.slice(0, 50), `\n// ... [truncated: ${lines.length - 50} additional lines] ...`].join("\n") : payloadText;

      setResult({
        status: response.status,
        statusText: response.statusText || (response.status === 401 ? "Unauthorized" : response.status === 200 ? "OK" : "Status " + response.status),
        durationMs,
        payload: truncated,
        isError: !response.ok,
        is401: response.status === 401
      });
    } catch (err: unknown) {
      const durationMs = Math.round(performance.now() - start);
      const message = err instanceof Error ? err.message : "Network failure";
      setResult({
        status: 0,
        statusText: "NETWORK_ERROR",
        durationMs,
        payload: JSON.stringify({ error: "network_error", message: `Connection failed: ${message}` }, null, 2),
        isError: true,
        is401: false
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Box sx={{ width: "100%" }}>
      {/* Section Header */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={2}
        sx={{ mb: 2 }}
      >
        <Box>
          <Typography
            sx={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: "0.85rem",
              fontWeight: 700,
              color: "#F59E0B",
              letterSpacing: "0.1em"
            }}
          >
            [ 04 // API PLAYGROUND ]
          </Typography>
          <Typography variant="h3" sx={{ mt: 0.5, fontSize: { xs: "1.8rem", md: "2.4rem" } }}>
            INTERACTIVE REAL-TIME DISPATCH
          </Typography>
        </Box>
        <Chip
          label="[ LIVE API // REAL FETCH ]"
          size="small"
          sx={{
            bgcolor: "rgba(16, 185, 129, 0.12)",
            color: "#10B981",
            borderColor: "rgba(16, 185, 129, 0.4)",
            fontWeight: 700,
            fontSize: "0.75rem"
          }}
        />
      </Stack>

      <Typography sx={{ color: "text.secondary", mb: 3, maxWidth: 760, fontSize: "0.95rem" }}>
        Execute real queries against Harvy API endpoints directly from your browser. Unauthenticated requests trigger authentic 401 responses with structured error envelopes. No mocking or synthetic data.
      </Typography>

      {/* Interactive Console Panel */}
      <TacticalPanel
        cornerColor="#00F0FF"
        sx={{
          bgcolor: "#000000",
          borderColor: "#27272A",
          p: { xs: 2.5, md: 3.5 }
        }}
      >
        {/* Request Config Bar */}
        <Box sx={{ mb: 2.5 }}>
          <Typography
            variant="caption"
            sx={{
              color: "#71717A",
              fontFamily: "'IBM Plex Mono', monospace",
              letterSpacing: "0.08em",
              display: "block",
              mb: 1
            }}
          >
            // TARGET_ENDPOINT [READ-ONLY SPECIFICATION]
          </Typography>

          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems="stretch">
            <Box
              sx={{
                flex: 1,
                bgcolor: "#121214",
                border: "1px solid #27272A",
                display: "flex",
                alignItems: "center",
                px: 2,
                py: 1,
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: "0.85rem",
                color: "#FAFAFA",
                overflowX: "auto"
              }}
            >
              <Box component="span" sx={{ color: "#F59E0B", fontWeight: 700, mr: 1.5 }}>
                GET
              </Box>
              <Box component="span" sx={{ color: "#FAFAFA" }}>
                {selectedEndpoint}
              </Box>
            </Box>

            <Button
              variant="contained"
              color="primary"
              onClick={executeQuery}
              disabled={isLoading}
              sx={{
                px: 3,
                py: 1.25,
                whiteSpace: "nowrap",
                fontWeight: 700,
                fontSize: "0.8rem"
              }}
            >
              {isLoading ? (
                <Stack direction="row" spacing={1} alignItems="center">
                  <CircularProgress size={14} color="inherit" />
                  <span>DISPATCHING...</span>
                </Stack>
              ) : (
                "[ RUN QUERY ]"
              )}
            </Button>
          </Stack>

          {/* Quick preset chips */}
          <Stack direction="row" spacing={1} sx={{ mt: 1.5, alignItems: "center", flexWrap: "wrap", gap: 1 }}>
            <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.7rem", color: "#71717A" }}>
              PRESETS:
            </Typography>
            <Button
              size="small"
              variant={selectedEndpoint === "/api/v1/events?product=tower&limit=5" ? "contained" : "outlined"}
              onClick={() => setSelectedEndpoint("/api/v1/events?product=tower&limit=5")}
              sx={{ fontSize: "0.68rem", py: 0.2, px: 1, color: selectedEndpoint === "/api/v1/events?product=tower&limit=5" ? "#09090B" : "#A1A1AA" }}
            >
              /api/v1/events?product=tower&limit=5
            </Button>
            <Button
              size="small"
              variant={selectedEndpoint === "/health" ? "contained" : "outlined"}
              onClick={() => setSelectedEndpoint("/health")}
              sx={{ fontSize: "0.68rem", py: 0.2, px: 1, color: selectedEndpoint === "/health" ? "#09090B" : "#A1A1AA" }}
            >
              /health
            </Button>
          </Stack>
        </Box>

        {/* Execution Response Output */}
        <Box
          sx={{
            border: "1px solid #27272A",
            bgcolor: "#09090B"
          }}
        >
          {/* Output Header */}
          <Box
            sx={{
              px: 2,
              py: 1,
              borderBottom: "1px solid #27272A",
              bgcolor: "#121214",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 1
            }}
          >
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box
                component="span"
                sx={{
                  width: 8,
                  height: 8,
                  bgcolor: result ? (result.status === 200 ? "#10B981" : result.status === 401 ? "#F59E0B" : "#EF4444") : "#52525B"
                }}
              />
              <Typography
                sx={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: "0.75rem",
                  color: "#FAFAFA",
                  fontWeight: 600
                }}
              >
                {result
                  ? `HTTP ${result.status} ${result.statusText}`
                  : "READY // CLICK [ RUN QUERY ] TO DISPATCH"}
              </Typography>
            </Stack>

            {result && (
              <Stack direction="row" spacing={2} alignItems="center">
                <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.75rem", color: "#A1A1AA" }}>
                  LATENCY: {result.durationMs}ms
                </Typography>
                {result.is401 && (
                  <Chip
                    label="401 — SIGN IN REQUIRED"
                    size="small"
                    sx={{
                      bgcolor: "rgba(245, 158, 11, 0.15)",
                      color: "#F59E0B",
                      borderColor: "#F59E0B",
                      fontSize: "0.65rem",
                      height: 20
                    }}
                  />
                )}
              </Stack>
            )}
          </Box>

          {/* Response Payload Block */}
          <Box
            component="pre"
            tabIndex={0}
            role="region"
            aria-label="API response payload"
            sx={{
              p: 2,
              m: 0,
              fontFamily: "'IBM Plex Mono', 'JetBrains Mono', monospace",
              fontSize: { xs: "0.75rem", sm: "0.82rem" },
              lineHeight: 1.5,
              color: result ? (result.status === 200 ? "#10B981" : result.is401 ? "#F59E0B" : "#EF4444") : "#52525B",
              maxHeight: 320,
              overflowY: "auto",
              whiteSpace: "pre-wrap",
              wordBreak: "break-all"
            }}
          >
            {result
              ? result.payload
              : `// Response output will render here upon query dispatch.\n// Authenticated tenant scopes require active session cookies.\n// Public health queries return HTTP 200 OK with timestamp.`}
          </Box>
        </Box>

        {/* 401 Context Notice */}
        {result?.is401 && (
          <Box
            sx={{
              mt: 2,
              p: 1.5,
              bgcolor: "rgba(245, 158, 11, 0.05)",
              border: "1px dashed rgba(245, 158, 11, 0.3)",
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: "0.75rem",
              color: "#A1A1AA"
            }}
          >
            <Box component="span" sx={{ color: "#F59E0B", fontWeight: 700, mr: 1 }}>
              [ HONEST AUTHENTICATION GATE ]:
            </Box>
            401 — sign in required, response: {result.payload.replace(/\s+/g, " ").slice(0, 120)}... The API strictly enforces Better Auth organization tokens and tenant boundaries.
          </Box>
        )}
      </TacticalPanel>
    </Box>
  );
}
