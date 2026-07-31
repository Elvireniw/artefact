---
name: project-artefact-block4-motion
description: "APPROVED motion settings for Artefact block 4 (4_глина це) — her own three-beat choreography plus the kasiasiwosz word-reveal; exact values, and why scrubbed beats are paced by scroll distance rather than duration."
metadata: 
  node_type: memory
  type: project
  originSessionId: f8bfb7b9-c0d7-4d36-8904-767b92814a10
  modified: 2026-07-30T18:41:20.818Z
---

Block 4 ("4_глина це", `.material`) motion — **she approved these exact values on 2026-07-30 and asked that they be saved**. Her choreography, her idea; do not redesign it without being asked.

## The four beats (script.js: `runMaterialEntrance()`)
| beat | what | settings |
|---|---|---|
| 1 | `( глина )` appears | `opacity 0→1`, `duration 1.4`, `stagger 0.14`, `sine.out`, trigger-once at `top 90%` — same recipe as `.hero__eyebrow` |
| 2 | blurred echo words converge from left+right | `opacity 0→1`, `x scatter→0`, `ease:'none'`, **scrub**, `top 95%` → `top 45%` |
| 3a | main paragraph arrives | `opacity 0→1`, `y 12→0`, `duration 1.0`, `sine.out`, trigger-once at `top 58%` — same as `.craft__body` |
| 3b | words light up one by one | `opacity 0.3→1`, `power2.out`, `duration 1.4`, `stagger 0.3`, **scrub**, `top 58%` → `top 8%` |

**Beat 3b's languid feel comes from the duration:stagger RATIO, not either value alone.** Under `scrub` the whole timeline is mapped onto the scroll range, so that pair decides how much each word's fade overlaps its neighbours. At `1.4 / 0.3` four words are brightening at once and one word takes ~60px of scrolling to light (measured). It previously leaned on GSAP's default `duration: 0.5` against `stagger: 0.16` — a tighter ratio that snapped each word on in ~52px and read as staccato. If she ever asks for "вальяжнее" again, widen the ratio; if she asks for crisper, narrow it.

## Beat 3b's origin — kasiasiwosz.com
Their effect for the "I work with top performers…" text. It is **not in any loaded .js file** — it is an inline Webflow `<script>` in the page; find it via `document.querySelectorAll('script:not([src])')`. Verbatim:
```js
const split = new SplitText(el, {type:"words", wordsClass:"word"});
gsap.fromTo(split.words, {opacity:0.3},
  {opacity:1, ease:"power2.out", stagger:0.1,
   scrollTrigger:{trigger:el, start:"top 80%", end:"top 35%", scrub:true}});
```
Ours matches except the range is shifted later so the highlight starts after the paragraph has arrived, and stagger is 0.16 for a more distinct wave. SplitText is a paid GSAP plugin this project does not load — `splitWordsDeep()` stands in.

## Two implementation rules learned here — apply to any future text motion
1. **A scrubbed tween ignores `duration` entirely.** Its pace comes from the scroll DISTANCE between `start` and `end`. To "slow it down so you can enjoy it" (her words), widen the range — both scrubbed beats went from 35% of the viewport to 50% (315px → 450px at vh 900).
2. **Container opacity × word opacity multiply, they do not overwrite.** Beat 3a animates `.material__text` itself while 3b animates its `.word` children, so the arrival and the highlight compose instead of fighting. This is the fix for the same class of bug that broke block 2's images (two tweens on one element's `y`) — see [[ref-rejouice-half-speed-parallax]].

## DONE — the 2x slowdown shipped once block 5 landed
Applied 2026-07-30 the moment the gallery block existed: beat 3b's `end` moved from `top 8%` to `top -45%`, taking the wave from 450px of travel to **1112px** (measured). Last word still reaches opacity 1 while `.material` is on screen. **If `.gallery` is ever removed, this must go back to ~`top 8%`** or the sentence never finishes.

Original context, kept because the reasoning recurs for any last-on-page section:

Why it could not be done then: `.material` was the LAST section, so max scroll landed exactly on its top edge — the whole block offered only 900px (one viewport) of travel, of which the first ~42% belongs to the label and the echo assembly. The wave could not start before `top 58%` because the paragraph is still invisible until then, so the reachable range was 50% → 53% of the viewport, i.e. **1.06x — not worth shipping**. Removing the section's bottom border was offered and declined: it frees no scroll distance whatsoever.

The fix once a block follows: block 4 starts scrolling up out of view, so the range can extend past its top edge into negative territory — roughly `start:'top 58%'`, `end:'top -45%'` gives the full 2x. One line, no layout change. Verify afterwards that the last word still reaches opacity 1 before the block leaves the screen.

Two options she rejected, so don't re-propose them: compressing the label/echo beats to free room (they are already approved), and making `.material` taller than the viewport (reintroduces the empty-beige band she disliked in block 2).

## Also settled in the same pass
Hero curtain now matches the dropdown menu's exactly — `clip-path` inset top-to-bottom, `duration 1.2`, `power3.out`. She compared rejouice's 1.6/expo.out against the menu's and chose the menu's. Both curtains share one mechanism and one setting.

Related: [[project-artefact-status]], [[ref-kasiasiwosz-text-reveals]].
