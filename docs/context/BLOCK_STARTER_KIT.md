---
name: block-starter-kit
description: "Self-contained design-system reference for building ANY new Artefact block (8-14) from a fresh chat, without reading the full project history. Structure, colors, fonts, grid, and every reusable motion recipe with exact values."
metadata:
  node_type: memory
  type: project
---

# Artefact — new-block starter kit

**Read this instead of the rest of `docs/context/` when starting a brand-new
block (8-14).** It has every reusable convention — structure, colors, fonts,
grid, motion recipes — with concrete values, so you don't need to read
`project_artefact_status.md`, `project_artefact_pending_fixes.md`, or the
`ref_*.md` files, and you don't need to read all of `style.css`/`script.js`
end to end. Grep for a specific class only when you need to copy its exact
implementation.

If you're instead *continuing or fixing* one of the 7 already-built blocks,
this file isn't enough — read `project_artefact_status.md` too.

## Working model: one block, one chat

She builds one new block per chat now. Each chat should:
1. Get the Figma node link + spec for its one block from her.
2. Build that block's markup/CSS/JS as a **self-contained, appendable
   addition** — new `<section>` in `index.html`, a new labeled block at the
   end of `style.css`, and new `cacheXRefs()` / `setInitialXStates()` /
   `runXEntrance()` functions in `script.js` (see "Per-block JS shape"
   below) — following the naming pattern already used for every block so
   far (`craft`, `clay`, `material`, `gallery`, `philosophy`, `steps`).
3. Not touch other blocks' code.
4. She merges the finished blocks herself afterward.

Because of #4, the single biggest risk is **name collisions** — two chats
picking the same class prefix or function name. Prefix everything with the
block's own name (see the Figma frame names in "Blocks not yet built",
below) and never reuse another block's class names, even for something
generic-sounding like `.title` or `.lead`.

## Running it

```bash
node _serve.cjs
```
Serves on `http://localhost:8000`. Always use this (not `file://`) — fonts,
video, and canvas-generated textures need a real origin. `.claude/launch.json`
already wires this into the Claude Code preview pane if you're on Claude Code.

## File structure (no build step)

Everything is three files: `index.html`, `style.css`, `script.js`, plus
`Font/` and `img/`. GSAP + ScrollTrigger + Lenis load from CDN in
`index.html`. No package manager, no bundler.

## Section anatomy — copy this skeleton

Every block section follows the same shape:

```html
<section class="myblock" id="myblock" data-cursor-theme="light">
  <div class="section-inner">
    <!-- all real content goes here -->
  </div>
</section>
```

- `.section-inner { position: absolute; inset: 0; }` — required. It's the
  handle the site-wide scroll-lag system (`applySectionLag()`) grabs;
  without it your block's content can't opt into that effect later, and
  everything inside it should be positioned `absolute` off it (see the grid
  below), matching every other block.
- `data-cursor-theme="dark"` or `"light"` — required on every section. The
  custom cursor reads the nearest ancestor with this attribute to decide
  its own color (`body.cursor-on-light` toggle). Pick whichever reads
  correctly against your block's background.
- The section itself should be `position: relative; overflow: hidden;`
  sized to `height: calc(var(--u) * <Figma frame height in px>)`.
- **Full-bleed seam hairline gotcha:** if your block sits directly against
  the section above/below it (no gap), add `margin: -2px 0 0` to whichever
  of the two is lower. At fractional `devicePixelRatio` (she runs 1.5),
  two full-bleed sections that are geometrically flush can still show a
  1px pale line where the transparent `body` shows through, because each
  edge rounds to a device pixel independently. This has hit two block
  boundaries already (5/6, and it was pre-empted on 6/7) — assume it'll
  happen again and just add the overlap up front. Verify by resizing the
  preview to **800×450** before screenshotting (hairlines vanish under
  downscaling at any larger viewport).

## Fluid unit + grid

