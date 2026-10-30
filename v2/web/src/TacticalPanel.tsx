import React from "react";
import Box, { type BoxProps } from "@mui/material/Box";

export interface TacticalPanelProps extends BoxProps {
  children: React.ReactNode;
  cornerSize?: number;
  cornerColor?: string;
}

/**
 * TacticalPanel wraps a box with 1px border and tactical '+' crosshair marks at the 4 corners.
 */
export function TacticalPanel({
  children,
  cornerSize = 10,
  cornerColor = "#F59E0B",
  sx,
  ...rest
}: TacticalPanelProps) {
  return (
    <Box
      sx={{
        position: "relative",
        border: "1px solid #27272A",
        bgcolor: "#121214",
        ...sx
      }}
      {...rest}
    >
      {/* Top Left '+' */}
      <Box
        component="span"
        sx={{
          position: "absolute",
          top: -7,
          left: -6,
          color: cornerColor,
          fontFamily: "'IBM Plex Mono', 'JetBrains Mono', monospace",
          fontSize: "13px",
          lineHeight: 1,
          fontWeight: 700,
          userSelect: "none",
          pointerEvents: "none",
          zIndex: 1
        }}
      >
        +
      </Box>
      {/* Top Right '+' */}
      <Box
        component="span"
        sx={{
          position: "absolute",
          top: -7,
          right: -6,
          color: cornerColor,
          fontFamily: "'IBM Plex Mono', 'JetBrains Mono', monospace",
          fontSize: "13px",
          lineHeight: 1,
          fontWeight: 700,
          userSelect: "none",
          pointerEvents: "none",
          zIndex: 1
        }}
      >
        +
      </Box>
      {/* Bottom Left '+' */}
      <Box
        component="span"
        sx={{
          position: "absolute",
          bottom: -7,
          left: -6,
          color: cornerColor,
          fontFamily: "'IBM Plex Mono', 'JetBrains Mono', monospace",
          fontSize: "13px",
          lineHeight: 1,
          fontWeight: 700,
          userSelect: "none",
          pointerEvents: "none",
          zIndex: 1
        }}
      >
        +
      </Box>
      {/* Bottom Right '+' */}
      <Box
        component="span"
        sx={{
          position: "absolute",
          bottom: -7,
          right: -6,
          color: cornerColor,
          fontFamily: "'IBM Plex Mono', 'JetBrains Mono', monospace",
          fontSize: "13px",
          lineHeight: 1,
          fontWeight: 700,
          userSelect: "none",
          pointerEvents: "none",
          zIndex: 1
        }}
      >
        +
      </Box>
      {children}
    </Box>
  );
}
