---
name: project-artefact-tech-lead-tooling
description: "Mapping between the \"Creative Tech Lead\" role/workflow guide (Creative_Tech_Lead_Project_Guide.md, Pixel Perfect → Motion → Behance stages, prompt format) and the actual tools available in this session — what's already covered and what's still open."
metadata: 
  node_type: memory
  type: project
  originSessionId: f8bfb7b9-c0d7-4d36-8904-767b92814a10
  modified: 2026-07-29T18:36:30.609Z
---

There is no separate `Creative_Tech_Lead_Project_Guide.md` file with pre-written content — she clarified (2026-07-29) it's just how we've been working already, not a doc to go read. The workflow has 3 stages per section: **Pixel Perfect** (layout matches Figma exactly) → **Motion** (animation/effects) → **Behance** (case-study/portfolio prep, done once at the end after the whole site is built).

**Why this matters:** she wants this role/workflow followed for the rest of the Artefact project, and wants the tool-mapping + stage definitions remembered so they don't need re-explaining each session.

**Stage definitions (her words, 2026-07-29):**
- **Motion**: sourced either from reference sites (see Browser-based reference analysis below) or by me proposing options as a specialist when there's no reference.
- **Behance** (end-of-project only, after the site is fully built): she'll show the final mockup/layout and case texts. My job there is to act as a top Behance case specialist + Behance-algorithm specialist — help structure the case page so it lands in Behance's TOP and gets strong engagement (comments/likes). Also help cut/edit video for the case if that's needed and within my ability — video editing itself is NOT something I can do (see video limitation below); I can only work from screenshots/frames, so "cutting video" would need to happen via her tools with me directing/reviewing.

**How to apply — tool mapping she confirmed:**
- **Figma spec verification** (exact spacing/colors/fonts instead of eyeballing): Figma MCP is connected — `get_design_context`, `get_screenshot`, `get_metadata`, `get_variable_defs`.
- **Motion/animation from Figma**: `figma-implement-motion` skill + `get_motion_context` — translates Figma motion into GSAP/CSS.
- **Reference-site analysis** (including reading other sites' actual code): Browser tool — open site, read DOM/CSS, inspect network requests, take screenshots for comparison. This is exactly how the olgaprudka.com and kasiasiwosz.com references were sourced (see [[ref-olgaprudka-underline-hover]], [[ref-kasiasiwosz-text-reveals]]) — precise-element verification lesson in [[project-artefact-status]] applies here too.
- **Copywriting / business analysis**: done directly, no extra skill needed, within the Creative Tech Lead role.
- **Video "reading" — real limitation, not solved**: I cannot watch video as a stream. Web reference video → frame-by-frame screenshots via Browser. Figma prototype export → `export_video`/motion-context. Local `.mp4` file → can only read individual frame-screenshots, not the video as a whole.

**Prompt-writing rule (reconfirmed 2026-07-29, strong emphasis — "!!!")**: only write a Claude Code prompt after FULL discussion is done; she will explicitly say when she wants the prompt. Same rule as [[feedback-prompt-timing]], just restated firmly for this workflow.

**Per-block flow going forward:** each new block starts as Pixel Perfect (layout only, matched to its Figma node) — motion/effects pass happens later as a separate step, only after layout is confirmed. Block 3 "3_мова глини" (Figma node 978:1237) started 2026-07-29 on this basis.

**Scope:** keep this memory active until the Artefact project is finished (per her explicit request — this is a project-duration memory, not permanent).
