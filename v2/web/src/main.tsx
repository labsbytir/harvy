import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import App from "./App";
import { harvyTheme } from "./theme";

const root = document.getElementById("root");
if (!root) throw new Error("Missing application root");

createRoot(root).render(
  <StrictMode>
    <ThemeProvider theme={harvyTheme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </StrictMode>
);
