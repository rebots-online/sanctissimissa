# SanctissiMissa Product Contract (the one list)

> **This is the single canonical list of what SanctissiMissa promises.** Established 2026-11-03 at the operator's
> direction ("if there is no list, establish one, and that becomes it"). Other documents point here; none re-list it.
> Add a promise here first, then give it an owner source and a check. A promise is **only** green when its check ran
> and passed; status is never hand-marked. Until a check exists the status is `no-check` and counts as not done.

## Direction (operator, 2026-11-03)

- **SanctissiMissa is the product. All development goes here.**
- **HelloWord (Play `mba.robin.helloword`) is legacy and maintenance-only.** Only compliance work (for example the Android 16 KB fix, done in v2.40.93612) touches it. No features, no data fixes.
- The bookstore is the critical part. Its look and feel is **finished in Google Stitch** (project `7192660594233084032`, frozen in `LIBS/UI/STITCH/sanctissimissa-library-20260913/`) and must be reintroduced, not redesigned.
- Content scope of the bookstore: public-domain writings (Church Fathers, mystics, martyrology, lives of the saints, and similar).

## The promises

| ID | Promise | Owner source | Check | Status |
|---|---|---|---|---|
| P01 | Hover translation on Mass, Office and Scripture lines (hover a line, its pair highlights) | `SectionReader` (architecture section 7.7 / 11) | browser test of hover pairing | no-check |
| P02 | Breviary and Mass together, all eight hours and the Mass propers for any date | `OfficeView`, `ReaderView`, `OfficeEngine` | full-year oracle diff against Divinum Officium at the pinned commit | no-check |
| P03 | Companion chatbot (streamed replies, guidance, hosted default) | architecture section 7.8 | browser test with the provider stubbed | no-check |
| P04 | Subway map navigation (Mass strip and full map) | `SubwayMap`, `MapStrip` | existing rubric rows | no-check |
| P05 | Month calendar with feast names, at-a-glance on mobile, find-a-saint search | `CalendarView` | month grid and search test | no-check |
| P06 | **Bookstore matches the Stitch design** (left-rail Bookstore, `bookstore.html`) | architecture section J; Stitch screen `eeb7643f00314991ab7a325c9daa2216` | rendered-app interaction test of the J.3 behaviors (filter, reset, drawer open/close, Escape, back navigation) plus screenshot parity at desktop and 390 px; frozen export hash unchanged | no-check (not yet mounted) |
| P07 | Free public-domain works readable offline, no login | LS contract (`library-study-20260913`) | airplane-mode read of an included work | no-check |
| P08 | Paid editions via one entitlement controller; missing merchant config denies only paid access | LS and BS-S contracts | entitlement tests with fixtures | no-check (LS.08, BS-S1-S5 pending) |
| P09 | Corpus reproducible from a clean clone (vendored DO snapshot, frozen semantic-named artifact, recorded recipe) | corpus pipeline proposal | rebuild-and-hash test, offline | no-check |
| P10 | Android release is 16 KB compliant | release rubric RP-V3 | `readelf` LOAD `0x4000` on 64-bit ABIs, `zipalign -c -P 16` | verified at v1.41; re-run at next Android build |
| P11 | Printing and PDF work inside the app (no browser hand-off) | export module | in-app PDF save/share test | no-check (journal print uses `window.open`) |

## Rules for this file

1. **One list.** If a promise is described anywhere else, that description is a pointer to its ID here.
2. **Status is computed.** The release driver reads each check's last result. `no-check` and `red` both block calling the promise done.
3. **A promise leaves the list only by an operator decision recorded here with the date and reason.** It does not fade out.
4. **Designs are promises too.** A frozen Stitch export is bound to its promise by rendered-behavior and screenshot checks, so the app cannot silently diverge from it.
5. **Legacy.** HelloWord is out of scope for this list except compliance (P10 pattern).
6. **Agent rules are not kept here.** How code and agent work are judged is governed by the Admin-Manual's global agent rules (`DOCS/TOOLING_CONVENTIONS/global-agent-rules.md`), the single source of truth. This file deliberately restates none of them.
