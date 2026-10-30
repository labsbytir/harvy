import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

const RAW_LINKS = [
  { href: "/ontology", label: "/ontology", desc: "Shared canonical ontology & provenance schema" },
  { href: "/security", label: "/security", desc: "Multi-tenant isolation & cryptographic boundary" },
  { href: "/docs", label: "/docs", desc: "Repository specifications & architectural decisions" },
  { href: "#playground", label: "/api playground", desc: "Live HTTP client dispatch & response inspector" },
  { href: "#cli", label: "/cli (in development)", desc: "Unix terminal emulator & pipeline control preview" },
  { href: "/sign-in", label: "/sign-in", desc: "Better Auth credentials & organization session" },
  { href: "/app", label: "/app", desc: "Harvy operational intelligence workspace" }
] as const;

export function BrutalistLinks() {
  return (
    <Box
      id="directory"
      component="section"
      sx={{
        py: { xs: 8, md: 12 },
        bgcolor: "#09090B",
        borderTop: "1px solid #27272A",
        borderBottom: "1px solid #27272A"
      }}
    >
      <Container maxWidth="lg">
        <Typography
          sx={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: "0.85rem",
            fontWeight: 700,
            color: "#F59E0B",
            letterSpacing: "0.12em",
            mb: 1
          }}
        >
          // 05 // SYSTEM INDEX & DIRECTORY
        </Typography>
        <Typography
          variant="h2"
          sx={{
            fontSize: { xs: "2rem", md: "2.8rem" },
            mb: 6,
            fontWeight: 700
          }}
        >
          RAW HARVY INDEX. NO DECORATION.
        </Typography>

        <Stack spacing={3} sx={{ maxWidth: 840 }}>
          {RAW_LINKS.map((link, idx) => (
            <Box
              key={link.label}
              sx={{
                display: "flex",
                flexDirection: { xs: "column", sm: "row" },
                alignItems: { xs: "flex-start", sm: "baseline" },
                gap: { xs: 0.5, sm: 3 },
                borderBottom: "1px solid #1E1E22",
                pb: 2
              }}
            >
              <Typography
                component="span"
                sx={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: "0.8rem",
                  color: "#52525B",
                  minWidth: 48,
                  userSelect: "none"
                }}
              >
                0{idx + 1} //
              </Typography>

              <Box
                component="a"
                href={link.href}
                sx={{
                  fontFamily: "'IBM Plex Mono', 'JetBrains Mono', monospace",
                  fontSize: { xs: "1.25rem", sm: "1.5rem" },
                  fontWeight: 700,
                  color: "#FAFAFA",
                  textDecoration: "underline",
                  textUnderlineOffset: "6px",
                  textDecorationThickness: "2px",
                  transition: "color 0.1s ease, text-decoration-color 0.1s ease",
                  "&:hover": {
                    color: "#F59E0B",
                    textDecorationColor: "#F59E0B"
                  },
                  "&:focus-visible": {
                    outline: "2px solid #00F0FF",
                    outlineOffset: "4px"
                  }
                }}
              >
                {link.label}
              </Box>

              <Typography
                component="span"
                sx={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "0.85rem",
                  color: "#71717A",
                  ml: { sm: "auto" }
                }}
              >
                {link.desc}
              </Typography>
            </Box>
          ))}
        </Stack>
      </Container>
    </Box>
  );
}
