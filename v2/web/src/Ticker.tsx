import Box from "@mui/material/Box";

const TICKER_TEXT =
  "HARVY // EVIDENCE-FIRST INTELLIGENCE // SOURCE-GROUNDED // TENANT-SCOPED // DETERMINISTIC PIPELINE // AUDITABLE PROVENANCE // ZERO SPECULATIVE CLAIMS // ";

export function Ticker() {
  const repeated = TICKER_TEXT.repeat(4);

  return (
    <Box
      component="div"
      aria-label="System telemetry announcement ticker"
      sx={{
        width: "100%",
        overflow: "hidden",
        bgcolor: "#000000",
        borderTop: "1px solid #27272A",
        borderBottom: "1px solid #27272A",
        py: 0.85,
        userSelect: "none",
        position: "relative",
        "@keyframes harvyTicker": {
          "0%": { transform: "translateX(0%)" },
          "100%": { transform: "translateX(-50%)" }
        },
        "@media (prefers-reduced-motion: reduce)": {
          "& .ticker-track": {
            animation: "none !important"
          }
        }
      }}
    >
      <Box
        className="ticker-track"
        sx={{
          display: "flex",
          width: "max-content",
          whiteSpace: "nowrap",
          animation: "harvyTicker 32s linear infinite",
          willChange: "transform"
        }}
      >
        <Box
          component="span"
          sx={{
            fontFamily: "'IBM Plex Mono', 'JetBrains Mono', monospace",
            fontSize: "0.8rem",
            fontWeight: 700,
            letterSpacing: "0.12em",
            color: "#F59E0B",
            px: 2
          }}
        >
          {repeated}
        </Box>
        <Box
          component="span"
          aria-hidden="true"
          sx={{
            fontFamily: "'IBM Plex Mono', 'JetBrains Mono', monospace",
            fontSize: "0.8rem",
            fontWeight: 700,
            letterSpacing: "0.12em",
            color: "#F59E0B",
            px: 2
          }}
        >
          {repeated}
        </Box>
      </Box>
    </Box>
  );
}
