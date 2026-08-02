/**
 * ABOUT_CONTENT — operator-editable long-form About page content (BD.1).
 * Origin story, purpose, acknowledgements, and privacy sections. Each slot
 * accepts prose of any length; AboutView renders as a normal scrollable
 * workspace without modal height/width caps.
 */

export const ABOUT_CONTENT = {
  origin: `
St. Android's Missal began as a reimagining of the Traditional Latin Mass and Divine Office as a navigable subway map. The project takes its name from the patron saint of technology, St. Android of the Circuits, and seeks to bring the beauty of the ancient liturgy into the digital age.

The application is a complete rewrite of the earlier SanctissiMissa project (also known as "Hello, Word"), transforming László Kiss's Divinum Officium flat-text corpus into a modern graph and vector database. This architecture enables powerful search, concept discovery, and liturgical calendar resolution while maintaining faithfulness to the 1962 rubrics.

Built with Tauri 2 for cross-platform deployment (web/PWA, Windows, Linux, Android), the application uses React 18 with Vite for the frontend and sql.js for the embedded corpus database. Every component is designed to work identically across platforms, following the "collinear rule" of a single query layer everywhere.
  `.trim(),

  purpose: `
The mission of St. Android's Missal is to provide priests, seminarians, and laity with a comprehensive digital tool for the Traditional Latin Mass and Divine Office. The application supports:

* Full Missal Reader with bilingual Latin-English text and rubrical color indications
* Perpetual calendar computed on demand using Butcher's Easter algorithm and 1962 precedence rules
* Divine Office with the complete eight-hour cycle
* Sacred Scripture browser with verse-level navigation and liturgical citation cross-references
* Concept-based search and discovery across the entire corpus
* Journal and Homily Planner for liturgical preparation and accompaniment
* Theme system with multiple visual families and light/dark modes

The corpus is fully self-contained; nothing references outside the repository. All scripture gap-fills come from vendored Clementine Vulgate (Latin) and Douay-Rheims (English) texts.
  `.trim(),

  acknowledgements: `
This project stands on the shoulders of many contributors:

* **László Kiss** — The Divinum Officium corpus, MIT-licensed and vendored in VENDORED/divinum-officium/
* **The Tauri team** — Cross-platform application framework
* **The React and Vite communities** — Modern frontend tooling
* **sql.js** — SQLite compiled to WebAssembly
* **All translators and rubricists** — Whose work makes the Traditional Latin Mass accessible

Special thanks to the monastic communities and scholars who have preserved and transmitted the liturgical tradition through centuries of change.
  `.trim(),

  privacy: `
St. Android's Missal is designed with privacy as a core principle:

* **Local-first architecture** — All data, including the liturgical corpus and your journal entries, is stored locally on your device
* **No cloud synchronization** — The application does not transmit any data to external servers
* **No telemetry** — No usage analytics or tracking are collected
* **Offline capability** — The full corpus is available offline after initial installation
* **Open transparency** — The complete source code is available for audit

Your journal entries and homily planning notes are stored in your browser's local storage (Web) or local filesystem (Tauri desktop/mobile). They are never transmitted or shared.
  `.trim(),

  license: `
Copyright © 2026 Robin L. M. Cheung, MBA. All rights reserved.

The application is proprietary software. The liturgical corpus (Divinum Officium) is used under the MIT License. The application identifier is mba.robin.standroidsmissal.

For licensing inquiries, please contact the developer through the official website.
  `.trim(),
};

export default ABOUT_CONTENT;