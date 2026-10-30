# Documentation site hosting

The public documentation landing site is built from `v2/web/docs-site/` and emitted to `dist/docs` by:

```sh
npm run build:docs
```

The site is deployed as the Cloudflare Pages project `harvy-docs`. The current Pages deployment is available at `https://harvy-docs.pages.dev`.

## Custom domain

`docs.harvy.dev` is attached to the Pages project but remains pending until DNS is present. The required record is:

```text
Type: CNAME
Name: docs
Target: harvy-docs.pages.dev
Proxy: Proxied
```

After the record is created in the `harvy.dev` zone, verify both `https://docs.harvy.dev` and the Pages deployment URL. Do not report the custom domain as live while DNS or Pages validation is pending.

## Source boundary

The site intentionally migrates only the old repository's public landing page, banner, logo, and changelog generator. Retired application pages and generated bundles are not part of the new documentation deployment. Markdown engineering documentation remains canonical in `docs/` and is linked from the repository until a dedicated Markdown renderer is adopted.
