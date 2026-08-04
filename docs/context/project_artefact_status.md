---
name: project-artefact-status
description: "Current build status of the Artefact landing page — what's done, established motion/code patterns to reuse, critical gotchas, and what's still pending. Read this FIRST in any new session on this project."
metadata: 
  node_type: memory
  type: project
  originSessionId: a18d892f-efdb-4bc1-a09f-fefca0a5b6e4
  modified: 2026-08-03T00:00:00.000Z
---

Snapshot as of 2026-07-29, end of a long multi-day session. Read this before starting new work so established patterns get reused and known landmines get avoided.

> Blocks 5 and 6 (gallery + philosophy) are now **fully done** — layout, motion, and both gallery hairlines fixed and confirmed by her on 2026-07-31. Full history and the reusable lessons from that bug are in [[project-artefact-pending-fixes]]. **She now works one block per new chat.**

> **Blocks 7 (steps) and 8 (free lesson) are now both fully done and confirmed by her**, 2026-07-31. Block 8's entrance was iterated twice after first landing: the gallery-pin entrance-timing bug (see "Blocks not yet built at all" below for the full fix) and then a second round where two of its beats (photo + body text) fired at the exact same instant, read as "too fast to see," fixed by chaining all 5 beats sequentially with small `'-='` overlaps instead of fixed absolute time offsets — same recipe philosophy/steps already used.

> **Blocks 9 (історії учнів) and 10 (тарифи/pricing) are now both fully done and confirmed by her**, 2026-08-01. Block 9 (5 course cards + click-to-reveal testimonials + a pinned 2-page horizontal carousel, built layout+motion together in one chat) surfaced two gotchas worth reading before touching any future pinned/carousel block: (1) **a pinned+scrubbed section must NOT also get `applySectionLag()`** — both scrubs fight over the same content transform (header drifting vertically while the carousel pans it horizontally); `.stories` is excluded from scroll-lag for this reason, same as `.gallery`. (2) **When pinning a section to a `'center center'`-style start so its content fits with symmetric margins, trigger off the specific sub-element that must fit on screen, not the whole section** — centering an oversized whole section crops both ends equally; `scrollTrigger: { trigger: <sub-element>, pin: <whole-section> }` can use different elements for each. This one was invisible on a narrow/tall test viewport and only showed up on her real wide monitor (~100px cropped off the bottom row). Block 10 (pricing cards) took MANY rounds on two specific, easy-to-repeat mistakes — full detail in "Established patterns" and a dedicated note below, but the short version: (1) a title-image-vs-subtitle left-alignment "bug" that looked fixed by CSS numbers three times in a row before someone actually measured the PNG's pixels; (2) a hover-scale-on-a-card-containing-a-hairline-line jitter that needed a counter-scale, not a bigger number.

