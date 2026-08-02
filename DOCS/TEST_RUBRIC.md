# TEST_RUBRIC — St. Android's Missal (SC4 / I-19 gauntlet)

**Build identity under test:** `mba.robin.standroidsmissal` · version pinned at run time from `package.json` (must equal `src-tauri/tauri.conf.json` + `src-tauri/Cargo.toml`).
**Environments:** web (Chromium via Playwright), Linux desktop (Tauri, this host), Android (device/emulator), Windows (cross-built artifacts; install-run on a Windows host).
**Authored at PLAN** (GR-1), sibling to `CHECKLIST.md`. **Executed only after every CHECKLIST task is ✅** (GR-2).

## Verdict doctrine (GR-3/3a)

Exactly two terminal verdicts: **SHIP-READY** (every row ✅) or **DEFECTIVE** (any ❌ at any severity; ⚠️ PARTIAL on BLOCKER/HIGH counts as ❌). Severity ranks fix urgency only — there is **no waiver state**. Agent subset all-✅ with OPERATOR rows un-run ⇒ **INCOMPLETE—pending-operator**, enumerating the remaining IDs. Nothing in the product spec is "out of scope" of this rubric: an app that renders the Mass but not the complete Divine Office is DEFECTIVE by construction (rows O-1…O-14).

## Driver discipline (GR-4/GR-7, TC11)

- Every action derives from a fresh screenshot/UI state — no blind coordinates.
- A PASS is granted only by **direct semantic observation** of cited evidence. Greps/logs/exit codes are FAIL-triggers and supporting evidence, never a PASS basis.
- Evidence stills to gitignored `.tmp/rubric/` as `NN-<ID>-<desc>.png`; the **whole driven session is screencast-recorded**, segments archived git-tracked under `dist/rubric-runs/v<VERSION>-<env>-<UTC>/` with TC5 names (`NN-<ID>-<desc>.mp4`). Web/desktop: `ffmpeg x11grab` or browser-tab capture; Android: `adb screenrecord` 3-min chained segments.
- The run report (`dist/RUBRIC-RUN-v<VERSION>-<env>.md`) cites every verdict's evidence file by name; a verdict without an existing evidence file is not a verdict. No secret-bearing capture is expected in this app; if any surface ever shows a key, quarantine per HR-6.
- Reference for liturgical correctness is **in-repo**: the vendored DO tree (`VENDORED/divinum-officium/`) — psalm schemas (`Psalterium/Psalmi/Psalmi {major,matutinum,minor}.txt`), hour skeletons (`Psalterium/Special/*.txt`), day files. Where the row names expected psalms/antiphons, those values are read from these tables, not from memory.

---

## S — Corpus sovereignty & ingest

| ID | Requirement | Driver | Steps / PASS criteria | Severity |
|---|---|---|---|---|
| S-1 | No build path leaves the repo | AUTO | `grep -rn '\.\./HelloWord\|http://\|https://' scripts/ src/` (excluding comments/README links shown in evidence) → zero runtime/build fetches outside repo; ingest runs with network disabled | BLOCKER |
| S-2 | Ingest regenerates cleanly | AUTO | `npm run ingest` exits 0; summary counts ≥ legacy (files ≥ 1332, sections ≥ 12769); `DOCS/CORPUS-FILL-LOG.md` regenerated with per-fill directive/resolution/citation/source | BLOCKER |
| S-3 | Office plane populated | AUTO | `missal.db` contains the office-generation tables (psalm schema rows for all 7 weekdays × hours; skeleton rows for all 8 hours; antiphon/invitatory/doxology sets incl. seasonal variants) — inspected via SQL, spot-checked against the vendored source tables | BLOCKER |
| S-4 | Provenance intact | AUTO | All three `VENDORED/*/PROVENANCE.md` present with pinned commit/date/license; any local `.txt` modification has a log entry | HIGH |
| S-5 | Tests green | AUTO | `npm test` → 100% pass, including ingest, office-engine, computus, precedence suites | BLOCKER |

## M — Mass (map + reader)

