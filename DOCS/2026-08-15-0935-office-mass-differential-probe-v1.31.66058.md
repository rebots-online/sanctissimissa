# Office & Mass Differential Probe — v1.31.66058 vs Divinum Officium (1960 rubrics)

**Date:** 2026-08-15 09:35 EDT (probe date; **day under test = same day**: Saturday 2026-08-15, *In Assumptione Beatæ Mariæ Virginis*, Duplex I classis, Tempora/Pent11-6)
**Method:** token/structure-level comparison of three generations of the same day —
1. **DO reference**: the vendored Divinum Officium snapshot rendered locally via its own Perl CGI (`python3 -m http.server --cgi`, high port, `PERL5LIB=~/perl5/lib/perl5`; CGI.pm 4.66 installed locally) at **Rubrics 1960** (the extraordinary-form-relevant default) — same corpus bytes we ingested, so every divergence is ours by construction. (The live divinumofficium.com sits behind a Cloudflare browser challenge, blocking plain `curl`; local mirror is the faithful reference.)
2. **LIVE**: https://standroid.robin.mba, headless Playwright, all 8 hours + the Mass reader — **v1.26.60862 (build 60862, 2026-08-02)**.
3. **LOCAL current tree**: Node harness (`scripts/db-adapter.mjs` → `resolveDay` → `buildHour`, the `tests/office.test.ts` pattern) against the working tree — classifies each divergence as live-stale vs still-in-current-code.

**Verdict in one line:** the Mass structure and propers match DO; the Divine Office diverges structurally in every hour, from four concentrated root causes (all current-code), plus a translation-gap family and an unexpanded-macro family.

Working artifacts: `tests/.tmp/diffprobe/` (`do-*.html`, `sam-*.norm`, `local-*.txt`, `struct-matrix.txt`, `live-rest.txt`, `gen-local.mjs`).

---

## Divergence summary

