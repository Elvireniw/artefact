---
name: feedback-prompt-timing
description: "Don't write out the full Claude Code prompt until the user explicitly asks for it or confirms every piece of the plan is approved"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: a15a51a5-b2c1-46a7-82e3-31e14c573ace
  modified: 2026-07-28T18:41:34.225Z
---

Do not generate the final Claude Code prompt proactively, even after proposing options or a plan — wait for the user to explicitly ask for it or confirm all open decisions are settled.

**Why:** user said directly (2026-07-28): "пожалуйста, пока не попрошу или не утвердим все, НЕ ПИШИ ПРОМПТ!" ("please, until I ask or we've approved everything, DO NOT WRITE THE PROMPT!"). This came right after a turn where multiple pieces of a multi-part animation task were still open (e.g. scroll-arrow hover had 3 proposed options awaiting her pick) — writing the full prompt too early, or bundling unresolved decisions into it, is unwanted.

**How to apply:** when discussing a multi-part feature (animation choreography, multi-step UI changes, etc.) in this project, treat proposing options / discussing approach as a distinct phase from delivering the prompt. Only compose the actual Context/Task/Requirements/Constraints/Expected Result/Do Not Change prompt block when she explicitly says something like "давай составлять промпт", "перепиши промпт", or otherwise directly asks for it — not automatically once a discussion seems to converge. Applies project-wide, not just to Hero motion work.

**Reinforced 2026-07-28, later same session:** she called this out again, sharper — "Я разве просила писать промпт? Ты сьедаешь мои токены(((" ("Did I even ask you to write a prompt? You're eating my tokens"). This happened even after she sent a clear, detailed bug report (3 numbered technical issues, code-diagnosable) — I treated "clear enough to act on" as license to write the full prompt unasked, which is exactly the mistake the rule exists to prevent. A detailed/well-diagnosed bug report is still not a request for the prompt. Default response to any bug report or feedback, however clear: diagnose, explain the root cause in chat, state what the fix would be in a sentence or two — then STOP and ask (or wait). Full Context/Task/Requirements block only after an explicit go-ahead. Token cost is an explicit part of her objection, not just workflow control — keep intermediate responses short too, not just prompt-gated.