```css
--u: calc(100vw / 1920);              /* 1920px Figma reference = 100vw */
--grid-margin: calc(var(--u) * 50);
--grid-gutter: calc(var(--u) * 10);
--grid-col: calc((100vw - (2 * var(--grid-margin)) - (3 * var(--grid-gutter))) / 4);
--col-1: var(--grid-margin);
--col-2: calc(var(--grid-margin) + var(--grid-col) + var(--grid-gutter));
--col-3: calc(var(--grid-margin) + 2 * (var(--grid-col) + var(--grid-gutter)));
--col-4: calc(var(--grid-margin) + 3 * (var(--grid-col) + var(--grid-gutter)));
```
4-column grid, margin 50u, gutter 10u. All already defined in `style.css`'s
`:root` — just use the variables, don't redefine them.

- Every geometry value is `calc(var(--u) * N)` where **N is the raw Figma
  pixel value** for that property, read straight off Figma Dev Mode/MCP —
  never hand-converted.
- `--u` is set from JS (`calibrateFluidUnit()`), not the CSS fallback,
  because `100vw` includes the scrollbar. You don't need to touch this —
  it's global and already correct for any new section.
- **"N пікселів"/"N pixels" in her spec means literal CSS `px`, not
  `--u`**, unless she says otherwise. The one standing exception: small
  fixed gaps next to `.italic-symbol` characters (see below) are
  conventionally literal px too, by precedent.
- Until 2026-08-04, `max-width: 768px` (menu overlay only) was the only
  breakpoint on the site. **The mobile phase started that day — see
  "Mobile version" below** if your task is a mobile build, not a desktop
  one.

## Mobile version — started 2026-08-04, block by block

All 14 desktop blocks are done and confirmed. She's now doing a mobile pass,
same one-block-per-chat workflow, working from her own mobile Figma frames
(she gives a node link per block, same as desktop). Ask for that block's
mobile node link if it wasn't given.

**Two breakpoints, not one** — she has separate Figma frames at 375px
(phone) and 768px (tablet) reference widths:

```css
@media (max-width: 768px) { /* tablet layer — base "below desktop" styles */ }
@media (max-width: 480px) { /* phone layer — overrides on top of tablet */ }
```

480px (not 767px) is the phone/tablet cutoff — a conventional round number
comfortably above her 375px phone reference and below the 768px tablet
reference, chosen so neither frame's design has to stretch across an
awkward gap. Confirm with her if a specific block's spec doesn't fit that
split cleanly.

**Fixed `px`, not `--u`, inside both breakpoints** — this is a real
convention switch from the fluid desktop system, not a shortcut. Confirmed
against the one mobile UI already built (`.menu-overlay`'s own
`max-width:768px` variant in `style.css`): every value there is a literal
px (`height: 52px`, `font-size: 32px`, `margin: 80px 20px 0`, etc.), not
`calc(var(--u) * N)`. `--u` is a 1920px-reference fluid scale — appropriate
for desktop's continuous-resize behavior, not for two fixed device-class
breakpoints. Write mobile geometry as literal px straight from Figma Dev
Mode, same as the menu overlay already does.

**Add mobile rules alongside the existing desktop CSS for that block, never
replace it** — the media queries layer on top; desktop rules still apply
above 768px. Same append-only, self-contained-addition model as new desktop
blocks (see "Working model" above) — she merges these in herself too.

Whether existing desktop JS (entrance timelines, hover/parallax, pin+scrub
carousels) should run at all under 768px hasn't been decided per-block yet
— ask her, or default to disabling scroll-jacking/pin mechanics on mobile
(the usual mobile-UX reason to have a breakpoint in the first place) unless
she says she wants them.

## Colors (CSS custom properties, already defined — reuse, don't redeclare)

