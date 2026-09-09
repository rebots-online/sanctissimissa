# St. Android's Missal v1.38.03717 — bilingual rubric-loss incident

- **Incident UUID:** `urn:uuid:6a39f30e-ee25-46b2-9afa-a621ea6dc87c`
- **Status:** implementation and automated non-corpus verification complete;
  working-artifact M-S8 pending the Forgejo LFS corpus
- **Observed:** 2026-08-31 in v1.37.82443
- **Recorded:** 2026-09-01
- **Affected surface:** Mass reader below the 1100 CSS-pixel interleaved breakpoint
- **Unaffected reference:** Divinum Officium and the app's two-column reader
- **Forgejo authority:** `https://forgejo.robin.mba/rcheung/StAndroidsMissal.git`
- **GitHub code mirror used for this repair:**
  `https://github.com/rebots-online/StAndroidsMissal`
- **Disambiguation:** this is `rebots-online/StAndroidsMissal` (plural
  `Androids`), not the separate `rebots-online/StAndroidMissal` repository.

## Symptom

On the narrow reader, red Latin rubrics such as
`Sacerdos paratus cum ingreditur ad Altare…` and
`Deinde, junctis manibus ante pectus…` appeared with no English rubric beneath
them, while the following spoken prayer remained bilingual.

## Evidence and root cause

The upstream English `missa/English/Ordo/Ordo.txt` contains the translations,
and the earlier ordinal Ordo-ingest correction records 0/21 blank English
sections. The omission occurs after retrieval. In v1.37.82443,
`BilingualText.tsx` computes `laKind` and `enKind` for leading-`!` lines, then
returns `null` for the English branch whenever `laKind` exists. The predicate
therefore asks whether the Latin line has markup, not whether the visible
English line duplicates the visible Latin line.

## Remediation plan and intended diff

| Order | Surface | Diff contract |
|---:|---|---|
| 1 | `version.txt` and stamped manifests | Run the canonical stamper first: `1.37.82443` → `1.38.03717`; `versionCode` 100038; Appx `1.38.0.0` |
| 2 | `DOCS/ARCHITECTURE.md` | Add §12, invariant BR-1, decision 27, repository identity, entities, and verification gate before code |
| 3 | `DOCS/TEST_RUBRIC.md` | Add M-S8 requiring translated red rubrics in the narrow working artifact |
| 4 | `src/core/liturgy/massSpecials.ts` | Centralize bang-line classification; add normalized visible-body comparison and a pure render policy |
| 5 | `src/ui/BilingualText.tsx` | Replace `laKind ? null` with `shouldRenderPairedBangLine(en, la)`; preserve specials suppression |
| 6 | `tests/bilingualRubrics.test.ts` | Reproduce both reported Ordo pairs; cover duplicate/distinct references and controls; prove the renderer consumes the policy |
| 7 | Admin Manual project record | Add this same UUID and exact repository coordinates to `PROJECTS/BUILD-INSTRUCTIONS-StAndroidsMissal.md` |
| 8 | Admin Manual convention | Seed a cross-repository incident UUID normalization rule from this incident |

## Acceptance

1. `npm test` and `npx tsc -b --pretty false` exit zero.
2. The focused regression proves distinct English bang-lines render, equal
   visible bodies deduplicate, and controls never render.
3. A working narrow build shows the English translations directly below both
   reported Latin rubrics.
4. No corpus rebuild is needed: corpus content is not the fault domain.
5. The UUID above matches the Admin Manual project record exactly.

## Diff outcome

Landed as planned. `laKind ? null` is removed from the interleaved English
branch. `classifyBangLine` and `shouldRenderPairedBangLine` now separate markup
classification from normalized visible-content equality. The regression is
wired to the renderer and covers the two reported rubric pairs.

Verification on 2026-09-01:

- focused regression: 5/5 pass;
- `npx tsc -b --pretty false`: pass;
- non-corpus suite: 246/246 pass, 3 declared skips;
- `npm run build:vite`: pass;
- full corpus suite: unavailable from the GitHub code mirror because the real
  `assets/missal.db` LFS object lives only on the currently offline Forgejo;
  observed failures uniformly identify the checked-out LFS pointer as not a
  database.

Direct M-S8 visual verification remains a release gate and is not inferred
from these automated results.