| ID | Severity | Class | One line | Status in current tree |
|---|---|---|---|---|
| D1 | CRITICAL | engine logic | Matins: all 9 psalms then all 9 lessons — nocturn interleaving missing | still broken |
| D2 | CRITICAL | engine logic | Psalm schema always `Day${dow}` (ferial Saturday) — feasts must use Day0/festal rows | still broken |
| D3 | CRITICAL | engine data | Benedictus slot filled by Canticle of Moses — `CANTICLE_PSALM.Benedictus='226'`, true number 231 | still broken |
| D4 | CRITICAL | ingest data + logic | Compline psalms 87/102/102 from garbage `Day6 Completorium` row; Compline is invariable (4/90/133) | still broken |
| D5 | HIGH | ingest data | `Day0 Prima` first ref = 117; DO renders 53, 118(1-16), 118(17-32) | still broken |
| D6 | HIGH | ingest+engine | 40 unexpanded `![…]` specials today (`Dominus_vobiscum`×20, `ant`×10, `teDeum`, `rubrica Pater secreto`…); missing Pater noster / greetings / Benedictiones | still broken |
| D7 | HIGH | engine logic | II Vespers Saturday commemoration (ant. *Omnis sapientia* + Sunday collect) not rendered; feria has no `[Oratio]` by design — DO falls back to the Sunday's | still broken |
| D9 | HIGH | ingest | ~34 English-gap blocks today where DO renders English | still broken (suspected regression vs v1.26 for proper antiphons) |
| D10 | MEDIUM | ingest/render | Literal `!Ref` citation markers (incl. duplicated English `!Luke 1:48-49`) in Mass propers and Capitulum | still broken |
| D11 | LOW | rendering | Hymn stanza separators render as `_` lines | still broken |
| D12 | LOW | rendering | Invitatory antiphon not repeated with partial reprises (DO's pattern) | still broken |
| D13 | LOW | by design | DO appendix links (Officium defunctorum / parvum B.M.V.) absent | intentional omission; noted |
| D14 | HIGH (UI) | live-only | Subway-map station links broken (operator-reported on v1.26) | verify against current tree separately |
| D15 | — (ops) | deployment | Live serves v1.26.60862 while v1.31.66058 was built 2026-08-05 — the release's mount stage never ran | see §Ops |

*(D8 minor-hours antiphons is subsumed by D2: the ferial-antiphon symptom and the ferial-psalm symptom share the single `dayKey` root cause.)*

---

## Side-by-side comparisons and causes

### D1 — Matins: nocturn interleaving missing (the reported "extra psalms after Ps. 23")

**OURS (live v1.26 and current tree, identical):**
```
Invitatorium → Ps 94 → Hymnus
Nocturnus 1: Ps 8, Ps 18, Ps 23        ← then straight on…
Nocturnus 2: Ps 44, Ps 45, Ps 86
Nocturnus 3: Ps 95, Ps 96, Ps 97
Lectio 1 … Responsorium 1 … Lectio 9    ← all nine lessons AFTER all psalms
Te Deum → Oratio → Conclusio
```
**DO (1960):**
```
Nocturnus I:  Ps 8, Ps 18, Ps 23 → Pater noster → Lectio 1 (Genesis: Jacob's ladder), 2, 3
Nocturnus II: Ps 44, Ps 45, Ps 86 → Pater noster → Lectio 4, 5, 6
Nocturnus III: Ps 95, Ps 96, Ps 97 → Pater noster → Lectio 7, 8, 9
Te Deum → Oratio → Conclusio
```
The psalm *set* (8/18/23, 44/45/86, 95/96/97 — the BVM feast scheme) is correct on both sides; what's wrong is placement. The operator's phrasing "we generate additional psalms after ps. 23 up to the lectio genesis reading" is exactly this: the reader expects Lectio 1 (*Genesis*) right after Ps 23 and instead gets six more psalms.

**Cause:** `src/core/office/engine.ts` Matutinum assembly (~lines 347–373): psalmody is filled into the three `Nocturnus n` skeleton slots, then the lesson blocks (`Lectio n`/`Responsorium n`) are appended after the whole psalmody pass. The skeleton frame (`getSkeleton('Matutinum')`) orders `Nocturnus 1..3` before the lesson blocks, and the engine honors that order instead of interleaving 3 psalms + 3 lessons per nocturn. Also missing per nocturn: the inaudible **Pater noster** (exists in our corpus only as the `![rubrica Pater secreto]` marker, see D6) and the **Benedictions** before lessons (DO: "Benediction. May the Gospel's holy lection…" before Lectio 8; our corpus has `Benedictions.txt` in the DO Psalterium but the engine never renders them).

**Fix direction:** interleave at assembly (for nocturn n: psalms → versicle → Pater noster → benediction → Lectio (3n−2..3n) with responsories), and consume the `![rubrica Pater secreto]` marker as the inaudible-block signal. This is squarely inside the §11 P-V program (decisions 22–26).

### D2 — Feast days use the ferial day-of-week psalmody (root cause of five symptoms)

**OURS (Laudes, live and current tree):** Ps **149, 91, 63, Canticum (216 = Ecclus 36), 150** — the *Day6 ferial* schema, with the *Day6 ferial antiphons* at Prime/Tertia/Sexta/Nona (e.g. Tertia ant. *Clamor meus*).
**DO (1960):** Ps **92, 99, 62, Canticum Trium Puerorum, 148** — the festal scheme; DO's own section label reads *"Psalms for Sunday"* on feasts, with the proper's antiphons at the minor hours.

Side-by-side (Laudes):
```
OURS:  Ant. Assúmpta est… / Ps 149 / Ant. María Virgo… / Ps 91 / Ant. In odórem… / Ps 63
       / Ant. Benedícta fília… / Canticum (216) / Ant. Pulchra es… / Ps 150
DO:    Ant. Assúmpta est… / Ps 92 / Ant. María Virgo… / Ps 99 / Ant. In odórem… / Ps 62
       / Ant. Benedícta fília… / Canticum Trium Puerorum / Ant. Pulchra es… / Ps 148
```
(The antiphons are right — they come from the proper — the psalms under them are ferial.)

**Cause:** `src/core/office/engine.ts:347` — `const dayKey = \`Day${this.dow}\``. There is no feast→Day0 mapping. The 1960 rule: on feasts (II cl+) the minor hours and Lauds use the Sunday/festal psalms with proper antiphons; Matins on feasts uses the proper's psalm scheme (ours got that right via the proper file). Our DB already contains the correct row — `Day0 Laudes1 = 92 99 62 210 148`, and **210 = Canticum Trium Puerorum**, exactly DO's render; `Day0 Prima = 117 118(1-16) 118(17-32)` (first ref wrong, see D5); `Day0 Tertia = 118(33-48)…` = DO's minor-hour sets. So the fix is selection, not new data: `dayKey = feast ? 'Day0' : \`Day${dow}\`` (rank threshold per 1960: feasts ≥ II class; ferias/Weekdays of Lent keep their day row). This also fixes the minor-hour **antiphons** (D8): on feasts the engine must prefer the proper's antiphon sequence over the schema's ferial `antiphon_la` columns.

Related but distinct: `engine.ts:378-380` — the §11-documented `isFeria` precedence defect (`!winner || (test === false) && rank <= 1.2` parses wrong; `isFeria !== false` on a boolean is a no-op) steering `Laudes1`/`Laudes2`. With the feast→Day0 fix, Laudes1 is correct for today; the Laudes1/Laudes2 predicate still needs the P-V rewrite for penitential ferias.

### D3 — The "Benedictus" is the Canticle of Moses

**OURS (Laudes, live and current tree):** the `Canticum: Benedictus` slot renders `(Canticum Moysis * Deut 32:1-65)` — 64 verses of Deuteronomy 32.
**DO:** `Canticum Zachariæ` (Luc 1:68-79).

**Cause:** `src/core/office/engine.ts:142` — `CANTICLE_PSALM = { Benedictus: '226', Magnificat: '232', 'Nunc dimittis': '233' }`. Verified against the DB's own numbering (inherited from DO's Psalterium): **226 = Canticum Moysis (Deut 32)**, **231 = Canticum Zachariæ (Luc 1:68-79)**, 232 = Canticum B. Mariæ Virginis (Magnificat ✓ — which is why Vespers was right), 233 = Canticum Simeonis ✓. One wrong constant; correct value `'231'`.

