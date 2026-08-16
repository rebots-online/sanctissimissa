# St. Android's Missal v1.34.81270

Completes the stop-landing fix of v1.33.

- A stop inside a multi-part section (the Confiteor within the prayers at the foot of the altar; the Alleluia verse within a Sunday Gradual) now lands on its own line even when that section started folded — the first release's landing worked only when the section was already open.

### For maintainers

- Root cause: a folded section renders no body, so the focus effect's line query ran before the unfold painted. Fix: retry the refinement after the unfold renders (double `requestAnimationFrame`) — `ReaderView` focus effect.

---

Built from commit f792dd07dcdbde392eaaacff528128aed080b60d. See the adjacent release manifest for exact artifact hashes and verification state.
