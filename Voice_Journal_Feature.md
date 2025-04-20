# Voice Journal Feature

## Feature Concept
Allow users to record personal reflections, insights, or prayers triggered by any element in the liturgical texts—whether it's a complete reading, a specific verse, a prayer, or even a single word that resonates with them.

## Spiritual and Personal Benefits

### 1. Deepened Engagement with Scripture
- Encourages active reflection rather than passive reading
- Creates a habit of personal response to the Word
- Builds a history of one's spiritual journey through the texts

### 2. Personal Spiritual Growth Tracking
- See how one's reflections on the same texts evolve over time
- Revisit insights from previous liturgical cycles
- Notice patterns in what resonates at different life stages

### 3. Authentic Voice and Emotion
- Capture the emotion and intonation of the moment
- Record insights exactly as they come, preserving spontaneity
- Express what might be difficult to write down

## User Experience Flow

### 1. Text Interaction & Recording Initiation
When a user long-presses on any text element, a context menu appears with options:
- Copy
- Share
- **Record Journal Entry** ← New prominent option
- Add Bookmark
- Highlight

### 2. Recording Interface
When "Record Journal Entry" is selected, a modal appears with:

1. **Context Display**
   - The selected text prominently displayed
   - Surrounding context (e.g., which reading, which feast day)
   - Option to add a title or topic for the reflection

2. **Recording Controls**
   - Large, accessible record button
   - Visual audio level indicator
   - Timer showing recording duration
   - Pause/resume capability

3. **Reflection Prompts** (Optional)
   - "How does this passage speak to you today?"
   - "What memories or insights does this text evoke?"
   - "How might this apply to your current life situation?"

### 3. Saving & Organization
After recording, users can:

1. **Add Metadata**
   - Tags for categorization (e.g., "personal insight," "prayer," "question")
   - Privacy setting (private by default)
   - Optional title for the entry

2. **Review Options**
   - Play back the recording before saving
   - Discard and re-record if desired
   - Optional: View auto-transcription

3. **Save Location**
   - Save to device storage
   - Optional cloud backup (privacy-protected)

### 4. Accessing Journal Entries
Users can access their voice journal entries through multiple paths:

1. **Text-Anchored Access**
   - Small journal icon appears next to text that has associated entries
   - Tapping the icon shows all journal entries for that text
   - Entries are organized chronologically

2. **Journal View**
   - Dedicated journal section in the app
   - Filterable by date, liturgical season, tags, etc.
   - Search functionality (using transcriptions if available)

3. **Calendar Integration**
   - Entries visible on liturgical calendar
   - Creates a spiritual journal mapped to the liturgical year
   - Encourages revisiting reflections on recurring feasts

## Technical Implementation Details

### Storage Strategy
1. **Local-First Approach**
   - Store recordings on device first for privacy and offline access
   - Use IndexedDB for metadata and references
   - Implement efficient compression for audio files

2. **Intelligent Syncing**
   - Optional cloud backup for signed-in users
   - Selective syncing based on user preferences
   - Bandwidth-aware uploading (e.g., only on WiFi)

3. **Privacy Protection**
   - End-to-end encryption for cloud-stored entries
   - Clear privacy controls and transparency
   - Option to keep entries device-only

### Audio Processing
1. **Optimized Recording**
   - Noise reduction for clearer playback
   - Automatic level adjustment
   - Silence trimming at beginning/end

2. **Playback Enhancements**
   - Variable speed playback
   - Background playback capability
   - Audio bookmarking for longer reflections

3. **Optional Transcription**
   - On-device speech-to-text for privacy
   - Searchable transcripts
   - Text highlighting during playback

## Implementation Timeline
1. **Core Recording Functionality** (2 weeks)
   - Implement long-press context menu with recording option
   - Create basic recording interface
   - Develop local storage system for recordings and metadata

2. **Journal Organization** (2 weeks)
   - Build journal view with filtering and search
   - Implement text-anchored indicators for existing entries
   - Create calendar integration for temporal navigation

3. **Enhanced Features** (3 weeks)
   - Add transcription capabilities
   - Implement cloud backup with privacy protections
   - Develop sharing options for selected entries
