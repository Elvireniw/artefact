---
name: project-artefact-close-icon-bug
description: "The dropdown menu's close-icon hamburger-to-X hover animation cost ~5 hours across two sessions but is now RESOLVED and confirmed working — read this for the working technique before implementing any similar custom-pivot rotation animation."
metadata: 
  node_type: memory
  type: project
  originSessionId: a18d892f-efdb-4bc1-a09f-fefca0a5b6e4
  modified: 2026-07-29T12:49:56.472Z
---

**RESOLVED 2026-07-29**, after ~5 hours total across two sessions — user confirmed working ("ПОЛУЧИЛОСЬ!!!"). Final answer below; read this before ever touching this element again, the dead-end list further down is still worth avoiding repeating if similar transform-origin issues come up elsewhere.

## Final working solution
- The icon is back to real SVG (`<svg><path>` bars, geometry from `menu-icon-mob.svg`: bar1 `M0 17.0002H15.5674V19.0002H0L0 17.0002Z`, bar2 `M20.4326 17.0002H36V19.0002H20.4326V17.0002Z`), NOT plain HTML divs — the user specifically wanted the real asset back, not a lookalike.
- `.menu-overlay__close-icon-bar { transform-box: view-box; transform-origin: 18px 18px; }` — required for SVG so the shared pivot resolves against the 36x36 canvas, not each bar's own tiny fill-box.
- Positioned at `left: calc(var(--u) * 1807); top: calc(var(--u) * 26)` — exactly `.hero__menu-btn`'s own position, so it reads as "меню" turning into this icon.
- **Trigger: hover (not auto-on-open), via JS `mouseenter`/`mouseleave` — NOT CSS `:hover`.** This turned out to matter a lot for testability (see below) and was also just what she wanted: hovering plays the morph forward, moving away reverses it.
- **The morph itself is NOT driven by GSAP's `rotate`/`x` shorthand properties, and NOT by a CSS transition on `:hover`.** Both were tried multiple times across two sessions and never reliably respected this icon's custom `transform-origin` during the actual animated tween (see "methodology lesson" below for why this was so hard to even detect). The working technique: tween a plain numeric proxy object (`{p: 0}` → `{p: 1}`) with GSAP, and in `onUpdate`, manually write the literal transform string onto the element every frame:
  ```js
  bar1.style.transform = `rotate(${45 * morph.p}deg) translateX(${10.2163 * morph.p}px)`;
  bar2.style.transform = `rotate(${-45 * morph.p}deg) translateX(${-10.2163 * morph.p}px)`;
  ```
  This bypasses GSAP's internal transform handling entirely — the browser just parses a normal CSS transform string every frame, the same reliable way it always has, respecting the CSS `transform-origin`/`transform-box` naturally.
- `closeMenu()` force-sets both bars to the full end-rotation (`gsap.set`-equivalent instant style write) the moment closing starts, regardless of what hover state they were in — since clicking close always means "closing from the X," there's no ambiguity about the target state, and this prevents ever showing/fading from a half-rotated icon.
- Click handler does only `closeMenu()` — no opacity/scale effect on click (last confirmed spec: hover-only, no click effect).

## Final state (superseded — kept for history)
`.menu-overlay__close-icon-bar--1`/`--2` are plain HTML `<span>` elements with a permanently baked-in CSS `transform: rotate(45deg)` / `rotate(-45deg)` — no morph, no hover, no click effect, no GSAP involvement of any kind. `closeIcon`'s click handler does nothing but call `closeMenu()`. This is deliberately the simplest possible implementation, chosen specifically because it has no moving parts left that could misbehave.

## Important methodology lesson (independent of this specific bug — applies to ANY future transform-origin debugging)
A large fraction of this session's wasted time came from a flawed verification technique: comparing `getComputedStyle(el).transform` matrices before/after a rotation, expecting the matrix's translation components (e, f) to reflect the `transform-origin`'s effect. **They never do.** `getComputedStyle().transform` reports only the raw composed transform *functions* (rotate, translate, scale) evaluated as if around (0,0) — `transform-origin` is applied separately by the renderer at paint time and is invisible to that property entirely. Comparing matrices this way produced what looked like damning proof of a bug (e,f staying at 0,0 after a rotation around a non-zero custom origin) when that was actually the **expected, correct** output.

