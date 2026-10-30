import { useState, useEffect } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { TacticalPanel } from "./TacticalPanel";

interface ScriptItem {
  type: "command" | "output" | "table";
  text: string;
}

const SCRIPT: readonly ScriptItem[] = [
  { type: "command", text: "harvy auth login --org acme" },
  { type: "output", text: "✓ authenticated as analyst@acme.io [tenant: acme-prod]" },
  { type: "command", text: "harvy events list --product tower --since 24h" },
  { type: "output", text: "▸ 12 events · 9 located · sources: gdacs, noaa" },
  { type: "command", text: 'harvy query "events where alertlevel != green" --format table' },
  {
    type: "table",
    text: [
      "┌──────────────┬─────────┬────────┬─────────────────────────────┬───────────┐",
      "│ EVENT ID     │ PRODUCT │ SEV    │ TITLE                       │ SOURCE    │",
      "├──────────────┼─────────┼────────┼─────────────────────────────┼───────────┤",
      "│ evt-09418a2f │ TOWER   │ RED    │ Tropical Cyclone 04B Alert  │ gdacs.org │",
      "│ evt-094188b1 │ TOWER   │ ORANGE │ Atlantic Storm System N2    │ noaa.gov  │",
      "│ evt-09417c09 │ TOWER   │ RED    │ Wildfire Complex Alpha      │ gdacs.org │",
      "└──────────────┴─────────┴────────┴─────────────────────────────┴───────────┘"
    ].join("\n")
  }
];

