---
name: project-artefact-block7-motion
description: "APPROVED final state for Artefact block 7 (7_кроки / steps) — entrance timing fix for firing after the gallery pin, card hover crossfade, card entrance sequencing/speed, and the scroll-hover guard. All confirmed live by her."
metadata:
  node_type: memory
  type: project
---

Block 7 ("7_кроки", `.steps`) — layout + motion fully built and iterated to
her approval. This consolidates everything that changed after the initial
build (which [[project-artefact-status]] already covered) so a future
session doesn't have to re-derive it from git history.

## 1. Entrance-timing fix (blocks 6 AND 7, then 8 too)
The gallery's pinned carousel (`galleryPinTrigger`) was letting downstream
blocks' entrance timelines fire mid-pin. **This took three attempts across
two sessions** — full failure analysis in
[[feedback-scrolltrigger-start-mutation]]. The version that actually works
now is `startAfterFloor(el, floorFn)` in `script.js`: a `start` FUNCTION
using a live `getBoundingClientRect()` read (not a hardcoded `--u` offset —
an intermediate version tried that and broke blocks 7/8's timing again by
dropping the `-viewportHeight*0.8` term), floored via `Math.max(natural,
floor)` where each trigger's floor chains to the PREVIOUS trigger's own
resolved `.start + 80` — never a single shared floor for every downstream
trigger, which collapses multiple triggers onto the same point. Bottom
line: use a `start` FUNCTION with live, chained geometry, verify with live
scroll instrumentation (`st.isActive`/`.progress` transitions during a real/
simulated scroll), never trust a static post-refresh `.start` read alone.

## 2. Card label crossfade ("(N)" ⇄ hover word) — final CSS
`.step__label-value-rest` (number) / `.step__label-value-hover` (word):
- **Bottom-aligned**, not top-aligned (`bottom: 0` on the absolutely
  positioned hover span) — both spans' different font-sizes (both are 40u
  now, matching per her request; originally 24 vs 40) used to put their
  baselines at different heights, so swapping in read as a downward jump.
- **Direction-aware transition duration**, not one fixed value: whichever
  span is *disappearing* uses the fast duration, whichever is *appearing*
  uses the slow one — set as the BASE rule (hover-OUT/leave case) plus a
  `.step:hover` override of just `transition-duration` (hover-IN/enter
  case), so the shared easing stays one declaration. Final: fast = 0.25s,
  slow = 0.85s. Giving each element ONE duration regardless of direction
  (the first attempt) only worked for hover-IN; on hover-OUT it was
  backwards (fast-reappearing number, slow-disappearing word), which is what
  produced the "number pops in before the word's gone" bug she flagged.
- **Easing: plain symmetric ease-in-out**, `cubic-bezier(0.65, 0, 0.35, 1)`
  — same on the rest/hover spans AND `.step__label-spacer`'s flex-grow
  transition (the parenthesis-spread animation is part of the same hover
  gesture, kept in sync). The project's usual signature hover curve
  (`cubic-bezier(0.16, 1, 0.3, 1)`, fast-start/slow-settle — see
  [[project-artefact-status]]'s "Established patterns") was tried first
  since it's the documented default for hover transitions, but she rejected
  it specifically for this crossfade ("плавно начинає і плавно закінчується"
  — smooth start AND smooth end). **Lesson: the signature curve is a
  default, not a universal law — a two-element crossfade can read better on
  a true ease-in-out; ask/iterate rather than assuming the signature curve
  always applies.**

## 3. Card entrance sequencing + speed
All three cards (`.step--1/2/3`) now enter **fully separately**, one after
another, each with the identical two-beat shape (label stagger, then
caption+text stagger) — `stepsCards.forEach(...)` in `runStepsEntrance()`.
Originally card 2 and 3 were combined into one paired beat (their labels
staggered together, then their bodies together), which read as neither
"separate" nor "simultaneous" and she called it out directly.
Durations/stagger/gaps are all scaled **×0.7** (30% faster) from the values
first shipped: label `duration:0.35, stagger:0.03`, gap `+=0.06`; body
`duration:0.25, stagger:0.04`, gap `+=0.06`.

## 4. Scroll-hover guard (reusable pattern, not just for steps)
Scrolling moves `.step` cards under a stationary cursor, and CSS `:hover`
re-evaluates purely from that — no mouse movement needed — so card 1 kept
triggering its hover every time she scrolled past it. Fix: `body.
is-scrolling` toggled by a plain `window.addEventListener('scroll', ...)`
with a 120ms idle-clear debounce (`initStepHoverGuard()` in `script.js`),
`.is-scrolling .step { pointer-events: none; }` in CSS. Native `scroll`,
not `lenis.on('scroll')` — Lenis here drives real native scroll (confirmed:
`window.scrollY` reads correctly elsewhere), so the native event fires
regardless of whether Lenis or the browser itself is moving it. **This
pattern is worth reusing for ANY future hover element near a scroll-heavy
area, not just steps' cards** — already folded into `BLOCK_STARTER_KIT.md`
as a general recipe ("Scroll-hover guard").

## Values her frustration was about — don't re-litigate lightly
Cards 1/2/3's separate-entrance ask and the crossfade jump were each raised
**three times** before landing (see [[feedback-scrolltrigger-start-mutation]]
for the timing-fix side of that same frustration, which needed a THIRD round
again later once block 8 landed and re-broke the same mechanism). If she
asks to revisit any of #2-#4 again, treat it as live iteration on an
already-fragile area — verify each change live before reporting it done,
don't just read code back.

Related: [[project-artefact-status]], [[feedback-scrolltrigger-start-mutation]].