| ID | Requirement | Driver | Steps / PASS criteria | Severity |
|---|---|---|---|---|
| M-1 | Day resolution correct | AUTO | 2026-07-05 → *Dominica VI Post Pentecosten*, Semiduplex/II cl., green; 2026-04-05 → *Dominica Resurrectionis*, I cl., white; 2026-02-18 → *Feria IV Cinerum*, violet. Masthead + calendar agree | BLOCKER |
| M-2 | Full-Mass reader: propers ⋈ Ordinary interleaved in canonical order | AUTO | For 2026-07-05: Incipit → Introitus (*Dóminus fortitúdo*) → Kyrie/Gloria → Oratio → Lectio → Graduale → Alleluia → Evangelium → Credo → Offertorium … → Canon → … → Ite → Last Gospel, each bilingual (Latin normative, English where stored) | BLOCKER |
| M-3 | Ember Day loop | AUTO | 2025-12-16 (Ember Wednesday of Advent): map shows ember loop active; reader carries the extra lesson group (LectioL1/GradualeL1/OratioL1) | HIGH |
| M-4 | Seasonal chant switch | AUTO | 2026-02-22 (Lent): Tract present, Alleluia absent + faded on map; 2026-04-12 (Paschaltide): doubled Alleluia (GradualeP), Gradual absent; map routes match | HIGH |
| M-5 | Commune gap-fill non-inverted | AUTO | 2026-01-21 (S. Agnetis): feast-file sections win; missing sections filled from its `vide` commune, labelled *ex communi* with source path | HIGH |
| M-6 | Super populum spur | AUTO | A Lenten feria (2026-02-20): *Oratio super populum* present in reader, spur active on map | MEDIUM |
| M-7 | Station click navigation (incl. re-click) | AUTO | Click `oratio` → reader scrolls to Oratio; click `canon` → Canon; re-click `oratio` → scrolls back (nonce retrigger). Reader scrollbar present and functional | BLOCKER |
| M-8 | Bilingual pane delineation | AUTO | Computed backgrounds of `.latin` vs `.english` differ (darker tint light modes, lighter tint dark modes) | LOW |

## O — Divine Office: complete generation (the product core)

Every row below must hold **for the named date AND for any spot-check date the operator chooses at run time** — the engine generates, it does not special-case the battery.

| ID | Requirement | Driver | Steps / PASS criteria | Severity |
|---|---|---|---|---|
| O-1 | All eight hours render for an ordinary Sunday | AUTO | 2026-07-05: Matutinum, Laudes, Prima, Tertia, Sexta, Nona, Vesperae, Completorium each render a complete hour — no empty hour, no "delegates to ferial" placeholder | BLOCKER |
| O-2 | Sunday Lauds psalmody matches the psalter schema | AUTO | 2026-07-05 Laudes psalms = `Day0 Laudes1` group from `Psalmi major.txt` (Pss. 92, 99, 62, canticle *Trium puerorum* [210], 148) with their antiphons; Benedictus + its antiphon present; collect = the Sunday's Oratio | BLOCKER |
| O-3 | Ferial weekday psalmody | AUTO | 2026-07-06 (feria II): Lauds = `Day1 Laudes1` group (46, 5, 28, canticle 211, 116); Vespers = `Day1 Vespera` (114, 115, 119, 120, 121); Matins psalms = `Psalmi matutinum.txt` Day1 set | BLOCKER |
| O-4 | Hour skeletons complete | AUTO | Each hour carries its full skeleton per `Special/*.txt`: Deus in adjutórium; hymn (correct per hour/season); psalmody with antiphons; capitulum; responsory breve / versum (minor hours); lessons+responsories (Matins); Benedictus/Magnificat/Nunc dimittis with antiphons; preces when rubrics call them; oratio; conclusio | BLOCKER |
| O-5 | Invitatory correct | AUTO | Matins invitatory: 2026-07-06 = feria II text (*Veníte, exsultémus…* per `Invitatorium.txt`/`Major Special`); Advent Sundays = *Regem ventúrum*; Paschaltide = *Surréxit Dóminus vere, Allelúja* | HIGH |
| O-6 | I-class feast: propers override psalter | AUTO | 2025-12-25 (Nativitas): proper antiphons/psalms/lessons from `Horas/Sancti/12-25`; Te Deum present; proper hymns; 9 lessons | BLOCKER |
| O-7 | First Vespers | AUTO | 2026-08-14 Vespers = **I Vespers of Assumptio** (1960: I cl. feasts only) — antiphons/capitulum/hymn/Magnificat ant. of the feast, not of the feria | HIGH |
| O-8 | Commune supply for office | AUTO | 2026-01-21 (S. Agnetis, III cl.): sections missing from the Sancti file supplied from Commune Virginum via `vide`, labelled with source | HIGH |
| O-9 | Lent: rubrical changes | AUTO | 2026-02-20 (Lent feria): no Te Deum at Matins; ferial preces at Lauds/Vespers; no Alleluia in openings (deo-gratias forms per `Rubricae`/skeleton conditionals) | HIGH |
| O-10 | Paschaltide: alleluia layer | AUTO | 2026-04-13 (Easter week / Paschaltide): antiphons carry appended Alleluias per schema (`Day0 Laudes1` Paschal forms); doubled-alleluia forms where the tables specify | HIGH |
| O-11 | Easter octave special structure | AUTO | 2026-04-05–06: hours follow the octave's abbreviated special form (no hymn, *Hæc dies* gradual-antiphon structure) as encoded by the skeleton conditionals | HIGH |