### D4 — Compline psalms 87/102/102

**OURS (live and current tree):** Ps **87, 102(1-12), 102(13-22)** with a ferial antiphon (*Intret orátio mea*).
**DO:** Ps **4, 90, 133** with *Miserére mihi, Dómine* — Compline's psalms are **invariable** (per annum), which our own `Day0 Completorium` row correctly records (`4 90 133`).

**Cause:** two layers. (a) Data: `office_psalm_schema` `Day6 Completorium = 87, 102(1-12), 102(13-22)` — a garbage row (no rubric has 87/102×2 at Compline; looks like a misaligned ingest parse). (b) Logic: even with correct rows, the engine keys Compline by `dow` (D2's `dayKey`), when Compline should always read the invariable row. **Fix:** pin Compline to the `Day0 Completorium` row unconditionally + audit/regenerate `Day1-6 Completorium` rows at ingest (they should either equal `4 90 133` or not exist).

### D5 — `Day0 Prima` first psalm wrong

**OURS:** `Day0 Prima = 117, 118(1-16), 118(17-32)`.
**DO:** Sunday/feast Prime = **53**, 118(1-16), 118(17-32).

**Cause:** ingest-side row population (`office_psalm_schema`; the 1960 Sunday Prime first psalm is 53, not 117). Surfaces once D2's feast→Day0 mapping lands — fix together with it.

### D6 — 40 unexpanded `![…]` specials (missing Pater noster, greetings, examen…)

**OURS (current tree census, today):**
```
![Dominus_vobiscum]            ×20   (Conclusions render the marker literally)
![ant]                          ×10
![teDeum]                        ×2
![rubrica Pater secreto]         ×2   ← the inaudible Pater noster, dropped instead of rendered
![rubrica Matutinum]  ![rubrica examen]  ![oratio_Visita]  ![oratio_Domine]  (×2 each)
```
**DO:** expands all of these — the "Dominus vobiscum" greeting before the collect, the Pater noster (audible in Matins per nocturn, "secreto" elsewhere), the Te Deum rubric, Compline's examen + *Converte nos*/*Visita nos* prayers.

**Cause:** the DO corpus marks specials with `![name]`; our ingest stores them literally and `engine.ts`'s `special()` resolves only the subset it knows (e.g. 'Major Special'). The unexpanded markers are user-visible junk and whole prayer blocks vanish. The source data exists (`horas/Latin/Psalterium/Special/`, `Benedictions.txt`, `Mariaant.txt`) — an ingest mapping + engine expansion table closes the family.

### D7 — II Vespers Saturday commemoration missing

**DO (after the collect):**
```
Ant. Omnis sapiéntia a Dómino Deo est, et cum illo fuit semper, et est ante ævum.
Ant. All wisdom is of the Lord God, and was with Him from everlasting, yea before time was.
[collect of the Saturday / preceding Sunday]
```
**OURS:** the day banner *knows* the commemoration ("Comm.: Sabbato infra Hebdomadam XI post Octavam Pentecostes" — `day.commemorations` carries `Tempora/Pent11-6`), but nothing renders: the Oratio block ends after the feast collect.

**Cause:** `engine.ts oratio()` loops `day.commemorations` and looks for `['Oratio']` in `Horas/<key>` then `<key>` — but `Tempora/Pent11-6` **has no `[Oratio]` section in the DO corpus by design** (its file carries only Officium/Rank/Rule/lectios); DO's engine falls back to the **preceding Sunday's** collect (`Tempora/Pent11-0 [Oratio]`, present and verified in our DB). Our lookup stops at the feria file and silently emits nothing (the fail-loud gap, quality finding H2, made visible). Additionally the engine has no slot for the commemoration **antiphon** (the Saturday's Vespers Magnificat antiphon *Omnis sapientia*, ferial-invariable per annum — available in the Psalterium specials). **Fix:** feria-key → `<week>-0` fallback in the comm loop + a commemoration antiphon slot at Vespers (and its Laudes counterpart for I Vespers cases).

### D9 — English gaps (the operator-flagged class)

Census (current tree, today, non-frame entries with Latin but no English):
```
Antiphons 12 (Laudes 5, Vesperae 5, Tertia 1)   Versus 5      Responsorium (Matins) 7 (1,2,3,5,6,7,8 — 4 and 9 DO have!)
Responsorium breve 3 (Tertia/Sexta/Nona)        Capitulum 2   Lectio 4–5 2   Invitatorium 1
Ant. ad Benedictus / ad Magnificat 2             Completorium Incipit 1        ≈ 34 total
```
**DO renders English for every one of these** (its parallel tree `web/www/horas/English/…` carries the translations — including "Today the Blessed Virgin Mary ascended to heaven…" for the *Ant. ad Magnificat* we render Latin-only).

**Cause:** ingest-side English mapping gaps (`scripts/ingest-office.mjs`): the `office_psalm_schema.antiphon_en` columns are NULL where the Latin columns are populated (schema-driven antiphons), and several section types (Versus, Responsorium*, Lectio 4–5 of this feast, Invitatorium, canticle antiphons) didn't get their `horas/English/` counterparts joined. **Regression flag:** live v1.26 renders English for the Laudes/Vespers proper antiphons; the current tree does not — the rebuilt `missal.db` lost antiphon English that the v1.26 db had. The Responsory 4/9-vs-1-8 split shows the mapping is data-present but selectively joined.

### D10 — Literal citation markers in propers

**OURS (Mass Communio):** `!Luc 1:48-49 Beátam me dicent omnes generatiónes…` — and after the English, a second `!Luke 1:48-49`. Introitus: `!Ap 12:1 v. Signum magnum… !Ps 97:1`. Tertia Capitulum: `!Judith 13:22-23` + duplicate `!Jdt 13:22-23`.
**DO:** renders citations inline as scripture references, no `!` markers, no Latin/English duplication.
**Cause:** DO's `!Ref` citation directive stored literally by the ingest; the English-side citation (`!Luke …`) additionally duplicated as a text line. Rendering/ingest cleanup family.

### D11–D13 — Rendering-level (LOW)

- **D11:** hymn stanza breaks appear as lines containing `_` (our render of DO's `!` stanza separator). DO: blank-line stanza break.
- **D12:** Invitatory antiphon sung once; DO repeats it with partial reprises between psalm verses (their standard display). Cosmetic/liturgical-display difference.
- **D13:** DO appends links to *Officium defunctorum* and *Officium parvum B.M.V.* after each hour; we omit (fine — note for parity completeness only).

### Mass — comparison verdict

**Structure matches DO on live:** the reader sequence (Iudica → … → Graduale **+ Alleluia** → Evangelium → … → Ultimum Evangelium) with **Tractus not travelled** (Time after Pentecost, non-penitential) is exactly DO's set. The local probe's extra `GradualeP`/`Tractus` rows (`[Commune/C11]`) are pre-conditional-filtering data — the UI's conditionality layer correctly suppresses Tractus. **Propers text matches DO token-for-token** (Introitus *Signum magnum*, Collect *Omnípotens sempitérne Deus…*, Gospel Luc 1:41-50 *Repléta est Spíritu Sancto Elísabeth…*, Communio *Beátam me dicent*…) — residual divergences are D10's citation markers only. DO also inlines the whole Ordinarium text on one page; ours distributes it across stations (map + reader) — a presentation choice, not a divergence.

### D14 — Subway-map link defect (live-only, operator-reported)

v1.26's subway map station→reader links are broken (operator report; my Mass capture used the 📖 reader to sidestep it). Not reproduced against the current tree in this probe — verify separately (candidate: the station click-through routing the §11 map work targets; related outstanding items in the 2026-08-13 handoff: "subway maps (scripture reader, breviary)").

### D15 — Ops: the live site is two releases stale

Live serves v1.26.60862 (built 2026-08-02) while v1.31.66058 completed its full multi-platform build on 2026-08-05. Under the release contract there is no such thing as a partially-mounted release: if the web app built successfully it must mount, and if it didn't mount, the release flow is broken and gets fixed. The fix is the push-only deployment design (artifacts push; the server's code, configs and HTML are never rewritten) — that mechanism is outlined and was just confirmed working on the Kintsugi project; StAndroidsMissal needs its deploy stage implemented to that pattern, with the release manifest riding inside the web PWA payload so `https://standroid.robin.mba/manifest.json` serves real JSON instead of falling through the SPA fallback to `index.html` (verified today).

---

## Evidence appendix

- **DO reference generation** (Rubrics 1960): `tests/.tmp/diffprobe/do-{Matutinum,Laudes,Prima,Tertia,Sexta,Nona,Vesperae,Completorium}.html` + `do-missa.html`, fetched from the vendored snapshot's CGI (`officium.pl?date=08-15-2026&command=pray<Hour>`, `missa.pl?…&command=prayMissa`).
- **Live capture**: `sam-<Hour>.norm`, `sam-Mass-full.norm` (Playwright headless, v1.26.60862).
- **Current tree**: `local-<Hour>.txt`, `local-Mass.txt` via `gen-local.mjs` (re-run: `node --experimental-strip-types tests/.tmp/diffprobe/gen-local.mjs 2026-08-15`).
- **Schema rows** (`office_psalm_schema`): Day6 Laudes1 `149 91 63 216 150` · Day6 Completorium `87 102(1-12) 102(13-22)` · Day0 Laudes1 `92 99 62 210 148` · Day0 Completorium `4 90 133` · Day0 Prima `117 118(1-16) 118(17-32)` (117 wrong) · Day0 Tertia `118(33-48)…` ✓.
- **Canticle identities** (`getPsalm`): 210 Trium Puerorum · 216 Ecclus 36 · **226 Moysis (Deut 32)** · **231 Zachariæ (Luc 1:68-79)** · 232 Magnificat ✓ · 233 Simeonis ✓.
- **Engine loci**: `src/core/office/engine.ts:347` (dayKey), `:142` (Benedictus '226'), `:378-380` (isFeria/Laudes1-2), `:436-455` (canticum slots), oratio() comm loop (feria collect fallback), Matutinum assembly (~347-373).
- **Corpus loci**: `Tempora/Pent11-6` has no `[Oratio]` (DO design); `Tempora/Pent11-0 [Oratio]` present in DO and our DB; English tree `web/www/horas/English/…`; specials `![…]` census above.

## Relation to the §11 program

D2 (feast→Day0 schema selection) and the Laudes1/Laudes2 predicate are the already-architected **B1 / P-V stanza** (`DOCS/ARCHITECTURE.md` §11, decisions 22–26; `DayInfo.vigil` still absent from `types.ts`). D1 (nocturn interleaving), D3 (Benedictus number), D4 (Compline row + invariability), D6 (specials expansion) and D7 (commemoration fallback) are natural members of the same stanza's scope; D5 and the `Day1-6 Completorium` rows are ingest-side data repairs best landed with the next `npm run ingest`. No remediation was performed in this probe — this report is the enumeration and cause record for that work.

---

# Phase 2 — day-type coverage (same day-session, ~10:15 EDT)

The Assumption probe exercised I-class-feast paths only. Phase 2 probes four further day-types, DO-vs-current-tree (live≈local equivalence was established in Phase 1): **2026-08-16** (Dominica XII, green Sunday), **2026-08-17** (S. Hyacinthi, III-class sanctoral), **2026-08-14** (Vigil of the Assumption), **2026-12-16** (Feria IV Quattuor Temporum in Adventu — Advent Ember Wednesday). Artifacts: `tests/.tmp/diffprobe/day-<date>/` (`do-*.html`, `local-*.txt`, `matrix.txt`, `condensed.txt`).

## Controls that PASSED (validating the schema table itself)

- **Sunday Laudes psalmody is correct**: 92/99/62/Canticum (210 = Trium Puerorum)/148 = DO exactly (`Day0 Laudes1` row ✓).
- **III-class feast Matins/Laudes/minor psalmody follows the ferial day row** and matches DO (Hyacinth: 13/14/16…, 46/5/28/Cant(211)/116) — correct 1960 behavior for III-class.
- **Ferial Compline day-rows match DO** (Monday 6/7(2-10)/7(11-18); Wednesday 33(2-11)/33(12-23)/60).
- **Advent Ember Tertia matches** (53, 54(2-16), 54(17-24)).

## New findings

### D16 — CRITICAL — Sunday Matins renders ZERO lessons
Green Sunday (2026-08-16): our Matins runs psalms → Oratio with **no Lectio/Responsorium at all** (0 entries); DO renders the Sunday homily lessons. **Cause:** `engine.ts:523` — `lessons()` iterates `Lectio${i}` from 1 with `if (!lec) break;`. DO's tempora files number Sunday Matins lessons **7–9** (the homily convention) — verified: `Tempora/Pent12-0` ingests `Lectio7/8/9` (+`Responsory8`) and nothing numbered 1–6. `Lectio1` misses → break → zero lessons. The contiguity assumption breaks every Sunday and any file using the 7–9 convention. Fix direction: collect all `Lectio n` sections present, sort, emit in order (and interleave per D1).

### D17 — CRITICAL — `isFeria` is inverted; penitential Laudes2 is unreachable for ferias and vigils
**Evidence 1 (Advent Ember Wednesday, 2026-12-16):** DO Laudes = **50**, 64, 100, Canticum Annæ, 145 (penitential arrangement); ours = **96**, 64, 100, Cant(213), 145 (Laudes1).
**Evidence 2 (Vigil of the Assumption, 2026-08-14):** DO Laudes = **50**, 142, 84, Canticum Habacuc, 147; ours = **98**, … (Laudes1).
**Cause:** `engine.ts:378` — `isFeria = !winner ‖ (/Feria|Dominica/i.test(rankClass) === false && rank ≤ 1.2)`. A day whose `rankClass` **is** "Feria" makes the regex match → `match === false` is false → `isFeria = false`. The predicate is true exactly when the day is *not* labeled a feria — backwards. Hence `penitential && isFeria` (line 380) never selects `Laudes2` for real ferias; vigils additionally fail the season list (`['Advent','Pre-Lent','Lent']` omits vigil penitentiality). **The schema data is already right:** `Day3 Laudes2 = 50 64 100 223 145` and `Day5 Laudes2 = 50 142 84 225 147` reproduce DO exactly (223/225 = the correct ferial canticles). This is the §11 B1 defect, now proven on two day-types; the fix belongs to the P-V stanza (`DayInfo.vigil` included).

### D18 — MEDIUM — Commemorations are not hour-scoped
DO renders *S. Eusebius* on 08-14/12-16 as **"Commemoratio ad Laudes tantum"** (and at Laudes shows the full commemoration block); on 08-16, *S. Joachim* similarly scoped. Our engine emits `Commemoratio: …` at **every hour** (Matins/Prima/Tertia/Compline on 08-14 and 08-16 all carry it). DO's kalendar data carries scope annotations (ad Laudes tantum / ad Laudes et Vesperas / ad Vesperas); our `day.commemorations` keeps only key/title/rank and `oratio()` appends it wherever the Oratio block renders. Fix direction: ingest the scope annotation and gate the commemoration rendering by hour.

### D5 — REVISED by Sunday control (was: "Day0 Prima first ref 117 wrong")
DO's Sunday Prime is **117, 118(1-16), 118(17-32)** — our `Day0 Prima` row is **correct for Sundays**. On **feasts** DO uses **53**, 118i, 118ii (the ferial invariable first psalm). So the actual defect is twofold: (a) the feast mapping must select the ferial-Prime set, not the Sunday row; (b) the `Day1–Day6 Prima` rows carry a **bogus 4th slot** — the day's Laudes psalm leaked in (Day1→46, Day3→96, Day5→98, Day6→149; DO renders three Prime psalms on every probed day). Ingest row repair + selection fix.

### D4 — REFINED (Compline)
Compline varies by day **character**, not weekday: ferias use the day rows (Day1/Day3 verified correct); Sundays, feasts, and vigils use the invariable **4/90/133** (DO on 08-14 vigil and 08-15 feast; our `Day0 Completorium` row). `Day6 Completorium = 87 102(1-12) 102(13-22)` remains garbage data. Fix: repair the Day6 row + select by character (feast→invariable row), same mapping family as D2.

### D2 — REFINED (scope of the feast mapping)
The feast→Day0/festal mapping applies to **Laudes, the minor hours, Prime, and Compline**, and only for **I/II-class feasts** (and Sundays by nature); III-class feasts and ferias keep their day-of-week rows (Hyacinth control passed). I-class **Matins** psalmody already works via the proper-file path (Phase 1's Assumption set was correct). Ember-Matins row nit (Day3 nocturn 3): ours `49(1-15) 49(16-23) 50` vs DO `49(1-6) 49(7-15) 49(16-23)` — a split-boundary data fix in the same family as D5's row repairs.

### D6 — recurrence confirmed
DO renders the **Pater noster** at Matins/Prime/Compline on all four Phase-2 days; ours is absent everywhere (the `![rubrica Pater secreto]` macro family, unchanged).

## Phase-2 divergence table

| Day | Type | Result |
|---|---|---|
| 2026-08-16 | Sunday | Laudes ✓ · **Matins lessons missing (D16)** · Prime row ✓ for Sunday · D3/D6 as Phase 1 |
| 2026-08-17 | III-class feast | Matins/Laudes/minors ✓ · Prima 4-slot row (D5b) · D3/D6 persist |
| 2026-08-14 | Vigil (I cl) | **Laudes2 not selected (D17)** · Compline should be 4/90/133 (D4) · commemoration hour-scoping (D18) · Matins psalmody ✓ |
| 2026-12-16 | Advent Ember feria | **Laudes2 not selected (D17 — inverted isFeria proven)** · Matins nocturn-3 split row · Compline ✓ (ferial row) · D6 Pater noster |

Phase 2 likewise performed no remediation; it extends the enumeration. The four CRITICAL engine defects are now D1 (nocturn interleave), D2+D4+D5 (schema selection/row data), D3 (Benedictus number), D16 (lesson numbering), D17 (inverted isFeria) — with D17 and the vigil cases mapping directly onto the §11 P-V stanza as designed.
