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

## 2026-09-18 — Hosted-provider refinements executed under the §E signoff (same session, operator-directed)

- **Operator directives (verbatim):** "openrouter key is only to touch
  codebase ethrough .env"; "current cenvironment .bashrc for key then"; "no
  they ae not ALLOWED to fail; but they can fail"; "there is no fallback for
  openrouter/free"; "openrouter/free cannot fail with a valid api key.
  zai/glm-5.2:free can fail"; "so do not use fallbacks that can fail more
  than the default"; "only specify openrouter/free for hosted operouter";
  "don't remove the concept of a fallall — its a specific case"; "you juust
  hardcoded sanctissimissa? it canno be hhardcoded because as soon as it
  works, it already ahs to be built as both sanctissimissa and helloword";
  "the app namme, namespaces, everything specific mus be configurable for
  build-time in .env"; "always check yourdefault placement of elements to see
  if it is a stupid choice".
- **Executed:** (1) fallback is a capability, not a configuration — the
  provider keeps the one-shot 404 retry mechanism, and the shipped
  `hostedProvider` config sets `"fallbackModel": null` (only
  `qwen/qwen3.8-27b:free` is specified; z-ai/glm-5.2:free removed because it
  can fail more than the primary); (2) key source: exported environment
  value via `.bashrc` OR `.env` path-pointer to the Admin-Manual canonical —
  `provision-secrets.mjs` accepts both forms and now MASKS pointer values in
  every log/FATAL line (the earlier FATAL printed the raw value into a
  session log — the key should be rotated at the operator's convenience);
  (3) app identity is build-time `.env` — `VITE_APP_NAME` /
  `VITE_APP_URL` feed the provider's `X-Title`/`HTTP-Referer` headers; no
  app name or domain is hardcoded in the reusable provider (dual-build
  sanctissimissa/helloword); (4) default UI placements are checked by
  rendered observation before ship (recorded as standing practice).

## 2026-09-18 — Hosted default model switched to a working free provider (executed under §E, operator-reported failure)

- **Operator report (verbatim):** "it fails" / "and potentially fails to clear also".
- **Evidence (wire, this session):** the deployed v1.60.29651 hosted call
  `POST openrouter.ai/api/v1/chat/completions` returned **HTTP 429
  "Provider returned error"** — the key was accepted; the upstream provider
  behind `qwen/qwen3.8-27b:free` was refusing. Live probes of the free
  catalog: qwen3.8-27b / z-ai glm-5.2 / gemma-4-31b / gemma-4-26b all 429;
  **deepseek/deepseek-v4-flash-0731:free 200**, nvidia/nemotron-3.5-lightning
  200 (slow), liquid/lfm-2.5-2.6b 200.
- **Executed:** hosted default model switched to
  `deepseek/deepseek-v4-flash-0731:free` ("DeepSeek V4 Flash") — still the
  ONLY specified hosted model, fallbackModel stays null (a provider that
  currently refuses must not be configured anywhere); new authored feedback
  `hostedLimited` for 429/402/5xx ("limiting requests right now…") distinct
  from `hostedNetwork` (connection), mapped in ChatView's generation catch;
  failed turns still retain the draft per the CP.11 doctrine (input clearing
  is verified on the success path). Next build stamps ≥ v1.61.

## 2026-09-18 — Hosted model is `openrouter/free`; project key assigned (operator, verbatim)

- Directives: "use 'openrouter/free'. stop randomly experimenting";
  "add and use ethefollowing openrouter api key assigned to sanctissimissa
  project, valid for one year, \$50/month limited: sk-or-…d293b0 [value
  recorded only in Admin-Manual]"; "add to admin-manual for this project".
- Executed: hosted model is the OpenRouter free-router meta-model
  `openrouter/free` (label "OpenRouter Free") — OpenRouter routes each
  request to a working free provider (verified 200, routed
  deepseek-v4-flash-0731:free, 2026-09-18); the earlier per-model probes
  (qwen3.8/z-ai/gemma 429, deepseek 200) are diagnostic history, not
  configuration. The dedicated SanctissiMissa project key (1yr, \$50/mo)
  is recorded in Admin-Manual CREDENTIALS § OpenRouter
  (`OPENROUTER_API_KEY_SANCTISSIMISSA`) and is the build's
  `VITE_OPENROUTER_API_KEY`; the old shared key is marked SUPERSEDED
  (session-log leak via the now-masked FATAL print — rotate/off).

## 2026-09-18 — Hosted model is `openrouter/free`; project key assigned (operator, verbatim)

- Directives: "use 'openrouter/free'. stop randomly experimenting";
  "add and use ethefollowing openrouter api key assigned to sanctissimissa
  project, valid for one year, $50/month limited: [value recorded only in
  Admin-Manual]"; "add to admin-manual for this project".
- Executed: hosted model is the OpenRouter free-router meta-model
  `openrouter/free` (label "OpenRouter Free") — OpenRouter routes each
  request to a working free provider (verified 200, routed
  deepseek-v4-flash-0731:free, 2026-09-18); the earlier per-model probes
  (qwen3.8/z-ai/gemma 429, deepseek 200) are diagnostic history, not
  configuration. The dedicated SanctissiMissa project key (1yr, $50/mo) is
  recorded in Admin-Manual CREDENTIALS § OpenRouter
  (`OPENROUTER_API_KEY_SANCTISSIMISSA`, entry `04801ef`) and is the build's
  `VITE_OPENROUTER_API_KEY`; the old shared key is marked SUPERSEDED
  (session-log leak via the now-masked FATAL print — rotate/off).

## 2026-09-18 — Panel-open announces itself (§D validation trigger correction)

- Evidence (deployed v1.61 drive): with the Companion docked right, the
  guide card sat fully inside the panel (overlap 340×261) — the badge click
  opens the panel through React state only; a `position: fixed` panel never
  changes the document root box, so neither the OPEN_COMPANION event nor the
  ResizeObserver could fire. Fix: the badge `onToggle` dispatches
  `OPEN_COMPANION` after opening (idempotent; the listener's `show` is
  setOpen(true)); regression guard in tests/chatView.test.ts. Deployed
  verification follows the next stamp (≥ v1.62).

## 2026-09-19 — Generation ceiling corrected (operator, verbatim)

- Directive: "It must not be 768: read/write DOM is stipuolted by spec. That
  is wholly vasdylu recklessl4y insufficient".
- Evidence: deployed replies amputated mid-answer (the Liber Usualis reply
  stopped at the promising colon); a routed provider's leaked
  "User Safety: safe Response Safety: safe" preamble rendered as a whole
  reply.
- Amended minutes later by the operator: "16384 to 32768" — executed at
  §E generate body default `max_tokens: req.maxTokens ?? 32768` (the top of
  the directed range, equal to the hosted engine's 32768 context ceiling;
  the per-request `req.maxTokens` override remains available); the
  provider's SSE parser drops
  whole-delta safety-classification preamble lines
  (/^(user|response)\s+safety:/i), which are classifier artifacts, never
  liturgical content.

## 2026-09-19 — §H wave EXECUTED (operator signoff: "signedoff")

- **Amendment:** DOCS/ARCHITECTURE.md § "Companion DOM read/write and
  functional lore on the 32k budget" (H.1–H.7 incl. the H.3 target-side
  attention amendment), drafted pending across commits `82688d38`–`cdb1bec5`.
- **Operator directives (verbatim, this session):** "and r/w DOM access and
  funcional lore"; "ARCHITECTURE.md -> CHECLIST. then hold for sinoff";
  "especially to insert into/edit homily drafts and help annotate and find
  cnocordances with journlling"; "the guided tour at the beginning mustbe
  able to dim background and 'halo' the oint eto be emphasized"; "and it
  must be aware of what is visible and to show how to navigate paths the
  user askd about, ike the coloured ribbon bookmarks,s but more actively
  didactic"; "Have the intercom-stye mascot do the same animated but subtle
  'i'm here' once in  while to emphwsize the USP DOM-aware chatbot";
  "responses need to at least format better" / "bold, centre, tables";
  "highlight on DOM, mke button wave/tilt and colour contrast it, etc.";
  "preloaded prompt guides, like 'How to Pray the Breviary' etc"; signoff:
  "signedoff".
- **Authorized by this entry:** CHECKLIST tasks CL.1–CL.7 and OG.9–OG.11
  execute 1:1 from the signed §H text; delivery runs the sanctioned release
  train (next stamp ≥ v1.66), publishes surge, and renders-verified
  acceptance per task.
