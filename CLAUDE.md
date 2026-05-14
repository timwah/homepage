# CLAUDE.md

Personal site for Tim Robles. Single-page, no build step, deployed to
Cloudflare Pages at https://timrobles.xyz.

Built end-to-end with Claude Code. This file documents conventions
that aren't obvious from the code.

## Project shape

- `index.html` — markup + inlined CSS + inlined `@font-face` + JSON-LD
  + preload/modulepreload hints. All visual styles and metadata live
  in `<head>`.
- `script.js` — raw WebGL wireframe torus. No library — procedural
  geometry, hand-written GLSL shaders, manual 4×4 matrix math.
  Mouse-driven positional parallax + very slow ambient rotation.
- `sw.js` — service worker. Stale-while-revalidate cache strategy +
  auto-reload on update. `__VERSION__` is replaced by `deploy.sh`
  with the git short hash, so every deploy invalidates the cache.
- `jbm.woff2` / `jbm-italic.woff2` — self-hosted JetBrains Mono
  (Latin subset, variable weight 400–500).
- `favicon.svg` — wireframe torus echoing the WebGL form.
- `_headers` — Cloudflare Pages cache + security headers (immutable
  1-year cache on fonts, short cache on HTML).
- `robots.txt` — explicit allow.
- `deploy.sh` — wrangler-based explicit deploy.

## Don't break these

- **CSS stays inlined in `index.html`.** No external stylesheet —
  inlining eliminates a render-blocking round trip. Edit inside the
  `<style>` block in `<head>`.
- **No 3D library — raw WebGL only.** We use ~5% of three.js, so
  hand-rolled the whole thing (~150 lines, ~9 KB). Don't reach for
  three.js / OGL / similar without a strong reason. If you add a new
  geometry, write a procedural generator alongside `makeTorusWireframe`.
- **Service worker uses `__VERSION__` placeholder, NOT a hard-coded
  version.** `deploy.sh` injects the git short hash at deploy time
  into a temp build dir, so cache invalidation is automatic per deploy.
  Don't manually edit `VERSION` in `sw.js`. SW registration is skipped
  on `localhost` / `127.0.0.1` so dev edits never get masked by SW
  cache — only production has SW caching.
- **Don't auto-deploy on git push.** Tim runs `./deploy.sh` manually
  when he wants changes live. Git is decoupled from deploys
  intentionally so incremental commits don't ship.
- **`--accent` CSS variable is the single source of truth for color.**
  It drives both the WebGL torus (read at runtime in script.js) and
  the SVG fallback. Don't hard-code accent hex values anywhere else.
- **Page weight budget: ~250 KB** (HTML ~7KB + fonts ~64KB + script
  ~5KB + three.js ~170KB gzipped). Keep additions light.
- **Apex is canonical.** `www.timrobles.xyz` 301-redirects to
  `timrobles.xyz` via a Cloudflare Redirect Rule. `<link rel="canonical">`
  in `index.html` agrees. Don't add www as a Pages custom domain.

## Workflow

Local preview:

```bash
python3 -m http.server 8765
```

Open http://localhost:8765 — DeviceOrientation needs HTTPS in the wild
but localhost is exempt.

Deploy to production:

```bash
./deploy.sh
```

One-time setup: `npm install -g wrangler && wrangler login`. Pages
project name is `timrobles-home` on Cloudflare account
`timrobles@gmail.com`.

## Visual + interaction conventions

- Mono body (JetBrains Mono); h1 same font at weight 500, tighter
  tracking (-0.04em).
- Italics for roles and descriptors ("Senior Director of Engineering,
  Data"). Bold (weight 500) for company/project names.
- Section labels: 12px uppercase, 0.08em tracking, 50% opacity.
- Content card: translucent (rgba(10,10,10,0.06)) with subtle blur,
  faint hairline border.
- Torus is anchored upper-left, scaled to feel abstract (extends past
  the viewport edges).
- Mouse parallax = position offset, NOT rotation. Max ±0.07 world units
  on desktop. Mobile has no input handlers (touch-drag was removed
  because it conflicted with scroll).
- Slow ambient drift always runs: linear rotation (~7 min/rev) + small
  sine wobble for organic easing.

## Original design constraints (from spec)

- Single column, max-width 640px, left-aligned (NOT centered).
- Dark only. No light mode toggle.
- No icons, emoji, decorative dividers, or "available for work" copy.
- No analytics scripts, no cookie banner.
- `prefers-reduced-motion` respected — renders a single static frame.
- Page is fully readable without JS (text is the primary content; the
  WebGL torus is purely decorative).
- WCAG AA contrast.
