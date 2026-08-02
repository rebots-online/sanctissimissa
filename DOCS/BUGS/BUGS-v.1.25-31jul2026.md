# BUGS TO FIX AS AT v.1.25-31jul2026

Note: All front-end/UI to be generated through the Open Design MCP.

 - we will deal with the MSI/MSIX issue *after* planning and executing the fixes for the following, since it is a build-time issue not the same as the following bugs: (not exhaustive)

1. I need the "Origin Story" to be specified in the .env file along with any necessary variables, as it describes a personal saga of seeking refuge in the Church during the tempestuous parental alienation decades when I served the traditional Latin Mass at the altar daily for four years. The .env file will also be used to draw other customizations but not for public consumption, such as api keys or host settings when we introduce the Liturgibot Chatbot in both local inference and hosted inference (prepaid token allotment, using per-user-issued & spend-limited on load, openrouter api keys using my account admin key)
    - this will require addition of gating and revenuecat (authoritative for user management), with accommodation for blink.sv POS, alby, btcpay, and especially woocommerce, which eventually to take over the revenuecat functionality, but for now, all payment processing/billing user changes to be synced to revenuecat.

2. Synchronized English-Latin line-under cursor highlighting and translation/notes/concordance flyout on hover works in Missal reading mode, but is completely missing in Breviary reading mode and Scripture reading mode--possibly other reading modes also 
    - in Breviary reading mode, not only English-Latin under mouse hover corresponding line highlighting (to follow along in sync between English and Latin) does not work, but right-click context (which also works when selecting text and after click is released in Missal reading mode) is missing
    - in Missal reading mode, even though the context menu activates properly (automatically on selecting any text), it should additionally:
       - if no text is click-drag selected, then right-click should activate the context menu on the currently-focused word in the flyout on hover; and
       - under all circumstances, the context menu should include a "Copy" option to copy the currently-focused word in the flyout on hover, or the selection highlighted if activated by a click-drag selection; and
       - the context menu should deactivate/disappear if the user clicks off the context menu or presses ESC--intuitively cancel the context menu when normal Windows app behaviours would cancel a context menu; right now, the context menu cannot be cancelled, forcing the user to select a disruptive option

3. The left sidebar should conform to the usual responsive hamburger menu-collapsible--one hamburger menu at the top left, and a 'hold open' icon when expanded
    - additionally, even though on mobile I note the sidebar collapses to icons, some text remains despite its not being possible to fit into the icon sidebar: the top title ("St. Androids Missal") and the liturgical feast day at the bottom. This is acceptable to be shown on hover but cannot display text that cannot fit into the icon sidebar. The current icon-collapsed sidebar is visually-ruined by those two text elements.

4. The next features that are to be included are the Liturgibot Chatbot, force-directed subgraph (local neighbours in a graph representation/vector semantic representation of the currently focused concept: passively surfaces latent relationships or similarities otherwise non-obvious), the "Bookstore" (for upsell/cross-sells of content modules and functionality modules: Haydock is to be included for all as sample, with additional public domain writings of the Church fathers, of matters pertaining to magisterium, catechesis, etc., as licencing allows); additionally, the novus ordo Mass should be able to be structurally analyzed and even concordances referred to--it is only the reproduction of verbatim copyrighted novus ordo texts that we avoid, instead referring to descriptive passages and explanations of the structure and meaning of the Mass.
    - Google Stitch contains screens illustrative of these changes;
    - given the following mcp server set up, please 

5. There needs to be an overall omnisearch bar that categorizes ajax-style results as you type, by semantic, graph, parts of Mass, readings, etc.

6. The loading splash screen (src/App.tsx, the `!db` loading branch) renders the copyright as `© Robin L. M. Cheung, MBA` with no year. It should read `© 2026 Robin L. M. Cheung, MBA` to match the About footer (src/ui/AboutView.tsx:75) and the license string in src/content/about.ts:56, both of which already carry `© 2026`.

7. Neither the .msi nor the .msix Windows installer works; both error out. This is a build-time issue (scripts/build-windows.sh, scripts/build-windows-msix.sh, src-tauri/tauri.conf.json bundle config) and will be addressed after the bugs above.

8. The major component to add here is the Chatbot; mostly minimized, like Intercom Chat, or smaller if it occupies too much screen space during a Mass: 
 - free trial and lifetime purchase both use atomic.chat's turboquant-enabled llama.cpp back-end; wllama3 for web app
 - default trial: use 770mb small LFM2 model 
 - 

 9. Subway Map has to be reworked: should be relevant to screen contents:
  - currently, always shows only parts of Mass,
  - should change to the Books (dropdown to Chapter, in the scripture reading view; 
  - should change to the structure of the office being prayed (doubled antiphons? then Ps.'s etc as subway stations)
  - for books, Chapters as stations

10. The dual-barreled Latin-English highlighting the sentence the mouse is hovering over is GREAT--but it only works in the Mass:
 - also the flyout excerpts and explanations in the same callout such as in the Mass are ALSO great, and also only consistently work in the Mass and not in other views;

 - need to add to the breviary, scripture, and other readings:
    - 1. parallel highlighting of sentence being hovered over in both languages
    - 2. flyouts of annotations, translation, etc., as in the Mass

11. The context menu needs a "Highlight" option that highlights the click-dragged-selected text in both languages like a highlighter marker so that every time the passage is returned to, it renders with the selected text at time of highlighting highlighted, and maintain a categorized index of Highlighted passages & Annotations added

12. The Journaling function, 