**O-11 amendment (2026-07-18, GLM-5.2 adjudication of OB.4 escalation — additive annotation; original row above is the audit trail, this annotation is the normative correction):** the "no hymn" clause is INACCURATE for the DO 1960 rubric. The Easter-octave Lauds KEEPS the hymn in Paschal form (`VENDORED/divinum-officium/web/www/horas/Latin/Psalterium/Special/Major Special.txt:1439 [Hymnus Pasch Laudes]` = "Auróra cælum púrpurat"; `horas/Ordinarium/Laudes.txt` carries no Easter-octave Hymnus-suppression directive). The CORRECTED O-11 requirement is: "Easter-octave Lauds (`2026-04-05`, `2026-04-06`) carries the Paschal hymn (`Hymnus` entry present, `Auróra cælum púrpurat` text) AND the `Hæc dies * quam fecit Dóminus` gradual-antiphon structure (entry whose title matches `/Hæc dies\|Haec dies/`)." The "no hymn" portion is DROPPED. The `Hæc dies` portion remains a binding HIGH row; the engine gap (no `Hæc dies` entry emitted today) is closed by `CHECKLIST.md` Stanza B-U task **OB.4E(b)**. Verified by read-only probe in worktree `wt/stam-ob4` against the canonical `assets/missal.db`: built `2026-04-05` Lauds HAS a `Hymnus` entry today (matching the DO 1960 source) but has NO `Hæc dies` entry (the gap OB.4E(b) closes).
| O-12 | Compline: seasonal Marian antiphon | AUTO | Completorium ends with the correct final antiphon B.M.V. per season (`Mariaant.txt`): *Alma Redemptoris* (Advent–Feb 1), *Ave Regina* (–Wed of Holy Week), *Regina cæli* (Paschaltide), *Salve Regina* (after Trinity) — verify one date in each window | HIGH |
| O-13 | Commemorations | AUTO | A date with a commemoration (e.g. 2026-07-05 comm. of the occurring Sancti per resolver): commemorated collect(s) appear after the day's oratio at Lauds/Vespers with their antiphon/versicle | HIGH |
| O-14 | Doxologies & seasonal hymn endings | AUTO | Hymn doxologies switch per season where `Doxologies.txt` mandates (e.g. Nativity/Epiphany/Paschal endings) | MEDIUM |
| O-15 | Office ⋄ Mass station parity | AUTO | Office loop-line UI: every hour clickable → hour renders; subway/office navigation consistent with reader anchors | MEDIUM |
| O-16 | No silent gaps | AUTO | For 14 consecutive days (2026-07-05…07-18), iterate all 8 hours: zero empty sections where the schema demands content; any `textus deest` placeholder appears ONLY if it is also in `DOCS/CORPUS-FILL-LOG.md` with its audit row | BLOCKER |

## L — Lore callouts