```css
--beige-100: #EDE9DD;   /* primary background */
--beige-80:  rgba(237, 233, 221, 0.8);
--beige-60:  rgba(237, 233, 221, 0.6);
--beige-40:  rgba(237, 233, 221, 0.4);
--blue:      #B1B8CA;   /* accent, e.g. hero CTA plus-icon */
--olive-100: #9A9671;   /* secondary background / dark-on-beige text */
--olive-80:  rgba(154, 150, 113, 0.8);
--olive-60:  rgba(154, 150, 113, 0.6);
```
Plus one literal (not a variable — introduce one if you need it in more
places) dark text color used repeatedly on beige backgrounds: `#2B3D2D`.

No blur effects anywhere, ever — not for depth, not for a "soft" look, not
as a transition state. This has been a hard rule since the project started.

## Typography

`'Helvetica Neue'` local files in `Font/`, 16 `@font-face` weights (100-900,
normal + italic each). **`HelveticaNeueRoman.otf` at `font-weight: 400` is
the correct "Regular"** — there's a separate, different-looking `Medium`
(500); don't substitute one for the other.

```css
font-family: 'Helvetica Neue', Arial, sans-serif; /* body fallback chain */
font-family: 'Helvetica Neue', sans-serif;         /* used everywhere else */
```

**`.italic-symbol` convention**: when Figma shows a decorative character —
almost always a parenthesis, e.g. `(наш підхід`, `(1)` — set in italic
while the surrounding text is regular, wrap just that character in its own
span:
```html
<span class="italic-symbol">(</span>
```
```css
.italic-symbol { font-style: italic; }
```
Gaps next to it are a literal px margin (10px is the common value), not `--u`.

## Reusable motion recipes

Every recipe below has been used at least twice already; match these
values rather than inventing new ones unless she asks for something
different.

**Signature hover easing** — use for every new hover transition:
```
cubic-bezier(0.16, 1, 0.3, 1)
```
This is the DEFAULT, not a universal law — on a two-element crossfade
(number ⇄ word, block 7's card labels) she rejected it and asked for a
plain symmetric ease-in-out instead (`cubic-bezier(0.65, 0, 0.35, 1)`,
smooth start AND smooth end, vs. the signature curve's fast-start/slow-end).
Start with the signature curve, but treat it as negotiable per-interaction
if she says the motion doesn't read right.

**Word-reveal stagger** (headings/eyebrows built from many small words):
```js
splitWords(el);           // wraps each space-separated word in <span class="word">,
                           // keeps existing element children (e.g. .italic-symbol) as one whole "word"
gsap.set(words, { opacity: 0 });
gsap.to(words, { opacity: 1, duration: 0.9-1.0, stagger: 0.08, ease: 'sine.out' });
```
`splitWordsDeep(el)` is the recursive variant — use it instead when the
element already wraps sub-phrases in their own colored/styled spans that
must stay intact (e.g. multi-color body copy), so each word still gets
individually staggered without breaking those spans.
`splitChars(el)` is the same idea per-character, for letter-by-letter reveals.

**Fade + rise** (body paragraphs, captions, most non-heading text):
```js
gsap.set(el, { opacity: 0, y: 12 });
gsap.to(el, { opacity: 1, y: 0, duration: 0.6, ease: 'sine.out' });
```
**Important**: if the element's resting CSS opacity is not `1` (e.g. a
lead paragraph styled at `0.8`), animate `to` that value, not to `1` —
then `clearProps: 'opacity,transform'` in `onComplete` so the stylesheet
stays the source of truth afterward. Animating blindly to `opacity: 1`
silently destroys the designed value.

**Heading/image entrance** (bigger elements — H1-style headings, hero
photos):
```js
gsap.set(el, { opacity: 0, y: 30 });        // or y: 120 for a full photo
gsap.to(el, { opacity: 1, y: 0, duration: 1.0-1.4, ease: 'power2.out' }); // power4.out for photos
```

**Section entrance shape**: one `ScrollTrigger`, `once: true`, **not**
scrubbed, `start: 'top 80%'` (or `'top 85%'` for a second beat further down
a tall section — anything past ~800-1000u tall needs 2 triggers, one for
the heading group and one for the lower content, or the lower beat fires
while still a viewport below the fold). Order beats top-to-bottom, mirror
Hero's own beat order (heading/message → visuals → supporting content →
CTA last), and **keep the whole sequence to ~2-3s total** — a slower
6s+ sequence can still be running when a normal scroll speed carries the
user past the section's bottom.

