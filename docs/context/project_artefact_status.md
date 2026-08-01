---
name: project-artefact-status
description: "Current build status of the Artefact landing page — what's done, established motion/code patterns to reuse, critical gotchas, and what's still pending. Read this FIRST in any new session on this project."
metadata: 
  node_type: memory
  type: project
  originSessionId: a18d892f-efdb-4bc1-a09f-fefca0a5b6e4
  modified: 2026-07-31T14:43:34.939Z
---

Snapshot as of 2026-07-29, end of a long multi-day session. Read this before starting new work so established patterns get reused and known landmines get avoided.

> Blocks 5 and 6 (gallery + philosophy) are now **fully done** — layout, motion, and both gallery hairlines fixed and confirmed by her on 2026-07-31. Full history and the reusable lessons from that bug are in [[project-artefact-pending-fixes]]. **She now works one block per new chat.**

> **Blocks 7 (steps) and 8 (free lesson) are now both fully done and confirmed by her**, 2026-07-31. Block 8's entrance was iterated twice after first landing: the gallery-pin entrance-timing bug (see "Blocks not yet built at all" below for the full fix) and then a second round where two of its beats (photo + body text) fired at the exact same instant, read as "too fast to see," fixed by chaining all 5 beats sequentially with small `'-='` overlaps instead of fixed absolute time offsets — same recipe philosophy/steps already used. **The next new chat's job is block 9** ("9_історії учнів" per the Figma frame names), which has no layout at all yet.

> **Gallery carousel is now PINNED** (`start:'bottom bottom'`, `end:'+=...'`, `scrub:1`) with a hand-rolled Lenis settle, not the unpinned `bottom center` scrub described further down. **Never use ScrollTrigger's `snap` on this site** — it animates the native scroll position and fights Lenis; the stutter shows up on every scrubbed tween on the page. Details in [[project-artefact-pending-fixes]].

## What's built
- **Hero section**: fully done — entrance choreography (preloader → curtain → header → eyebrow → H1 → vase/table → description → CTA → scroll arrow), pixel-matched to Figma. Also now has a scroll-OUT effect (see "Hero scroll-fade" pattern below).
- **Dropdown menu overlay**: fully done and working — curtain-reveal (top-down), staggered content, desktop/tablet + mobile variants, close-icon hover-morph (working, see [[project-artefact-close-icon-bug]]), social-link hover now uses the project's signature easing curve.
- **Craft section (block 2, Figma node 978:1223, "2_мистецтво")**: fully built, pixel-perfect + full effects pass done and iteratively tuned (see patterns below). This was the main focus of the second half of this session.

### Added 2026-07-30 (second long session)
- **Block 3 "3_мова глини" (`.clay`, node 978:1237)** — done, layout + motion. Background `<video>` with its own `yPercent ±50` scrub parallax and a separate `start:'top bottom'` fade-in (it must not wait for `top 40%`, that leaves 60% of a viewport of bare beige). Glass play/pause button + the custom cursor morphing into a "стоп"/"грати" glass bubble inside the centre zone (`.js-cursor-media` + `data-cursor-label`).
- **Block 4 "4_глина це" (`.material`)** — motion approved and frozen, see [[project-artefact-block4-motion]]. Full viewport height (her explicit exception), background `#DDD8C8`.
- **Block 5 "5_галерея робіт" (`.gallery`)** — pixel-perfect layout only. The carousel is NOT built: `.gallery__arrow` is wired to nothing, and `initGalleryFilter()` only toggles the visual active state — no real card filtering. Awaiting her spec (paging vs drag vs autoplay).
- **Block 6 "6_філософія" (`.philosophy`)** — pixel-perfect layout only, no motion pass yet.
- **Site-wide scroll-lag system** — content lags behind background at half speed, copied verbatim from rejouice.com's source, see [[ref-rejouice-half-speed-parallax]]. Applied to `.hero`, `.craft`, `.clay`, `.material` via `applySectionLag()`. **`.gallery` and `.philosophy` are deliberately excluded** — she reads those two as one continuous surface.
- **`--u` calibration fix** — `--u` is now set from JS (`calibrateFluidUnit()` + `ResizeObserver`) using `documentElement.clientWidth`, because `100vw` includes the scrollbar and every section was systematically ~35px off. Top spacing unified at 150u across blocks 2/5/6.
- **`_serve.cjs`** — local dev server; mp4 mime + HTTP Range (206) support added so video seeking works.

