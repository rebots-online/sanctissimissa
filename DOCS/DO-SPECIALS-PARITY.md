# DO specials parity matrix (Mass + Office)

**Status:** implementation in progress (Mass engine landed; Office inventory open).  
**Reference:** `VENDORED/divinum-officium/web/cgi-bin/missa/propers.pl` `specials()` + hook subs; horas specials for Office.

## Priority law

Work required to reproduce Divinum Officium functionality outranks product add-ons and is never “out of scope.”

## Mass — `!*` / `!&` controls (Ordo.txt)

| Control | DO semantics | Our implementation | Status |
| --- | --- | --- | --- |
| `!*…` line | Never printed | Dropped in `applyMassSpecials` | Implemented |
| `!*&Hook` | Eval hook; if true skip to blank | `HOOKS` in `massSpecials.ts` | Implemented |
| `!*D` | Skip unless Requiem | `requiem` context | Implemented |
| `!*S` | Skip if not solemn | `mass.solemn` setting | Implemented |
| `!*R` | Skip if solemn | same | Implemented |
| `!*nD` / `SnD` / `RnD` | nD + requiem | flag regex | Implemented |
| `!&hook` bare | Run hook, omit line | Dropped | Implemented |
| `Introibo` | Omit Judica in Requiem/Passiontide | `isPassiontideDay` / `isRequiemDay` | Implemented |
| `GloriaM` / `Credo` | gloriflag / Credo rules | Heuristics from day+rule | Implemented (rule blob optional) |
| `CheckQuiDixisti` / `CheckPax` / `CheckBlessing` / `CheckUltimaEv` | omit blocks | Hooks | Implemented |
| `placeattibi` | never omit | returns false | Implemented |
| Section `#Label` omit via Rule | skip section | Partial (subway/rule elsewhere) | Open |
| Re-ingest | only if runtime cannot recover | Not required for Ordo controls | N/A |

**Apply site:** `ReaderView` Ordo entries via `applyMassSpecialsBilingual` + `massSpecialsContextFromDay`.  
**Display belt:** `BilingualText` suppresses residual `!*`/`!&`; citations vs rubrics.

**Solemn UI:** sidecar `mass.solemn` = `0`|`1` (default Low).

## Office — horas specials

| Area | Status |
| --- | --- |
| Macro `$` / `&` expansion | Existing `office/engine.ts` |
| Full `specials.pl` omit/include matrix | **Open — P0** |
| Seasonal preces / doxology switches | Inventory vs engine |
| Golden fixtures Laudes/Vespera/Completorium/Matins | Pending |

## Tests

- `tests/massSpecials.test.ts` — Judica, Solemn/Low, Requiem, Passiontide, no raw controls.

## Gauntlet rows

See `DOCS/TEST_RUBRIC.md` section **MS — Mass specials** (M-S1… when present).
