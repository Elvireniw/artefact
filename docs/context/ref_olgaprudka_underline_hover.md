---
name: ref-olgaprudka-underline-hover
description: "Two underline-hover CSS techniques found on olgaprudka.com, one already used in Artefact's nav, one still needed for permanently-underlined elements (e.g. footer contact name/email)"
metadata: 
  node_type: memory
  type: project
  originSessionId: a15a51a5-b2c1-46a7-82e3-31e14c573ace
  modified: 2026-07-28T08:57:57.770Z
---

Reference site: https://olgaprudka.com — user picked its underline hover as a motion reference for the Artefact project.

**Technique A — no underline at rest (draw-in on hover).**
Source uses `.link::after`: absolute pseudo-element, `height: 0.05em`, `background: currentColor`, `transform: scaleX(0)`, `transform-origin: 100% 100%` at rest; on hover flips to `transform-origin: 0 0` + `scaleX(1)`, `transition: transform 0.5s cubic-bezier(0.215,.61,.355,1)`. Line draws in left→right on hover, retracts back to the right on mouseleave.
This is already implemented in Artefact for the top nav links as `.hero__link-underline` at [style.css:428](../../../../../../9_CLAUDE/Sessions/Artefact/style.css) (same transform-origin-flip trick, just a real `<span>` instead of `::after`). No action needed here.

**Technique B — permanent underline, "collapse then redraw" sweep on hover.**
Source uses `.link--underline::after`: underline visible at rest (`scaleX(1)`, origin `0 0`). On hover it runs a *named keyframe* (not a plain transition), `animation: 0.75s ease 0s 1 normal forwards`:
```css
@keyframes link {
  0%, 0.1%   { transform-origin: 100% 100%; transform: scaleX(1); }
  49.9%      { transform-origin: 100% 100%; transform: scaleX(0); }
  50%, 50.1% { transform-origin: 0 0;       transform: scaleX(0); }
  100%       { transform-origin: 0 0;       transform: scaleX(1); }
}
```
i.e. the line first collapses away toward its right edge (0%→50%), then redraws from the left edge (50%→100%) — a "swipe" rather than a simple fade/retract. Source also disables it on touch (`.touchevents .link--underline::after { display:none }`, falls back to plain `text-decoration: underline`).

**Why this matters:** the user described elements in the Artefact design that already have a permanent underline (like the "DASHA" name / email link on the reference site) — these belong to Technique B, not Technique A. Artefact has no implementation of Technique B yet; it's needed for whichever block has permanently-underlined text/links by design (likely the footer/contact area — files `11_СТА.png` / `14_футер.png` in the project root, not yet coded as of 2026-07-28).

**How to apply:** when that block is built, reuse Technique B's keyframe verbatim (renamed to the project's `hero__`/section BEM convention), gated the same way behind a `hover: hover` / non-touch media query as the rest of Artefact's hover work. Confirm the exact HTML elements and Figma node with the user before writing the Claude Code prompt — don't assume which elements get it.
