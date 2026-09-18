# SANCTISSIMISSA: architecture/code comparison and marketplace completion handoff

Recorded: 2026-09-18T06:29:18Z (02:29:18 America/Toronto).

## Operator priority and quota reminder

**Natally first. SanctissiMissa afterward.**

Robin's instruction: preserve the remaining approximately 20% assistant quota to finish Natally completely and have it live on its intended marketplaces. After Natally has reached that outcome, resume the SanctissiMissa remediation below and carry it through to live marketplace availability too.

The percentage is Robin's estimate, not a measured quota reading. Saving this report does not start either implementation or certify either product as ready. A source merge, successful build, uploaded binary or submitted listing is not the same as a live marketplace release. Preserve this order in subsequent sessions.

This is a requested audit and handoff prompt. ARCHITECTURE.md and its adopted contracts remain the specification authority; this report does not silently replace them or confer architecture signoff.

## Comparison baseline and evidence

- Repository: https://github.com/rebots-online/sanctissimissa
- Before this session's changes: master at `3021d442bbfc1705ca4d40e6d70fe8f48d433cfb`.
- Last architecture edit before that baseline: `30e759b8e53a7532b902cf23af2d4a30313eaff7`, dated September 17, recording RevenueCat internal IDs and the virtual-currency amendment. Git records the account author; it does not independently identify GLM as the generating agent.
- Current audited source: `1fe8549dc6aa7dc423484165e52d3ae6168c458f`.
- CodeGraph 0.9.4 synchronized: 187 files, 2,710 symbols, 6,070 relationships. Negative symbol findings were corroborated against filesystem presence, package dependencies and App navigation; a missing search result alone was not treated as proof.
- The tracked workflow located is `DOCS/WORKFLOWS/workflow_LS-companion-20260916.md`. No tracked file explicitly labelled “workflow v2” was found. A newer workstation-only revision is outside this audit.
- Asrock was inaccessible through the connected workstation tool; no conclusion is made about current GLM activity or uncommitted workstation changes.
- “Present” below describes source implementation, not device, payment or marketplace qualification.

## Comparison matrix

| Area | Architecture before this session | CHECKLIST representation | Current source / CodeGraph finding |
|---|---|---|---|
| Mass, Office, Scripture | Shared bilingual reader, separate workspaces | Earlier reader/navigation tasks | Present: CorpusDb, SectionReader, buildHour and views. |
| Journal and homilies | One Accompaniment object, SQLite sidecar, rich-text editor | Earlier accompaniment tasks | Present: SidecarDb, AccompanimentEditor, journal/homily views. |
| RevenueCat catalogue | September 17 amendment: 70 entitlements, 80 products, offerings/paywalls | BI.4 partially executed; still unchecked | commerce.seed.json records 70/70 entitlement IDs and 80/80 product IDs. Live dashboard state was not rechecked; this is provisioning evidence, not app integration. |
| Identity and web purchases | Identity, Web Billing, one entitlement controller | LS.08 pending | IdentityController, PurchaseController, EntitlementController absent. @revenuecat/purchases-js and oidc-client-ts absent from dependencies. |
| Android/Play purchases | RevenueCat Android SDK and Tauri configure/offers/purchase/restore bridge | LS.09 pending; actual store obligations BI.4a | PlayPurchaseAdapter and src-tauri/src/commerce.rs absent. |
| Bookstore backend | JWT identity, RC reconciliation, webhooks, signed licences/packages, HTTP service | BS-S1–BS-S5 pending | Entire services/bookstore/ directory absent. |
| Library domain/storage | Catalogue/publication states, library records and media | LS.01–LS.03 pending | Seeds exist; src/core/library/ and LibraryStore absent. |
| Verified books/offline ownership | Signed packages/licences, resume, permanent ownership, subscription expiry | LS.04 pending | EditionInstaller and entitlement/licence client absent. The LLM downloader does not implement bookstore downloads. |
| Library/Bookstore screens | Frozen designs adopted for LibraryView and BookstoreView | LS.06 pending | Components and src/ui/library/ absent. Design exports are not executable app screens. |
| Book reader and study tools | Shared bookmarks, notebooks, voice notes | LS.05 / LS.07 pending | Existing reader/editor foundations; LibraryReader and library-specific integration absent. |
| Shell navigation | My Library, Bookstore, Gregorian Chant, Mass Reference destinations | LS.10 pending | All four destinations absent from App View/navigation. |
| Chant and Mass Reference | Adopted chant/reference contract | CH1–CH6 pending | ChantView and MassReferenceView absent. |
| Companion engines | Native llama.cpp, browser WebLLM, CPU/WASM fallback; later TurboQuant phases | CP.2–CP.4 / CP.7–CP.9 pending | Partial: NativeRunnerProvider and WebLlmRunnerProvider exist. Browser engine is in-page; no connected WasmRunnerProvider. Windows/32-bit native inference remains unsupported. |
| Companion knowledge/payment gates | Lore, retrieval, citations, saved insights, RC gates | BI.2–BI.4 / CP.6 pending | CompanionMemory and retrieval/citation/payment-gate integration absent. Lore tables do not supply the missing orchestration. |
| Guidance/diagnostics/navigation repairs | September 18 additions from this session | CP.11–CP.13 / NAV.18 acceptance open | Source implementations and focused tests exist; full device/browser qualification is pending. |

