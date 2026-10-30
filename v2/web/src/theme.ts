import { createTheme } from "@mui/material/styles";

declare module "@mui/material/Typography" {
  interface TypographyPropsVariantOverrides {
    mono: true;
  }
}

export const harvyTheme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#F59E0B", // Palantir tactical amber
      light: "#FBBF24",
      dark: "#D97706",
      contrastText: "#09090B"
    },
    secondary: {
      main: "#00F0FF", // Tactical cyan accent
      light: "#67E8F9",
      dark: "#0891B2",
      contrastText: "#09090B"
    },
    background: {
      default: "#09090B", // Tactical black
      paper: "#121214" // Slate panel
    },
    text: {
      primary: "#FAFAFA",
      secondary: "#A1A1AA"
    },
    divider: "#27272A",
    warning: { main: "#F59E0B", contrastText: "#09090B" },
    error: { main: "#EF4444" },
    info: { main: "#00F0FF" },
    success: { main: "#10B981" },
    action: {
      hover: "rgba(245, 158, 11, 0.08)",
      selected: "rgba(245, 158, 11, 0.16)",
      focus: "rgba(245, 158, 11, 0.24)"
    }
  },
  shape: {
    borderRadius: 0 // Zero rounded corners anywhere
  },
  typography: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    h1: {
      fontFamily: "'Space Grotesk', 'Inter', sans-serif",
      fontWeight: 700,
      letterSpacing: "-0.04em",
      textTransform: "uppercase",
      lineHeight: 1.02
    },
    h2: {
      fontFamily: "'Space Grotesk', 'Inter', sans-serif",
      fontWeight: 700,
      letterSpacing: "-0.03em",
      textTransform: "uppercase",
      lineHeight: 1.08
    },
    h3: {
      fontFamily: "'Space Grotesk', 'Inter', sans-serif",
      fontWeight: 700,
      letterSpacing: "-0.02em",
      textTransform: "uppercase"
    },
    h4: {
      fontFamily: "'Space Grotesk', 'Inter', sans-serif",
      fontWeight: 700,
      letterSpacing: "-0.02em",
      textTransform: "uppercase"
    },
    h5: {
      fontFamily: "'Space Grotesk', 'Inter', sans-serif",
      fontWeight: 700,
      letterSpacing: "-0.01em",
      textTransform: "uppercase"
    },
    h6: {
      fontFamily: "'Space Grotesk', 'Inter', sans-serif",
      fontWeight: 700,
      letterSpacing: "0.02em",
      textTransform: "uppercase"
    },
    overline: {
      fontFamily: "'IBM Plex Mono', 'JetBrains Mono', monospace",
      letterSpacing: "0.14em",
      fontWeight: 600
    },
    caption: {
      fontFamily: "'IBM Plex Mono', 'JetBrains Mono', monospace",
      letterSpacing: "0.04em"
    }
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: "#09090B",
          color: "#FAFAFA"
        }
      }
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true
      },
      styleOverrides: {
        root: {
          borderRadius: 0,
          textTransform: "uppercase",
          fontFamily: "'IBM Plex Mono', 'JetBrains Mono', monospace",
          fontWeight: 600,
          letterSpacing: "0.08em",
          borderWidth: 1,
          "&:hover": {
            borderWidth: 1
          }
        },
        containedPrimary: {
          backgroundColor: "#F59E0B",
          color: "#09090B",
          border: "1px solid #F59E0B",
          "&:hover": {
            backgroundColor: "#FBBF24",
            borderColor: "#FBBF24"
          }
        },
        outlined: {
          borderRadius: 0,
          borderColor: "#27272A",
          color: "#FAFAFA",
          "&:hover": {
            borderColor: "#F59E0B",
            backgroundColor: "rgba(245, 158, 11, 0.08)"
          }
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          boxShadow: "none",
          backgroundColor: "#121214",
          border: "1px solid #27272A"
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          boxShadow: "none",
          border: "1px solid #27272A"
        }
      }
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          fontFamily: "'IBM Plex Mono', 'JetBrains Mono', monospace",
          fontSize: "0.75rem",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          border: "1px solid #27272A"
        },
        outlinedPrimary: {
          borderColor: "#F59E0B",
          color: "#F59E0B"
        }
      }
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: "#27272A"
        }
      }
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          borderBottom: "1px solid #27272A",
          backgroundColor: "#09090B"
        }
      }
    }
  }
});