> **Block 11 (`.cta`, "11 СТА") is now fully done and confirmed by her**, 2026-08-03. 4-line heading + stat counters (200+/94%/15+/3+) + a click-to-toggle background video (pottery clip, cursor label swaps "стоп"/"грати" like block 3's video), olive-100 with the same film-grain as `.philosophy`/`.gallery__bar`. Heading uses the kasiasiwosz.com "line" reveal (mask + slide-up-fade per row, `duration:0.5, stagger:0.1, power2.out`) — the first real use of that technique on the site, previously only documented; the lead paragraph uses the "word" scroll-scrubbed emphasis already shipped on block 4. **Found and fixed a real bug in the shared `startAfterFloor()` pattern every block since block 6 has used**: a function-based ScrollTrigger `start` can get "stuck" at whatever it first resolved to during page init and never re-resolve on later `ScrollTrigger.refresh()` calls, even with `invalidateOnRefresh:true` and even calling `refresh()` repeatedly — verified live that only refreshing that ONE trigger's instance directly (`trigger.refresh()`), timed after the page's real layout finishes settling (which took several seconds after `load` on this page, well past what the existing `load`/`fonts.ready` hooks catch), actually fixes it. `.cta` was hit hardest (last section = most accumulated late-loading drift above it, ~740px), but block 10 (pricing) showed a smaller ~176px version of the same thing when checked. Fix: a `ResizeObserver` on `document.body` (`reRefreshCtaTrigger()` in `script.js`) that re-refreshes both globally and this trigger specifically whenever the page's real height changes, however late. **Worth applying the same fix to blocks 6-10 if any of them are ever reported as "already finished animating by the time I scrolled to it."**

> **Blocks 12 (FAQ), 13 (соц мережі/social) and 14 (футер/footer) are now ALL done and confirmed — the entire desktop build is complete**, 2026-08-04. Block 12: accordion (all closed by default, multi-open), see [[project-artefact-block12-faq]] for the `grid-template-rows:0fr` collapse trap and a margin-collapse fix. Block 13: heading + hero photo + a real `.gallery`-style pin+scrub+Lenis-settle 7-card carousel, see [[project-artefact-block13-social]] — **three** real bugs, most notably a pinned section shorter than the viewport leaving dead space for the whole pin duration (see next paragraph, same root cause hit block 14 too). Block 14 (footer, the last block): full-viewport `min-height:100vh` layout with `justify-content:space-between`, subscribe form, social links (hover mechanism copied verbatim from the menu overlay's), contacts/logo/copyright; the ARTEFACT wordmark keeps its designer soft-focus blur on purpose (her own `img/logo-footer.png`, a confirmed exception to the "no blur anywhere" rule). Full detail in [[project-artefact-block14-footer]].
>
> **Recurring bug class worth internalizing for any future pinned OR last section: a flat Figma-frame-height box (e.g. `height: calc(var(--u)*890)`) is only "tall enough" by coincidence of one specific viewport size.** Both block 13 (pinned carousel) and block 14 (last section) independently shipped with this and both had to be revised to `min-height:100vh` — for a pinned section, center the content vertically (`top: calc(50% - Nu)`) since the viewport-relative slack now varies; for a last/flow section, use `justify-content:space-between` (or similar) so content anchors to both the real top and real bottom instead of collapsing to its intrinsic height with the gap dumped on one side. Default to this from the start on any new pinned or last-in-document section rather than waiting for it to be reported as "looks broken."
>
> **Next: mobile version — scope now established, 2026-08-04.** Two breakpoints (she has Figma frames at both 375px phone and 768px tablet reference widths): `@media (max-width: 768px)` for tablet, `@media (max-width: 480px)` layered on top for phone. **Fixed `px` inside both, not `--u`** — confirmed against the menu overlay's own existing `max-width:768px` mobile variant, which already uses literal px throughout. Same one-block-per-chat workflow as desktop; starting with block 1 (Hero). Full detail in `BLOCK_STARTER_KIT.md`'s new "Mobile version" section — point any new mobile-block chat there.

> **Two new gotchas from block 10, read before touching ANY image-based title or hover-scale card:**
> 1. **A Figma-exported title PNG can have an OPAQUE background matching the card's own color instead of real alpha transparency** — this makes "the image's bounding box starts at (0,0), so no left-offset is needed" a FALSE reading if you only check the alpha channel (fully opaque end-to-end) rather than actual pixel COLOR. Verify by sampling the image's own corner pixel color and scanning for the first pixel that differs from it by a meaningful amount — not by checking alpha, and not by eyeballing "the CSS `left` values already match." This exact mistake cost three rounds on cards 2/3's title alignment (`pricing-title-2.png`/`pricing-title-3.png` both had ~15-16px of baked-in background margin before the visible glyph). See the canvas-based measurement technique in [[project-artefact-block10-pricing]].
> 2. **A CSS hover `transform: scale()` on a card visually stretches EVERY descendant, including any 1px hairline border/line inside it** — a 1px line really does render at ~1.01px once its 1%-scaled ancestor is hovered, and animating through that tiny continuous change reads as jitter/trembling on the line specifically (thin features are far more visible to sub-pixel rounding than anything else on the card). Fix: counter-scale the hairline element itself (`transform: scale(1 / <card's hover scale>)`) with the IDENTICAL transition duration/easing as the card's own hover rule, so the two cancel out continuously through the whole transition, not just at the two end states. Reusable for any future card that scales on hover and contains a thin line/border.
> 3. **Border-width has its own devicePixelRatio rounding cliff, separate from both of the above**: at her dpr of 1.5, EVERY border-width from 0 up to ~1.3px renders at the exact same physical thickness (they all round down to 1 device pixel ≈ 0.667 CSS px) — confirmed by testing 0.5px/1px/1.2px/1.3px side by side and getting an identical computed value for all four. 1.4px is the first value that actually renders thicker (2 device pixels). If a border-width tweak on this project "does nothing" visually, suspect this rounding cliff before assuming the CSS didn't apply — check `getComputedStyle(el).borderTopWidth` at a few candidate values first.

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
- **Card hover: the whole card lifts + scales, not just its contents** (pricing cards, confirmed final): `transform: translateY(-2px) scale(1.01)` on the card's own box, 0.5s signature easing. A per-child version was tried and explicitly rejected. See [[project-artefact-block10-pricing]] for the full back-and-forth.
- **Hairline inside a hover-scaling container needs a counter-scale**: any 1px border/line nested inside an element that scales on hover will visibly stretch with it, and animating through that reads as jitter on the thin element specifically. Fix: `transform: scale(1 / <parent's hover scale>)` on the hairline itself, on the SAME transition duration/easing as the parent's own hover rule (so both interpolate in lockstep, canceling throughout the transition, not just at the end states). First used on pricing's CTA underline, see [[project-artefact-block10-pricing]].

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

**Blocks 9 "9_історії учнів" (student stories) and 10 "10_тарифи" (pricing)
are also both DONE**, built in their own per-block chats. Block 10's motion
pass is the one with all the pixel-measurement and hover/hairline lessons
above — full detail in [[project-artefact-block10-pricing]].

**Block 11 "11 СТА" (CTA) is also DONE** — heading/lead/video/stat-counter
motion plus the `startAfterFloor()` stale-trigger fix, both summarized in
the blockquote near the top of this file.

**Blocks 12 "12 FAQ", 13 "13 соц мережі" (social) and 14 "14 футер"
(footer) are ALL DONE** — the entire desktop build, all 14 blocks, is
complete and confirmed by her as of 2026-08-04. See the blockquote near
the top of this file and [[project-artefact-block12-faq]],
[[project-artefact-block13-social]], [[project-artefact-block14-footer]]
for full detail on each.

## Mobile version — next phase, not yet started

No mobile layout exists anywhere on the site except the menu overlay's own
`max-width:768px` variant (see `CLAUDE.md`'s "Layout system"). Every other
section is desktop-only fluid geometry (`--u` scaled from a 1920px
reference, no other breakpoints). Scope and per-block approach for this
pass had not been established as of this note — check current memory
(`MEMORY.md` in the auto-memory system) for anything decided since.

**Starting a new block/phase in a new chat?** She now wants each new block
built in its own chat, without reading this whole file. Point that chat at
`docs/context/BLOCK_STARTER_KIT.md` instead — it's a distilled,
self-contained reference (structure, colors, fonts, grid, every reusable
motion recipe with values) built specifically so a fresh session doesn't
need this file, `project_artefact_pending_fixes.md`, or a full read of
`style.css`/`script.js`. She merges finished blocks herself afterward.
