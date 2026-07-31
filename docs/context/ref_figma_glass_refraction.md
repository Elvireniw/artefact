---
name: ref-figma-glass-refraction
description: "How Figma's Glass/refraction effect actually works (from its own shader source) and the calibration factors used to reproduce it in CSS+SVG — read before touching the glass cursor or adding glass anywhere else."
metadata: 
  node_type: memory
  type: reference
  originSessionId: b7628e1b-5fbc-44d4-8588-e6ea0e23678e
  modified: 2026-07-31T09:43:24.742Z
---

Figma's built-in **Glass** effect has no readable source, but the account shader library's **"Pattern refraction"** effect (id `f1a4fc0f-dcc1-45e3-bad6-ec82abb7c7eb`, read via `get_shader_effect` + `ReadMcpResourceTool`) is the same model, and its WGSL is readable. This is what it does:

1. Height field over the shape → surface normals (finite differences).
2. `refract(ray, normal, ior)` per colour channel, ray = (0,0,-1).
3. Sample the backdrop at `localPos + refractedDir.xy * amount`.

**Dispersion is exact, no guessing needed.** `iorR = 1.333 + d`, `iorG = 1.333`, `iorB = 1.333 - d`, where `d = (Dispersion / 100) * 0.25`. For a near-flat normal, `refract()` bends by roughly `(ior - 1)`, so **Dispersion 35 → per-channel displacement ratios 1.2628 / 1.0 / 0.7372**. Those are the three `feDisplacementMap` scales.

**Frost is NOT blur** — the shader scales the slider by 0.1 and adds it as value noise into the height field (surface roughness). Figma's Frost 7 → 0.007, i.e. essentially nothing. Any Frost value under ~20 should read as *almost no blur*.

**Light at 0% intensity means there is no specular highlight at all.** The bright rim in a Glass mockup comes from refraction bending the backdrop, not from a light source — don't fake it with gradients.

**Refraction and Depth are NOT in px** and Glass's scale differs from the library shader's, so they must be calibrated by eye against the Figma render. Values that landed for Artefact's cursor (Figma Refraction 44 / Depth 73):
- displacement scale = **10% of the bubble's diameter** (`GLASS_REFRACTION_SCALE`)
- bevel reaches **23.4% of the radius** inward (`GLASS_BEVEL`)

First attempt used 44% of diameter and 36.5% bevel — that reads as a **soap bubble**, huge rainbow. The rainbow fringe grows very fast with the scale; if glass ever looks "too prismatic", lower the scale, not the dispersion ratios.

## Web implementation notes
- `feDisplacementMap` is structurally the same algorithm, so no WebGL is needed.
- The `<filter>` needs `color-interpolation-filters="sRGB"` — the default linearRGB gamma-converts the normal map's channel values before they're read as offsets.
- Filter region must be **larger than the element** (`x/y -25%`, `w/h 150%`) or the rim samples transparent black instead of real backdrop. Easiest handling: generate the normal-map canvas at 150% with neutral grey (128,128,128) in the margin and give `feImage` **no** subregion, so it fills the filter region and no primitive-subregion maths is needed.
- The normal map is generated once in a `<canvas>` (`toDataURL`) and stretched with `preserveAspectRatio="none"`; only the `scale` attributes need re-syncing when `--u` changes.
- `url()` inside `backdrop-filter` works in **Chrome/Edge only**. Ship two declarations so the cascade degrades safely: `backdrop-filter: blur(1.5px);` then `backdrop-filter: blur(1.5px) url(#...)`. Safari/Firefox keep the first. `@supports` does NOT help here — it tests parsing, not rendering.
- Verified rendering live at 220px; at the real ~50–110px bubble it's correct but too small to judge from a screenshot, so inspect by temporarily inflating the element.

Built for [[project-artefact-status]]'s glass cursor. [[feedback-read-the-source]] paid off again — the dispersion ratios came straight out of the shader instead of five rounds of eyeballing.
