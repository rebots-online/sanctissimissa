# sanctissimissa-about-20260915 — Frozen Stitch design source (Stanza AM)

Design specimen for the **Help · About** workspace: media-auto-mounting origin
story (alternating right-first floats, text reflow, lightbox) and the
derivative-corpus attribution. Frozen 2026-09-15 under the TC12 stitch-first
convention, mirroring `sanctissimissa-library-20260913/`.

## Provenance

- **Stitch project**: `14487439725465174200` — "SanctissiMissa — About Media
  Montage" (created 2026-09-15 via the Stitch MCP `create_project`).
- **Transport**: the operator's Stitch MCP import (`~/.claude.json` →
  `mcpServers.stitch`, HTTP endpoint `https://stitch.googleapis.com/mcp`),
  driven directly over JSON-RPC (the importing agent runtime does not expose
  it natively). Credential canonical copy:
  `/home/robin/Admin-Manual/CREDENTIALS/stitch-mcp.md` (I-15).
- **Design system**: `assets/a5b8c45f4d454c7f9a8fc5e3d3e6fde4` — created from
  the frozen LS `original/DESIGN.md` via `upload_design_md` +
  `create_design_system_from_design_md`, so the specimen speaks the app's
  parchment-and-ink token language.
- **Screen**: `dd4c40efd3ee4d2ab5079ceea8fbdc09` ("Help · About —
  SanctissiMissa", DESKTOP, 2560×8386) from `generate_screen_from_text` with
  the brief in `DOCS/PROPOSALS/about-media-montage-2026-09-15.md` §8.
  Verbatim export under `original/generated/`; adapted specimen at
  `about.html` (adaptation list in its header comment and `manifest.json`).

## Files

| Path | Role |
|---|---|
| `about.html` | Adapted design specimen (conspicuous notice; 7 corrections) |
| `manifest.json` | IDs, timestamps, sha256s, adaptation list |
| `original/DESIGN.md` | Copy of the LS-frozen design-system spec (input to the design system) |
| `original/generated/about-dd4c40efd3ee4d2ab5079ceea8fbdc09.html` | Verbatim Stitch export |
| `original/generated/about-…-screenshot.png` | Export thumbnail |
| `original/generated/media/fig-1..4.jpg` | Specimen placeholder photographs (offline copies of the export's hotlinked aida-public images) |

## Serving locally

```
cd LIBS/UI/STITCH/sanctissimissa-about-20260915
python3 -m http.server 43872   # open http://localhost:43872/about.html
```

(The adapted specimen loads Tailwind + Google Fonts from CDNs; it is a
specimen, not the offline-first product.)

## Observed in preview

- Origin-story prose with **four figure cards floated right→left→right→left**,
  text wrapping around each, uniform 4:3 crops, gold/rubric/office accent dots
  in captions, hover lift + `cursor: zoom-in`.
- Drop cap on the opening paragraph; ornament rules between sections.
- **Lightbox state section**: dark scrim, "2 of 4" counter, ‹ › navigation,
  × close, caption line, filmstrip dots — the interaction map for
  `AboutLightbox`.
- **Version & Build** definition list (`.def-grid`) carrying the exact
  derivative-corpus Corpus line adopted for `AboutView`.
- The specimen's top nav rail and header chip are specimen chrome — the
  application owns navigation (same omission rule as the LS freeze).

## Wiring rule (TC12)

Preserve markup, layout and selectors — `.figure-float-right`,
`.figure-float-left`, `.figure-card`, `figcaption`, `.dropcap`,
`.ornament-rule`, `.def-grid`, and the lightbox stage structure (counter,
arrows, close, caption, filmstrip) — mapped to the app's design tokens in
`src/styles.css`. Replace specimen handlers with application state: figures
mount from `content/` media enumerated at build time (`ABOUT_MEDIA`), prose
comes from `content/origin-story.md`, metadata from `version.json`. Do not
import Tailwind or the CDN fonts into the app; the app's serif stack
(`--serif`) and semantic tokens stand in. Media order/placement is computed
(`planMediaMounts`: regular spacing, right-first alternation), not hand-placed
as in the specimen.