Chain the beats with `.to()` calls at **relative, sequential positions**
(no position argument for the first beat, then `'-=0.2'`-to-`'-=0.5'`-style
overlaps for each one after — matching how `runPhilosophyEntrance()` and
`runStepsEntrance()` do it), not fixed absolute time offsets on every
`.to()` call. Block 8's first pass used absolute offsets to hit the ~2s
budget and ended up firing two unrelated beats (a photo and a body
paragraph) at the exact same instant to save time — which read as "half
the section pops in at once, too fast to see," not a staggered reveal. A
sequential chain with small overlaps still fits the ~2-3s budget and keeps
every beat visibly distinct.

**Image hover-scale + scroll-parallax** (any photo that isn't a clickable
link — craft's images, philosophy's, the steps photo):
```js
// hover: plain scale, no cursor-tracking (cursor-tracking was tried once, wrong effect)
frame.addEventListener('mouseenter', () =>
  gsap.to(imgs, { scale: 1.05, duration: 0.7, ease: 'power2.out', overwrite: 'auto' }));
frame.addEventListener('mouseleave', () =>
  gsap.to(imgs, { scale: 1, duration: 0.7, ease: 'power2.out', overwrite: 'auto' }));

// scroll-parallax: separate scrubbed tween on the same image, independent GSAP channel
gsap.to(imgs, {
  yPercent: -15,               // per-group drift, tune if the frame needs more/less
  ease: 'none',
  scrollTrigger: { trigger: frame, start: 'top bottom', end: 'bottom top', scrub: true },
});
```
The frame is `overflow: hidden`; the inner `<img>` is sized taller than its
frame (e.g. `height: 120-150%`, `object-fit: cover`) so the drift never
exposes an empty edge. Register any new image group in the shared
`mediaImageGroups()` array in `script.js` (one line: `{ frame, imgs, drift }`)
rather than writing a new hover/parallax function — `initMediaImageHover()`
and `initMediaImageParallax()` already iterate that array.

**Clickable image → cursor bubble** (gallery-style, for anything that
navigates/opens something on click): `<button class="js-cursor-media"
data-cursor-label="далі">`, custom cursor swaps to a label bubble on hover.
Only use this for genuinely clickable images — non-interactive photos get
the hover-scale+parallax recipe above instead, not this.

**Two-line icon swap** (a "+"/"×" or similar single-glyph hover swap, e.g.
CTA plus icons): two stacked spans inside an `overflow: hidden` container,
one at rest (`translateY(0%)`), one hidden (`translateY(100%)`), both
`transition: transform 0.65s cubic-bezier(0.16, 1, 0.3, 1)`; on
`.js-line-hover:hover` the resting one slides to `-100%` and the hidden one
slides to `0%`. Class names follow `.<block>__cta-plus-char--out` /
`--in`. Pure CSS `:hover`, no JS.

**Underline sweep** (nav links, CTA underlines, menu trigger): a
`@keyframes heroLineSweep` that collapses from the right then re-expands
from the left (`scaleX` + `transform-origin` flip at the midpoint), fired
via `animation: heroLineSweep 1.1s cubic-bezier(0.16, 1, 0.3, 1) forwards`
on `.js-line-hover:hover`. 1px line thickness, project-wide.

