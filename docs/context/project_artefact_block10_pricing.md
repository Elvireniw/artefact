---
name: project-artefact-block10-pricing
description: "APPROVED final state for Artefact block 10 (10_тарифи / pricing cards) — title-image alignment fix (with the PNG pixel-measurement technique), card hover mechanics, the hairline counter-scale fix, CTA underline, and border thickness. All confirmed live by her."
metadata:
  node_type: memory
  type: project
---

Block 10 ("10_тарифи", `.pricing`) — three pricing cards (`.pricing__card--basic`
/ `--featured` / `--pro`). Layout landed cleanly; the motion/polish pass took
several rounds on two specific, easy-to-repeat mistakes. This consolidates
the final state so a future session doesn't re-derive it or repeat the same
wrong turns.

## 1. Title-image left-alignment — the real bug, found on the 4th attempt
Cards 2 and 3's titles (`pricing-title-2.png` / `pricing-title-3.png`) are
`<img>` elements sitting beside plain-text subtitles (`<p
class="pricing__card-subtitle">`). Both had CSS `left: 40u` — IDENTICAL to
the subtitle's `left: 40u` — yet visually the title's glyph sat clearly to
the right of the subtitle's `(`. Three rounds of "fix" (all re-checking that
the CSS `left` values matched, or re-reading the image's alpha-channel
bounding box) reported "already aligned" and changed nothing visible.

**Root cause**: both PNGs were exported FLATTENED onto an opaque background
matching their card's own color, not with real alpha transparency (unlike
`h-1price.png`, card 1's title, which genuinely IS transparent). An
alpha-channel bounding-box check reports `(0,0)` for a fully-opaque image
regardless of where the visible glyph actually starts — a false "no offset
needed" reading. The image LOOKS like it has no padding only because the
transparency check is answering the wrong question.

**How it was actually measured** (canvas pixel scan, not eyeballing or
alpha): draw the image to an offscreen canvas, read the pixel color at
`(0,0)` as the background reference, then scan column-by-column for the
first pixel whose color differs from that reference by a meaningful amount
(`|Δr|+|Δg|+|Δb| > 30` was enough margin). This found a real ~15-16px
baked-in left margin in both `pricing-title-2.png` (16px of 492) and
`pricing-title-3.png` (15px of 449) — both assets happen to render at
1 natural pixel = 1u, so the column index converts directly to a `u` value
with no extra scaling math.

**The fix**: subtract that measured padding from the title's `left`, same
compensation `h-1price.png` already needed (its own ~16u padding is why
card 1's title `left` is 23.9u, not 40u, even though its subtitle is at
40u):
- `.pricing__card--featured .pricing__card-title`: `left: 24u` (40 − 16).
- `.pricing__card--pro .pricing__card-title`: `left: 25u` (40 − 15).

Verified by measuring the RENDERED position of the visible ink (title box's
`getBoundingClientRect().left` + padding-in-px) against the subtitle's first
character's own rendered rect (via a `Range` around its text node) — the
two now differ by a rounding error under 0.01px, not by eyeballing a
screenshot.

**Lesson for any future title-image-next-to-real-text case**: don't trust
"the CSS `left` values match" or "the image's alpha bbox starts at (0,0)"
as proof of visual alignment. Do the canvas color-scan. It's cheap and it's
the only check that actually answers the right question.

## 2. Card 3 title vertical position
`.pricing__card--pro .pricing__card-title`'s `top` needed THREE separate
literal-px nudges upward before it read as correct to her (30-07/2026 →
2026-08-01, requested 3 separate times, each "a bit more"): -5px, then -6px
(replacing the -5px), then another -7px on top of that. Final: `top:
calc(calc(var(--u) * 90) - 13px)`. If she asks for more, it's an
established pattern of small sequential nudges — don't over-correct in one
jump, just apply the next literal px delta she gives.

## 3. Card hover: the whole card lifts and scales — confirmed final
```css
.pricing__card {
  transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}
@media (hover: hover) and (pointer: fine) {
  .pricing__card:hover {
    transform: translateY(-2px) scale(1.01);
  }
}
```
A per-child version (`.pricing__card > *` scaling instead of the card's own
box) was built and shipped first, then explicitly rejected — she wants the
CARD's own box moving (background, border, everything, as one unit), not
just its contents. Don't reintroduce the per-child version without her
asking for it again specifically.

## 4. Hairline-inside-a-scaling-hover jitter — counter-scale fix
The CTA underline (`.pricing__card-cta-line-track`, a 1px-tall strip) sits
inside `.pricing__card`, so the card's own `scale(1.01)` on hover visually
stretches the line too — a real 1px really does render at ~1.01px once its
scaled ancestor is hovered, and animating through that continuous 1%
change reads as visible jitter/trembling on the line specifically (thin
features are far more sensitive to sub-pixel rounding than anything else
on the card). Fix, confirmed working (verified the line's rendered
`getBoundingClientRect()` height/width are IDENTICAL at rest and at a
simulated hover, not just close):
```css
.pricing__card-cta-line-track {
  transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1); /* same as the card's */
}
@media (hover: hover) and (pointer: fine) {
  .pricing__card:hover .pricing__card-cta-line-track {
    transform: scale(calc(1 / 1.01)); /* exact inverse of the card's own hover scale */
  }
}
```
Matching the transition's duration/easing to the card's own is what makes
the two scales cancel THROUGHOUT the animation, not just at the two end
states — a mismatched duration/easing would still jitter mid-transition
even with the correct end-state math. **Reusable pattern**: any future card
that scales on hover and contains a hairline border/line needs this same
counter-scale on that specific element.

## 5. CTA underline: static, no hover animation (deliberate exception)
Unlike Hero/craft's CTAs, which use the shared `heroLineSweep` hover
animation (see "Established patterns" in [[project-artefact-status]]),
pricing's CTA underline is a permanently-visible STATIC line with NO hover
behavior of its own — she explicitly rejected the animated sweep here
("не уместно" — doesn't suit this card, plus the sweep animation itself
was what originally read as "jittering," before the real hairline-vs-scale
cause above was found). Markup keeps the same `.pricing__card-cta-line-track`
/ `.pricing__card-cta-line` / `.pricing__card-cta-line--out` class names as
every other CTA on the site for consistency, but NO
`.js-line-hover:hover .pricing__card-cta-line--out { animation: ... }` rule
exists for it — don't add one back without her asking. The plus-icon swap
(`.pricing__card-cta-plus-char`) is untouched and still animates on hover
as normal.

## 6. Border-width devicePixelRatio rounding cliff
`.pricing__card--pro`'s hairline border was `0.5px`, changed to `1px` "to
match the project's standard line thickness" — visually IDENTICAL, no
change she could see. Confirmed live: at her devicePixelRatio (1.5), EVERY
border-width from 0 up to ~1.3px renders at the exact same physical
thickness (all round down to 1 device pixel ≈ 0.667 CSS px) — tested
0.5px/1px/1.2px/1.3px side by side via `getComputedStyle(el).borderTopWidth`,
all four identical. 1.4px is the first value that actually renders thicker
(rounds up to 2 device pixels ≈ 1.333 CSS px). Final value: `border: 1.5px
solid rgba(154, 150, 113, 0.2)`. **This is a NEW instance of the project's
known dpr-1.5 sub-pixel gotcha** (previously only documented for the
full-bleed section-seam hairline, fixed there with `margin: -2px`) — it
also applies directly to `border-width` itself, and probably to any other
sub-2px dimension on this project. If a thickness change "does nothing"
visually, test a few candidate values via `getComputedStyle` before
assuming the CSS didn't apply.

Related: [[project-artefact-status]].
