# Documentation site hosting

The developer documentation is authored in the repository `docs/` directory and built with Quartz 5. The build reads a curated set of those Markdown files directly; there is no second hand-edited content tree. `quartz.config.yaml` excludes operational plans, runbooks, workflow ledgers and private reporting guidance from the public output. A page additionally needs `publish: true` in its frontmatter. The docs build writes harmless replacement HTML at previously published operational paths because Pages may preserve removed assets for a week. Review the ignore list whenever adding or renaming a file under `docs/`; an unreviewed Markdown file must not receive `publish: true`.

```sh
npm run docs:build
```

The output is `dist/docs`, deployed as the Cloudflare Pages project `harvy-docs` at `https://docs.harvy.dev`. For local preview, run `npm run docs:dev`.

## Site features

The Quartz build provides full-text search, a document explorer, table of contents, syntax highlighting, dark mode, graph view, and backlinks. The landing page is `docs/index.md`; add reviewed developer-facing content to `docs/` and link it from that index when it belongs in the public documentation set.

## Custom domain

The Pages project uses this DNS record:

```text
Type: CNAME
Name: docs
Target: harvy-docs.pages.dev
Proxy: Proxied
```

Verify both `https://docs.harvy.dev` and the Pages deployment URL after deployment.

## Publishing rule

Do not publish a marketing landing page in place of the developer docs. Documentation must describe the codebase, API endpoints, standards, contracts, infrastructure, and evidence-backed implementation status. Distinguish implemented, partial, planned, blocked, and unverified work.