**Text crossfade on hover** (revealing an alternate word/label without a
JS content swap, e.g. a number that becomes a word): two spans, one normal-
flow (rest, sets the container's size) + one `position: absolute; left:0;
bottom:0` (hover — **bottom, not top**, so the two share a baseline even if
their font-sizes differ; top-aligning a taller hover span makes it read as
jumping downward when it appears). Statically sized (don't transition
font-size on the SAME element you're crossfading — animating font-size
while also swapping content in one step is what caused a jitter bug once
already). Pure CSS, no JS needed for the swap itself.

Transition duration is **direction-aware, not one shared value**: whichever
span is disappearing should always use a fast duration, whichever is
appearing should always use a slow one, regardless of which direction
you're crossfading. Giving each span one fixed duration works for hover-IN
but is backwards for hover-OUT (the reappearing element pops back in fast
while the disappearing one is still slowly fading — a visible jump/overlap,
confirmed bug on block 7's card labels). Implement as: base rule on each
span = its hover-OUT duration, then a `.parent:hover .span { transition-
duration: X }` override (not the whole `transition` shorthand, so the
shared easing curve stays one declaration) = its hover-IN duration. Block 7
shipped fast=0.25s / slow=0.85s.

**Scroll-hover guard** (stop `:hover` firing on an element that scrolls
under a stationary cursor): CSS `:hover` re-evaluates purely from what's
under the pointer, so any hover-heavy element positioned where the cursor
naturally rests can trigger its hover just from scrolling past it, with no
mouse movement at all — hit block 7's card 1. Fix: toggle `body.
is-scrolling` from a plain `window.addEventListener('scroll', ..., {
passive: true })` with a ~120ms idle-clear `setTimeout` debounce, and add
`.is-scrolling .your-hover-element { pointer-events: none; }` in CSS. Use
the native `scroll` event, not `lenis.on('scroll')` — Lenis drives real
native scroll here, so `scroll` fires regardless of whether Lenis or the
browser itself is moving the page. See `initStepHoverGuard()` in
`script.js`. Only add this to elements that actually sit somewhere a
cursor commonly rests during scrolling — not a blanket default.

**Site-wide scroll-lag** (content lags half a screen behind its section's
background as you scroll): `applySectionLag('.myblock', '.myblock >
.section-inner')`, one line added to `initSectionScrollLag()`. **Ask her
first** whether the new block should have this — gallery and philosophy
were deliberately excluded because she reads them as one continuous
surface; it's not automatic for every block. **Never add this to a
pinned+scrubbed section** (a carousel, gallery-style) — both scrubs fight
over the same content transform, visible as the header drifting vertically
while the pin is also panning it horizontally. `.gallery` and `.stories`
are both excluded for exactly this reason.

**Pinning a section to a `'center center'`-style start** (so its content
sits with symmetric margins once fully visible, e.g. any future carousel
block): trigger the pin off the SPECIFIC sub-element that must fit on
screen, not the whole section — `scrollTrigger: { trigger:
<the-sub-element>, pin: <the-whole-section> }` (trigger and pin can be
different elements). If the section (header + content combined) is taller
than a typical widescreen viewport, centering the WHOLE section crops both
ends equally instead of showing everything — this bug was invisible on a
narrow/tall test viewport and only showed up on her real wide monitor
(~100px cropped off the bottom row of block 9's carousel).

**Entrance-timing-after-a-pinned-section gotcha**: if your new block comes
directly (or a few blocks) after a section that uses ScrollTrigger
`pin: true` (currently only the gallery carousel does), a plain
`start: 'top 80%'` on your block's entrance can fire *while the pinned
section is still visually holding the screen* — the pin only freezes what's
on screen, not the underlying scroll position your trigger is watching.

Two things that look like fixes but aren't:
- **Don't** mutate the trigger's resolved `self.start` after creation (from
  `onRefresh` or any later pass) — reads back as correct in a static
  post-load check, still fires at the original too-early position live.
- **Don't** anchor to a hardcoded `--u` distance from the pin's end (e.g.
  "philosophy's top is roughly `pin.end + 1118u`, the next block is that
  plus philosophy's own height, etc."). This is what actually shipped for
  a while and broke blocks 7/8's entrances outright: every one of those
  offset formulas is missing the `- viewportHeight * 0.8` a real "top 80%"
  trigger needs, so instead of firing 80% of a viewport early it only fires
  once the element's top hits the very TOP of the viewport — which reads
  as "doesn't animate until you've scrolled almost past the whole section."
  It also silently goes stale the moment any upstream block's height
  changes, which is exactly how adding block 8 broke block 7's already-set
  offset.

**What actually works**: `startAfterFloor(el, floorFn)` in `script.js` — a
`start` **function** (not a fixed string/number, so ScrollTrigger recomputes
it fresh on every refresh — GSAP's own documented pattern for a trigger
whose position depends on another) that takes the element's own LIVE
`getBoundingClientRect()`-based "top 80%" position and floors it with
`Math.max(natural, floor)`. Chain the floor to whatever comes immediately
before your block in the page (that trigger's own resolved `.start + 80`),
not to a single flat constant shared by everything downstream of the pin —
a flat shared floor collapses multiple triggers onto the identical point
whenever more than one of them naturally falls inside the pin's range, so
they reveal together instead of in sequence. `runPhilosophyEntrance()` →
`runStepsEntrance()` → `runFreeLessonEntrance()` in `script.js` is the
reference chain: the first one floors against `galleryPinTrigger.end`,
every one after floors against the immediately-preceding trigger. Copy that
pattern for your own block if it needs this at all.

**Verify by simulating a real scroll and watching `ScrollTrigger` instances'
`.progress`/`isActive`** (drive `window.scrollTo()` + call
`ScrollTrigger.update()`, then read `.progress` before and just after the
resolved `.start`) — reading `.start`/`.end` once right after the page
loads is not sufficient proof it fires correctly; this bug read as fine
under that check every time it actually shipped broken.

## Per-block JS shape (script.js)

Every block so far follows this exact function shape — match it:
```js
let myblockFoo, myblockBarWords, /* ...refs... */;

function cacheMyblockRefs() {
  myblockFoo = document.querySelector('.myblock__foo');
  // ...
}

function setInitialMyblockStates() {
  if (reducedMotion) return;
  gsap.set(myblockFoo, { opacity: 0, y: 30 });
  // ...
}

function runMyblockEntrance() {
  if (reducedMotion || !hasGSAP || !window.ScrollTrigger) return;
  // ScrollTrigger timeline(s) here
}
```
Then, in the init block at the bottom of `script.js`:
```js
cacheMyblockRefs();                 // alongside the other cache*Refs() calls
if (hasGSAP) setInitialMyblockStates();  // inside the existing hasGSAP block
runMyblockEntrance();                // alongside the other runXEntrance() calls
```
Whoever merges blocks later just needs to slot these three calls into the
three existing groups — don't restructure the init block itself.

## Hard rules (apply to every block, no exceptions)

- **Never apply a GSAP transform to `.hero` itself**, or to any ancestor of
  `.hero__bg` — this breaks the preloader→curtain hand-off via an
  unwanted stacking context. Not relevant unless your new block's code
  somehow touches Hero, but worth knowing before any cross-block motion
  work (e.g. a whole-page scroll effect).
- **Never use ScrollTrigger's `snap`.** It fights Lenis (the smooth-scroll
  library) and the stutter shows up on every scrubbed tween on the page,
  not just yours.
- **No blur effects, anywhere.**
- Entrance tweens animate **to the CSS value**, not blindly to `opacity: 1`
  — `clearProps` afterward. Several elements have designed sub-1 opacity
  that a lazy `to(1)` would destroy.
- Reduced-motion: every `runXEntrance()`/hover-init function starts with
  `if (reducedMotion || ...) return;` — keep that guard on anything new.

## Verifying visual work

- `devicePixelRatio` is **1.5** on her machine — resize the preview to
  **800×450** before screenshotting a hairline/seam check; anything larger
  gets downscaled and 1px lines disappear before you see them.
  `getBoundingClientRect` alone can't catch this class of bug — it's a
  compositing/rounding issue, not a geometry one.
- The automated preview tab is often backgrounded (`document.hidden ===
  true`), which stalls `requestAnimationFrame` — a GSAP `.to()` tween
  silently never progresses while `gsap.set()` (instant) still works.
  Don't read a frozen mid-tween as a real bug without checking
  `document.hidden` first.

## Blocks not yet built

Per the Figma frame names (mockup exports intentionally not in the repo —
she supplies node links per block when it starts): **12 FAQ**,
**13 соц мережі** (social), **14 футер** (footer). Each starts from zero
layout.

## Verifying a title/label built from an exported image, next to real text

If a block's heading or label is an exported PNG (like the pricing cards'
titles) sitting next to plain text that needs to visually left-align with
it, **do not trust the CSS `left` values matching, and do not trust an
alpha-channel bounding-box check** ("image's opaque pixels start at (0,0),
so no offset needed"). A title PNG exported flattened onto an opaque
background matching its own card color (rather than real alpha
transparency) is fully opaque edge-to-edge — an alpha check reports zero
padding even when the visible glyph sits 15-20px inside the canvas. This
cost three rounds on the pricing cards before it was actually measured
right.

Measure it properly: draw the image to an offscreen canvas, read the pixel
color at `(0,0)` as the background reference, then scan for the first
column whose color differs from that reference by a real margin (`|Δr| +
|Δg| + |Δb| > 30` is a safe threshold). Convert that column index to `u`
(these assets render at 1 natural px = 1u, so no extra scaling math is
usually needed) and subtract it from the naive `left` value. Verify by
comparing the title's rendered ink position against the real text's
rendered position (a `Range` around its first character's text node gives
an accurate rect) — the two should differ by well under 1px once correct.

## Card hover that scales/lifts the whole element

The established default (pricing cards, confirmed final after a per-child
version was tried and rejected): the CARD's own box moves, not just its
contents —
```css
.mycard { transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
@media (hover: hover) and (pointer: fine) {
  .mycard:hover { transform: translateY(-2px) scale(1.01); }
}
```
**If the card contains any hairline border or 1px line**, that line will
visibly stretch along with the card's scale, and animating through that
tiny continuous change reads as jitter on the line specifically (thin
features are far more sensitive to sub-pixel rounding than anything else
on the card). Counter-scale the hairline element itself, on the exact same
transition duration/easing as the card's own hover rule so the two cancel
out continuously through the whole transition, not just at the two end
states:
```css
.mycard-hairline { transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
@media (hover: hover) and (pointer: fine) {
  .mycard:hover .mycard-hairline { transform: scale(calc(1 / 1.01)); }
}
```

## Border-width has its own devicePixelRatio rounding cliff

At her machine's devicePixelRatio (1.5), a border-width or any thin
dimension doesn't render at whatever value you set — it snaps to the
nearest achievable DEVICE pixel. For dpr 1.5 specifically, EVERY value from
0 up to ~1.3px rounds down to the same 1 device pixel (≈0.667 CSS px) —
confirmed by testing 0.5px/1px/1.2px/1.3px side by side and getting an
identical `getComputedStyle(el).borderTopWidth` for all four. 1.4px is the
first value that actually renders thicker (2 device pixels ≈ 1.333 CSS
px). If a thickness tweak "does nothing" visually, check a few candidate
values via `getComputedStyle` before assuming the CSS didn't apply — this
is the same family of fractional-dpr issue as the full-bleed section-seam
hairline gotcha above, just hitting `border-width` instead of a layout
seam.
