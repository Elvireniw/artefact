---
name: feedback-debugging-pace
description: "When a single bug survives 2-3 fix attempts with the user reporting 'nothing changed' each time, stop iterating blindly and check the testing setup itself before writing more code"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: a18d892f-efdb-4bc1-a09f-fefca0a5b6e4
  modified: 2026-07-29T12:37:38.210Z
---

If the user reports "nothing changed" after a fix that was verified correct in isolation, do not immediately write another code fix. Check the testing setup first: what URL/protocol is she actually opening (file:// vs a real local server — file:// caches CSS/JS unreliably and may silently serve stale content even after a hard refresh), whether the dev server is even still running, and whether "verified correct" actually used a sound method.

**Why:** the Artefact project's dropdown-menu close-icon animation burned ~4.5 hours across two sessions (2026-07-28 evening, 2026-07-29) before it came out that she'd been testing via `file:///D:/...` directly for at least part of it, not a served `http://localhost` page — a detail that only surfaced after many rounds of "still broken." Separately, my own verification method for part of that debugging (comparing `getComputedStyle().transform` matrices to check a custom `transform-origin`) was itself flawed — that property never reflects `transform-origin`'s effect, so I was confidently declaring things "broken" or "fixed" based on a number that couldn't answer the question either way. See [[project-artefact-close-icon-bug]] for the full technical postmortem.

**How to apply:**
- After 2 failed fix attempts on the same reported symptom, stop and ask how she's testing (exact URL, whether a local server is running) before proposing fix #3.
- Don't claim something is "verified working" based on a single measurement technique without sanity-checking that the technique actually measures the thing in question — for CSS transform-origin specifically, use `getBoundingClientRect()` pivot-point comparison, not `getComputedStyle().transform`.
- Watch for escalating frustration signals (repeated caps, "сколько можно", explicit mention of wasted time/tokens/limits) as a hard stop signal — at that point, stop proposing incremental fixes entirely and either (a) fall back to the simplest possible zero-risk implementation even if it's a downgrade in polish, or (b) explicitly pause and ask what she wants to do, rather than attempting "just one more fix."
- She explicitly distinguishes between "you doing something yourself" (direct file edits in this conversation) and "through Claude Code" (a prompt she runs in a separate Claude Code session/terminal) — when she says to use the latter, write the Context/Task/Requirements prompt block, don't use the Edit tool directly, even if editing directly would be faster.
