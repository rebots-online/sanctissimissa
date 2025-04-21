# Release Push Checklist — 20 Apr 2025 (Target: 11:00 pm)

## 21:45–21:55 — Critical Bug Fixes & Build
- [ ] **HIGHEST PRIORITY:** Create and run direct import script to populate IndexedDB with liturgical texts from flat files (required for all app testing)
- [ ] Import flat text files to IndexedDB for Mass, Office, and Prayers data
- [ ] Fix any remaining build errors (JSX, lint, etc.)
- [ ] Confirm Mass, Divine Office, and Prayers pages display (no blank screens)
- [ ] Verify navigation and routing for all main menu items

## 21:55–22:10 — Core Functionality QA
- [ ] Test liturgical day loading (calendar navigation)
- [ ] Test audio/text journal entry creation, save, and display
- [ ] Confirm context menu triggers for notes
- [ ] Check error handling (microphone, data load, etc.)
- [ ] Ensure all canonical hours (Matins, Lauds, Prime, Terce, Sext, None, Vespers, Compline) are present in Divine Office UI, each with at least basic content

## 22:10–22:25 — UI/UX Polish
- [ ] Review responsive/mobile layout
- [ ] Check for any major visual glitches
- [ ] Quick accessibility review (tab order, screen reader basics)

## 22:25–22:40 — Data & Schema Finalization
- [ ] Confirm IndexedDB schema matches current code
- [ ] Check for data migration issues (old/new journal entries)
- [ ] Backup/export any critical data

## 22:40–22:50 — Documentation & Checklist Finalization
- [ ] Update README/ROADMAP with any last-minute changes
- [ ] Mark completed tasks in all checklists
- [ ] Note any deferred features (e.g., print/export)

## 22:50–23:00 — Final Smoke Test & Release Prep
- [ ] Full app walkthrough (fresh browser session)
- [ ] Verify app loads and works offline (if PWA)
- [ ] Prepare deployment (build, push, or upload as needed)
- [ ] Announce release or handoff for deployment

---

**Legend:**  
- [ ] Not started  
- [/] In progress  
- [x] Complete, not fully tested  
- [✅] Fully tested and complete
