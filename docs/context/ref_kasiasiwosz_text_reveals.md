---
name: ref-kasiasiwosz-text-reveals
description: "Two GSAP/ScrollTrigger text-reveal techniques from kasiasiwosz.com (per-line heading mask-reveal, per-word scroll-scrubbed emphasis) the user wants reused across the Artefact landing page"
metadata: 
  node_type: memory
  type: project
  originSessionId: a15a51a5-b2c1-46a7-82e3-31e14c573ace
  modified: 2026-07-30T18:19:43.971Z
---

Reference site: https://www.kasiasiwosz.com/ — user wants "the different text-appearance effects" from this site reused across the whole Artefact landing page (not just Hero). Confirmed via live DOM/JS inspection (Webflow site, GSAP + ScrollTrigger both present as `window.gsap`/`window.ScrollTrigger`).

The site marks animated text with a custom `animate="..."` attribute, three variants found:

**1. `animate="line"` — headings, mask-slide-fade per line.**
Each visual line of a heading (e.g. `<h2>`) is split into its own `<div>`, one per line, each starting at:
```
opacity: 0; transform: translate(0px, 100%);
```
(hidden, shifted down 100% of its own line-height) and animated by GSAP to `opacity:1; transform:none` — a per-line "slide up + fade in" reveal, staggered line by line. No blur involved at all — pure transform/opacity, so it sidesteps whatever rendering problem the user hit trying to do progressive `filter:blur()` on a per-letter SVG.

**2. `animate="word"` — paragraph emphasis, scroll-scrubbed per word.**
Each word is wrapped in its own `<div class="word">`, and its `opacity` is tied to scroll position (ScrollTrigger scrub, not a one-time load animation): words not yet "reached" sit at `opacity: 0.3` (dim gray), words the scroll has passed are `opacity: 1` (full black) — a "reading spotlight" effect, matches the screenshot the user shared of the "(02) WHEN SUCCESS..." section where some words in "It's about working in a way that's finally aligned with who you are now." are already dark and others still dim.

**3. `animate="footer-letter"`** — per-letter: `SplitText` type `chars`, `fromTo(chars, {y:'-100%'}, {y:'0%', ease:'power2.out', stagger:0.1, duration:0.8})`, trigger `top 95%`, `once:true`.

**SOURCE READ (2026-07-30).** All three drivers are **inline `<script>` blocks in the page**, NOT in any loaded `.js` file — find them via `document.querySelectorAll('script:not([src])')`. Exact code:
```js
// animate="word"
const split = new SplitText(el, {type:"words", wordsClass:"word"});
gsap.fromTo(split.words, {opacity:0.3},
  {opacity:1, ease:"power2.out", stagger:0.1,
   scrollTrigger:{trigger:el, start:"top 80%", end:"top 35%", scrub:true}});

// animate="line"
const split = new SplitText(el, {type:"lines", wordsClass:"line"});
gsap.fromTo(split.lines, {y:'100%', opacity:0},
  {y:'0%', opacity:1, ease:"power2.out", duration:0.5, stagger:0.1,
   scrollTrigger:{trigger:el, start:"top 80%", once:true}});
```
They load the paid `SplitText` plugin; Artefact does not — use `splitWords()` / `splitWordsDeep()` instead. The `word` variant is now live on Artefact block 4 — see [[project-artefact-block4-motion]] for the adapted values. The `line` variant is still unused.

Both effect containers also carry a real `aria-label` with the full plain-text sentence, and the split pieces are `aria-hidden="true"` — same accessibility pattern Artefact already uses (`<h1 class="visually-hidden">`), no new approach needed there.

**Why this matters:** user is building out Artefact section by section and wants a consistent, reusable "vocabulary" of text-reveal effects across the whole landing page — line-reveal for headings, word-scrub for body copy — sourced from this site rather than invented ad hoc per section. [[ref-olgaprudka-underline-hover]] is the sibling reference note for hover micro-interactions; this one is for scroll/load text reveals.

**How to apply:** when building each new Artefact section, check this note before proposing a fresh reveal technique — prefer reusing "line" (headings) / "word" (body paragraphs) unless the section has a specific reason not to. The project already has GSAP loaded (script.js), so no new dependency is needed; ScrollTrigger would need to be added to index.html's script tags when a scroll-driven (not just load-driven) reveal is needed for the first time.
