---
name: feedback-read-the-source
description: "When copying an effect from a reference site, read its actual bundled source code first — don't infer mechanics from DOM measurements."
metadata: 
  node_type: memory
  type: feedback
  originSessionId: f8bfb7b9-c0d7-4d36-8904-767b92814a10
  modified: 2026-07-30T17:32:49.319Z
---

When she asks to reproduce an effect from a reference site, **read that site's JavaScript source before doing anything else**. Do not infer the mechanic from measuring DOM positions across scroll positions.

**Why:** on rejouice.com (2026-07-30) I spent four or five rounds measuring `getBoundingClientRect()` at various scroll offsets, concluded the effect was a single half-speed video parallax, implemented it, and she reported "nothing changed" three times running. She eventually had to ask outright: "Ты что на сайте референсе не можешь посмотреть код?" Reading their bundle took one attempt and revealed there were **two** scrubbed timelines, and that the one I had never implemented (the top block's content lagging DOWN by half the section height) was the one she'd been describing all along. Worse, the site hijacks `window.scrollTo`, so several of my measurements were quietly invalid — I noticed that mid-investigation and still didn't revisit the conclusions built on them.

**How to apply:**
1. `performance.getEntriesByType('resource')` → filter `.js` → `fetch()` each → test for a distinctive class name from the DOM (e.g. `/videos-wrapper|hero-reel/`). This finds the component chunk in one pass even in a bundled Nuxt/Next app.
2. Then grep that chunk for `scrollTrigger`, `scrub`, `fromTo` and read the real parameters. Copy the values verbatim into the comment so the origin is auditable.
3. Only fall back to DOM measurement if the source is genuinely unreadable — and if the site has smooth-scroll/scroll-hijacking, drive it with real wheel events, never `window.scrollTo`.
4. If a "fix" doesn't change the measured behaviour, say so plainly instead of presenting it as a fix — I once shipped a CSS/JS rewrite that produced a mathematically identical drift rate and nearly reported it as an improvement.

Ties into [[feedback-debugging-pace]]: repeated failed attempts on one symptom mean the investigation method is wrong, not that the numbers need more tuning. Related: [[ref-rejouice-half-speed-parallax]].
