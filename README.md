# timrobles.xyz

Single-page personal site, served as static assets via Cloudflare Pages.
No build step.

## Files

- `index.html` — markup, inlined CSS, inlined font @font-face, JSON-LD,
  and preload/modulepreload hints. CSS edits happen inside `<style>`.
- `script.js` — WebGL torus (three.js loaded from esm.sh CDN).
- `jbm.woff2` / `jbm-italic.woff2` — self-hosted JetBrains Mono
  (Latin subset, variable weight). Eliminates the Google Fonts round-trip.
- `favicon.svg` — wireframe torus, accent-colored.
- `_headers` — Cloudflare Pages cache + security headers.
- `robots.txt` — explicit allow.

## Editing

### Swap copy

All visible text lives in `index.html` inside `<main>`:
- Name and tagline → `<header>`.
- Each `<section>` is one block (Currently / Projects / Find me).

The `<meta name="description">` / `og:*` / `twitter:*` tags and the
JSON-LD `<script type="application/ld+json">` block in `<head>` should
be updated if the copy or roles change substantively.

### Change the accent color

Edit the `--accent` CSS variable at the top of the inline `<style>` in
`index.html`. This single value drives both the WebGL torus (read from JS
at runtime) and the SVG fallback.

```css
:root {
  --accent: #7c7cf0;  /* change this one line */
}
```

### Swap the geometric form

In `script.js`, look for the block labelled `── Geometric form ──`.
Replace the `THREE.TorusGeometry(...)` line with any other three.js
primitive — `IcosahedronGeometry`, `BoxGeometry`, `OctahedronGeometry`,
etc. The wireframe/material/positioning code below it doesn't need to
change.

## Performance notes

Optimizations applied:
- CSS and @font-face declarations inlined in `<head>` — no
  render-blocking external stylesheet
- Fonts self-hosted with `rel="preload"` hints
- `rel="modulepreload"` for `script.js` so it fetches in parallel with
  HTML parse
- three.js still loaded from esm.sh (cached aggressively by their edge,
  often warm-cached for visitors who hit other three.js sites)
- `_headers` sets immutable 1-year cache on woff2 fonts, short cache on
  HTML so updates propagate quickly

Page weight after first paint: HTML ~7KB + 2 fonts ~64KB + script.js ~5KB
(+ three.js ~170KB gzipped). All except three.js comes from the origin
on the same connection.

## Deployment — getting this live on timrobles.xyz

Prerequisites:
- timrobles.xyz is registered with Cloudflare Registrar.
- Cloudflare account has DNS for timrobles.xyz active.

Steps:

1. Sign in to dash.cloudflare.com.

2. In the left sidebar: Workers & Pages → Create → Pages →
   "Upload assets". (Not "Connect to Git" — we're doing direct upload.)

3. Project name: "timrobles-home" (or similar). This becomes the
   default subdomain: timrobles-home.pages.dev.

4. Drag the folder containing index.html, script.js, the woff2 fonts,
   favicon.svg, _headers, and robots.txt into the upload area.
   Click "Deploy site".

5. Wait ~30 seconds for the deploy to finish. Verify the site looks
   right at the .pages.dev URL Cloudflare gives you.

6. In the project view, click "Custom domains" tab → "Set up a custom
   domain" → enter "timrobles.xyz" → confirm.

7. Cloudflare auto-creates the necessary DNS records since the registrar
   and Pages live in the same account. Wait 1-2 minutes for SSL to
   provision (status will go from "Initializing" to "Active").

8. Repeat step 6-7 for "www.timrobles.xyz" so both apex and www work.
   Optionally, add a Page Rule or Bulk Redirect to send www → apex
   (or vice versa) for consistency.

9. Visit https://timrobles.xyz in an incognito window to confirm
   everything works end-to-end with valid SSL.

To update later:
- Edit the files locally, then in the Pages project click "Create new
  deployment" → "Upload assets" → drag the updated folder.
- Or, switch to Git-connected later for auto-deploy on push.

If anything breaks:
- Check the Custom Domains tab for SSL status.
- Check that DNS records (A or CNAME) in the DNS dashboard point at
  the Pages project — they should be auto-created and orange-clouded.
- Hard-refresh (Cmd+Shift+R) to bypass Cloudflare's edge cache.