| ID | Requirement | Driver | Steps / PASS criteria | Severity |
|---|---|---|---|---|
| L-1 | Station lore | AUTO | Hover 5 sampled stations (asperges, introitus, canon, ite, ultimum-evangelium): rich popover with What/Origins/Development/Novus Ordo blocks; content specific to the station | HIGH |
| L-2 | Route lore | AUTO | Hover all 9 routes (2 trunks, connector, ember loop, 4 chant routes, super-populum spur): each explains the navigation logic + seasonal omission | HIGH |
| L-3 | Accessibility | AUTO | Keyboard focus opens callout; Escape closes; touch long-press opens (emulated); content scrollable when long | MEDIUM |
| L-4 | No native tooltips remain | AUTO | No `<title>` tooltip appears on hover anywhere on the map | LOW |

## P — Sidecar, calendar, planner/journal

| ID | Requirement | Driver | Steps / PASS criteria | Severity |
|---|---|---|---|---|
| P-1 | Sidecar persistence | AUTO | Create annotation + homily + theme span → hard-reload (web) / relaunch (desktop) → all present; localStorage annotations migrated once (flag set) | BLOCKER |
| P-2 | Calendar indicators | AUTO | Annotated day shows color-coded dot/glow; homily days show status chip (unstarted/in-progress/complete colors) | HIGH |
| P-3 | Theme painting | AUTO | Drag-select a date range → labelled colored bar spans exactly those cells; span persisted; deletable | HIGH |
| P-4 | Homily recycling (base vs year) | AUTO | Create base homily on a liturgical key; switch year tab, add year overlay; base text visible every year, overlay only in its year | HIGH |
| P-5 | Laity mode | AUTO | Mode switch → planner vocabulary becomes Journal/Topic; journal entry anchored to a verse-ref/nodeKey; anchor chip visible | HIGH |
| P-6 | Editor context header | AUTO | Editor shows day title, season, color, and the day's actual Lectio/Evangelium citations pulled live from the corpus | MEDIUM |

## T — Themes & print

| ID | Requirement | Driver | Steps / PASS criteria | Severity |
|---|---|---|---|---|
| T-1 | 12 themes apply | AUTO | For each of 6 families × light/dark: `data-theme`/`data-mode` set AND observed surface/ink/pane token values change accordingly (screenshot per theme) | HIGH |
| T-2 | Persistence + system default | AUTO | Chosen theme survives reload; with no setting, `prefers-color-scheme: dark` yields dark mode | MEDIUM |
| T-3 | Seasonal accent orthogonal | AUTO | Switching theme does not change liturgical color accent; violet day stays violet-accented in all themes | MEDIUM |
| T-4 | Print stylesheet | AUTO | Emulated `media: print`: rail/menus/chrome hidden; bilingual columns clean black-on-white; full day's Mass paginates | HIGH |

## Y — Presentation tray: rubric forms, role lenses, typography

| ID | Requirement | Driver | Steps / PASS criteria | Severity |
|---|---|---|---|---|
| Y-1 | Slide-out tray | AUTO | Reader/Office/Map views expose a slide-out settings tray (edge handle or button); opens/closes with animation, keyboard accessible, state persists in sidecar settings | HIGH |
| Y-2 | Theme + light/dark in tray | AUTO | Tray contains the theme family selector and light/dark toggle (T-1/T-2 driven from here) | HIGH |
| Y-3 | Mass-form rubric toggle (DO-provided granularity) | AUTO | Tray offers the forms DO's own rubrics distinguish: **Missa lecta (privata)** / **Missa sollemnis** (Missa Cantata rendered as the sollemnis rubric layer minus sacred-minister rows, labelled "Cantata — derived"). Switching form swaps the displayed `!`-rubric layer per the `si est Missa sollemnis / si privata` conditionals extracted from `Ordo.txt`; reader re-renders; map legend reflects the form | BLOCKER |
| Y-4 | Role lens — DO-provided roles | AUTO | Tray offers exactly the roles DO's rubric prose names: **Celebrans (Priest)** / **Diaconus** / **Subdiaconus** / **Ministri (Servers)**, plus a **Laity** lens defined as "all parts marked as responses (`R.`/Ministri respondent) + non-secreto texts". Selecting a lens highlights (never hides) that role's parts with a visible lens indicator | BLOCKER |
| Y-5 | Role rubric provenance | AUTO | Every role-tagged rubric row traces to its `Ordo.txt` (or horas skeleton) source line — spot-check 6 rows (e.g. Incensatio: Diaconus/Celebrans exchange at `Ordo.txt:61-68`; Gospel procession `:105-116`; paten `:152`). External-manual-derived lenses (M-C, detailed server choreography, laity postures) are **next-major**, not release-gating | HIGH |
| Y-6 | Rubrics on/off | AUTO | Tray master toggle "[X] rubrics" shows/hides the red rubric layer entirely in reader and office views | HIGH |
| Y-7 | Typeface + size | AUTO | Tray offers typeface selection (bundled families incl. a serif liturgical default, a sans, and a dyslexia-friendly option — all packaged locally, no remote fonts) and font-size control (range or stepped); both apply live to reader/office text and persist across reload | HIGH |
| Y-8 | Settings round-trip | AUTO | All tray selections (form, lens, rubrics on/off, typeface, size, theme) persist in sidecar `settings` and restore on relaunch (web + desktop) | BLOCKER |

