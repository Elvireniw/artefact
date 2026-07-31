---
name: project-artefact-scroll-transition-options
description: "Two proposed options for the Hero-to-block-2 scroll transition; Variant A (no cross-section interaction, just scroll-triggered reveal) was chosen first; Variant B (subtle parallax lag on Hero) is saved for a possible later pass"
metadata: 
  node_type: memory
  type: project
  originSessionId: a18d892f-efdb-4bc1-a09f-fefca0a5b6e4
  modified: 2026-07-29T13:42:51.136Z
---

Discussed 2026-07-29 when starting block 2 ("craft" section) effects. User explicitly rejected any curtain/shtorka-style transition and any "one section slides over/covers the other" (pin-and-cover) mechanic between Hero and the next section — wants something "light and airy" (лёгкое и воздушное), understandably given how much the curtain/close-icon debugging cost earlier in the project (see [[project-artefact-close-icon-bug]]).

**Variant A (chosen, implemented first):** No interaction between sections at all. Block 2's own elements simply fade+rise into view via ScrollTrigger as the section naturally scrolls into the viewport — the same reveal mechanics already used for the Hero's own load entrance, just triggered by scroll position instead of page load. Zero coupling between Hero and the next section.

**Variant B (saved for later, not yet built):** A subtle parallax lag on the Hero's own content while scrolling away from it — Hero's content moves slightly slower than the actual scroll (roughly 20-30% lag), giving a soft "floating away" feel, while the next section rises in normally underneath at regular scroll speed. No pinning, no overlap/covering — still "light," just with a touch more depth than Variant A.

**How to apply:** if she asks for something more elaborate on the section transition later, offer Variant B before proposing anything new — it was already scoped and agreed as a reasonable next step up in polish, no need to re-derive it from scratch.