All 21 LS/BS-S/CH tasks are unchecked: ten LS tasks, five backend tasks and six chant/reference tasks. This session's CHECKLIST changes append CP.11–CP.13 and NAV.18; commerce requirements and their pending states were preserved.

## Where RevenueCat and the bookstore are represented

The pre-change ARCHITECTURE.md explicitly adopts:
- [Library and study architecture](ARCHITECTURE/library-study-20260913.md): complete product scope, catalogue, reader, checkout and shell integration.
- [Bookstore service contract](ARCHITECTURE/bookstore-service-20260913.md): identity, RC read/reconciliation, webhooks, signed offline access, package distribution and operations.
- [Chant/reference contract](ARCHITECTURE/chant-reference-20260913.md).

The September 17 RevenueCat commerce amendment is provisioning work. BI.4 explicitly says its RC configuration half was executed while FeatureId gates remain unwired. LS.08 specifies SDK installation, identity-before-purchase, actual offerings, purchase/restore reconciliation and verified licences. LS.09 specifies the real Android adapter. LS.10 specifies the actual screens/routes and shared service lifetime.

The committed workflow also explicitly includes:
| Workflow provision | Obligation |
|---|---|
| Inputs: active Library/Bookstore stanza | Execute all 21 tasks alongside Companion work. |
| Phase 1 A5 | Reconcile library/model storage under one resolver. |
| Phase 2 B4 | Coordinate Settings/storage ownership across both workstreams. |
| Phase 4 W5 | Companion memory/citations and BI.4 RevenueCat gates. |
| Phase 4 after W7 | Continue LS in its dependency order. |

## Findings requiring correction

1. The bookstore and RevenueCat requirements are present in the specifications and checklist; the missing part is execution.
2. Recorded merchant provisioning must not be reported as working checkout, entitlement enforcement or delivery.
3. LS.10 waits for the entire dependent wave, including chant/reference. This explains delayed visible integration, not completion.
4. CP.6 still says to expand its semantics task when a real provider lands; real providers now exist, but that expansion/integration has not followed.
5. The September 16 workflow's engine plan predates the September 17 runner re-baseline. Preserve its commerce obligations while reconciling the obsolete provider plan.
6. Historical G1 “all-ungated” language must be reconciled with the adopted LS rule: missing merchant configuration leaves free functionality available and denies new paid access.
7. BI.4a still includes recording IDs already present in the seed; distinguish completed recording from outstanding Play linkage and real purchase tests.
8. The current architecture reconciliation documents gaps; it does not cancel the target product or authorize reducing its scope.
9. The previous focused check passed TypeScript and 61 tests. Rust/device loading, visual acceptance and live commerce remain unverified; corpus-dependent testing lacks the provisioned corpus in this checkout.

## Resume prompt — use after Natally is live