The correct way to verify a custom transform-origin is visually working: compare `getBoundingClientRect()` of the rotating element before and after, and check that the *pivot point* (the point transform-origin was set to) stays at the same screen coordinates across the rotation — i.e. one corner/edge of the bounding box shouldn't move. Did this properly, once, late in the session, and it confirmed the rotation geometry (plain HTML bars, CSS `transform-origin` pointing at the icon's shared center, GSAP `rotate` shorthand) was actually landing correctly on screen (pivot points matched the icon's true center within ~1px). So the geometry itself was likely never the real bug — see below.

## What was tried, in order (do not repeat)
1. SVG `<path>` bars with `transform: rotate() translateX()`, shared `.hero__menu-icon-bar` classes with the header's own icon — hover-triggered. Broke because `body.menu-is-open` rules (unconditional) bled onto the reused classes.
2. Same SVG bars, own dedicated classes, hover-triggered, `transform-box: view-box` added for correct SVG pivot — user reported hover produced disconnected/fragmented-looking bars.
3. Diagnosed (correctly, per the matrix-comparison method later found flawed) that GSAP's `rotate`/`x` shorthand doesn't respect SVG `transform-origin`/`transform-box`/`svgOrigin` — worked around by manually tweening a proxy value and writing the `transform` string via `onUpdate`. This one WAS verified via `getBoundingClientRect` math at the time and did produce mathematically correct target matrices for the *string-written* case (different from the shorthand-property case) — this specific technique is probably trustworthy if this is revisited.
4. Switched trigger model from hover to "auto-morph once on menu open" (no hover) after hover proved unreliable to get right — user went back and forth several times on whether she wanted hover or auto-morph; this ambiguity itself burned real time. **If revisiting, get an explicit, single, written-down answer on trigger model before writing any code.**
5. Rebuilt bars as plain HTML `<span>` (not SVG) reasoning that SVG's fill-box/view-box ambiguity was the root cause — geometry math (transform-origin per bar, positioned at the icon's shared center) was verified correct via `getBoundingClientRect` (see above). User still reported the same "jumps left" symptom after this rebuild, tested via proper `http://localhost` (not just `file://`).
6. Discovered mid-session the user had been testing via `file:///D:/...` directly for at least part of the debugging — `file://` pages cache CSS/JS unreliably compared to a real HTTP server and may not have been picking up edits on refresh. Started a local Node static server (`_serve.cjs` in the project root, plain http.server-equivalent, `Cache-Control: no-store` on every response) on port 8000 specifically to rule this out. **Even after switching to `http://localhost:8000` and confirming fresh loads, user still reported the identical symptom.** So `file://` caching was a real, separate problem worth fixing, but not the (or not the only) explanation for this specific bug.
7. Landed on the fully static fallback described above.

## Open question, unresolved
Given the geometry was verified mathematically correct via the right method (step 5/discovery above), and the bug persisted anyway through several different implementations, it's possible the "jumps left" the user was seeing was never actually about this icon's transform math at all — could have been a different element, a perception/timing thing, or something in her specific browser/OS that never got isolated (no working screen-share/video-viewing capability was available to actually watch her repro). This was never conclusively root-caused. The static fallback sidesteps the question entirely rather than answering it.

## If she wants the morph animation back in a future session
- Confirm the trigger model FIRST (hover vs. auto-on-open) in writing before any code.
- Reuse the plain-HTML-bars + CSS-transform-origin + GSAP-rotate approach from step 5 — it's the most defensible technically and the geometry was verified via the correct method.
- Verify using `getBoundingClientRect()` pivot-point comparison, never `getComputedStyle().transform` matrix comparison.
- Ask her to test via `http://localhost:8000` (start `node _serve.cjs` from the project root if it's not already running) — never `file://`.
- Consider asking her to record a short screen capture with the browser's own DevTools "Rendering > Paint flashing" or similar, or literally screen-share, since blind iteration on this element has proven extremely costly twice now.
