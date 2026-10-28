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

export const HARVY_PRODUCTS: readonly HarvyProduct[] = ["Newsk", "Tower", "Ops", "Civic"] as const;

export const HARVY_PRODUCT_TAGLINE: Record<HarvyProduct, string> = {
  Newsk: "Newsroom desk and attributed verification",
  Tower: "Worldwide geopolitical and risk intelligence",
  Ops: "Operational action and business intelligence",
  Civic: "Legislative and municipal public records",
};
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
  allowedProducts?: readonly HarvyProduct[];
  onProductChange?: (product: HarvyProduct) => void;
}

const stateMessage: Record<Exclude<SurfaceState, "ready">, string> = {
  loading: "Loading this workspace…",
  empty: "No results for this view.",
  stale: "This view may be out of date. Check source freshness before using it.",
  error: "This view could not load. Try again or contact support.",
  denied: "Your account does not have access to this view.",
};

/** Shared visual frame; API authorization must be enforced on the server. */
export function HarvyShell({ product, tool, title, context, state, updatedAt, notice, children, allowedProducts, onProductChange }: HarvyShellProps) {
  const canView = context.capabilities.includes(`${tool}.view`);
  const effectiveState = canView ? state : "denied";
  return (
    <Box data-harvy-tag="harvy.platform.shell" sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <CssBaseline />
      <AppBar position="static" color="default" elevation={0}>
        <Toolbar sx={{ gap: 2, flexWrap: "wrap" }}>
          <Typography variant="h6" component="span">Harvy / {product}</Typography>
          {allowedProducts && allowedProducts.length > 1 && (
            <Box component="nav" aria-label="Product modes" sx={{ display: "flex", gap: 0.5 }}>
              {allowedProducts.map((name) => (
                <Button key={name} size="small" variant={name === product ? "contained" : "text"}
                  aria-current={name === product ? "page" : undefined}
                  onClick={onProductChange ? () => onProductChange(name) : undefined}
                  href={onProductChange ? undefined : `/${name.toLowerCase()}`}
                  title={HARVY_PRODUCT_TAGLINE[name]}>
                  {name}
                </Button>
              ))}
            </Box>
          )}
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
