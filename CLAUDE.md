# Artefact — landing page for a pottery school

Static site: `index.html` + `style.css` + `script.js`, no build step, no
package manager. GSAP + ScrollTrigger + Lenis, loaded from CDN. Designed in
Figma; the owner supplies node links on request.

## Running it

```bash
node _serve.cjs
```

Serves on `http://localhost:8000`. Use it rather than opening `index.html`
over `file://` — the fonts, the video and the canvas-generated textures all
need a real origin. `_serve.cjs` implements HTTP Range (206) so video seeking
works. `.claude/launch.json` wires the same server into the Claude Code
preview pane.

## Read this before working

Which doc to read depends on what you're being asked to do — she now works
one block per chat, and wants a **new block** started without reading the
full accumulated history of the ones already built.

- **Starting a brand-new block (8-14, no layout yet)?** Read
  **`docs/context/BLOCK_STARTER_KIT.md`** only. It's a self-contained
  design-system reference — structure, colors, fonts, grid, every reusable
  motion recipe with exact values — built specifically so a fresh chat
  doesn't need the rest of `docs/context/` or a full read of `style.css`/
  `script.js`. Build your block as a self-contained, appendable addition
  (see that file's "Working model" section); she merges blocks herself
  afterward.
- **Continuing, fixing, or reviewing one of the 7 already-built blocks?**
  Read `docs/context/project_artefact_status.md` first (what's built,
  pending work, critical gotchas), then `docs/context/project_artefact_pending_fixes.md`
  (most recent incident log), then `docs/context/README.md` (index of the
  rest). The `ref_*.md` files record how reference-site effects actually
  work, read from their real source; the `feedback_*.md` files record how
  the owner wants to be worked with. Both were expensive to produce —
  consult them before re-deriving anything they cover.

## Hard rules

These have each cost real time at least once.

- **Never apply a GSAP transform to `.hero` itself**, or to any ancestor of
  `.hero__bg`, not even an identity one. It creates a stacking context and
  silently breaks the preloader→curtain hand-off. Target `.hero`'s children
  individually. Full explanation in `project_artefact_status.md`.
- **Never use ScrollTrigger's `snap`.** It animates native scroll position and
  fights Lenis; the stutter then shows up on every scrubbed tween on the page,
  not just the one you added.
- **No blur effects, anywhere.** The glass cursor uses a real SVG refraction
  filter, not a blur.
- **"N пикселей" means literal CSS px**, not `--u`, unless stated otherwise.
- Entrance tweens must animate to the CSS value, not blindly to `opacity: 1` —
  several elements have designed sub-1 opacity that a lazy `to(1)` destroys.
  `clearProps` afterwards.

## Layout system

`--u` is the fluid unit, scaled from a 1920px reference and set from JS by
`calibrateFluidUnit()` + a `ResizeObserver` — it uses
`documentElement.clientWidth`, because `100vw` includes the scrollbar and put
every section ~35px off. Almost all geometry is `calc(var(--u) * N)`, where N
is the raw Figma pixel value. The only breakpoint (`max-width: 768px`) is
still scoped to the menu overlay.

Sections, in order, matching the Figma frame names: `.hero`, `.craft`
(2_мистецтво), `.clay` (3_мова глини), `.material` (4_глина це), `.gallery`
(5_галерея робіт), `.philosophy` (6_філософія), `.steps` (7_кроки). Blocks
8+ are not built — see `docs/context/BLOCK_STARTER_KIT.md` before starting one.

## Verifying visual fixes

`devicePixelRatio` is **1.5** on the owner's machine — fractional, which is
what produces sub-pixel seams and hairlines. When checking one, resize the
preview pane to **800x450** first so screenshots come back 1:1; at any larger
viewport they are downscaled and 1px lines vanish. `getBoundingClientRect` is
the wrong instrument for a hairline — it measures geometry, and these bugs are
almost always colour. See the verification notes in
`project_artefact_pending_fixes.md`.

The preview tab is often backgrounded (`document.hidden === true`), which
stalls `requestAnimationFrame`: GSAP `.to()` tweens then never progress while
`gsap.set()` still works. Don't read a frozen mid-tween as a real bug without
checking `document.hidden` first.

## Assets

- `Font/` — Helvetica Neue, 16 weights, referenced by `@font-face` in
  `style.css`. `HelveticaNeueRoman.otf` at weight 400 is the correct
  "Regular"; don't swap it.
- `img/` — all photography, SVG logos/icons, and `clay-bg.mp4` (block 3's
  background video) live here together.
- Figma mockup exports are deliberately **not** in the repo; the owner shares
  node links when a comparison is needed.
