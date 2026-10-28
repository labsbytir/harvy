import { useState } from "react";
import { MODES, type HarvyProduct } from "./modes";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeProduct, setActiveProduct] = useState<HarvyProduct>("Newsk");
  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <AppBar position="static" elevation={0} color="transparent" sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Container maxWidth="lg">
          <Toolbar disableGutters sx={{ gap: 2, minHeight: 72 }}>
            <Typography component="a" href="#top" variant="h5" color="text.primary" sx={{ textDecoration: "none", fontWeight: 800, letterSpacing: "-0.04em" }} data-harvy-tag="harvy.global.nav.brand.v1">Harvy</Typography>
            <Box component="nav" aria-label="Main navigation" sx={{ ml: "auto", display: { xs: "none", md: "flex" }, gap: 2 }}>
              <Button color="inherit" href="#products">Products</Button>
              <Button color="inherit" href="#workflow">How it works</Button>
              <Button color="inherit" href="#status">Build status</Button>
            </Box>
            <Button size="small" variant="outlined" sx={{ display: { xs: "inline-flex", md: "none" }, ml: "auto" }} aria-expanded={menuOpen} aria-controls="mobile-nav" onClick={() => setMenuOpen(!menuOpen)}>Menu</Button>
          </Toolbar>
          {menuOpen && <Box id="mobile-nav" component="nav" aria-label="Mobile navigation" sx={{ display: { xs: "flex", md: "none" }, flexDirection: "column", pb: 2 }}>
            <Button href="#products" onClick={() => setMenuOpen(false)}>Products</Button>
            <Button href="#workflow" onClick={() => setMenuOpen(false)}>How it works</Button>
            <Button href="#status" onClick={() => setMenuOpen(false)}>Build status</Button>
          </Box>}
        </Container>
      </AppBar>

      <Box component="main" id="top" role="main">
        <Container maxWidth="lg" sx={{ pt: { xs: 8, md: 12 }, pb: 10 }}>
          <Chip label="Harvy foundation · development preview" color="primary" variant="outlined" sx={{ mb: 3 }} />
          <Typography component="h1" variant="h1" sx={{ fontSize: { xs: "3rem", sm: "4.5rem", md: "6rem" }, maxWidth: 900 }}>
            Intelligence you can trace to its source.
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 680, mt: 3, fontWeight: 400, lineHeight: 1.5 }}>
            Harvy brings monitoring, connected records, analysis, and action into one evidence-first workspace.
          </Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mt: 4, alignItems: { xs: "stretch", sm: "center" } }}>
            <Button variant="contained" href="#products" size="large">Explore the products</Button>
            <Button variant="outlined" href="#workflow" size="large">See the workflow</Button>
          </Stack>

          <Card sx={{ mt: { xs: 7, md: 10 }, overflow: "hidden" }} data-harvy-tag="harvy.global.hero.preview.v1">
            <Box sx={{ bgcolor: "#17212B", color: "#FFFFFF", px: 3, py: 1.5, display: "flex", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
              <Typography variant="subtitle2">Newsk · evidence preview</Typography>
              <Typography variant="caption">Illustrative fixture · no live collection</Typography>
            </Box>
            <CardContent sx={{ p: { xs: 3, md: 4 } }}>
              <Stack direction={{ xs: "column", md: "row" }} spacing={4}>
                <Box sx={{ flex: 1 }}>
                  <Chip size="small" label="Emerging event" color="warning" variant="outlined" />
                  <Typography variant="h5" sx={{ mt: 2 }}>A developing story, with its evidence attached.</Typography>
                  <Typography color="text.secondary" sx={{ mt: 2 }}>A future editor view will show the source, capture time, related records, and coverage gaps before a brief is shared.</Typography>
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
          </Card>
        </Container>

        <Box id="products" sx={{ bgcolor: "background.paper", py: { xs: 8, md: 10 }, borderTop: 1, borderBottom: 1, borderColor: "divider" }}>
          <Container maxWidth="lg">
            <Typography variant="overline" color="primary">One foundation, four contexts</Typography>
            <Typography component="h2" variant="h2" sx={{ fontSize: { xs: "2.3rem", md: "3.5rem" }, mt: 1, mb: 4 }}>Work from the same evidence.</Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" }, gap: 2 }}>
              {products.map((product) => <Card key={product.name} data-harvy-tag={"harvy.global.products." + product.name.toLowerCase() + ".v1"}
                sx={product.name === activeProduct ? { borderColor: "primary.main", borderWidth: 2 } : undefined}
                onClick={() => setActiveProduct(product.name as HarvyProduct)}>
                <CardContent sx={{ p: 3 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="start" gap={1}>
                    <Typography variant="h5">{product.name}</Typography>
                    <Chip label={product.status} size="small" variant="outlined" />
                  </Stack>
                  <Typography fontWeight={700} sx={{ mt: 2 }}>{product.label}</Typography>
                  <Typography color="text.secondary" sx={{ mt: 1 }}>{product.description}</Typography>
                </CardContent>
              </Card>)}
            </Box>
          </Container>
        </Box>

        <Container id="workflow" maxWidth="lg" sx={{ py: { xs: 8, md: 10 } }}>
          <Typography variant="overline" color="primary">How it works</Typography>
          <Typography component="h2" variant="h2" sx={{ fontSize: { xs: "2.3rem", md: "3.5rem" }, mt: 1, mb: 4 }}>From source to decision.</Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" }, gap: 3 }}>
            {steps.map((step) => <Box key={step.number}>
              <Typography color="primary" fontWeight={800}>{step.number}</Typography>
              <Typography variant="h5" sx={{ mt: 1 }}>{step.title}</Typography>
              <Typography color="text.secondary" sx={{ mt: 1 }}>{step.text}</Typography>
            </Box>)}
          </Box>
        </Container>

        <Box id="status" sx={{ bgcolor: "#17212B", color: "#FFFFFF", py: { xs: 7, md: 8 } }}>
          <Container maxWidth="lg">
            <Typography component="h2" variant="h4" fontWeight={800}>The foundation is being built.</Typography>
            <Typography sx={{ mt: 2, maxWidth: 720, color: "#D9E4E2" }}>This preview shows the design direction. Authentication, live connectors, HQL queries, and saved dashboards require implementation and verification before customer use.</Typography>
          </Container>
        </Box>
      </Box>
      <Box component="footer" sx={{ py: 4 }}>
        <Container maxWidth="lg"><Typography variant="body2" color="text.secondary">Harvy · source-grounded intelligence</Typography></Container>
      </Box>
    </Box>
  );
}