## X — Export, share, deep links

| ID | Requirement | Driver | Steps / PASS criteria | Severity |
|---|---|---|---|---|
| X-1 | HTML/MD/JSON export | AUTO | Export current Mass day in all three formats (± annotations): files download, open standalone, contain the day's actual sections | HIGH |
| X-2 | Office export | AUTO | Export a rendered hour (e.g. Laudes) — same three formats | MEDIUM |
| X-3 | Share deep link | AUTO | Share from a selection → URL copied; opening URL in fresh session lands on view+date+section with quote highlighted | HIGH |
| X-4 | Deep-link validation | AUTO | Malformed date / unknown view in URL params → app boots normally to default view (no crash) | MEDIUM |

## E — Entitlements

| ID | Requirement | Driver | Steps / PASS criteria | Severity |
|---|---|---|---|---|
| E-1 | Ungated by default | AUTO | With no `VITE_REVENUECAT_API_KEY`, every feature reachable; `FEATURE_GATES` all-null | HIGH |
| E-2 | No secret in artifacts | AUTO | `grep -r 'rcb_\|sk_' src/ dist/` (built bundles) → no key material | BLOCKER |
| E-3 | Bridge spec complete | AUTO | `DOCS/ENTITLEMENT-SYNC.md` implementable without questions (HMAC, idempotency, grant flow, health, env) | MEDIUM |

## B — Builds & packaging (manual, per I-25 / BUILD_CONVENTIONS)

All artifacts staged in the canonical checkout's `dist/`; version bumped + stamped commit `v{VERSION}: …`; signed with the ecosystem production key.

| ID | Requirement | Driver | Steps / PASS criteria | Severity |
|---|---|---|---|---|
| B-1 | Version identity | AUTO | One version string across package.json / tauri.conf.json / Cargo.toml; identifier `mba.robin.standroidsmissal` in all manifests | BLOCKER |
| B-2 | Web bundle | AUTO | `npm run build` exit 0; `dist/` web bundle serves and passes M-1 smoke visually | BLOCKER |
| B-3 | Linux deb + AppImage | AUTO | `tauri build` produces both; deb installs on this host; AppImage launches; app opens corpus and renders 2026-07-05 Mass + Laudes | BLOCKER |
| B-4 | Android APK + AAB + debug-symbols zip | COND (Android SDK/NDK on host or CI runner) | `tauri android build` release: signed APK + AAB produced; native debug symbols zipped (`dist/…-native-debug-symbols.zip`); APK installs and passes M-1/O-1 on device/emulator | BLOCKER |
| B-5 | Windows EXE (NSIS) | COND (windows cross toolchain or windows-x64-cross runner) | NSIS installer built; SHA256 recorded | HIGH |
| B-6 | Windows MSI (WiX) | COND (Windows host/runner — WiX is Windows-only) | MSI built on the windows runner; SHA256 recorded | HIGH |
| B-7 | Windows install-run | OPERATOR | Operator (or Windows runner with session) installs EXE and MSI on Windows 11, launches, verifies M-1 renders | HIGH |
| B-8 | MSIX code-readiness attestation | AUTO | Documented attestation in the run report: tauri.conf/bundle config + identity are MSIX-complete; packaging MSIX requires **no further code edits** (config/tooling invocation only), citing the exact config keys inspected | MEDIUM |
| B-9 | Android on-device pass | OPERATOR | Operator installs the signed APK on a physical device; verifies O-1 (all eight hours render) and P-1 (sidecar persists across app restarts) | BLOCKER |
| B-10 | dist/ staging + stamped commit | AUTO | Complete artifact set (apk, aab, symbols zip, deb, AppImage, exe, msi, web bundle, rubric-run report+screencasts) in canonical `dist/`; `v{VERSION}: ` commit per I-25 | BLOCKER |

