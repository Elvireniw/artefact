---
name: feedback-usage-economy
description: "Elvira's usage limits are tight — the practices that actually reduce token burn on this project, and the standing instruction to remind her of them."
metadata: 
  node_type: memory
  type: feedback
  originSessionId: f8bfb7b9-c0d7-4d36-8904-767b92814a10
  modified: 2026-07-30T22:31:46.712Z
---

On 2026-07-30 Elvira hit ~20% of her remaining usage limits and asked what actually drives the burn. **She asked to be reminded of these practices going forward** — bring them up when a session starts getting long, or before starting anything expensive.

**Why:** token cost is dominated by *context size × number of turns*, not by who initiates the edit. Handing her a prompt to relay elsewhere does **not** save limits by itself — the same file reads, edits and verifications still run, just on another session's budget. The real lever is how much history each turn re-sends.

**How to apply — in priority order:**

1. **One block per session.** This is the biggest lever by far. Every turn resends the entire conversation, so a small CSS fix at the end of a 200-message session costs many times what it costs at the start. `MEMORY.md` exists precisely so a fresh session can get up to speed cheaply — that's the intended workflow, not a fallback.
2. **Batch her fixes.** Her numbered lists ("1. … 2. … 3. …") are the ideal format — one round instead of six. Encourage it; never split a batch into separate turns.
3. **Verify with numbers, not screenshots.** Images are the most expensive tokens in the budget. Use `getBoundingClientRect()` / `getComputedStyle` measurements for pixel-perfect checks; take a screenshot only when the question is genuinely "how does it *look*".
4. **Model choice.** She knows `/model`. Layout work against a finished Figma spec and small CSS edits are fine on a cheaper model; reserve Opus for reading unfamiliar code, reference-site reverse-engineering, and designing motion.
5. **Targeted reads.** `style.css` and `script.js` are now large — read the relevant range or grep, don't re-read whole files.
6. **Don't load big skill/doc bundles speculatively.** One such load cost a large chunk of context in the session where this was written.

Related: [[project-artefact-status]], [[feedback-debugging-pace]] (failed fix loops are also a direct token cost), [[feedback-prompt-timing]].
