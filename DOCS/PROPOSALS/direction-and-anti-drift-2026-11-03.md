# Direction, repository map and an anti-drift contract (proposal, 2026-11-03)

> Status: **PROPOSAL, pending operator sign-off.** Not an architecture amendment; it changes no code.
> It records the operator's direction from the 2026-11-02/03 session, the evidence it rests on, and one structural
> proposal aimed at the problem the operator named: features and designs get built, then drift away.
> Every figure below was measured in that session; sources are named inline.

## 1. Direction (operator statements, paraphrased)

1. **SanctissiMissa is the product.** All development goes here.
2. **HelloWord (Play listing `mba.robin.helloword`) is legacy and maintenance-only.** It was the original skeleton, it served its purpose of taking a product through the whole process, and it needed only the Android 16 KB fix to stay compliant. That fix is done (build v2.40.93612, gates recorded in that repo's `claudedocs/`).
3. **What SanctissiMissa must be:** the chatbot interface, hover translations, **Breviary and Mass together** (not Mass only), and a **bookstore** that is "the critical part": a collection of public-domain writings (Church Fathers, mystics, martyrology, lives of the saints and similar).
4. **The bookstore's look and feel is already designed and finished in Google Stitch** and must be reintroduced, not redesigned.
5. **Recurring problem:** over the years features and designs have been built and then drifted away. Preventing that is a requirement, not a nice-to-have.

## 2. Repository map

| Repo | Role | Evidence |
|---|---|---|
| `rebots-online/sanctissimissa` (this repo) | The product; runs `sanctissimissa.surge.sh` (v1.66.30030) | Deployed bundle contains that version string; `scripts/deploy-web.mjs` targets the domain |
| HelloWord legacy repo (private) | Original skeleton; Play listing; maintenance only | One 3,563-line component, flat two-table DO import; none of the rewrite's modules present |
| `rebots-online/HelloWord-v2` | The rewrite under the HelloWord identifier; archive or keep as an option | 0 of 20 source paths shared with the original; README calls it a rewrite |
| `sanctissi-missa`, `SanctissiMissa`, `SanctissiMissa-Gemini`, `helloword-april2026` | Earlier attempts; already mined | See the first consolidation report |

The two lineages share a subway-map interface but no code. Names overlap (the original's Rust crate and product name also say "SanctissiMissa"), which is a source of confusion in itself.

## 3. Why work drifts here (evidence, not opinion)

1. **A design existed but nothing bound the app to it.** The Stitch bookstore screen is frozen in `LIBS/UI/STITCH/sanctissimissa-library-20260913/` (Stitch project `7192660594233084032`, five screens, per-screen SHA-256 in `manifest.json`, export re-verified against Google's live export on 2026-10-05). Yet `DOCS/ARCHITECTURE.md` section J.3 records that the app's `App` source "contains neither a Library entry nor a mounted Bookstore screen". The design was never mounted, and no check failed because no check existed.
2. **Status words substitute for evidence.** The architecture header itself says its historical "shipped", "verified" and phase labels "are dated records, not evidence that all planned entities exist".
3. **Artifacts and recipes are not reproducible.** The live corpus (`corpus-2026.09.09-2054`) was built from a source commit that does not exist upstream and is newer than the last ledger entry; `VENDORED/divinum-officium` and `assets/missal.db` are gitignored, so a clean clone cannot rebuild it; release binaries tracked through Forgejo LFS are lost.
4. **Parallel restarts.** Several repos each re-derived the same app (section 2).
5. **Work that waits on sign-off or on another task never lands.** All ten bookstore app tasks (LS.01-LS.10), all five backend tasks (BS-S1-S5) and all six chant tasks (CH1-CH6) are `[ ]` pending; `src/core/library/`, `src/core/entitlements/` and `services/` do not exist.

## 4. Proposal: a Product Contract that is checked, not claimed

**Idea.** One short machine-readable file lists what SanctissiMissa promises. Each promise has an owner source (an architecture section or a Stitch screen) and **an automated check**. Its status is computed from the check's result, never hand-marked. The release driver refuses to cut a release if any promised feature is red, and prints one page of green and red rows.

**Shape (illustrative):**

| Promise | Source of truth | Check (computed) |
|---|---|---|
| Hover translation on Mass and Office lines | architecture section on `SectionReader` | browser test: hover a Latin line, the English line highlights |
| Breviary and Mass in one app | `OfficeView`, `ReaderView` | all eight hours render for a sample set of dates; oracle diff against Divinum Officium (pinned commit) |
| Companion chatbot | companion contract | send a prompt, receive a streamed reply (hosted provider stubbed) |
| **Bookstore matches Stitch** | Stitch screen `eeb7643f...`, section J | element-ID presence from J.2; screenshot parity against the frozen export at desktop and 390 px widths; manifest SHA unchanged |
| Free reading works offline | LS contract | airplane-mode test of an included work |
| Month calendar with feast names | `CalendarView` | month grid renders 28-31 cells with feast titles |

**Why this fits the existing process.** The repo already gates releases on a rubric (`DOCS/TEST_RUBRIC.md`; the surge cutover waits on row AM-UI). This extends that, with local checks only (no CI, per operator policy). It also turns J.3's requirement ("rendered verification compares the running screen with the frozen source") into a repeatable test.

**Cost, my estimate:** the contract file and runner about 1 day; the Stitch parity gate about 1-2 days; one check per promise thereafter, written together with each feature.

## 5. Bookstore: state and path

**Exists:** frozen Stitch screens (`bookstore`, `library`, `reader`, `chant`, `mass-reference`); an adopted architecture contract (`library-study`, `bookstore-service`, `chant-reference`); a proposed amendment, section J (Bookstore in the left sidebar after Sacred Scripture, before My Journal, bound to the Stitch screen), **awaiting operator sign-off**; a catalogue seed of **61 works, 8 collections and 7 bundles** (Fathers and early Church 13, Spiritual life and prayer 15, Catechism/theology/apologetics 14, Saints and spiritual biography 5, Scripture and commentary 3, Marian devotion 3, Prayer books 5, Mass and liturgical year 3). It is a research proposal "not a list of products cleared for sale", with each edition's rights pending review.

**Gaps against the stated scope:** martyrology is thin (the catalogue holds one martyrdom account; martyrology texts exist in the Divinum Officium tree, and the live corpus carries only 2 martyrology nodes); saints' lives are thin (one daily-lives work plus several autobiographies). "All public-domain writings" therefore needs catalogue expansion as well as the UI.

**Dependency chain as written:** `LS.01 > LS.02 > LS.03 > BS-S1..S5 > LS.04 > LS.05 > LS.08 > LS.09 > LS.06 > LS.07 > CH1..CH6 > LS.10`. The UI (LS.06) sits behind the commerce backend and identity (LS.08), so the look cannot return until payments exist.

**Proposed re-sequencing (free-first), needs sign-off:** public-domain works are free to read. Ship a browsable, offline, Stitch-faithful library of the included works first (LS.01-LS.03, a read-only LS.06/LS.07 with purchase controls absent), then add the backend, identity and paid editions (BS-S, LS.04/05/08/09). This removes the merchant, identity and store-listing prerequisites from the critical path for the first appearance of the bookstore, and puts the Stitch parity gate in place before any commerce code exists. Per the adopted contract, missing merchant configuration already denies only new paid access, and the free reader stays anonymous (identity is for purchasing).

**Only the operator can provide (lead time):** a RevenueCat project and offerings; an OIDC issuer and client ID; the Play Console listing and in-app products for the SanctissiMissa identifier; merchant, tax and payout setup; a host for the bookstore service. None blocks the free-first step.

## 6. Carried over from the HelloWord work

- 16 KB pattern: linker flag `-Wl,-z,max-page-size=16384` per 64-bit ABI, NDK r28 pin, `zipalign -P 16`, then verify with `readelf` and `zipalign -c -P 16`. This repo already carries the linker flags and verified them at v1.41; the latest recorded Android build is v1.64 (partial), so re-verify at the next Android build.
- Journal "Print" (`src/ui/JournalView.tsx:80-87`) uses `window.open` plus `print()`, the same pattern that misbehaves inside a Tauri webview; replace with an in-app PDF and save or share.
- Analytics: none exists here (no Firebase or analytics code). A privacy-first design is sketched separately; the bookstore funnel (views, opens, installs, purchases) is its natural first use.
- Corpus pipeline: see the separate pipeline proposal (frozen, vendored, semantically named, reproducible).

## 7. Decisions needed

1. Sign off section J as written (Bookstore in the left rail, bound to the Stitch screen)?
2. Approve the free-first re-sequencing?
3. Approve the Product Contract and release gate as the first deliverable?

Until sign-off nothing here changes code; the architecture-first gate in `CLAUDE.md` applies.
