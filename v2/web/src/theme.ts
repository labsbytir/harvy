import { createTheme } from "@mui/material/styles";

export const harvyTheme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#086E68", dark: "#075A55", contrastText: "#FFFFFF" },
    background: { default: "#F8F7F4", paper: "#FFFFFF" },
    text: { primary: "#17212B", secondary: "#5F6B72" },
    divider: "#D8DDD9",
    warning: { main: "#9A5A17" },
    error: { main: "#B33B36" }
  },
  typography: {
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
    h1: { fontWeight: 800, letterSpacing: "-0.055em", lineHeight: 1.04 },
    h2: { fontWeight: 750, letterSpacing: "-0.035em", lineHeight: 1.1 },
    h5: { fontWeight: 700 }
  },
  shape: { borderRadius: 12 },
  components: {
    MuiButton: { styleOverrides: { root: { textTransform: "none", fontWeight: 700 } } },
    MuiCard: { styleOverrides: { root: { boxShadow: "none", border: "1px solid #D8DDD9" } } }
  }
});
