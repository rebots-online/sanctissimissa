# Architecture amendment signoff ledger

One entry per operator decision executing an ARCHITECTURE.md amendment. Prose
in ARCHITECTURE.md alone is never an executed approval; this ledger is the
record the amendment-sequence gate (operator directive 2026-09-17, bound in
CLAUDE.md at `3021d442`) requires before CHECKLIST derivation and code.

## 2026-09-18 — Automatic Surge web publication (executed)

- **Amendment:** DOCS/ARCHITECTURE.md § "Automatic Surge web publication
  (operator request 2026-09-18)" — added at `e750f198`, drafted as "pending
  amendment signoff".
- **Operator directive (verbatim, 2026-09-18):** "Build the latest with
  working chatbot and mount at sanctissimissa.surge.sh"
- **Authorized by this entry:** executing that amendment end to end — the
  `web-deploy` release stage immediately after `web`, the standalone
  `deploy:web` command, `build:web` = build + publish, pinned Surge CLI
  dependency, SPA fallback, host-managed credentials, and exactly one minor
  increment performed once by the fresh-release stamp (no pre-stamp of the
  source edit). Live publication to `https://sanctissimissa.surge.sh` and
  verification of the served version are in scope. Existing release states
  from an earlier source are preserved via the existing restart/archive
  behavior, not silently migrated.
- **Reconciliation recorded with this signoff:** the amendment prose says the
  deploy command "requires `dist/index.html`" and "prepares the SPA fallback
  `dist/200.html`". Root `dist/` is the tracked release-artifact home
  (CC12/CC14) and never holds raw web-build output; the web build output
  directory is `dist-web/` (vite.config.ts `outDir`, gitignored via
  `dist-*/`). "The completed `dist` web output" therefore means
  `dist-web/index.html` and `dist-web/200.html`. This is a naming
  reconciliation of the same contract, not a scope change.
- **Still pending operator decisions:** none for this amendment. (Venice AI
  hosted-provider preference recorded in the 2026-09-18 handoff is noted,
  not executed: no hosted provider is authorized for SanctissiMissa by this
  entry, and the on-device default is unchanged.)

## 2026-09-18 — Orientation geometry, feedback plane, universal default model (executed)

- **Amendment:** DOCS/ARCHITECTURE.md § "Orientation geometry, feedback plane,
  and universal default model amendment (2026-09-18)".
- **Operator directives (verbatim, 2026-09-18, this session):** "move the
  'Orientation walk-through' notification at the bottom left somewhere
  else--and make sure it is moveable by dragging: it is obscuring the text box
  to type in"; "In the linux, it defauted to full-screen, also, obscuring all
  of the Mass; this is totally unacceptable--the main USP of the main feature
  cannot be completely obscurfed by a supporting function--especially when it
  doesn3 work"; "the latency with no spinner or 'please wait... %' animation
  ... progress animation/spinners with percentages are critically important in
  these situations, and even feedback of a button 3D 'pressing,' clicking,
  changing colour on press, etc."; "The universal default model should be the
  qwen3.5:2b and no heavier without their expressly choosing it."
- **Authorized by this entry:** §A top-right default + pointer-drag +
  persisted/clamped position + hard size caps for the orientation cards;
  §B global button press/disabled states, busy indicators, generation
  elapsed/spinner/streaming/cancel, inline failure surfaces; §C 2B-only
  automatic default, heavier models by express choice only. CHECKLIST stanza
  OG.1–OG.5 derives 1:1 from §A–§C; code lands only through those tasks.
- **Qualitative gate (operator, same session):** "You must check your work
  with the rubrics and make qualitative observations before declaring success
  conditions" — acceptance for this stanza is judged from rendered screens,
  not tests alone.
