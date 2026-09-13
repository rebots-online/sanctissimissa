# SanctissiMissa study and parish design source

Stitch project: https://stitch.withgoogle.com/projects/7192660594233084032
Retrieved 2026-09-13. Five HTML/CSS/JavaScript exports: bookstore.html,
library.html, reader.html, chant.html, mass-reference.html. `manifest.json`
records screen IDs and SHA-256 hashes; `original/generated/` preserves the raw
exports, and `original/bookstore.html` / `original/DESIGN.md` preserve the
predecessor design inputs. New HTML files add a conspicuous design-specimen
notice; chant's unsupported authenticity claim is corrected.

Open any HTML file, or serve this directory with:

    python3 -m http.server 43871 --bind 127.0.0.1 --directory LIBS/UI/STITCH/sanctissimissa-library-20260913

The corresponding pages are http://127.0.0.1:43871/bookstore.html and siblings.
These are design specimens. Sample ownership, bibliographic claims, dates,
prices, content, score geometry and progress are not product evidence. The
committed catalogue and edition-level source review govern production. Sample
articles must be replaced by sourced CH5 content; score drawings by verified
assets; UI counts and download states by real stores. No products or payments
were created. No generated content should be promoted to authoritative liturgy.

Observed preview checks: exported Bookstore loaded; Catena search reduced eight
cards to one; its Inspect Volume action opened the matching title; Edition
Provenance tab displayed its specimen metadata. Chant layout rendered with the
specified controls. A subsequent tab interaction timed out in the browser
connection; no claim that every prototype control was verified. Production
interaction checks belong to the LS rubric. All five exports retain their actual
DOM IDs for wiring. The exported HTML exceeds the normal hand-authored file-size
limit because raw specialist source is retained intact as provenance.

Source status: specialist export, not a shipped application. Use the LS contract
in CHECKLIST.md; preserve markup, layout and selectors, replace specimen handlers
with application state, and mount the existing SectionReader in the reader host.
The latest operator instruction explicitly selected Stitch; no Figma Make
source export or Figma billing failure is claimed.
