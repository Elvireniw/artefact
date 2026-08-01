---
name: feedback-scrolltrigger-start-mutation
description: "GSAP ScrollTrigger gotcha — mutating self.start after creation (even from onRefresh) doesn't reliably rewire live firing; use a start function instead. Verify with live scroll instrumentation, not a static post-refresh read."
metadata:
  type: feedback
---

When a ScrollTrigger's position must depend on another (pinned/scrubbed)
trigger's resolved geometry, don't create it with a static `start` and then
patch `self.start = floor` later (from `onRefresh` or a global
`ScrollTrigger.addEventListener('refresh', …)` pass). It reads back correct
afterwards — `ScrollTrigger.getAll().map(st => st.start)` shows clean,
properly-staggered numbers — but does NOT reliably rewire GSAP's internal
firing check. On [[project-artefact-status]]'s blocks 6/7 this looked fixed
twice in a row on static inspection, and both times still fired live at the
original too-early position (confirmed only by instrumenting `st.isActive`/
`.progress` transitions during an actual simulated scroll — drive
`window.scrollTo()` + call `ScrollTrigger.update()` in a loop, or dispatch
real wheel events, then read `.progress` before/after the expected
threshold — not by reading `.start` once after the page settles).

**Working fix:** give the trigger a `start` FUNCTION at creation time —
`start: () => otherTrigger.end + offset` — GSAP's own documented pattern for
this exact dependency. It's recomputed fresh on every refresh instead of
being fixed at creation or patched after the fact.

**A function alone isn't sufficient either — the offset math inside it still
has to be right.** A later pass on this same project replaced a working
live-`getBoundingClientRect()`-based start function with one built from
hardcoded `--u` distances from the pinned trigger's `.end` — still a
function, still recomputed every refresh, and it still broke: every one of
those hardcoded formulas dropped the `- viewportHeight * fraction` term a
real `'top X%'` trigger needs, so each one only fired once the element's top
hit the very TOP of the viewport instead of X% down it. The function-vs-
mutation distinction above is necessary, not sufficient — verify the actual
resolved values make sense relative to each other too (not clustered on one
point, not absurdly late), not just that the mechanism is "a function."

**Why this matters beyond this one bug:** the failure mode is specifically
that the "obviously correct" verification step (read the resolved value once
things settle) passes even when the fix is broken. Reading `.start`/`.end`
after a refresh is not proof of correct runtime behavior for ScrollTrigger —
only watching `isActive`/`.progress` during a real (or simulated) scroll
proves it.

**How to apply:** any GSAP ScrollTrigger whose position depends on another
pinned/scrubbed trigger elsewhere on the page (not just this project) —
default to a start/end function from the outset, keep the math inside it
self-measuring (live geometry) rather than hardcoded distances, and verify
by simulating scroll and logging trigger activation, not by reading resolved
coordinates once. This was flagged 3 separate times before it actually
landed correctly across two different sessions on this project — the first
few "fixes" each passed a too-shallow verification.
