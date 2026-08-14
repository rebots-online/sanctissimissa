# Handoff — 2026-08-14 (context cleared mid-program)

Written for the next session taking this program to **all-platform release, inclusive of
verifying the standroid.robin.mba automanifest mount**. Everything here is the state of
record; the authoritative contracts are `DOCS/ARCHITECTURE.md` §11 and `CHECKLIST.md`.

## 1. Session state

- Branch `master`, pushed to **both remotes** at **`82938369`** (forgejo `origin` =
  authoritative + only LFS store; `github` = mirror). Nothing of this session is local-only.
- Landed in that commit: the two verified fixes (§2) + `DOCS/ARCHITECTURE.md` fifth
  re-attestation §11 + `DOCS/ARCHITECTURE.md.bak` (I-0 backup).
- Dev server (`:5173`) **stopped**; Playwright browser closed. No dangling processes.
- This checkout: `/home/robin/github/StAndroidsMissal`, **native Linux (msi4090, Ubuntu
  24.04, node v24.14.1) — NOT WSL**. `sqlite3` CLI works; read-only DB probes via
  `file:assets/missal.db?mode=ro&immutable=1`.
- Figma file exists (capture of the live SubwayMap, file `2vR0mnCm0op6doElrnjNsD`,
  canvas https://www.figma.com/design/2vR0mnCm0op6doElrnjNsD?node-id=1-2) — reference
  only; **nothing is Figma-gated** (operator rule: designs are generated in-proposal).

## 2. Landed and verified (do not redo)

| Fix | Proof |
|---|---|
| **B4** highlight marked every identical word → exact-passage anchoring (`AnnotationRange` `{lang,line,start,end}` src+alt; `SectionReader.resolveSelectionRange` @ `src/ui/SectionReader.tsx:471`; `renderLine` marks path @ `src/ui/BilingualText.tsx:73`) | Playwright: word "Amen" ×15 → exactly **1** `mark.ann` |
| **B3a** psalm verse numbers → `<sup class="vnum">`, chapter shown once | Playwright on Ps 98: heading "Psalmus 98" once; no `NN:` repetition |

Typecheck clean (`npx tsc -b` exit 0).

## 3. Diagnosis of record (ARCHITECTURE.md §11.1 — fixes NOT yet coded)

- **B1 🔴 Office Lauds diverges from Divinum Officium.** Engine bug, **data exonerated**:
  `office_psalm_schema` probe proved `Day5/Laudes2` = row-for-row the divinumofficium.com
  reference, `Day5/Laudes1` = row-for-row our wrong output. Root cause:
  `OfficeEngine.psalmody` (`src/core/office/engine.ts:374-381`) has **no vigil rule**
  (a vigil is penitential → ferial psalter/Laudes2 with Ps 50 *Miserere*, even in Time
  after Pentecost) and its `isFeria` is precedence-broken. Fix: `DayInfo.vigil` +
  rewritten predicate + `scripts/diff-office.mjs` fidelity harness (decisions 24/26).
- **B2 🟠 Subway stops don't jump to their own text** (Confiteor et al.): six station
  *pairs* share one Ordo section in `ORDO_STATION_SECTION` (`src/core/model/massOrdo.ts:104`);
  clicks land on the section top. Fix: line-addressable anchors `{section, line?}` +
  totality test (decision 25).
- **B3b 🟠 Bible verse numbers**: `BibleView.tsx:172` joins verses with no inline number —
  prefix the join; extend the `vnum` regex for sub-verse letters (`142:11b`, `(12a)`).
- **B5 🟠 edit/remove highlights**: add `updateAnnotation` to
  `src/core/annotations/store.ts`, a mark popover in SectionReader, and the F3 index.
- **B6 🟡 rail pin inverted**: pin (📌 hold-open ↔ follow-viewport) and collapse (☰)
  become distinct controls (`src/App.tsx:56-59`).
- **F1–F4** new screens — ScriptureMap (per-Book alternating chapter boxes + dropdown
  verses + superscript numbers), OfficeHourMap (intra-hour part stations),
  AnnotationIndex (🔖 global edit/remove/jump), ConceptSearch (fuzzy description →
  closest concepts; ⌘K + 🔍; reuses `conceptsForText`/`groupedConcordance`/
  `groupedSimilarToText`). All specified with signatures in ARCHITECTURE.md §11.2 (P-V).

## 4. NEW requirement (operator, 2026-08-14 — this handoff) — task #11

**missal.db release-version disambiguation — fail loud, never silent.** Name/stamp the
corpus by release version (and/or a version handshake: `version.json` ↔ db meta) so a
stale or mismatched DB makes the app **refuse to work** instead of silently generating
wrong liturgy — the exact B1 failure mode that shipped invisibly. Rationale on record:
*fix-on-encounter; each release is responsible for everything up to its attestation;
nobody passes the buck*. Needs an ARCHITECTURE.md decision/entity row (mechanism +
platform implications: desktop `include_bytes!`, web `fetch`, Android asset pack)
**before code**, and must land before the next release attestation.

## 5. Execution order through release (task #12 → #13)

1. **Architect gate (task #12):** re-form `DOCS/TEST_RUBRIC.md` — rows for D24
   office-fidelity differential, D25 station-anchor totality, D22 exact-range
   highlight, **and the missal-db version-handshake fail-loud row (§4)**. Then author
   `CHECKLIST.md` stanza V citing §11.2 entity rows verbatim.
2. **Code wave (stanza V):** B1 → B2 → B3b → B5 → B6 → missal-db disambiguation →
   F4 ConceptSearch → F1 ScriptureMap → F3 AnnotationIndex → F2 OfficeHourMap
   (+ `View`/`NAV` rail additions). Verify each: `tsc -b`, `npm test`, and the
   Playwright patterns used this session (differential office check, mark counts,
   station-jump assertions). `diff-office.mjs` wires into `npm test`.
3. **Release (task #13), canonical native-Linux checkout only:** load
   `~/.claude/BUILD_CONVENTIONS.md` first; `npm run build:release` (stamp runs once,
   first; commit prefix `v{VERSION}: `; STAGE_ORDER test→web→linux→windows→
   windows-msi→windows-msix→android-debug→android-release→symbols→collect). **Write
   the `## v<version>` section of `DOCS/CHANGELOG.md` before collect** — release notes
   generate from it into JSON/XML manifests (`change_notes`). CC12 slug-first artifacts
   into the tracked `dist/` via forgejo LFS; installer acceptance = install → launch →
   verify splash version + corpus loads → uninstall (never "build succeeded").
4. **Automanifest verification (explicit operator requirement):** after collect,
   verify the **standroid.robin.mba CC8 automanifest mount** renders the new
   `release-manifest-v*.json` and its per-release highlights (access paths per
   `~/Admin-Manual/SERVERS/README.md`). The release is not done until the public
   landing page shows it.
5. **Push both remotes end-to-end** — "push a commit" means assemble → commit → push
   (origin + github), no intermediate stops.

## 6. Un-assessed working-tree items (predate this session; NOT committed — assess, don't assume)

- **`VENDORED/divinum-officium` is UNTRACKED** — yet ingest reads it and decision 8
  (corpus sovereignty) vendored it "whole." A fresh clone cannot re-ingest. Assess:
  commit (LFS where needed) vs intentional gitignore; this is the "vendored dep frozen
  only when its assets are frozen" hazard class. Priority before trusting any re-ingest.
- Modified, un-assessed: `DOCS/BUGS/BUGS-v.1.25-31jul2026.md`,
  `DOCS/CORPUS-FILL-LOG.md`, `dist/manifest.json`.
- Untracked `dist/` v1.31.66058 release set (apk/aab/exe/msi-class/AppImage/deb/pwa +
  manifests + release notes) — stage or outbox per CC12; never delete (I-0; outbox =
  `~/outbox/standroidsmissal/`).
- Stray: file named `to` (repo root), `2026-08-13-190625-standroidsmissal-figma.json`,
  `.playwright-mcp/` (session artifacts), `/tmp/sam-devserver.log` (outside repo).

## 7. Operator expectations (behavioral, also in Claude memory)

- "Push a commit" = the full flow through remote push, both remotes — no reminders.
- Stop long-running processes when finished; nothing dangles.
- Fix-on-encounter / release-responsibility / fail-loud doctrine (§4).
- Nothing is Figma-gated: generate designs in-proposal.

## 8. Pointers

- `DOCS/ARCHITECTURE.md` §11 (amended 2026-08-14; backup `.bak` beside it)
- Plan file: `/home/robin/.claude/plans/i-wanet-you-to-twinkly-blum.md`
- `~/Admin-Manual/PROJECTS/BUILD-INSTRUCTIONS-StAndroidsMissal.md`,
  `~/Admin-Manual/SERVERS/README.md`, `~/.claude/BUILD_CONVENTIONS.md`
- Differential oracle used for B1: divinumofficium.com (same day/feast/rubric;
  Laudes, *In Vigilia Assumptionis B.M.V.*, 2026-08-14)
