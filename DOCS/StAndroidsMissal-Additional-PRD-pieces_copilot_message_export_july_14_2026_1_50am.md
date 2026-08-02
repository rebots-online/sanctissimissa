*Shared Message from Pieces (https://pieces.app) by Robin (robinsaiworld@gmail.com) on Tuesday Jul 14, 2026 - 1:50 AM*
---
## Product Requirements Document: StAndroidsMissal Homily Management & Journaling System (Updated with Prototype Insights)

### 1. Introduction

#### 1.1 Purpose
This document outlines the product requirements for new Homily Management and Journaling features within the `StAndroidsMissal` application. These features aim to enhance user interaction with Sacred Scripture and liturgical texts by providing tools for personal reflection, study, and homily preparation, now augmented with semantic search capabilities and a refined user experience as indicated by the `standroids-journal-sidecar-standalone.html` prototype.

#### 1.2 Scope
This PRD covers the integration of context-menu driven text selection, annotation, highlighting, vector semantic search/embeddings, and a dedicated sidecar interface for managing these interactions. It addresses the needs of both priest users (Homily Management) and general end-users (Journaling), leveraging the existing bilingual reader capabilities and a planned sidecar annotations database.

#### 1.3 Target Audience
*   **Priest Users:** Requiring robust tools for homily preparation, research, and organization of scriptural insights, with intelligent surfacing of related passages and a streamlined workflow for creating and managing homily notes.
*   **End Users:** Seeking personal reflection, study notes, and the ability to highlight significant passages within the application, with enhanced discovery of thematically linked content and a dedicated space for personal journaling.

### 2. Features

#### 2.1 Core Functionality

##### 2.1.1 Context Menu Integration
*   A context menu will be accessible via a right-click (desktop) or long-press (mobile) gesture when text is selected within the application's Mass, Breviary, or Scripture reading modes.
*   This menu will present at least two primary options: "Add to Journal/Homily Notes" and "Highlighter".
*   *Reference:* This functionality aligns with the established "reader interaction grammar" documented in `PL-1` of `/home/robin/Admin-Manual/DOCS/PORTABLE LEARNINGS.md`, which includes `menu` and `select` interactions.

##### 2.1.2 Homily Management (Priest User)
*   **Role-Based Interface:** The system will recognize the user's role (e.g., `data-role="priest"`) and potentially offer tailored workflows or features for homily preparation.
*   **Capture Selected Text:** When a priest user selects text and chooses "Add to Journal/Homily Notes" from the context menu, the selected passage will be captured.
*   **Rich Text Interface:** The captured text will be presented in a dedicated interface (`sjp-editor`) for creating new homily research notes or appending to existing ones. This interface will support rich-text editing, leveraging the planned `TipTap rich-text editor`.
*   **Metadata Association:** Each homily note entry will automatically associate relevant metadata, including:
    *   The source of the text (e.g., `Ps/22/2` from `Vulgate/Douay-Rheims`).
    *   The date and time of capture.
    *   User-defined tags for organization (e.g., "Advent", "Gospel Reflection").
*   **Attachments:** The system will support attaching files or media to homily notes, indicated by `sjp-attachment-list`.
*   **Workflow & Destinations:** A clear workflow (`sjp-flow`, `sjp-stage`, `sjp-destinations`) will guide the user in processing selected text and directing it to appropriate destinations (e.g., a specific homily draft).
*   **Storage:** Homily notes will be durably stored in the planned `SQLite sidecar via sql.js` annotations database.

##### 2.1.3 Journaling (End User)
*   **Capture Selected Text:** When an end user selects text and chooses "Add to Journal/Homily Notes" from the context menu, the selected passage will be captured.
*   **Rich Text Interface:** The captured text will be presented in a dedicated interface (`sjp-editor`) for creating new personal journaling entries. This interface will also support rich-text editing using `TipTap`.
*   **Metadata Association:** Journal entries will include similar metadata to homily notes, such as source, date of capture, and user-defined tags.
*   **Attachments:** Support for attaching files or media to journal entries will be provided (`sjp-attachment-list`).
*   **Storage:** Journal entries will be stored in the planned `SQLite sidecar via sql.js` annotations database.

##### 2.1.4 Highlighter Functionality
*   **Context Menu Option:** A "Highlighter" option will be available in the context menu.
*   **Visual Effect:** Upon selection, the currently selected text will be marked with a clear visual highlighter effect (`mark` tag in prototype).
*   **Bilingual Dual-Selection:** This feature will operate on a dual-selection principle. When text is selected in either the Latin or English pane of the bilingual reader, the corresponding text in the other language pane will be concurrently selected at the cursor level. The highlighter effect will then apply to both selected segments simultaneously, maintaining the bilingual integrity of the highlighted passage.
*   **Storage:** Highlighter data (including text range, chosen color, and source information) will be stored in the sidecar annotations database.
*   *Reference:* The existing "bilingual Sacred Scripture reader with OT/NT grids and side-by-side Vulgate/Douay-Rheims verses" provides the necessary foundation for this dual-selection behavior.

##### 2.1.5 Vector Semantic Search & Embeddings
*   **Bidirectional Semantic Search:** The system will leverage vector semantic search and embeddings to enable intelligent connections between user-generated content (homily topics, journaling entries) and scriptural passages.
*   **Homily Topic to Scripture:** When a priest user is working on a homily topic, the system will be able to surface potentially related scriptural passages from the `StAndroidsMissal` corpus based on semantic similarity, even if exact keywords are not present. These related passages will be presented in a dedicated section (`sjp-related`, `sjp-related-list`, `sjp-related-card`) with explanations (`sjp-why`) and evidence (`sjp-evidence`) for their relevance.
*   **Journaling to Scripture:** Similarly, for end users, journaling entries will be able to surface relevant scriptural passages, aiding in deeper reflection and study, presented in the same `sjp-related` format.
*   **Scripture to User Content:** Conversely, when a user is viewing a scriptural passage, the system can suggest related homily notes or journaling entries they have previously created.
*   **Embedding Generation:** Text from scriptural passages, homily notes, and journaling entries will be converted into high-dimensional vector embeddings.
*   **Similarity Search:** These embeddings will be stored and used to perform similarity searches, identifying content that is semantically close.
*   **Synthesis of Related Content:** The prototype suggests a `sjp-synthesis` element, indicating that the system may offer a summary or synthesis of the related content it surfaces.

#### 2.2 Technical Considerations & Dependencies
*   **Annotations Database:** The system will utilize the planned `SQLite sidecar via sql.js` for robust and durable storage of all journaling entries, homily notes, and highlighter data. This is part of the "B-C Accompaniment object model" implementation.
*   **Vector Database/Index:** In addition to SQLite, a mechanism for storing and querying vector embeddings will be required. This could be an integrated SQLite extension (e.g., `sqlite-vss`), a separate lightweight vector database, or an in-memory index for similarity search.
*   **Embedding Model:** An appropriate pre-trained or fine-tuned language model will be used to generate the vector embeddings for both scriptural text and user-generated content.
*   **Rich Text Editor:** The `TipTap rich-text editor` will be integrated to provide a flexible and feature-rich content creation experience for journaling and homily management interfaces (`sjp-editor`).
*   **Object Model:** The `B-C Accompaniment object model` will need to be fully implemented to manage the data structures for annotations, ensuring proper relationships and retrieval.
*   **Existing Components:** The features will integrate seamlessly with existing reader components, particularly `src/ui/BibleView.tsx` for rendering and interaction, and will leverage the `src/core/annotations/store.ts` (implied) for underlying annotation management.
*   **Interaction Grammar:** All new interactions will adhere to the established reader interaction grammar (peek/echo/select/menu/annotate/back-nav/deep-link/scrolling) to ensure a consistent and intuitive user experience.
*   **Voice Input:** The presence of `sjp-voice-state` suggests potential integration with voice-to-text capabilities for note-taking.

#### 2.3 User Interface / User Experience (UI/UX)
*   **Sidecar Interface:** The prototype indicates a `sjp-sidecar` element, suggesting a dedicated panel or area within the application for managing journal entries, homily notes, and related content, operating alongside the main `sjp-reader`.
*   **Workspace Layout:** The `sjp-workspace` with `sjp-reader` and `sjp-sidecar` implies a split-pane layout, optimizing for simultaneous reading and note-taking.
*   Context menus should be visually consistent, intuitive, and highly responsive to user input.
*   The highlighter effect should be distinct, non-obtrusive, and clearly indicate the selected bilingual text.
*   The journaling and homily notes interfaces (`sjp-editor`) should be designed for ease of navigation, allowing users to efficiently create, view, edit, search, and filter their entries.
*   Semantic search results (`sjp-related-list`) should be presented clearly and intuitively, perhaps in a dedicated panel or as suggestions within the editing interface, indicating their relevance score, along with explanations (`sjp-why`) and evidence (`sjp-evidence`).
*   **Notifications:** A `sjp-toast` element suggests a non-intrusive notification system for user feedback (e.g., "Note saved").

### 3. Data Model & Storage

All annotations (journal entries, homily notes, highlights) will be stored in a central table within the `SQLite` sidecar database. An example schema includes:

| Field                 | Type       | Description                                                                 |
| :-------------------- | :--------- | :-------------------------------------------------------------------------- |
| `annotation_id`       | `UUID`     | Primary key, unique identifier for each annotation.                         |
| `user_id`             | `TEXT`     | Identifier for the user who created the annotation.                         |
| `type`                | `TEXT`     | Type of annotation (`journal`, `homily_note`, `highlight`).                |
| `source_book`         | `TEXT`     | Book of Scripture (e.g., `Ps`).                                            |
| `source_chapter`      | `INTEGER`  | Chapter number.                                                             |
| `source_verse_start`  | `INTEGER`  | Starting verse number of the selected text.                                 |
| `source_verse_end`    | `INTEGER`  | Ending verse number of the selected text.                                   |
| `selected_text_latin` | `TEXT`     | The verbatim selected text in Latin.                                        |
| `selected_text_english` | `TEXT`   | The verbatim selected text in English.                                      |
| `content`             | `TEXT`     | For `journal`/`homily_note` types, the rich text content of the entry.      |
| `highlight_color`     | `TEXT`     | For `highlight` types, the color used (e.g., `#FFFF00`).                   |
| `embedding`           | `BLOB`     | Vector embedding of the `content` or `selected_text` for semantic search.   |
| `created_at`          | `DATETIME` | Timestamp of creation.                                                      |
| `updated_at`          | `DATETIME` | Timestamp of last modification.                                             |
| `tags`                | `JSON`     | JSON array of user-defined tags.                                            |
| `attachments`         | `JSON`     | JSON array of attachment metadata (e.g., file paths, URLs).                 |
| `related_content_ids` | `JSON`     | JSON array of `annotation_id`s or scriptural references for related content. |

### 4. Use Cases & Embodied Principles

#### 4.1 Use Cases

*   **Priest preparing a homily:** A priest is reading the Gospel for an upcoming Sunday. They select a key verse, right-click, and choose "Add to Homily Notes." The verse appears in the sidecar editor. As they type their reflections, the "Related Content" section (`sjp-related`) automatically suggests other scriptural passages, Church Fathers' commentaries, or even their past homily notes that are semantically similar. They can attach relevant theological articles (`sjp-attachment-list`) and then, using the workflow (`sjp-flow`), send the note to a specific homily draft.
*   **End user journaling:** An end user is reading a Psalm and a particular phrase resonates with them. They long-press to select it, choose "Add to Journal," and begin typing their personal reflections in the sidecar. The system suggests other Psalms or New Testament passages that share a similar theme. They can highlight other verses in both Latin and English as they continue their study.
*   **Deep study with highlighting:** A student is performing a detailed textual analysis. They select a word in the Vulgate, and the corresponding word in the Douay-Rheims is also selected. They apply a specific highlighter color. Later, they can filter their view to see all passages highlighted with that color, across both languages.
*   **Voice-enabled note-taking:** While reading, a user has an insight and quickly taps a button to record a voice note, which is then transcribed and added to their journal entry via the `sjp-voice-state` functionality.

#### 4.2 Embodied Principles

*   **Seamless Integration:** The sidecar (`sjp-sidecar`) and context menu (`sjp-context`) ensure that journaling and homily management are deeply integrated into the reading experience, minimizing context switching.
*   **Bilingual Fidelity:** The dual-selection and highlighting mechanism reinforces the bilingual nature of the `StAndroidsMissal`, treating both Latin and English texts as primary and interconnected.
*   **Intelligent Discovery:** Vector semantic search (`sjp-related`, `sjp-why`, `sjp-evidence`) moves beyond keyword matching to provide semantically relevant connections, enriching the user's understanding and research.
*   **Personalized Workspace:** The ability to create homily notes and journal entries, attach content, and receive tailored suggestions transforms the application into a personalized study and reflection tool.
*   **Guided Workflow:** Elements like `sjp-flow` and `sjp-destinations` suggest a design principle focused on guiding the user through the process of capturing and organizing their thoughts efficiently.
*   **Rich Content Creation:** The `sjp-editor` and support for attachments (`sjp-attachment-list`) emphasize enabling users to create rich, multimedia-enhanced notes.

### 5. Future Enhancements / Next Steps

*   Implement advanced search and filtering capabilities for journal and homily notes based on content, source, date, tags, and semantic similarity.
*   Provide options for users to customize highlighter colors and manage their highlight palettes.
*   Develop export and import functionalities for notes, allowing users to back up or share their content.
*   Explore integration with external services for cloud synchronization or backup of annotations.
*   Continue cross-pollination of portable learnings and implementation patterns to other reader applications like `EnZIME`.
*   Refine the embedding model for domain-specific accuracy (e.g., theological language).
*   Implement user feedback mechanisms for semantic search results to improve relevance over time.
*   Fully implement voice-to-text functionality for note-taking.