## V — Platform parity (collinear rule)

| ID | Requirement | Driver | Steps / PASS criteria | Severity |
|---|---|---|---|---|
| V-1 | Web = desktop content parity | AUTO | Same date (2026-07-05): Mass reader + Laudes render byte-identical section lists on web and Linux Tauri build | HIGH |

## SCR — Screencast (TC11)

| ID | Requirement | Driver | Steps / PASS criteria | Severity |
|---|---|---|---|---|
| SCR-1 | Whole run recorded | AUTO | Every AUTO row's driven sequence captured in chained segments; archived `dist/rubric-runs/v<VERSION>-<env>-<UTC>/NN-<ID>-<desc>.mp4`; report maps every verdict → segment/still | BLOCKER |
| SCR-2 | Operator rows recorded | OPERATOR | B-7/B-9 sessions screencast-recorded (device recorder / `adb screenrecord`) and archived in the same run folder | HIGH |

---


## MS — Mass specials & rubrics (DO parity)

| ID | Requirement | Driver | Steps / PASS criteria | Severity |
|---|---|---|---|---|
| M-S1 | No raw DO specials in Incipit | AUTO | Working web/desktop artifact: Mass Incipit shows no `*&Introibo`, `*D`, `*S`, or bare control tokens; evidence still | BLOCKER |
| M-S2 | Judica present ordinary Sunday Low | AUTO | Non-Passiontide non-Requiem day: Judica me block present after Introibo antiphon | BLOCKER |
| M-S3 | Judica omitted Passiontide/Requiem | AUTO | Fixture Passiontide or Requiem day: Judica block absent; Confiteor path continues | BLOCKER |
| M-S4 | Solemn vs Low incense | AUTO | `mass.solemn=0` omits Incensatio; `mass.solemn=1` shows solemn incense block | HIGH |
| M-S5 | Callout not on citation | AUTO | Hover/hold over `!Ps. 42` citation does not park callout on reading line; placement above/below anchor | HIGH |
| M-S6 | Meaning pins Ordinary | AUTO | Select “Introíbo ad altáre Dei” → Meaning shows pinned “In the Ordinary of the Mass” / Incipit before distant Office lessons | HIGH |
| M-S7 | Production Incipit | AUTO | https://standroid.robin.mba (or current host) after deploy of this version matches M-S1–M-S2 stills | BLOCKER |

**Evidence:** stills + screencast under `dist/rubric-runs/v…/` from **working release artifacts**, not dev-server-only. Smoke tests are not part of this process.

## Verdict computation

1. Any ❌ (or ⚠️ on BLOCKER/HIGH) ⇒ **DEFECTIVE** — named IDs return to ARCHITECT/CODE; gauntlet re-runs after fix.
2. All AUTO/COND ✅ but any OPERATOR row un-run ⇒ **INCOMPLETE—pending-operator** (enumerate: currently B-7, B-9, SCR-2).
3. Every row ✅ ⇒ **SHIP-READY**.

## Attestation block template (appended to `dist/RUBRIC-RUN-v<VER>-<env>.md`)

> Run by: <agent/operator, model+version> · Date: <UTC ISO> · Build: v<VER> (<git sha>) · Env: <host/device>.
> Verdict: <SHIP-READY | DEFECTIVE | INCOMPLETE—pending-operator>.
> I attest every ✅ above was granted on direct semantic observation of the evidence file cited on its row, that no verdict rests on a grep, exit code, or log absence, and that the screencast archive covers every driven sequence. Nothing was waived.
