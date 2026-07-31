---
name: project-artefact-pending-fixes
description: "RESOLVED and confirmed by her. Historical record of the two gallery hairlines from blocks 5/6 (2026-07-31) — three attempts, the reusable lesson (transparent-body sub-pixel gap between full-bleed sections) now lives in [[project-artefact-status]]'s CRITICAL gotchas."
metadata:
  node_type: memory
  type: project
  originSessionId: fedf6898-2dc9-4526-bf3e-d202608dfe88
  modified: 2026-07-31T14:43:51.792Z
---

Blocks 5/6 work from 2026-07-31, closed out and confirmed by her the same day.
See [[project-artefact-status]] for current project state and the durable
lessons — this file is now just the incident log.

# Two gallery hairlines — both fixed, both confirmed

## Line 1 — top of the beige note panel over the photos
`.gallery__note::before` had `top: -1px`, height `calc(var(--u)*448 + 1px)`
added (bottom still lands on 1107u). Cause: panel top and card tops sat at the
*identical* fractional y (248.3958 at dpr 1.5); identical fractional
coordinates in different composited layers can still round to different
device pixels. Overshooting by a whole CSS px removes the coincidence. Fixed
on the first attempt, her diagnosis.

## Line 2 — the seam between block 5's olive bar and block 6 — took 3 attempts
1. **First attempt (failed):** grain. `.gallery__bar` was flat `--olive-100`
   while `.philosophy` carried canvas film grain — added the same grain +
   `mix-blend-mode: overlay` to `.gallery__bar`. Correct and necessary, but
   not sufficient alone.
2. **Second attempt (made it WORSE):** removed an old `box-shadow: 0 2px 0
   var(--olive-100)` hack on `.gallery` that predated the grain fix, reasoning
   it was now an ungrained sliver standing out between two grained surfaces.
   Wrong diagnosis — the line got *thicker*, which was the tell that this was
   a real geometric gap, not just a colour/texture mismatch, and the
   box-shadow had been crudely patching it.
3. **Third attempt (fixed):** `body`/`html` have a transparent background,
   and `.gallery`'s bottom edge sits only ~0.4px from `.philosophy`'s top in
   exact math. At fractional `devicePixelRatio` (1.5, confirmed on her machine
   and in the browser pane used to verify), the two edges round to device
   pixels independently and can land a physical pixel apart, letting the
   page's default white show through the transparent body — hence a pale/
   white line, not an olive one. Fixed with `margin: -2px 0 0` on
   `.philosophy`, forcing a real overlap no rounding combination can defeat.

**The general lesson from this (worth internalizing, not just this bug):**
a hairline that reads pale/white is a geometry problem (transparent-body gap);
a hairline that reads as a duller/brighter shade of the section colour is a
texture/colour problem (grain mismatch). Diagnose which one it is before
picking a fix — this bug looked like the latter and was actually the former.
Full gotcha writeup, for reuse on any future block boundary, is in
[[project-artefact-status]].
