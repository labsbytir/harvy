import { useState } from "react";
import Workspace from "./Workspace";
import { MODES, type HarvyProduct } from "./modes";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardActionArea from "@mui/material/CardActionArea";
import Chip from "@mui/material/Chip";
import Container from "@mui/material/Container";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";

const products = MODES;

const steps = [
  { number: "01", title: "Monitor", text: "Collect from approved sources through registered connectors." },
  { number: "02", title: "Connect", text: "Resolve observations and relationships in Ontoly with HarvyDex IDs." },
  { number: "03", title: "Analyze", text: "Use bounded HQL views with visible coverage and source age." },
  { number: "04", title: "Act", text: "Save an attributed brief or hand off an authorized action." }
] as const;

export default function App() {
  return window.location.pathname.startsWith("/app") || window.location.pathname === "/sign-in" ? <Workspace /> : <MarketingHome />;
}

function MarketingHome() {
  const [menuOpen, setMenuOpen] = useState(false);
  const productRoute = window.location.pathname.match(/^\/product\/(newsk|tower|ops|civic)$/)?.[1];
  const routeProduct = products.find((item) => item.name.toLowerCase() === productRoute);
  const [activeProduct] = useState<HarvyProduct>(routeProduct?.name ?? "Newsk");
  const infoPage = ["/ontology", "/security", "/docs", "/contact"].includes(window.location.pathname) ? window.location.pathname.slice(1) : null;
  const info = {
    ontology: { title: "One shared ontology", description: "Harvy connects source observations, evidence, and entities across product contexts. Each record keeps its provenance and scope." },
    security: { title: "Access is scoped by organization", description: "Local API routes validate Better Auth membership, product entitlements, and tenant/workspace boundaries. No hosted security review or deployment is claimed." },
    docs: { title: "Harvy documentation", description: "Public product guides are not published yet. The current build and deployment status is shown here; no live integration instructions are implied." },
    contact: { title: "Talk with Harvy", description: "The demo/contact workflow is not connected yet. No message is sent from this preview." },
  }[infoPage as "ontology" | "security" | "docs" | "contact"];
  const routeDescription = routeProduct ? `${routeProduct.description}${routeProduct.name === "Newsk" ? " Its organization entitlement includes Tower, Ops, and Civic modes." : ""} The local build shows only product-scoped records and labels the service state honestly.` : null;
  const home = window.location.pathname === "/";
  const topHref = home ? "#top" : "/";
  const workflowHref = home ? "#workflow" : "/#workflow";
  const productHref = home ? "#products" : "/#products";
  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <AppBar position="static" elevation={0} color="transparent" sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Container maxWidth="lg">
          <Toolbar disableGutters sx={{ gap: 2, minHeight: 72 }}>
            <Typography component="a" href={topHref} variant="h5" color="text.primary" sx={{ textDecoration: "none", fontWeight: 800, letterSpacing: "-0.04em" }} data-harvy-tag="harvy.global.nav.brand.v1">Harvy</Typography>
            <Box component="nav" aria-label="Main navigation" sx={{ ml: "auto", display: { xs: "none", md: "flex" }, gap: 2 }}>
              <Button color="inherit" href={productHref}>Products</Button>
              <Button color="inherit" href={workflowHref}>How it works</Button>
              <Button color="inherit" href="/docs">Documentation</Button>
              <Button color="inherit" href="/security">Security</Button>
              <Button color="inherit" href="/contact">Contact</Button>
              <Button color="inherit" href="/sign-in">Sign in</Button>
            </Box>
            <Button size="small" variant="outlined" sx={{ display: { xs: "inline-flex", md: "none" }, ml: "auto" }} aria-expanded={menuOpen} aria-controls="mobile-nav" onClick={() => setMenuOpen(!menuOpen)}>Menu</Button>
          </Toolbar>
          {menuOpen && <Box id="mobile-nav" component="nav" aria-label="Mobile navigation" sx={{ display: { xs: "flex", md: "none" }, flexDirection: "column", pb: 2 }}>
            <Button href={productHref} onClick={() => setMenuOpen(false)}>Products</Button>
            <Button href={workflowHref} onClick={() => setMenuOpen(false)}>How it works</Button>
            <Button href="/docs" onClick={() => setMenuOpen(false)}>Documentation</Button>
            <Button href="/security" onClick={() => setMenuOpen(false)}>Security</Button>
            <Button href="/contact" onClick={() => setMenuOpen(false)}>Contact</Button>
            <Button href="/sign-in" onClick={() => setMenuOpen(false)}>Sign in</Button>
          </Box>}
        </Container>
      </AppBar>

      <Box component="main" id="top" role="main">
        <Container maxWidth="lg" sx={{ pt: { xs: 8, md: 12 }, pb: 10 }}>
          <Chip label={routeProduct ? `${routeProduct.name} · development preview` : infoPage ? `${info?.title} · development preview` : "Harvy foundation · development preview"} color="primary" variant="outlined" sx={{ mb: 3 }} />
          <Typography component="h1" variant="h1" sx={{ fontSize: { xs: "3rem", sm: "4.5rem", md: "6rem" }, maxWidth: 900 }}>
            {routeProduct ? routeProduct.label : info?.title || "Intelligence you can trace to its source."}
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 680, mt: 3, fontWeight: 400, lineHeight: 1.5 }}>
            {routeDescription || info?.description || "Harvy brings monitoring, connected records, analysis, and action into one evidence-first workspace."}
          </Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mt: 4, alignItems: { xs: "stretch", sm: "center" } }}>
            <Button variant="contained" href={routeProduct ? "/app" : infoPage === "contact" ? "/sign-in" : productHref} size="large">{routeProduct ? "Open Harvy" : infoPage === "contact" ? "Sign in" : "Explore the products"}</Button>
            <Button variant="outlined" href={workflowHref} size="large">{home ? "See the workflow" : "How Harvy works"}</Button>
          </Stack>

          {infoPage && <Card sx={{ mt: { xs: 7, md: 10 } }}><CardContent><Typography variant="h5">Current status</Typography><Typography color="text.secondary" sx={{ mt: 1 }}>{infoPage === "ontology" ? "Events, source evidence, stories, briefs, dashboards, runs, and handoff actions use explicit organization/workspace scopes in the local migration and API." : infoPage === "security" ? "The local build has signed Automation callbacks and tenant-scoped query checks. Live authorization, R2 permissions, secret injection, and two-tenant deployment checks are still pending." : infoPage === "docs" ? "Canonical product, engineering, connector, and UI documents are kept in the repository docs folder. A public documentation site has not been deployed." : "This preview has no contact form or external demo booking integration."}</Typography></CardContent></Card>}
          {!infoPage && <Card sx={{ mt: { xs: 7, md: 10 }, overflow: "hidden" }} data-harvy-tag="harvy.global.hero.preview.v1">
            <Box sx={{ bgcolor: "#17212B", color: "#FFFFFF", px: 3, py: 1.5, display: "flex", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
              <Typography variant="subtitle2">{routeProduct?.name || "Newsk"} · evidence preview</Typography>
              <Typography variant="caption">Illustrative fixture · no live collection</Typography>
            </Box>
            <CardContent sx={{ p: { xs: 3, md: 4 } }}>
              <Stack direction={{ xs: "column", md: "row" }} spacing={4}>
                <Box sx={{ flex: 1 }}>
                  <Chip size="small" label="Emerging event" color="warning" variant="outlined" />
                  <Typography variant="h5" sx={{ mt: 2 }}>{routeProduct?.name === "Tower" ? "A business signal, with its evidence attached." : routeProduct?.name === "Ops" ? "A reviewed signal becomes an owned action." : routeProduct?.name === "Civic" ? "A civic event, traceable to its public record." : "A developing story, with its evidence attached."}</Typography>
                  <Typography color="text.secondary" sx={{ mt: 2 }}>Source links, capture times, related records, and coverage gaps stay attached before a brief is shared.</Typography>
                </Box>
                <Box sx={{ flex: 1, borderLeft: { md: 1 }, borderColor: "divider", pl: { md: 4 } }}>
                  <Typography variant="overline" color="text.secondary">Evidence panel</Typography>
                  <Stack spacing={1.5} sx={{ mt: 1 }}>
                    <Box><Typography fontWeight={700}>Source</Typography><Typography color="text.secondary">Approved source reference</Typography></Box>
                    <Divider />
                    <Box><Typography fontWeight={700}>Freshness</Typography><Typography color="text.secondary">Capture time shown with every observation</Typography></Box>
                    <Divider />
                    <Box><Typography fontWeight={700}>Coverage</Typography><Typography color="text.secondary">Missing or partial inputs remain visible</Typography></Box>
                  </Stack>
                </Box>
              </Stack>
            </CardContent>
          </Card>}
        </Container>

        {(home || routeProduct) && <Box id="products" sx={{ bgcolor: "background.paper", py: { xs: 8, md: 10 }, borderTop: 1, borderBottom: 1, borderColor: "divider" }}>
          <Container maxWidth="lg">
            <Typography variant="overline" color="primary">One foundation, four contexts</Typography>
            <Typography component="h2" variant="h2" sx={{ fontSize: { xs: "2.3rem", md: "3.5rem" }, mt: 1, mb: 4 }}>Work from the same evidence.</Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" }, gap: 2 }}>
              {products.map((product) => <Card key={product.name} data-harvy-tag={"harvy.global.products." + product.name.toLowerCase() + ".v1"}
                sx={product.name === activeProduct ? { borderColor: "primary.main", borderWidth: 2 } : undefined}>
                <CardActionArea component="a" href={`/product/${product.name.toLowerCase()}`} sx={{ textAlign: "left", height: "100%" }}>
                  <CardContent sx={{ p: 3 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="start" gap={1}>
                      <Typography variant="h5">{product.name}</Typography>
                      <Chip label={product.status} size="small" variant="outlined" />
                    </Stack>
                    <Typography fontWeight={700} sx={{ mt: 2 }}>{product.label}</Typography>
                    <Typography color="text.secondary" sx={{ mt: 1 }}>{product.description}</Typography>
                  </CardContent>
                </CardActionArea>
              </Card>)}
            </Box>
          </Container>
        </Box>}

        {(home || routeProduct) && <Container id="workflow" maxWidth="lg" sx={{ py: { xs: 8, md: 10 } }}>
          <Typography variant="overline" color="primary">How it works</Typography>
          <Typography component="h2" variant="h2" sx={{ fontSize: { xs: "2.3rem", md: "3.5rem" }, mt: 1, mb: 4 }}>From source to decision.</Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" }, gap: 3 }}>
            {steps.map((step) => <Box key={step.number}>
              <Typography color="primary" fontWeight={800}>{step.number}</Typography>
              <Typography variant="h5" sx={{ mt: 1 }}>{step.title}</Typography>
              <Typography color="text.secondary" sx={{ mt: 1 }}>{step.text}</Typography>
            </Box>)}
          </Box>
        </Container>}

        {(home || routeProduct) && <Box id="status" sx={{ bgcolor: "#17212B", color: "#FFFFFF", py: { xs: 7, md: 8 } }}>
          <Container maxWidth="lg">
            <Typography component="h2" variant="h4" fontWeight={800}>A working core, not a live service yet.</Typography>
            <Typography sx={{ mt: 2, maxWidth: 720, color: "#D9E4E2" }}>The local build includes sign-in integration and a scoped newsroom desk. Live collection and customer access require approved source configuration, deployed Workers, and verified storage.</Typography>
            <Button href="/app" variant="contained" sx={{ mt: 3 }}>Open Harvy</Button>
          </Container>
        </Box>}
      </Box>
      <Box component="footer" sx={{ py: 4 }}>
        <Container maxWidth="lg"><Typography variant="body2" color="text.secondary">Harvy · source-grounded intelligence</Typography></Container>
      </Box>
    </Box>
  );
}