### Added 2026-07-31 (glass cursor session)
- **Glass cursor DONE** — `.cursor__media` now reproduces Figma's Glass (node 978:1272) via a real SVG refraction filter in `backdrop-filter`, not a blur. Rolled out to all 6 gallery works (`.gallery__photo` is now a `<button>` with `.js-cursor-media` + `data-cursor-label="далі"`), plus the existing block-3 video toggle. See [[ref-figma-glass-refraction]] for the maths and the calibration constants.
- **Gallery is now 6 cards** — the 6th is a placeholder reusing `gallery-2.jpg`; she is supplying the real export. Swap `src`, `alt` and both aria-labels.
- **Block 6 images got the craft treatment, NOT the cursor** — her call: philosophy images aren't clickable, so they get hover-scale 1.05 + scroll-drift instead of a bubble promising a destination. `initCraftImageHover/Parallax` were generalised into `initMediaImageHover/Parallax` + `mediaImageGroups()` with a per-group `drift`; craft stays -15, philosophy is -7 against a 125%/-12.5% oversize.
- **Blocks 5 and 6 motion DONE** — every beat reuses an existing recipe by her explicit mapping: eyebrows = `.hero__eyebrow` word stagger; headings = `.craft__heading-line`; body copy + filter items + hover captions = `.craft__body`; `.gallery__note` = `.craft__side-text` word stagger; block 6 images = the craft image beat (y120 / 1.4s / power4.out). Captions ("створено на N тижні") are hover-only now.
- **Gallery carousel DONE — variant A, scroll-scrubbed** (`initGalleryCarousel`): track drifts +409u -> -409u over the section, mockup framing at the midpoint. `.gallery__note` was lifted OUT of `.gallery__track` and absolutely placed with a beige `::before` panel, because she wants it to stay put on screen while cards pass behind it (she confirmed the panel is in the mockup). Its `end` is `'bottom center'`, not the site's usual `'bottom top'` — the gallery is second-to-last and with no footer yet the page runs out of scroll before `bottom top` is reachable. **Revisit that once a footer exists.**
- **Olive grain added** (`initOliveGrain`) — canvas tile, gaussian, mid-grey, `mix-blend-mode: overlay` on `.philosophy::before`. Amplitude was measured off Figma's render (sd ~3.4/channel on the bare olive), not guessed; ours lands at 3.63. Background only, not over the photos. See [[ref-figma-glass-refraction]] for the same measure-the-mockup approach.
- **Next up: the lightbox.** Each gallery work opens its main shot plus 2-3 other angles of the same piece. The `<button>`s exist with no click handler yet. She'll supply the extra angle photos; stub or repeat the main shot until then.
- **Watch for this class of bug:** entrance tweens that end at `opacity: 1` silently destroy any designed sub-1 opacity in the CSS (`.gallery__lead` is 0.8, `.gallery__filter-item.is-active` is 0.6). Animate to the CSS value and `clearProps` afterwards. Also give paired hover tweens `overwrite: 'auto'` — without it a fast in/out leaves the longer (enter) tween finishing last and stranding the element revealed.

## CRITICAL gotcha — full-bleed sections can show a hairline at their shared edge
Two adjacent full-height sections (e.g. `.gallery`/`.philosophy`) can show a
faint line exactly on their shared boundary even when their computed rects
overlap in exact math, IF `body`/`html` have a transparent background. At
fractional `devicePixelRatio` (she runs **1.5**) each edge rounds to a device
pixel independently, and the two roundings can land a physical pixel apart,
letting the page's default white flash through the transparent body for that
one row of pixels. Fix by forcing a real overlap larger than any rounding
error — e.g. `margin: -2px 0 0` on the lower section — not by trying to make
the edges land exactly flush (that's fighting sub-pixel arithmetic you don't
control) and not by assuming it's a colour/texture mismatch (a hairline that's
pale/white rather than a duller shade of the section colour is this bug, not
a grain/texture one). Full incident write-up in
[[project-artefact-pending-fixes]] — worth reading in full before any new
block's boundary shows a similar line, since blocks 7-14 are all going to be
edge-to-edge the same way.

**Verifying any hairline**: resize the preview to **800x450** before
screenshotting — larger viewports get downscaled and 1px lines disappear
before you ever see them. `getBoundingClientRect` alone can mislead (identical
or near-identical numbers can still hide a real gap depending on how each
independently rounds) — also check `body`/`html` background-color.

