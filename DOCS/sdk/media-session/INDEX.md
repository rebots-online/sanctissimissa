# DOCS/sdk/media-session/ — Media Session API (W3C + MDN)

**Pinned version:** W3C Media Session Editor's Draft dated 5 June 2026; MDN content main branch on 2026-11-06
**Snapshot date:** 2026-11-06
**Convention:** Admin-Manual TC7 (`/home/robin/Admin-Manual/DOCS/TOOLING_CONVENTIONS/inline-deeplink-comments-to-local-sdk-docs.md`).
Cite as `// see DOCS/sdk/media-session/<file>.md §<heading>`.

## Curator notes

- `MediaSessionAction` enum (W3C): play, pause, seekbackward, seekforward, previoustrack, nexttrack, skipad, stop, seekto, togglemicrophone, togglecamera, togglescreenshare, hangup, previousslide, nextslide, enterpictureinpicture, voiceactivity.
- `navigator.mediaSession.setActionHandler(action, handler|null)` throws for unsupported actions in some browsers — wrap each call in try/catch (MDN `setactionhandler.md`).
- `setPositionState({duration, playbackRate, position})` for seek bars; `MediaMetadata` for title/artist/artwork.
- The W3C file is a text extraction (HTML tags stripped) of the full spec.

## Files

| File | Covers | Fetch method | Source URL |
|---|---|---|---|
| [`w3c-mediasession-spec.md`](w3c-mediasession-spec.md) | Full W3C spec text incl. IDL and action algorithms | curl HTML, tags stripped to text (content verbatim) | <https://w3c.github.io/mediasession/> |
| [`mdn-media-session-api.md`](mdn-media-session-api.md) | API overview | curl, verbatim | <https://raw.githubusercontent.com/mdn/content/main/files/en-us/web/api/media_session_api/index.md> |
| [`mdn-mediasession.md`](mdn-mediasession.md) | MediaSession interface | curl, verbatim | <https://raw.githubusercontent.com/mdn/content/main/files/en-us/web/api/mediasession/index.md> |
| [`mdn-setactionhandler.md`](mdn-setactionhandler.md) | setActionHandler() and action list | curl, verbatim | <https://raw.githubusercontent.com/mdn/content/main/files/en-us/web/api/mediasession/setactionhandler/index.md> |
| [`mdn-setpositionstate.md`](mdn-setpositionstate.md) | setPositionState() | curl, verbatim | <https://raw.githubusercontent.com/mdn/content/main/files/en-us/web/api/mediasession/setpositionstate/index.md> |
| [`mdn-mediametadata.md`](mdn-mediametadata.md) | MediaMetadata | curl, verbatim | <https://raw.githubusercontent.com/mdn/content/main/files/en-us/web/api/mediametadata/index.md> |

## Section map (deep-link targets)

### `w3c-mediasession-spec.md`

- Media Session
  - Abstract
  - Status of this document
  - Table of Contents
  - 1. Introduction
  - 2. Privacy Considerations
    - 2.1. Incognito mode
    - 2.2. Media Session Actions
  - 3. Security Considerations
    - 3.1. User interface guidelines
  - 4. Model
    - 4.1. Playback State
    - 4.2. Routing
    - 4.3. Metadata
    - 4.4. Actions
    - 4.5. Position State
  - 5. The MediaSession interface
  - 6. The MediaMetadata interface
  - 7. The ChapterInformation
  - 8. The MediaImage dictionary
  - 9. The MediaPositionState
  - 10. The
  - 11. Permissions Policy Integration
  - 12. Examples
  - Acknowledgments
  - Conformance
    - Document conventions
    - Conformant Algorithms
  - Index
    - Terms defined by this specification
    - Terms defined by reference
  - References
    - Normative References
    - Non-Normative References
  - IDL Index

### `mdn-media-session-api.md`

  - Media Session concepts and usage
  - Accessing the Media Session API
  - Interfaces
  - Examples
    - Setting up action handlers for a music player
    - Using action handlers to control a slide presentation
  - Specifications
  - Browser compatibility
  - See also

### `mdn-mediasession.md`

  - Instance properties
  - Instance methods
  - Examples
    - Setting up action handlers for a music player
    - Playing and pausing audio
      - HTML
      - JavaScript
      - Result
    - Using action handlers to control a slide presentation
  - Specifications
  - Browser compatibility

### `mdn-setactionhandler.md`

  - Syntax
    - Parameters
    - Return value
  - Description
  - Examples
    - Setting up action handlers for a music player
    - Supporting multiple actions in one handler function
    - Using action handlers to control a slide presentation
  - Specifications
  - Browser compatibility

### `mdn-setpositionstate.md`

  - Syntax
    - Parameters
    - Return value
    - Exceptions
  - Examples
  - Specifications
  - Browser compatibility

### `mdn-mediametadata.md`

  - Constructor
  - Instance properties
  - Examples
  - Specifications
  - Browser compatibility
