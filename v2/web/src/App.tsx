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
import { TacticalPanel } from "./TacticalPanel";
import { Ticker } from "./Ticker";
import { CliSimulator } from "./CliSimulator";
import { ApiPlayground } from "./ApiPlayground";
import { BrutalistLinks } from "./BrutalistLinks";

const products = MODES;

const steps = [
  { index: "01", code: "MONITOR", title: "Monitor", text: "Collect from approved sources through registered workflows with verified proxy egress." },
  { index: "02", code: "ONTOLY", title: "Connect", text: "Resolve observations and entities in Ontoly with immutable HarvyDex IDs and provenance." },
  { index: "03", code: "HQL_ANALYTICS", title: "Analyze", text: "Execute bounded semantic HQL views with visible freshness and recorded coverage gaps." },
  { index: "04", code: "OPERATIONAL_ACT", title: "Act", text: "Produce attributed intelligence briefs or hand off authorized Ops actions." }
] as const;

const pipelineNodes = [
  { label: "SPIDER + WEBSHARE", sub: "EGRESS / SCRAPE", tone: "#F59E0B" },
  { label: "N8N AUTOMATION", sub: "EXECUTION & NORMALIZATION", tone: "#A1A1AA" },
  { label: "R2 + BASIN SQL", sub: "COLD ARTIFACTS & LOGS", tone: "#A1A1AA" },
  { label: "POSTGRES / HYPERDRIVE", sub: "TRANSACTIONAL AUTHORITY", tone: "#00F0FF" },
  { label: "ONTOLY & HQL", sub: "BOUNDED SEMANTIC ENGINE", tone: "#10B981" }
];

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
  const routeDescription = routeProduct ? `${routeProduct.description} The local build shows only product-scoped records and labels the service state honestly.` : null;
  const home = window.location.pathname === "/";
  const topHref = home ? "#top" : "/";
  const workflowHref = home ? "#workflow" : "/#workflow";
  const productHref = home ? "#products" : "/#products";
  const cliHref = home ? "#cli" : "/#cli";
  const playgroundHref = home ? "#playground" : "/#playground";
  const directoryHref = home ? "#directory" : "/#directory";

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", color: "text.primary" }}>
      {/* Telemetry status ribbon */}
      <Box
        sx={{
          bgcolor: "#000000",
          borderBottom: "1px solid #27272A",
          py: 0.75,
          px: 2,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontFamily: "'IBM Plex Mono', 'JetBrains Mono', monospace",
          fontSize: "0.75rem",
          letterSpacing: "0.06em",
          color: "#A1A1AA"
        }}
      >
        <Stack direction="row" spacing={2} sx={{ alignItems: "center", overflowX: "auto", whiteSpace: "nowrap" }}>
          <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.75, color: "#FAFAFA" }}>
            <Box component="span" sx={{ width: 6, height: 6, bgcolor: "#10B981" }} />
            <span>SYS: HARVY_V2</span>
          </Box>
          <Box component="span">|</Box>
          <Box component="span">EDGE: HYPERDRIVE</Box>
          <Box component="span">|</Box>
          <Box component="span">INGEST: N8N_VPS</Box>
          <Box component="span">|</Box>
          <Box component="span" sx={{ color: "#F59E0B" }}>STATUS: 200_OK [NOMINAL]</Box>
        </Stack>
        <Button
          href="/app"
          size="small"
          variant="outlined"
          sx={{
            py: 0.25,
            px: 1,
            fontSize: "0.7rem",
            color: "#F59E0B",
            borderColor: "rgba(245, 158, 11, 0.4)",
            display: { xs: "none", sm: "inline-flex" }
          }}
        >
          [ ACCESS PLATFORM ]
        </Button>
      </Box>

      {/* Marquee ticker strip */}
      <Ticker />

      {/* Industrial Navigation Header */}
      <AppBar position="static" elevation={0} color="transparent" sx={{ borderBottom: "1px solid #27272A", bgcolor: "#09090B" }}>
        <Container maxWidth="lg">
          <Toolbar disableGutters sx={{ gap: 2, minHeight: 64 }}>
            <Stack direction="row" alignItems="center" spacing={1.5} component="a" href={topHref} sx={{ textDecoration: "none", color: "inherit" }} data-harvy-tag="harvy.global.nav.brand.v1">
              <Box
                sx={{
                  width: 14,
                  height: 14,
                  bgcolor: "#F59E0B",
                  display: "inline-block"
                }}
              />
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 800,
                  letterSpacing: "-0.02em",
                  color: "#FAFAFA",
                  fontFamily: "'Space Grotesk', 'Inter', sans-serif"
                }}
              >
                HARVY // ONTOLOGY
              </Typography>
            </Stack>

            <Box component="nav" aria-label="Main navigation" sx={{ ml: "auto", display: { xs: "none", lg: "flex" }, gap: 0.5, alignItems: "center" }}>
              <Button color="inherit" href={productHref} sx={{ fontSize: "0.75rem" }}>[ 01 // PRODUCTS ]</Button>
              <Button color="inherit" href={workflowHref} sx={{ fontSize: "0.75rem" }}>[ 02 // PIPELINE ]</Button>
              <Button color="inherit" href={cliHref} sx={{ fontSize: "0.75rem" }}>[ 03 // CLI ]</Button>
              <Button color="inherit" href={playgroundHref} sx={{ fontSize: "0.75rem" }}>[ 04 // API ]</Button>
              <Button color="inherit" href={directoryHref} sx={{ fontSize: "0.75rem" }}>[ 05 // INDEX ]</Button>
              <Button color="inherit" href="/docs" sx={{ fontSize: "0.75rem" }}>[ SPECS ]</Button>
              <Button
                variant="contained"
                color="primary"
                href="/sign-in"
                sx={{ ml: 1, px: 2, fontSize: "0.75rem" }}
              >
                SIGN IN
              </Button>
            </Box>

            <Button
              size="small"
              variant="outlined"
              sx={{ display: { xs: "inline-flex", lg: "none" }, ml: "auto" }}
              aria-expanded={menuOpen}
              aria-controls="mobile-nav"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              [ MENU ]
            </Button>
          </Toolbar>

          {menuOpen && (
            <Box
              id="mobile-nav"
              component="nav"
              aria-label="Mobile navigation"
              sx={{
                display: { xs: "flex", lg: "none" },
                flexDirection: "column",
                pb: 2,
                gap: 1,
                borderTop: "1px solid #27272A",
                pt: 2
              }}
            >
              <Button href={productHref} onClick={() => setMenuOpen(false)}>[ 01 // PRODUCTS ]</Button>
              <Button href={workflowHref} onClick={() => setMenuOpen(false)}>[ 02 // PIPELINE ]</Button>
              <Button href={cliHref} onClick={() => setMenuOpen(false)}>[ 03 // CLI ]</Button>
              <Button href={playgroundHref} onClick={() => setMenuOpen(false)}>[ 04 // API PLAYGROUND ]</Button>
              <Button href={directoryHref} onClick={() => setMenuOpen(false)}>[ 05 // RAW INDEX ]</Button>
              <Button href="/docs" onClick={() => setMenuOpen(false)}>[ SPECS ]</Button>
              <Button href="/security" onClick={() => setMenuOpen(false)}>[ SECURITY ]</Button>
              <Button href="/contact" onClick={() => setMenuOpen(false)}>[ CONTACT ]</Button>
              <Button href="/sign-in" variant="contained" color="primary" onClick={() => setMenuOpen(false)}>SIGN IN</Button>
            </Box>
          )}
        </Container>
      </AppBar>

      <Box component="main" id="top" role="main">
        {/* Hero Section */}
        <Container maxWidth="lg" sx={{ pt: { xs: 6, md: 10 }, pb: { xs: 6, md: 8 } }}>
          <Box sx={{ mb: 3 }}>
            <Typography
              component="span"
              sx={{
                fontFamily: "'IBM Plex Mono', 'JetBrains Mono', monospace",
                fontSize: "0.8rem",
                color: "#F59E0B",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                border: "1px solid rgba(245, 158, 11, 0.4)",
                px: 1.5,
                py: 0.5,
                display: "inline-block"
              }}
            >
              {routeProduct
                ? `[ DESK // ${routeProduct.name.toUpperCase()} · DEV PREVIEW ]`
                : infoPage
                ? `[ SPEC // ${info?.title.toUpperCase()} · DEV PREVIEW ]`
                : "[ PLATFORM // INTELLIGENCE WITH EVIDENCE ]"}
            </Typography>
          </Box>

          <Typography
            component="h1"
            variant="h1"
            sx={{
              fontSize: { xs: "2.75rem", sm: "4.25rem", md: "5.5rem" },
              maxWidth: 960,
              fontWeight: 700,
              lineHeight: 1.02,
              letterSpacing: "-0.03em"
            }}
          >
            {routeProduct
              ? routeProduct.label
              : info?.title || "INTELLIGENCE YOU CAN TRACE TO ITS SOURCE."}
          </Typography>

          <Typography
            variant="body1"
            sx={{
              maxWidth: 720,
              mt: 3,
              color: "text.secondary",
              fontFamily: "'Inter', sans-serif",
              fontSize: { xs: "1rem", md: "1.2rem" },
              lineHeight: 1.6
            }}
          >
            {routeDescription ||
              info?.description ||
              "Harvy unifies automated collection, immutable source evidence, and multi-tenant semantic analytics into an industrial intelligence workspace."}
          </Typography>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mt: 5 }}>
            <Button
              variant="contained"
              href={routeProduct ? "/app" : infoPage === "contact" ? "/sign-in" : productHref}
              size="large"
              sx={{ px: 3, py: 1.5 }}
            >
              {routeProduct ? "[ LAUNCH DESK ]" : infoPage === "contact" ? "[ AUTHENTICATE ]" : "[ EXPLORE PRODUCTS ]"}
            </Button>
            <Button
              variant="outlined"
              href={workflowHref}
              size="large"
              sx={{ px: 3, py: 1.5 }}
            >
              {home ? "[ INSPECT PIPELINE ]" : "[ SYSTEM WORKFLOW ]"}
            </Button>
          </Stack>

          {/* Blueprint schematic bar */}
          <Box sx={{ mt: 8 }}>
            <Typography
              variant="caption"
              sx={{
                color: "#A1A1AA",
                display: "block",
                mb: 1.5,
                letterSpacing: "0.1em"
              }}
            >
              // ARCHITECTURE // DETERMINISTIC DATA PIPELINE
            </Typography>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(5, 1fr)" },
                border: "1px solid #27272A",
                bgcolor: "#000000"
              }}
            >
              {pipelineNodes.map((node, i) => (
                <Box
                  key={node.label}
                  sx={{
                    p: 2,
                    borderRight: { md: i < 4 ? "1px solid #27272A" : "none" },
                    borderBottom: { xs: i < 4 ? "1px solid #27272A" : "none", md: "none" }
                  }}
                >
                  <Typography
                    sx={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: "0.65rem",
                      color: "#71717A",
                      letterSpacing: "0.08em"
                    }}
                  >
                    0{i + 1} // STAGE
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: "0.85rem",
                      fontWeight: 700,
                      color: node.tone,
                      mt: 0.5
                    }}
                  >
                    {node.label}
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: "0.7rem",
                      color: "#A1A1AA",
                      mt: 0.5
                    }}
                  >
                    {node.sub}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>

          {/* Info page or Hero Evidence Inspection Panel */}
          {infoPage && (
            <TacticalPanel sx={{ mt: 8, p: 3 }}>
              <Typography
                variant="caption"
                sx={{ color: "#F59E0B", display: "block", mb: 1, letterSpacing: "0.1em" }}
              >
                // SYSTEM_STATUS // AUDIT & REVISION
              </Typography>
              <Typography variant="h5" sx={{ mb: 2 }}>{info.title}</Typography>
              <Typography color="text.secondary" sx={{ fontFamily: "'Inter', sans-serif" }}>
                {infoPage === "ontology"
                  ? "Events, source evidence, stories, briefs, dashboards, runs, and handoff actions use explicit organization/workspace scopes in the local migration and API."
                  : infoPage === "security"
                  ? "The local build has signed Automation callbacks and tenant-scoped query checks. Live authorization, R2 permissions, secret injection, and two-tenant deployment checks are still pending."
                  : infoPage === "docs"
                  ? "Canonical product, engineering, workflow, and UI documents are kept in the repository docs folder. A public documentation site has not been deployed."
                  : "This preview has no contact form or external demo booking integration."}
              </Typography>
            </TacticalPanel>
          )}

          {!infoPage && (
            <TacticalPanel sx={{ mt: 8 }} data-harvy-tag="harvy.global.hero.preview.v1">
              <Box
                sx={{
                  bgcolor: "#000000",
                  borderBottom: "1px solid #27272A",
                  px: 3,
                  py: 1.5,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 1
                }}
              >
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Box component="span" sx={{ width: 8, height: 8, bgcolor: "#F59E0B" }} />
                  <Typography
                    sx={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: "0.8rem",
                      fontWeight: 700,
                      color: "#FAFAFA",
                      letterSpacing: "0.05em"
                    }}
                  >
                    [ SCHEMA_EVIDENCE // {routeProduct?.name.toUpperCase() || "NEWSK"} ]
                  </Typography>
                </Stack>
                <Typography
                  sx={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: "0.75rem",
                    color: "#71717A",
                    letterSpacing: "0.05em"
                  }}
                >
                  PROVENANCE_TRACKING: ENFORCED
                </Typography>
              </Box>

              <Box sx={{ p: { xs: 3, md: 4 } }}>
                <Stack direction={{ xs: "column", md: "row" }} spacing={4}>
                  <Box sx={{ flex: 1 }}>
                    <Chip
                      size="small"
                      label="[ SIGNAL_STATE: EMERGING ]"
                      sx={{
                        bgcolor: "rgba(245, 158, 11, 0.1)",
                        color: "#F59E0B",
                        borderColor: "#F59E0B",
                        mb: 2
                      }}
                    />
                    <Typography variant="h5" sx={{ mb: 2 }}>
                      {routeProduct?.name === "Tower"
                        ? "A BUSINESS SIGNAL, WITH ITS EVIDENCE ATTACHED."
                        : routeProduct?.name === "Ops"
                        ? "A REVIEWED SIGNAL BECOMES AN OWNED ACTION."
                        : routeProduct?.name === "Civic"
                        ? "A CIVIC EVENT, TRACEABLE TO ITS PUBLIC RECORD."
                        : "A DEVELOPING STORY, WITH ITS EVIDENCE ATTACHED."}
                    </Typography>
                    <Typography color="text.secondary" sx={{ fontSize: "0.95rem" }}>
                      Source links, capture times, verified records, and coverage gaps remain linked through Ontoly before any decision brief is approved.
                    </Typography>
                  </Box>

                  <Box
                    sx={{
                      flex: 1,
                      borderLeft: { md: "1px solid #27272A" },
                      pl: { md: 4 }
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        color: "#A1A1AA",
                        display: "block",
                        mb: 2,
                        letterSpacing: "0.1em"
                      }}
                    >
                      // METADATA DESK
                    </Typography>
                    <Stack spacing={2}>
                      <Box>
                        <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.75rem", color: "#F59E0B" }}>
                          [ SOURCE PROVENANCE ]
                        </Typography>
                        <Typography color="text.secondary" sx={{ fontSize: "0.9rem" }}>
                          Approved workflow registry · verified proxy egress
                        </Typography>
                      </Box>
                      <Divider />
                      <Box>
                        <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.75rem", color: "#F59E0B" }}>
                          [ FRESHNESS & CLOCK ]
                        </Typography>
                        <Typography color="text.secondary" sx={{ fontSize: "0.9rem" }}>
                          Microsecond capture timestamp on every observation
                        </Typography>
                      </Box>
                      <Divider />
                      <Box>
                        <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.75rem", color: "#F59E0B" }}>
                          [ GAPS & COVERAGE ]
                        </Typography>
                        <Typography color="text.secondary" sx={{ fontSize: "0.9rem" }}>
                          Explicit missing inputs stay visible in data models
                        </Typography>
                      </Box>
                    </Stack>
                  </Box>
                </Stack>
              </Box>
            </TacticalPanel>
          )}
        </Container>

        {/* Product Grid Section */}
        {(home || routeProduct) && (
          <Box
            id="products"
            sx={{
              bgcolor: "#09090B",
              py: { xs: 8, md: 10 },
              borderTop: "1px solid #27272A",
              borderBottom: "1px solid #27272A"
            }}
          >
            <Container maxWidth="lg">
              <Typography
                variant="caption"
                sx={{ color: "#F59E0B", letterSpacing: "0.12em", display: "block" }}
              >
                // 01 // PRODUCT SUITE
              </Typography>
              <Typography
                component="h2"
                variant="h2"
                sx={{
                  fontSize: { xs: "2.2rem", md: "3.2rem" },
                  mt: 1,
                  mb: 5
                }}
              >
                ONE FOUNDATION. FOUR CONTEXTS.
              </Typography>

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" },
                  gap: 3
                }}
              >
                {products.map((product, idx) => {
                  const isActive = product.name === activeProduct;
                  return (
                    <TacticalPanel
                      key={product.name}
                      cornerColor={isActive ? "#F59E0B" : "#52525B"}
                      sx={{
                        borderColor: isActive ? "#F59E0B" : "#27272A",
                        transition: "border-color 0.15s ease",
                        "&:hover": {
                          borderColor: "#F59E0B"
                        }
                      }}
                      data-harvy-tag={"harvy.global.products." + product.name.toLowerCase() + ".v1"}
                    >
                      <CardActionArea
                        component="a"
                        href={`/product/${product.name.toLowerCase()}`}
                        sx={{ textAlign: "left", height: "100%", p: 3.5, borderRadius: 0 }}
                      >
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
                          <Box>
                            <Typography
                              sx={{
                                fontFamily: "'IBM Plex Mono', monospace",
                                fontSize: "0.75rem",
                                color: "#71717A",
                                letterSpacing: "0.08em"
                              }}
                            >
                              SEC_0{idx + 1} // {product.name.toUpperCase()}
                            </Typography>
                            <Typography variant="h4" sx={{ mt: 0.5, fontWeight: 700 }}>
                              {product.name}
                            </Typography>
                          </Box>
                          <Chip
                            label={`[ ${product.status.toUpperCase()} ]`}
                            size="small"
                            variant="outlined"
                            sx={{
                              borderColor: isActive ? "#F59E0B" : "#27272A",
                              color: isActive ? "#F59E0B" : "#A1A1AA"
                            }}
                          />
                        </Stack>

                        <Typography
                          sx={{
                            mt: 2.5,
                            fontWeight: 600,
                            fontFamily: "'Inter', sans-serif",
                            color: "#FAFAFA"
                          }}
                        >
                          {product.label}
                        </Typography>
                        <Typography
                          color="text.secondary"
                          sx={{ mt: 1, fontSize: "0.95rem", lineHeight: 1.5 }}
                        >
                          {product.description}
                        </Typography>

                        <Box sx={{ mt: 3, pt: 2, borderTop: "1px dashed #27272A" }}>
                          <Typography
                            sx={{
                              fontFamily: "'IBM Plex Mono', monospace",
                              fontSize: "0.75rem",
                              color: "#F59E0B",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 0.5
                            }}
                          >
                            [ ENTER {product.name.toUpperCase()} DESK ] →
                          </Typography>
                        </Box>
                      </CardActionArea>
                    </TacticalPanel>
                  );
                })}
              </Box>
            </Container>
          </Box>
        )}

        {/* Workflow Pipeline Section */}
        {(home || routeProduct) && (
          <Container id="workflow" maxWidth="lg" sx={{ py: { xs: 8, md: 10 } }}>
            <Typography
              variant="caption"
              sx={{ color: "#F59E0B", letterSpacing: "0.12em", display: "block" }}
            >
              // 02 // EXECUTION PROTOCOL
            </Typography>
            <Typography
              component="h2"
              variant="h2"
              sx={{
                fontSize: { xs: "2.2rem", md: "3.2rem" },
                mt: 1,
                mb: 5
              }}
            >
              FROM RAW SOURCE TO VERIFIED DECISION.
            </Typography>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" },
                gap: 3
              }}
            >
              {steps.map((step) => (
                <TacticalPanel key={step.index} sx={{ p: 3, height: "100%" }}>
                  <Typography
                    sx={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: "0.85rem",
                      fontWeight: 700,
                      color: "#F59E0B"
                    }}
                  >
                    [ {step.index} // {step.code} ]
                  </Typography>
                  <Typography variant="h5" sx={{ mt: 2, mb: 1, fontWeight: 700 }}>
                    {step.title}
                  </Typography>
                  <Typography color="text.secondary" sx={{ fontSize: "0.9rem", lineHeight: 1.6 }}>
                    {step.text}
                  </Typography>
                </TacticalPanel>
              ))}
            </Box>
          </Container>
        )}

        {/* CLI Simulator Section */}
        {(home || routeProduct) && (
          <Box
            id="cli"
            sx={{
              bgcolor: "#09090B",
              py: { xs: 8, md: 10 },
              borderTop: "1px solid #27272A"
            }}
          >
            <Container maxWidth="lg">
              <CliSimulator />
            </Container>
          </Box>
        )}

        {/* Live API Playground Section */}
        {(home || routeProduct) && (
          <Box
            id="playground"
            sx={{
              bgcolor: "#000000",
              py: { xs: 8, md: 10 },
              borderTop: "1px solid #27272A"
            }}
          >
            <Container maxWidth="lg">
              <ApiPlayground />
            </Container>
          </Box>
        )}

        {/* Brutalist Raw Link List Section */}
        {(home || routeProduct) && <BrutalistLinks />}

        {/* System Deployment Status Terminal Box */}
        {(home || routeProduct) && (
          <Box
            id="status"
            sx={{
              bgcolor: "#000000",
              color: "#FAFAFA",
              py: { xs: 8, md: 10 },
              borderTop: "1px solid #27272A",
              borderBottom: "1px solid #27272A"
            }}
          >
            <Container maxWidth="lg">
              <TacticalPanel sx={{ bgcolor: "#09090B", p: { xs: 3, md: 5 } }}>
                <Typography
                  variant="caption"
                  sx={{ color: "#10B981", display: "block", mb: 1, letterSpacing: "0.1em" }}
                >
                  // ENVIRONMENT // PRODUCTION READINESS
                </Typography>
                <Typography component="h2" variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
                  A WORKING CORE, NOT A LIVE SERVICE YET.
                </Typography>
                <Typography sx={{ maxWidth: 760, color: "#A1A1AA", mb: 4, lineHeight: 1.6 }}>
                  The local build includes auth integration, multi-tenant workspace scoping, and the Harvy newsroom desk. Live collection and customer access require verified source configurations, deployed Workers, and active Hyperdrive PostgreSQL connectivity.
                </Typography>

                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <Button href="/app" variant="contained" color="primary" sx={{ px: 3, py: 1.25 }}>
                    [ LAUNCH HARVY ]
                  </Button>
                  <Button href="/sign-in" variant="outlined" sx={{ px: 3, py: 1.25 }}>
                    [ SIGN IN WITH CREDENTIALS ]
                  </Button>
                </Stack>
              </TacticalPanel>
            </Container>
          </Box>
        )}
      </Box>

      {/* Terminal-style Footer */}
      <Box component="footer" sx={{ py: 6, bgcolor: "#09090B" }}>
        <Container maxWidth="lg">
          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", sm: "center" }}
            spacing={2}
          >
            <Box>
              <Typography
                sx={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: "0.8rem",
                  color: "#FAFAFA",
                  letterSpacing: "0.05em"
                }}
              >
                HARVY // SOURCE-GROUNDED INTELLIGENCE
              </Typography>
              <Typography
                sx={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: "0.75rem",
                  color: "#71717A",
                  mt: 0.5
                }}
              >
                AUTONOMOUS ONTOLOGY ENGINE · STRICT TENANT ISOLATION
              </Typography>
            </Box>
            <Stack direction="row" spacing={3}>
              <Button href="/security" color="inherit" sx={{ fontSize: "0.75rem", color: "#A1A1AA" }}>
                [ SECURITY ]
              </Button>
              <Button href="/docs" color="inherit" sx={{ fontSize: "0.75rem", color: "#A1A1AA" }}>
                [ SPECS ]
              </Button>
              <Button href="/contact" color="inherit" sx={{ fontSize: "0.75rem", color: "#A1A1AA" }}>
                [ CONTACT ]
              </Button>
            </Stack>
          </Stack>
        </Container>
      </Box>
    </Box>
  );
}