## CRITICAL gotcha — read before touching Hero's scroll/parallax behavior again
**Never apply a GSAP transform directly to `.hero` itself** (or any ancestor of `.hero__bg`) — not even a scrub-driven one that's identity at rest. Any transform on `.hero` makes it establish a new CSS stacking context for its descendants, which silently breaks the preloader→curtain mechanic (`.hero__bg` gets a temporary `z-index: 10000` boost to outrank the preloader's `z-index: 9999`, which lives as a body-level sibling outside `.hero` — that comparison stops working across a new stacking-context boundary). This has now bitten this project twice. **Correct pattern, confirmed working:** for the Hero's scroll-out fade/fly-away effect, target `.hero`'s individual children directly (e.g. `.hero > *:not(.hero__bg):not(.hero__vase-scene)`), never `.hero` itself — and still only initialize any such ScrollTrigger from inside `runHeroEntrance()`'s final `.call()`, after the preloader/curtain sequence has completed, not eagerly at script load.

## CRITICAL gotcha — mutating a ScrollTrigger's `.start` after creation does not reliably work
When one ScrollTrigger's position must depend on another (pinned) trigger's resolved geometry — e.g. blocks 6/7's entrance triggers needing to fire only after the gallery's pinned carousel (`galleryPinTrigger`, a long `invalidateOnRefresh` pin, 2200u of scroll) releases — **do not** create the trigger with a static `start: 'top 80%'` and then correct `self.start = floor` later, whether from that trigger's own `onRefresh` callback or from a global `ScrollTrigger.addEventListener('refresh', …)` pass. Both were tried here and both looked fixed in a static post-load check (`ScrollTrigger.getAll().map(st => st.start)` read clean, correctly-staggered numbers) but **still fired at the original, too-early position live** — confirmed by instrumenting `st.isActive` transitions during an actual simulated scroll, which showed block 6 revealing at ~25–60% into the gallery's pinned scroll both times, not after it. Mutating the public `.start` property after the trigger already exists does not reliably rewire GSAP's internal firing check in this setup, even though the property reads back correctly afterwards — a real trap, since the "obviously correct" verification (read `.start` once things settle) passes anyway. **Working fix:** give the trigger a `start` **function** at creation time (GSAP's documented pattern for exactly this dependency) — `start: () => galleryPinTrigger.end + 60 + offsetU * u()` — so ScrollTrigger recomputes it fresh on every refresh instead of reusing a value fixed at creation or patched after the fact. See `galleryFloorStart()` in `script.js`, used by all four of blocks 6/7's entrance triggers. **Any future block whose entrance timing depends on another pinned/scrubbed element upstream should use this same function-start pattern from the start, and should be verified by simulating real scroll and watching `isActive`, not just reading `.start`/`.end` after the page settles.**

