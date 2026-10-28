import type { ReactNode } from "react";
import Alert from "@mui/material/Alert";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import CssBaseline from "@mui/material/CssBaseline";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";

export type HarvyProduct = "Tower" | "Ops" | "Civic" | "Newsk";
export type HarvyTool = "query" | "map" | "graph" | "media" | "forms" | "agent";
export type SurfaceState = "ready" | "loading" | "empty" | "stale" | "error" | "denied";

export interface HarvyShellContext {
  principalId: string;
  tenantId: string;
  workspaceId: string;
  capabilities: readonly string[];
  policyRevision: string;
}

export interface HarvyShellProps {
  product: HarvyProduct;
  tool: HarvyTool;
  title: string;
  context: HarvyShellContext;
  state: SurfaceState;
  updatedAt?: string;
  notice?: string;
  children: ReactNode;
}

const stateMessage: Record<Exclude<SurfaceState, "ready">, string> = {
  loading: "Loading this workspace…",
  empty: "No results for this view.",
  stale: "This view may be out of date. Check source freshness before using it.",
  error: "This view could not load. Try again or contact support.",
  denied: "Your account does not have access to this view.",
};

/** Shared visual frame; API authorization must be enforced on the server. */
export function HarvyShell({ product, tool, title, context, state, updatedAt, notice, children }: HarvyShellProps) {
  const canView = context.capabilities.includes(`${tool}.view`);
  const effectiveState = canView ? state : "denied";
  return (
    <Box data-harvy-tag="harvy.platform.shell" sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <CssBaseline />
      <AppBar position="static" color="default" elevation={0}>
        <Toolbar sx={{ gap: 2, flexWrap: "wrap" }}>
          <Typography variant="h6" component="span">Harvy / {product}</Typography>
          <Box component="nav" aria-label="Product tools" sx={{ display: "flex", gap: 1, ml: "auto" }}>
            {(["query", "map", "graph", "media", "forms", "agent"] as const)
              .filter((name) => context.capabilities.includes(`${name}.view`))
              .map((name) => (
                <Button key={name} size="small" href={`/${product.toLowerCase()}/${name}`} aria-current={name === tool ? "page" : undefined}>
                  {name}
                </Button>
              ))}
          </Box>
        </Toolbar>
      </AppBar>
      <Container component="main" maxWidth="xl" sx={{ py: 3 }} data-harvy-tag={`harvy.${product.toLowerCase()}.${tool}.surface`}>
        <Typography variant="h5" component="h1" gutterBottom>{title}</Typography>
        {updatedAt && <Typography variant="caption" color="text.secondary">Updated {updatedAt}</Typography>}
        {notice && <Alert severity="info" sx={{ mt: 2 }}>{notice}</Alert>}
        {effectiveState !== "ready" && (
          <Alert severity={effectiveState === "error" ? "error" : effectiveState === "denied" ? "warning" : "info"} sx={{ my: 2 }} role="status">
            {stateMessage[effectiveState]}
          </Alert>
        )}
        {(effectiveState === "ready" || effectiveState === "stale") && children}
      </Container>
    </Box>
  );
}
