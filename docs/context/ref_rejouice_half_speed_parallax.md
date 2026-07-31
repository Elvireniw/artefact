---
name: ref-rejouice-half-speed-parallax
description: "rejouice.com's scroll effect she wants on Artefact — video drifts at exactly HALF the scroll rate; measured mechanics, plus the fact she could NOT see it yet in our build (unresolved)."
metadata: 
  node_type: memory
  type: reference
  originSessionId: f8bfb7b9-c0d7-4d36-8904-767b92814a10
  modified: 2026-07-30T17:43:23.546Z
---

Reference site: https://www.rejouice.com/ — she flagged its scroll effect (2026-07-30) and wants it on Artefact. **She has NOT confirmed seeing it working in our build yet** ("Пока не вижу эффекта") — treat as unresolved/pending visual verification, not done.

## THE ACTUAL SOURCE (read from their Nuxt chunk `BdSAQIjB.js`)
Stop measuring DOM positions on this site — it hijacks `window.scrollTo`, so programmatic-scroll measurements are unreliable and produced wrong conclusions twice. Read the bundle instead: find the chunk with `fetch()` + a `/videos-wrapper|hero-reel/` test over `performance.getEntriesByType('resource')`.

They use GSAP + ScrollTrigger + lenis, **no pin, no sticky anywhere**. TWO scrubbed timelines:

```js
// 1. TOP BLOCK CONTENT LAGS — the effect she kept pointing at
gsap.timeline({scrollTrigger:{trigger: hero, scrub:true,
  start:"top top", end:"bottom top", invalidateOnRefresh:true}})
  .fromTo(logo, {y:0}, {y:() => hero.offsetHeight * 0.5, ease:"none"})

// 2. VIDEO
gsap.timeline({scrollTrigger:{trigger: reel, scrub:true,
  start:"top bottom", end:"bottom top"}})
  .fromTo(video, {yPercent:-50}, {yPercent:50, ease:"none"})
```
Their video element is **100% of its container** — no oversizing. `height:100%` + `yPercent ±50` is self-covering: the uncovered half is always the half that is off-screen. A 200%-tall box with ±25% gives the identical on-screen drift, so that variant is pointless complexity.

**Effect 1 was the missing piece.** Artefact's Hero ran `y:-100` over `end:'center top'` — opposite direction, ~1/5 the distance. Content drifting DOWN while the page scrolls up is what reads as lag; moving it up just makes it leave sooner. Now matched (children of `.hero` only — never `.hero` itself, see [[project-artefact-status]]), fade kept per her call.

## Their preloader curtain (also copied, 2026-07-30)
```js
gsap.timeline({defaults:{ease:"expo.out", duration:1.6, onComplete:…}})
  .set(el,{yPercent:0}).to(el,{yPercent:100}, 1.4)   // panel slides DOWN
  .to(content,{opacity:0},1.2).to(content,{y:-innerHeight},1.4)
```
Artefact's Hero curtain now uses `ease:'expo.out'` (was `power3.out`; duration was already 1.6) and reveals **top-to-bottom** — `clipPath` initial state flipped from `inset(100% 0 0 0)` to `inset(0 0 100% 0)`. A 100% BOTTOM inset leaves a zero-height strip at the top, so animating it to 0 grows the reveal downward.

## Site-wide state after this pass
- Fade-outs removed from every block — the lag drift alone carries transitions.
- All section pins/holds removed (they caused a visible jolt on arrival). `initSectionPins`, `craftPinTrigger`, `sectionPins` all deleted.
- `applySectionLag(section, children)` is the shared helper; `.hero` still wired only from `runHeroEntrance()` (stacking-context landmine), the rest from `initSectionScrollLag()`.
- **Known/expected:** the LAST section on the page can never show its lag — its trigger needs scroll room past `start:'top top'` and the document ends with it (measured: `maxScroll === materialTop`). Resolves itself when a further block is added.

## Earlier measured mechanics (superseded by the source above)
- Hero reel: the container (`.reel`) tracks scroll 1:1, while the video inside (`.videos-wrapper`) translates at **exactly half the scroll rate** — 150px of drift per 300px scrolled. Transform ran from `translateY(-404px)` to `+196px` over ~1200px of scroll.
- **No sticky or fixed elements anywhere on that page (0 found).** Blocks do not stack, pin, or overlap — it is ordinary scroll. Do not build a stacking/pinning mechanism for this.
- Their SECOND video block (`.home-video`) has **no parallax at all** — scrolls 1:1. The effect lives only in the first hero+video pairing.
- "Top block's elements don't disappear" there simply because they apply no fade-out — there is no mechanism behind it. She explicitly chose to KEEP Artefact's own fade-out for now, revisit after everything is built.

## How it was implemented on Artefact (block 3 video)
`initClayVideoParallax()` in script.js — `gsap.fromTo(clayVideo, {yPercent:-25}, {yPercent:25})`, `scrub:true`, `start:'top bottom'`, `end:'bottom top'`. CSS `.clay__bg` sized `height:200%; top:-50%`.
- Rate maths: while on screen a section travels (viewport + section height); drifting the video by half of that reads as half-speed. 25% of a 200%-tall box = 50% of the section = half the travel.
- Verified: 200px drift per 400px scroll = rate 0.5 exactly; video covers the section top and bottom at every sampled position (no exposed edge).
- **Free visually** because the source clip is PORTRAIT 720x1280 in a landscape frame — `object-fit:cover` scales by width (2.67x), covered content is ~3413px tall regardless, so a 200%-tall box reveals more footage rather than zooming further. Same trick applies to any portrait source.
- Known side effect: during block 3's 400px pin-hold the video keeps drifting while the section is frozen, because pin and parallax read the same scroll. Not yet judged good or bad.

## If she still can't see it
Most likely causes to check first, in order: the drift is genuinely subtle at half-speed on a full-bleed background; the pin-hold masks it; or she is looking at the Hero (which has NO parallax — she deferred that decision, see [[project-artefact-status]]). Consider temporarily exaggerating the rate to confirm it is wired at all before re-tuning.

Related: [[project-artefact-status]], [[ref-olgaprudka-underline-hover]], [[ref-kasiasiwosz-text-reveals]].