export function CliSimulator() {
  const [stepIndex, setStepIndex] = useState(0);
  const [typedChars, setTypedChars] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;

    if (stepIndex >= SCRIPT.length) {
      // Hold at end for 8 seconds, then restart session loop
      const timer = setTimeout(() => {
        setStepIndex(0);
        setTypedChars(0);
      }, 8000);
      return () => clearTimeout(timer);
    }

    const current = SCRIPT[stepIndex];

    if (current.type === "command") {
      if (typedChars < current.text.length) {
        const timer = setTimeout(() => {
          setTypedChars((c) => c + 1);
        }, 45);
        return () => clearTimeout(timer);
      } else {
        const timer = setTimeout(() => {
          setStepIndex((s) => s + 1);
          setTypedChars(0);
        }, 400);
        return () => clearTimeout(timer);
      }
    } else {
      // Output or table reveals after brief computation pause
      const timer = setTimeout(() => {
        setStepIndex((s) => s + 1);
        setTypedChars(0);
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [stepIndex, typedChars, isPaused]);

  return (
    <Box sx={{ width: "100%" }}>
      {/* Header bar and dev status indicator */}
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
            [ 03 // CLI — IN DEVELOPMENT ]
          </Typography>
          <Typography variant="h3" sx={{ mt: 0.5, fontSize: { xs: "1.8rem", md: "2.4rem" } }}>
            UNIX-FIRST OPERATIONAL CONTROL
          </Typography>
        </Box>
        <Chip
          label="[ IN DEVELOPMENT // NOT YET RELEASED ]"
          size="small"
          sx={{
            bgcolor: "rgba(245, 158, 11, 0.12)",
            color: "#F59E0B",
            borderColor: "rgba(245, 158, 11, 0.4)",
            fontWeight: 700,
            fontSize: "0.75rem"
          }}
        />
      </Stack>

      <Typography sx={{ color: "text.secondary", mb: 3, maxWidth: 760, fontSize: "0.95rem" }}>
        Direct terminal workflows for analysts and automation scripts. Query HQL, inspect Ontoly evidence, and trigger pipeline runs from any shell.{" "}
        <Box component="span" sx={{ color: "#F59E0B", fontWeight: 600 }}>
          CLI is in development. The API below is live.
        </Box>
      </Typography>

      {/* Terminal Window Box */}
      <TacticalPanel
        cornerColor="#F59E0B"
        sx={{
          bgcolor: "#000000",
          borderColor: "#27272A",
          overflow: "hidden"
        }}
      >
        {/* Terminal Title Bar */}
        <Box
          sx={{
            bgcolor: "#121214",
            borderBottom: "1px solid #27272A",
            px: 2,
            py: 1,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            userSelect: "none"
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <Box component="span" sx={{ width: 8, height: 8, bgcolor: "#EF4444", display: "inline-block" }} />
            <Box component="span" sx={{ width: 8, height: 8, bgcolor: "#F59E0B", display: "inline-block" }} />
            <Box component="span" sx={{ width: 8, height: 8, bgcolor: "#10B981", display: "inline-block" }} />
            <Typography
              component="span"
              sx={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: "0.75rem",
                color: "#FAFAFA",
                fontWeight: 600,
                ml: 1.5,
                letterSpacing: "0.05em"
              }}
            >
              harvy-cli — zsh — 80x24
            </Typography>
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center">
            <Button
              size="small"
              onClick={() => setIsPaused(!isPaused)}
              sx={{
                fontSize: "0.65rem",
                py: 0.2,
                px: 1,
                color: isPaused ? "#F59E0B" : "#A1A1AA",
                borderColor: "#27272A"
              }}
            >
              {isPaused ? "[ RESUME ]" : "[ PAUSE ]"}
            </Button>
            <Button
              size="small"
              onClick={() => {
                setStepIndex(0);
                setTypedChars(0);
                setIsPaused(false);
              }}
              sx={{
                fontSize: "0.65rem",
                py: 0.2,
                px: 1,
                color: "#A1A1AA",
                borderColor: "#27272A"
              }}
            >
              [ REPLAY ]
            </Button>
          </Stack>
        </Box>

        {/* Terminal Screen Body */}
        <Box
          role="region"
          aria-label="Simulated harvy-cli interactive terminal session"
          aria-live="polite"
          sx={{
            p: { xs: 2, md: 3 },
            minHeight: 280,
            fontFamily: "'IBM Plex Mono', 'JetBrains Mono', monospace",
            fontSize: { xs: "0.75rem", sm: "0.85rem" },
            lineHeight: 1.6,
            color: "#FAFAFA",
            overflowX: "auto",
            "@keyframes blink": {
              "0%, 49%": { opacity: 1 },
              "50%, 100%": { opacity: 0 }
            }
          }}
        >
          {SCRIPT.slice(0, stepIndex).map((item, idx) => (
            <Box key={idx} sx={{ mb: 1 }}>
              {item.type === "command" && (
                <Box sx={{ color: "#FAFAFA" }}>
                  <Box component="span" sx={{ color: "#F59E0B", mr: 1, fontWeight: 700 }}>
                    $
                  </Box>
                  <Box component="span">{item.text}</Box>
                </Box>
              )}
              {item.type === "output" && (
                <Box sx={{ color: "#00F0FF", pl: 2 }}>{item.text}</Box>
              )}
              {item.type === "table" && (
                <Box
                  component="pre"
                  sx={{
                    m: 0,
                    fontFamily: "inherit",
                    fontSize: "inherit",
                    color: "#A1A1AA",
                    pl: 2,
                    whiteSpace: "pre"
                  }}
                >
                  {item.text}
                </Box>
              )}
            </Box>
          ))}

          {/* Currently typing command or cursor prompt */}
          {stepIndex < SCRIPT.length && SCRIPT[stepIndex].type === "command" && (
            <Box sx={{ color: "#FAFAFA" }}>
              <Box component="span" sx={{ color: "#F59E0B", mr: 1, fontWeight: 700 }}>
                $
              </Box>
              <Box component="span">{SCRIPT[stepIndex].text.slice(0, typedChars)}</Box>
              <Box
                component="span"
                sx={{
                  display: "inline-block",
                  width: "0.55em",
                  height: "1em",
                  bgcolor: "#F59E0B",
                  verticalAlign: "middle",
                  ml: 0.25,
                  animation: "blink 1s step-start infinite"
                }}
              />
            </Box>
          )}

          {/* Completed loop terminal waiting prompt */}
          {stepIndex >= SCRIPT.length && (
            <Box sx={{ color: "#FAFAFA", mt: 1 }}>
              <Box component="span" sx={{ color: "#F59E0B", mr: 1, fontWeight: 700 }}>
                $
              </Box>
              <Box
                component="span"
                sx={{
                  display: "inline-block",
                  width: "0.55em",
                  height: "1em",
                  bgcolor: "#F59E0B",
                  verticalAlign: "middle",
                  ml: 0.25,
                  animation: "blink 1s step-start infinite"
                }}
              />
            </Box>
          )}
        </Box>

        {/* Terminal Footer Bar */}
        <Box
          sx={{
            bgcolor: "#09090B",
            borderTop: "1px solid #27272A",
            px: 2,
            py: 0.75,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: "0.7rem",
            color: "#71717A"
          }}
        >
          <Box component="span">SHELL: ZSH 5.9 // UTF-8</Box>
          <Box component="span" sx={{ color: "#F59E0B" }}>
            SIMULATION MODE — NO LOCAL DAEMON REQUIRED
          </Box>
        </Box>
      </TacticalPanel>
    </Box>
  );
}
