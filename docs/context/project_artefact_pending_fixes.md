---
name: project-artefact-pending-fixes
description: "Blocks 5/6 fixes from 2026-07-31. All five are now implemented, including the two gallery hairlines that failed twice — her own diagnosis was right on both. Awaiting her visual confirmation."
metadata:
  node_type: memory
  type: project
  originSessionId: fedf6898-2dc9-4526-bf3e-d202608dfe88
  modified: 2026-07-31T14:09:34.753Z
---

Blocks 5/6 work from 2026-07-31. See [[project-artefact-status]] for everything
else.

# The two gallery hairlines — FIXED on her diagnosis, needs her eyes

Both fixes are hers; two earlier code-first attempts had failed. Implemented
and checked live at 800x450 (1:1). **Not yet confirmed by her** — if she still
sees either line, start from the notes below, not from scratch.

## Line 2, the olive seam at the block 5/6 boundary — grain, as she said

`.philosophy` carries the canvas film grain; `.gallery__bar` (block 5's olive
caption strip) was flat `--olive-100` with none. Same colour, different
surface, so the boundary read as a line.

`initOliveGrain()` now sets `--grain` on `document.documentElement` instead of
on `.philosophy`, and `.gallery__bar` got a `::before` with the same
`background-image` + `mix-blend-mode: overlay`, plus `isolation: isolate` on
the bar to keep the blend inside it. `.philosophy::before` is unchanged and
inherits the var.

Worth knowing: `overlay` against the mid-grey tile does not only add noise, it
lifts the base ~0.4 levels. So the two olives differed slightly in **mean**
colour too, not just texture — which is why this reads as a clean line rather
than as a texture change.

## Line 1, the top of the beige note panel — the 1px raise, as she said

`.gallery__note::before` now has `top: -1px` and `height: calc(var(--u) * 448
+ 1px)`, so the bottom still lands on 1107u.

Why it works: measured live, the panel top and the card tops sat at the *same*
fractional y (248.3958 at dpr 1.5). Identical fractional coordinates in
different composited layers can round to different device pixels, so a sliver
of the photo behind the panel showed above it, full width. Overshooting by a
whole CSS px removes the coincidence entirely. The pixel it gains is beige on
`.gallery`'s own beige, so nothing above it changes.

## Verification notes — read before debugging any hairline here

- **dpr is 1.5 on her machine.** Fractional dpr is the precondition for all of
  this; don't reason as if edges land on whole device pixels.
- Resize the pane to **800x450** first. Screenshots then come back 800x450,
  i.e. 1:1 in CSS px, and a 1px line survives. This is what the two failed
  attempts skipped.
- `computer {action: "zoom", region: [...]}` **does not crop in this pane** —
  it silently returns the full screenshot. Don't rely on it to magnify a
  hairline; size the viewport instead.
- `getBoundingClientRect` is the wrong instrument here and cost two rounds.
  Measured again this session: `.philosophy` top *overlaps* `.gallery` bottom
  by 0.4px, so there was never a geometric crack at the boundary at all. The
  problem was always colour.
- No global `lenis` handle is exposed; plain `window.scrollTo` works fine for
  jumping to a scroll position when inspecting.

## The two dead attempts (don't repeat)

- `box-shadow: 0 2px 0 var(--olive-100)` on `.gallery`, for a measured 0.031px
  crack. The crack was not the bug. **Still in the code** — harmless, and it
  costs nothing since `.philosophy` covers it off the pin. Fine to drop.
- `.gallery__note::before` moved from `z-index: -1` to `0` with the `<p>` at
  `1`. **Still in the code**, same paint order either way.

# Done and verified earlier

## 1. Gallery note panel
`.gallery__note::before`: height 448u (the photo height) so it stops at 1107u
where `.gallery__bar` starts, instead of notching the olive strip. `left:
-10px`, **`right: 0`** — a 10px left inset for the text, but the right edge
stays on the slot line so the card parked behind the panel stays fully
covered. Text stays on 965u, "ДЕКОР" alignment untouched (her explicit call).

## 2. Carousel — **Pin: keep. ScrollTrigger `snap`: never.**
Pinned scrub: `start:'bottom bottom'`, `end:'+=' + PAGES*PAGE_SCROLL*u`,
`pin:true`, `scrub:1`. She likes the pinned paging — "карточки фіксувались на
своїх місцях і я встигала їх прокрутити" — **do not remove the pin**; an
earlier session removed it and she immediately noticed the loss.

The settle is `initGallerySettle()`, hand-rolled on Lenis. ScrollTrigger's own
`snap` settles by animating the NATIVE scroll position, and this page's scroll
belongs to Lenis (`initLenis`, driven off the GSAP ticker) — the two then write
the same value every frame and fight, exactly as the `initLenis` comment warns
for `window.scrollTo`. Her symptom was stutter on EVERY scrubbed tween from
block 2 down, not just the gallery.

Two traps hit while building the hand-rolled version, both now avoided:
- Lenis `lock: true` on `scrollTo` — if the settle is interrupted its
  onComplete never fires, Lenis stays locked, stops emitting scroll, and every
  scrubbed tween on the page freezes.
- An "am I settling" boolean guarding the listener — latches for the same
  reason. Neither is needed: an idle timer on `lenis.on('scroll')` plus a 2px
  tolerance check is self-terminating.

**Geometry, solved — do not re-derive.** The note panel occupies exactly one
card slot (left edge on the same 965u the 4th card lands on in the mockup
framing), so the only positions where it doesn't bisect a card are whole
multiples of the card pitch (448u + 10u = 458u) from that framing. Hence pitch
= snap grid, travel = ±458u = 3 stops. The track only has 818u of overhang, 49u
short of the 916u needed, so each end stop shows a 49u beige strip at the outer
edge — accepted, reads as end of row.

Tuning knobs at the top of the block: `GALLERY_PAGE_SCROLL` (1100u per page)
for pace, `GALLERY_PAGES` for how many stops, `GALLERY_SETTLE_IDLE` /
`GALLERY_SETTLE_DURATION` for the settle's feel.

## 3. Block 6 images
`.philosophy__img` drift -7 -> -15 and `.philosophy__img img` 125%/-12.5% ->
150%/-25%, i.e. block 2's exact numbers. Verified live: frame 444.5px, image
666.75px.

## 4. Hero scroll-out
`applySectionLag('.hero', '.hero > *:not(.hero__bg)')` — `.hero__vase-scene`
is now IN the lag. What makes the beige field appear to cover the Hero is not
z-order (`.hero` is `overflow:hidden`) but the lag: the children hang back and
the section's own bottom edge eats them. Safe w.r.t. the stacking-context
landmine — that rule is about `.hero` itself and ancestors of `.hero__bg`, and
`.hero__vase-scene` is `.hero__bg`'s sibling.

## Housekeeping
`.claude/launch.json` drives the dev server (`_serve.cjs`, port 8000). It is
often already running from a previous session — if `preview_start` reports the
port busy with a plain node process, that's it; just open
`http://localhost:8000` with `preview_start {url}`.
