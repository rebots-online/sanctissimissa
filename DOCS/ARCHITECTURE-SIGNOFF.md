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

## 2026-09-18 — Whole-card orientation interaction, workspace-aware placement, hosted OpenRouter debug default, version uniqueness (executed)

- **Amendment:** DOCS/ARCHITECTURE.md § "Whole-card orientation interaction,
  workspace-aware placement, and hosted OpenRouter debug default (2026-09-18)"
  (§D/§E/§F) — added at `f47a3284`, drafted as pending signoff.
- **Operator directives (verbatim, this session):** "the method of dragging by
  clicking on the title with no indication to, is so extremely unintuitive it
  would be a turnoff and frfustration either mke it draggble anywhere you
  click on it or add window dressing like MS Windows. But better to jsut allow
  dragging by clicking anywhere on the box"; "i closed it. you cannot coninue
  testing on the webapp until you fix the atomic.bot chatbot on webapp";
  "easier, replace the webapp/pwa and FOR NOW default for all platforms, to
  openrouter/free as per api key in admin-manual we are losing too much time
  to the chatbot problems and making no progress; so fowr now, make the
  default to use hosted openrouter/free. But leave everything in place to
  fix--openrouter is for debug only because it is not scalable";
  "THEN TRANSLATE TO @CHECKLIST.md AAND THEN ASSIGN CODING SUBAGENTS TO
  @CHECKLIST.md looking only at their one assigned task"; signoff:
  "signed off if it is as pasted in last message" (the amendment text as
  presented in the signoff-request message, §D/§E/§F, was confirmed as pasted).
- **Authorized by this entry:** §D whole-card drag (both orientation cards,
  4 px threshold, click passthrough), grip `⠿` + "Drag to move" affordance,
  keyboard nudge/reset + "Reset position" button, `src/core/orientation/layout.ts`
  (`occupiedRects`/`resolveGuidePlacement`/`ORIENTATION_GAP`, compact
  `'compact'` fallback), validation on mount/step/START_GUIDE/OPEN_COMPANION/
  resize/ResizeObserver with self-healing persistence; §E
  `HostedOpenRouterProvider` (`reusable-chatbot/engines/hosted-openrouter/index.ts`),
  `resolveHostedEngine` tried first on every platform, local stack retained,
  picker hosted entry first, `hostedProvider` config block
  (`qwen/qwen3.8-27b:free` / `z-ai/glm-5.2:free` / label "Qwen 3.8 27B"),
  `OPENROUTER_API_KEY` provision-secrets materialization → gitignored
  `.env.local` `VITE_OPENROUTER_API_KEY`, feedback `hostedKeyMissing`/
  `hostedNetwork`, `HOSTED` engine chip, exposure record (debug-only, rotate
  before non-debug use; metered `companion_hosted` proxy NOT implemented);
  §F one minor increment (→ v1.59.x) at the next build's fresh-release stamp.
  CHECKLIST stanza HC.1–HC.2 / OG.6–OG.8 derives 1:1; code lands only through
  those tasks.
- **Additional operator directives (verbatim, same session, before dispatch):**
  "but you are adding openrouter/free as default, right?" — YES, confirmed:
  §E makes the hosted OpenRouter free tier the automatic default engine on
  every platform, tried first; local engines retained and picker-selectable.
  "this MUST be at LEAST v1.59 or higher" — binding version floor for this
  wave's build (the one-minor-increment stamp satisfies it; no build of this
  wave may ship under 1.59). "if it is an lfs issue then chatgpt already
  recoverfed it" — Forgejo recovery reported by the operator; pushes retried
  this turn (this session's blocker was network unreachability, not LFS).
- **Execution scope (operator, same session): "not #4"** — the post-dispatch
  step (running-app qualitative verification drive and the ≥v1.59 release
  build/publish) is NOT authorized this wave-turn; it stays pending an
  explicit operator go. Task-completion commits and pushes remain in force.
- **Still pending operator decisions:** the ≥v1.59 build/verify go (see
  execution-scope note above; the version floor above is binding whenever
  that go comes).