## Established patterns — reuse these, don't reinvent
- **Curtain reveal**: `clip-path: inset(...)`. Hero bottom-up (merged with preloader per the gotcha above); menu overlay top-down, `power3.out`, 1.2s.
- **Word-reveal stagger**: `splitWords()`/`splitChars()`. `opacity 0→1`, `sine.out`, ~0.08 stagger. Hero eyebrow/description, craft side-text.
- **Fade+rise stagger** (menu-contact style): `opacity 0→1, y:12→0, sine.out`. Menu contact info, craft body paragraph.
- **`.italic-symbol` hover pattern**: italic "(" + 10px literal-px gap (em-based shift on the label itself when the label also moves — see social-link hover below).
- **Line-hover sweep** (`js-line-hover` + `heroLineSweep` keyframe): nav links, Hero CTA, menu trigger underline. 1px thickness project-wide. Signature easing curve for ALL hover transitions project-wide: `cubic-bezier(0.16, 1, 0.3, 1)` — use this instead of generic `ease` whenever adding a new hover transition (this was retrofitted onto the menu's social-link hover this session specifically because it was using plain `ease` and felt off next to everything else).
- **CTA plus-icon swap** (`-plus-track` + `-plus-char--out/--in`): Hero CTA and craft's "free вебинар" both use this. Keep the swap separate from whatever underline treatment that button has (static border vs. line-sweep are independent per-button choices).
- **Custom cursor, section-themed color**: `data-cursor-theme="dark"`/`"light"` on themed sections, `body.cursor-on-light` toggled in `initCustomCursor()`'s mousemove via `closest('[data-cursor-theme]')`. Add this attribute to any new section.
- **Scroll-triggered section entrance**: `ScrollTrigger`, trigger-once, NOT scrubbed, mirrors Hero's own beat order (heading/message → visuals → supporting content → CTA last). **Keep total sequence duration short (~2-3s)** — this bit the craft section: an initial ~6s sequence meant the CTA (last in line) hadn't appeared by the time a normal-speed scroll reached the bottom of the section. Tuned down, then per her request slowed back down slightly for smoothness — there's a real tension between "smooth/slow" and "finishes before scroll-past" for any future scroll-triggered section; ask which she prioritizes if it's not obvious.
- **Image hover + scroll-parallax** (craft images, final version): NO cursor-tracking — that was tried first and was wrong (see "research lesson" below). Final: plain hover scale (`gsap.to(imgs, {scale:1.05, duration:0.7})` on mouseenter/mouseleave, no mousemove at all) + a SEPARATE scroll-scrubbed `yPercent` drift on the same image (`ScrollTrigger scrub:true`, `start:'top bottom', end:'bottom top'`), with the inner image sized taller than its frame (e.g. `height:120%`) so the drift never exposes an empty edge within the `overflow:hidden` frame. Both effects compose fine on the same element since GSAP tracks scale/x/y as independent channels.
- **Fluid units**: `--u` scales from 1920px reference. Only breakpoint (`max-width:768px`) still scoped to the menu overlay's mobile variant.

## Research lesson — verify reference-site mechanics precisely, don't generalize
When asked to copy an effect from a reference site, find the EXACT element/page being referenced, not a similar-looking one elsewhere on the same site. This session spent real effort building a "magnetic cursor-parallax" image hover based on a generic project-grid hover found on olgaprudka.com's homepage — turned out to be the wrong element entirely. The specific photo she'd referenced (linking to a "dasha" project page) actually used a plain CSS-style hover scale (1.05, no cursor tracking) plus a SCROLL-linked parallax (Locomotive Scroll's `data-scroll-speed`), found only by locating that exact `<a href=".../dasha/">` link and reading its real markup. Always locate the precise element first.

## Testing-environment lesson (still relevant)
The automated browser tab used for live verification in this environment is frequently backgrounded (`document.hidden === true`), which stalls `requestAnimationFrame` — GSAP `.to()` tweens silently never progress, while `gsap.set()` (instant, no ticker needed) still works fine. This produced multiple false "still broken" readings this session. When verifying a live fix: prefer instant/forced-state checks (`gsap.set` + `getBoundingClientRect`) over waiting on a real-time tween to play out, and don't trust a "frozen mid-tween" observation as a real bug without checking `document.hidden` first. Also: `getComputedStyle(el).transform` never reflects a custom `transform-origin`'s effect (it only shows the raw transform-function matrix evaluated around 0,0) — to verify a custom pivot point visually, compare `getBoundingClientRect()` before/after, not the transform matrix string.

## Style/collaboration preferences (confirmed repeatedly)
- No blur effects anywhere, ever.
- "Pixel" requests are literal CSS px, not scaled through `--u`, unless she says otherwise.
- Prefers lighter/thinner visual weight generally, but will explicitly ask to strengthen something back up if a reduction goes too far (happened with the craft image hover scale: 1.12 → asked to reduce → 1.04 caused a real edge-peeking bug → reverted to 1.12, then the whole mechanism was replaced anyway).
- `HelveticaNeueRoman.otf` at weight 400 IS the correct "Regular" for this font family — don't swap it.
- [[feedback-prompt-timing]] + [[feedback-debugging-pace]]: diagnose in chat first, don't write the full Claude Code prompt until she explicitly asks; after repeated failed fixes on the same symptom, check the testing setup itself before writing more code; watch for frustration signals as a hard stop.
- For scroll/animation timing requests, she iterates fast in small increments ("faster", "slower", "smoother") — expect several quick rounds on any new timing-sensitive feature, don't over-engineer the first pass.

## Close icon (dropdown menu) — RESOLVED, see [[project-artefact-close-icon-bug]] for full history
Real SVG `<path>` bars, `transform-box: view-box; transform-origin: 18px 18px`, hover-triggered (JS `mouseenter`/`mouseleave`), manual `transform` string written in a GSAP-proxy `onUpdate` (not GSAP's `rotate`/`x` shorthand). Positioned to match `.hero__menu-btn` exactly. Working and confirmed by her.

## Pending work
1. ~~Gallery carousel~~ — DONE 2026-07-31, variant A (scroll-scrubbed), see above.
2. **Real card filtering** by Ліплення / Гончарне коло / Декор — only the visual active state exists. Still the biggest unbuilt piece in block 5.
3. ~~Motion pass for blocks 5 and 6~~ — DONE 2026-07-31. Still no section scroll-lag on these two, by her design.
4. ~~Glass cursor upgrade~~ — DONE 2026-07-31, see the additions above and [[ref-figma-glass-refraction]].
5. ~~Two gallery hairlines~~ — DONE 2026-07-31, confirmed by her. See [[project-artefact-pending-fixes]] and the CRITICAL gotcha above.
6. `.philosophy__lead` deliberately overhangs its column (356u text in a 295u wrapper, per Figma) — confirm that's intended.
7. Mobile menu content — built per Figma spec, still not verified live on an actual mobile viewport/device.
8. [[ref-kasiasiwosz-text-reveals]]'s scroll-scrubbed per-word emphasis (`animate="word"`) — still not used anywhere; the craft image scroll-parallax this session is the first *scrubbed* (as opposed to trigger-once) scroll effect in the project, could reuse similar ScrollTrigger scrub setup for this if she wants it later.
9. Extend the `--u`/breakpoint system beyond the menu overlay to the rest of the site as more sections get built.
10. **Lightbox** — each gallery work should open its main shot + 2-3 other angles. The `<button>`s exist with no click handler. She'll supply the extra angle photos.

## Blocks not yet built at all
**Blocks 7 "7_кроки" (steps) and 8 "free lesson" are both DONE.** Block 7:
layout + motion + hover cards, plus a follow-up polish pass (hover-swap
crossfade, cards entering fully separately, a scroll-hover guard). Block 8
was built in a separate per-block chat per her new workflow (see below).

**The gallery-pin entrance-timing bug went through three iterations before
it actually worked** — worth reading before touching entrance timing on any
future block:
1. A flat shared floor (`galleryPinTrigger.end`) applied to every
   downstream trigger — collapsed multiple triggers onto the same point, so
   blocks fired together instead of in sequence.
2. A hardcoded per-block `--u`-offset chain (added once block 8 existed,
   trying to place each trigger a fixed distance past the gallery's pin) —
   went stale immediately (block 8 needed a manual "+1118u correction" to
   its offset that nobody could derive without re-measuring live) and,
   worse, every offset formula dropped the `-viewportHeight*0.8` term a
   real "top 80%" trigger needs — so blocks 7 and 8 didn't animate at all
   until scrolled almost to the bottom of each section. This is the bug she
   caught on video 2026-07-31.
3. **What actually works, live-verified** (driven scroll +
   `ScrollTrigger.isActive`/`.progress`, not just reading `.start` after the
   page settles — that read as "fine" every time despite the bug):
   `startAfterFloor(el, floorFn)` in `script.js` — a `start` FUNCTION using
   a fresh `getBoundingClientRect()` read each refresh (self-correcting,
   no hardcoded offsets to keep in sync with `style.css`), floored via
   `Math.max(natural, floor)` where each trigger's floor is the PREVIOUS
   trigger's own resolved `.start + 80` (chained sequentially — philosophy
   top → philosophy bottom → steps heading → steps list → free-lesson —
   not one shared constant), and only the very first one floors against
   `galleryPinTrigger.end`. `galleryFloorStart()` (the old, broken name) no
   longer exists in the file — if you see it referenced anywhere else in
   these docs, that reference is stale.

**Separately, block 8's beat pacing needed a second round**: its 5 entrance
beats were chained on fixed absolute time offsets (to hit the starter kit's
~2-3s budget), which put the photo and the body text at the exact same
instant — she saw the heading/eyebrow, then everything else landed too
fast to register. Fixed by chaining all 5 beats sequentially with small
`'-='` overlaps (same recipe philosophy/steps already used) instead of
absolute offsets — still ~2.7s total, but each beat now gets its own
visible moment. See "Section entrance shape" in `BLOCK_STARTER_KIT.md`.

Remaining, per the Figma frame names (mockup exports intentionally removed
from the repo — she gives node links on request when a block starts):
**9 історії учнів** (student stories), **10 тарифи** (pricing), **11 СТА**
(CTA), **12 FAQ**, **13 соц мережі** (social), **14 футер** (footer). No
layout exists for any of these yet.

**Starting one of these in a new chat?** She now wants each new block built
in its own chat, without reading this whole file. Point that chat at
`docs/context/BLOCK_STARTER_KIT.md` instead — it's a distilled,
self-contained reference (structure, colors, fonts, grid, every reusable
motion recipe with values) built specifically so a fresh session doesn't
need this file, `project_artefact_pending_fixes.md`, or a full read of
`style.css`/`script.js`. She merges finished blocks herself afterward.
