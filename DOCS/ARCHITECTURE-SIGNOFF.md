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