> Work on SANCTISSIMISSA to complete the already specified product and release it on its intended marketplaces.
>
> First honor Robin's project priority: reserve the remaining approximately 20% quota for completing Natally and making it live on its intended marketplaces. If Natally has not reached that outcome, preserve this handoff and continue Natally. Do not consume the reserved quota on SanctissiMissa implementation now.
>
> Once Natally is complete and live, read this audit, the latest master, applicable Admin-Manual/project instructions, DOCS/ARCHITECTURE.md and its adopted Library/Bookstore/Chant contracts, CHECKLIST.md, the actual latest workflow and TEST_RUBRIC. Refresh CodeGraph. Recheck this report against current source; do not overwrite concurrent work or assume historical gaps are unchanged. If a newer workflow v2 exists on a workstation, reconcile it explicitly rather than inventing its contents.
>
> Maintain the distinction between the finished-product specification, implementation state and qualification evidence. Restore traceability where a target is mixed with status prose. Follow the applicable architecture amendment/signoff/checklist sequence for genuine specification changes; use existing valid approvals rather than asking for the same approval again. This audit itself is not a signoff ledger.
>
> Complete the existing dependency-ordered LS.01–LS.10, BS-S1–BS-S5 and CH1–CH6 obligations: real catalogue/domain and user storage; edition ingestion; signed/resumable package installation and offline access; shared reader/study/recording tools; operational bookstore service; OIDC identity; actual RevenueCat Web Billing and Android Play adapters; central entitlement and purchase controllers; real Library/Bookstore/Chant/Reference screens and shell routes. Reuse the provisioned RC IDs after validating current configuration. Preserve free Haydock and personal study data, permanent ownership and correct refund/subscription semantics. Implement the actual paths; demo screens, fixtures and provisioned product lists are not substitutes.
>
> Finish Companion semantics and qualification: retrieval from the real corpus, supported citations/deep links, appropriate lore recall and saved insights, real entitlement wiring; qualify the selected native Qwen 3.5 2B default on the Z Fold and all supported distribution targets. Preserve the guidance/diagnostics/Mass-navigation repairs, complete the intended chatbot-led DOM orientation, and disclose actual unsupported targets. Implement outstanding runner/storage requirements from the signed contract; do not silently replace them with claims of qualification.
>
> Test the real workflows as well as meaningful automated cases: sign-in and return links; browse/buy/restore; pending/cancel/error; successful entitlement reconciliation; download/resume/integrity; permanent offline reading; expiry/refund; preservation of notes; navigation and accessibility; model cold-load/generation/cancel/recovery. Keep raw debugging in the dedicated diagnostics surface and clear next-step guidance in ordinary UI.
>
> Integrate completed work into master and publish promptly using the authorized GitHub connection if shell credentials are unavailable. Preserve concurrent upstream changes; avoid leaving the only copy on a branch/workstation. Robin's instruction to merge to master includes publication, as explicitly clarified in this conversation.
>
> Continue through production service configuration/deployment, release signing and full supported artifact builds, real payment sandbox verification, store product/linkage requirements, listing assets/privacy declarations, submission and publication for the marketplaces specified in the authoritative project/release documents. Do not invent marketplace accounts or silently narrow the platform/store scope. Use existing authorized access; identify unavoidable missing credentials, legal attestations or operator-only actions precisely while completing all independent work.
>
> The completion target is real live marketplace availability, not merely code complete, tests green, APK built, listing prepared or submission pending. Record version, commit, artifact checksums, verification evidence and live listing URLs. External review may remain pending; report its actual state and resume the remaining work when it clears rather than claiming the whole goal is done.

## Source references

- [Pre-change architecture](https://github.com/rebots-online/sanctissimissa/blob/3021d442bbfc1705ca4d40e6d70fe8f48d433cfb/DOCS/ARCHITECTURE.md)
- [Last pre-change architecture edit](https://github.com/rebots-online/sanctissimissa/commit/30e759b8e53a7532b902cf23af2d4a30313eaff7)
- [Audited checklist](https://github.com/rebots-online/sanctissimissa/blob/1fe8549dc6aa7dc423484165e52d3ae6168c458f/CHECKLIST.md)
- [Committed workflow](https://github.com/rebots-online/sanctissimissa/blob/3021d442bbfc1705ca4d40e6d70fe8f48d433cfb/DOCS/WORKFLOWS/workflow_LS-companion-20260916.md)
- [Recorded commerce IDs](https://github.com/rebots-online/sanctissimissa/blob/1fe8549dc6aa7dc423484165e52d3ae6168c458f/content/library/commerce.seed.json)
