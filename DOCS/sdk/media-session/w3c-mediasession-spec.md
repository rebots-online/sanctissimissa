<!--
SNAPSHOT  DOCS/sdk/media-session/w3c-mediasession-spec.md
source:   https://w3c.github.io/mediasession/
fetched:  2026-11-06 (curl HTML, tags stripped to text (content verbatim))
version:  W3C Media Session Editor's Draft dated 5 June 2026; MDN content main branch on 2026-11-06
license:  W3C Software and Document License

Everything below this header is the upstream text unchanged (unless the method says "summary").
Do not edit by hand: re-snapshot and bump DOCS/sdk/media-session/INDEX.md instead.
-->



Media Session

- 

- 

- 

# Media Session

Editor’s Draft,
5 June 2026

More details about this document

This version:
https://w3c.github.io/mediasession/
Latest published version:
https://www.w3.org/TR/mediasession/
Feedback:
GitHub
Editors:
Tommy Steimel (Google LLC)
Youenn Fablet (Apple Inc.)
Former Editors:
Mounir Lamouri (Google LLC)
Becca Hughes (Google LLC)
Zhiqiang Zhang (Google Inc.)
Rich Tibbett (Opera)
Version History:
https://github.com/w3c/mediasession/commits

Copyright © 2026 World Wide Web Consortium. W3C® liability, trademark and permissive document license rules apply.

## Abstract

This specification enables web developers to show customized media
metadata on platform UI, customize available platform media
controls, and access platform media keys such as hardware keys found
on keyboards, headsets, remote controls, and software keys found in
notification areas and on lock screens of mobile devices.

## Status of this document

This section describes the status of this document at the time of its publication. A list of current W3C publications and the latest revision of this technical report can be found in the W3C standards and drafts index.

Feedback and comments on this specification are welcome.
GitHub Issues are preferred for discussion on this specification. Alternatively, you can send comments to the Media Working Group’s mailing-list, public-media-wg@w3.org (archives).
This draft highlights some of the pending issues that are still to be discussed in the working group.
No decision has been taken on the outcome of these issues including whether they are valid.

This document was published by the Media Working Group as an Editor’s Draft.
This document is intended to become a W3C Recommendation.

Publication as an Editor’s Draft does not imply endorsement by
W3C and its Members.

This document was produced by a group operating under the W3C Patent Policy.
W3C maintains a public list of any patent disclosures made in connection with the deliverables of the group; that page also includes instructions for disclosing a patent. An individual who has actual knowledge of a patent that the individual believes contains Essential Claim(s) must disclose the information in accordance with section 6 of the W3C Patent Policy.

This document is governed by the 18 August 2025 W3C Process Document.

## Table of Contents

- 1 Introduction

- 
2 Privacy Considerations

- 2.1 Incognito mode

- 2.2 Media Session Actions

- 
3 Security Considerations

- 3.1 User interface guidelines

- 
4 Model

- 4.1 Playback State

- 4.2 Routing

- 4.3 Metadata

- 4.4 Actions

- 4.5 Position State

- 5 The MediaSession interface

- 6 The MediaMetadata interface

- 7 The ChapterInformation
interface

- 8 The MediaImage dictionary

- 9 The MediaPositionState
dictionary

- 10 The
MediaSessionActionDetails dictionary

- 11 Permissions Policy Integration

- 12 Examples

-  Acknowledgments

- 
Conformance

-  Document conventions

-  Conformant Algorithms

- 
Index

-  Terms defined by this specification

-  Terms defined by reference

- 
References

-  Normative References

-  Non-Normative References

-  IDL Index

## 1. Introduction

This section is non-normative.

Media is used extensively today, and the Web is one of the primary means of
consuming media content. Many platforms can display media metadata, such as
title, artist, album and album art on various UI elements such as notifications,
media control center, device lockscreen, and wearable devices. This
specification aims to enable web pages to specify the media metadata to be
displayed in platform UI, and respond to media controls that may come from
platform UI or media keys, thereby improving the user experience.

## 2. Privacy Considerations

This section is non-normative.

The API introduced in this specification has very low impact with regards to
privacy. Part of the API allows a website to receive
commands from the user via buttons or other form of controls which might
sometimes introduce a new input layer between the user and the website.

### 2.1. Incognito mode

For privacy purposes, when in incognito mode, the user agent should be
careful when sharing the information from MediaMetadata with the
system and make sure they will not be used in a way that would harm the
user. Displaying this information in a way that is very visible would be
against the user’s intent of browsing in incognito mode. When available,
the UI elements should be advertized as private to the platform.

### 2.2. Media Session Actions

Media session actions expose a new input layer to the web platform.
User agents should make sure users are aware that their actions might be
routed to the website with the active media session. Especially,
when the actions are coming from remote devices such as a headset or other
remote device. It is recommended for the user agent to follow the platform
conventions when listening to these inputs in order to facilitate the user
understanding.

## 3. Security Considerations

This section is non-normative.

The API introduced in this specification has very low impact with regards to
security. Part of the API allows a website to expose metadata
that can be used by the user agent. The user agent obviously needs to use
this data with care.

### 3.1. User interface guidelines

The MediaMetadata introduced in this specification allows a website to
offer more information with regards to what is being played. The user
agent is meant to use this information in any UI related to media
playback, either internal to the user agent or within the platform.

The MediaMetadata are expected to be used in the context of media
playback, making spoofing harder but because the MediaMetadata has
text fields and image fields, a malicious website could try to spoof
another website’s identity. It is recommended that the user agent offers a
way to find the origin or clearly expose the origin of the website which
the metadata are coming from.

If a user agent offers a mechanism to go back to a website from a UI
element created based on the MediaMetadata, it is recommended that the
action should not be noticeable by the website, thus reducing the chances
of spoofing.

In general, all security considerations related to the display
of notifications from a website should apply here. It is worth noting that
the MediaMetadata offer less customization than regular web
notifications, thus would be harder to spoof.

## 4. Model

### 4.1. Playback State

In order to make play and
pause actions work properly, the user agent SHOULD
be able to determine if a browsing context of the active media
session is playing media or not, which is called the guessed
playback state. The RECOMMENDED way for determining the guessed
playback state is to monitor the media elements whose node document’s
browsing context is the browsing context. The
browsing context’s guessed playback state is
"playing" if any of them is potentially playing and not muted, and is
"paused" otherwise. Other information SHOULD
also be considered, such as WebAudio and plugins.

The playbackState attribute specifies the declared
playback state from the browsing context. The state is combined
with the guessed playback state to compute the
actual playback state, which is a finalized state and will be
used for play and pause
actions.

The actual playback state is computed in the following way:

- 
If the declared playback state is
playing, return
playing.

- 
Otherwise, return the guessed playback state.

The playbackState attribute could be useful when the page
wants to do some preparation steps when the media is paused but it allows
the preparation steps to be interrupted by pause
action. See Setting playbackState
for example.

When the actual playback state of the active media session
changes, the user agent MUST run the media session actions update
algorithm.

### 4.2. Routing

There could be multiple MediaSession objects existing at the same time
since the user agent could have multiple tabs, each tab could contain a
top-level traversable and descendant navigables,
and each navigable could have a MediaSession object.

The user agent MUST select at most one of the MediaSession objects to
present to the user, which is called the active media session.
The active media session may be null. The selection is up to the user
agent and SHOULD be based on preferred user experience. Note that the
playbackState attribute MUST not affect media session
routing. It only takes effect for the active media session.

It is RECOMMENDED that the user agent selects the active media
session by managing audio focus. A tab or browsing context is said to have audio focus if it is currently playing
audio or the user expects to control the media in it. The AudioFocus API
targets this area and could be used once it’s finished.

Whenever the active media session is changed, the user agent MUST run
the media session actions update algorithm and the update metadata
algorithm.

### 4.3. Metadata

The media metadata for the active media session MAY be displayed in
the platform UI depending on platform conventions. Whenever the active
media session changes or setting metadata of the
active media session, the user agent MUST run the update
metadata algorithm. The steps are as follows:

- 
If the active media session is null, unset the media metadata
presented to the platform, and terminate these steps.

- 
If the metadata of the
active media session is an empty metadata, unset the media
metadata presented to the platform, and terminate these steps.

- 
Update the media metadata presented to the platform to match the
metadata for the
active media session.

- 
If the user agent wants to display an artwork image,
the user agent MUST run the fetch image algorithm.

The fetch image algorithm is as follows:

- 
If there are other fetch image algorithms running, cancel
existing algorithm execution instances.

- 
If metadata’s artwork of the active
media session is empty, then terminate these steps.

- 
If the platform supports displaying media artwork, select a
preferred artwork image from metadata’s
artwork of the active media session.

- Let request be a new request whose URL is the
preferred artwork image’s src, destination
is "image", mode is "no-cors", credentials mode is "include",
and whose use-URL-credentials flag is set.

- 

Fetch request with  the following steps executed
as the fetch’s processResponse algorithm.

- 
Let response be the response given to the fetch’s
processResponse algorithm.

- 
If response’s type is not
"error", attempt to decode response’s body as an
image.

- 
If the image format is supported, use the image as the artwork for
display in platform UI. Otherwise the fetch image algorithm
fails and terminates.

If no images are fetched in the fetch image algorithm, the user agent
MAY have fallback behavior such as displaying a default image as artwork.

### 4.4. Actions

A media session action is an action that the page can handle in
order for the user to interact with the MediaSession. For example, a
page can handle some actions that will then be triggered when the user
presses buttons from a headset or other remote device.

A media session action source is a source that might produce a
media session action. Such a source can be the platform or the UI
surfaces created by the user agent.

A media session action source has an optional
target which should be the
recipient of any media session action created by the
media session action source. If a media session action
source’s
target is null, the active
media session is the recipient of all
media session action source’s actions.

A media session action is represented by a MediaSessionAction
which can have one of the following value:

- 
play: the action’s intent
is to resume the playback.

- 
pause: the action’s
intent is to pause the currently active playback.

- 
seekbackward: the
action’s intent is to move the playback time backward by a short
period (eg. a few seconds).

- 
seekforward: the action’s
intent is to move the playback time forward by a short period (eg. a
few seconds).

- 
previoustrack: the
action’s intent is to either start the current playback from the
beginning if the playback has a notion of beginning, or move to the
previous item in the playlist if the playback has a notion of
playlist.

- 
nexttrack: the action’s
intent is to move to the playback to the next item in the playlist if
the playback has a notion of playlist.

- 
skipad: the action’s
intent is to skip the advertisement that is currently playing.

- 
stop: the action’s intent
is to stop the playback and clear the state if appropriate.

- 
seekto: the action’s
intent is to move the playback time to a specific time.

- 
togglemicrophone: the
action’s intent is to mute or unmute the user’s microphone.

- 
togglecamera: the
action’s intent is to turn the user’s active camera on or off.

- 
togglescreenshare: the
action’s intent is to turn the user’s active screenshare on or off.

- 
hangup: the action’s
intent is to end a call.

- 
previousslide: the
action’s intent is to go back to the previous slide when presenting
slides.

- 
nextslide: the action’s
intent is to go to the next slide when presenting slides.

- 
enterpictureinpicture:
the action’s intent is to open the media session in a
picture-in-picture window.

- 
voiceactivity: the
action’s intent is to notify the web page that voice activity has been
detected by the microphone.

All MediaSessions have a map of supported media session
actions with, as a key, a media session action and as a value
a MediaSessionActionHandler.

When the update action handler algorithm on a given
MediaSession with action and handler parameters
is invoked, the user agent MUST run the following steps:

- 
If handler is null, remove action
from the supported media session actions for MediaSession
and abort these steps.

- 
Add action to the supported media session actions
for MediaSession and associate to it the handler.

When the supported media session actions are changed, the user
agent SHOULD run the media session actions update algorithm. The
user agent MAY queue a task in order to run the media session
actions update algorithm in order to avoid UI flickering when multiple
actions are modified in the same event loop.

When the user agent is notified by a media session action source
named source that a
media session action named action has been triggered,
the user agent MUST queue a task, using the user interaction task source, to run the following
handle media session action steps:

- 
Let session be source’s target.

- 
If session is null, set session to the
active media session.

- 
If session is null, abort these steps.

- 
Let actions be session’s
supported media session actions.

- 
If actions does not contain the key action,
abort these steps.

- 
Let handler be the MediaSessionActionHandler associated
with the key action in actions.

- 
Run handler with the details parameter set to:
MediaSessionActionDetails.

- 
Run the activation notification steps in the browsing context associated with session.

When the user agent receives a joint command for play and pause, such as a headset button click, it MUST
queue a task, using the user interaction task source, to run
the following steps:

- 
If the active media session is null, abort these steps.

- 
Let action be a media session action.

- 
If the actual playback state of the active media session
is playing, set
action to pause.

- 
Otherwise, set action to play.

- 
Run the handle media session action steps with
action.

It is RECOMMENDED for user agents to implement a default handler for the
play and pause media session actions if none was
provided for the active media session.

A user agent MAY implement a default handler for the togglemicrophone, togglecamera, or togglescreenshare, or hangup media session actions if none was
provided for the active media session.

A user agent MAY expose microphone, camera, and screenshare state to web
pages via MediaStreamTrack’s muted attribute in
addition to togglemicrophone,
togglecamera or
togglescreenshare media session action. In that
case, the user agent MUST execute the corresponding
MediaSessionActionHandler before running, as different tasks, the
steps defined to set a track’s muted state.

The voiceactivity action source MUST always have a
target whose document MUST always have live
microphone MediaStreamTracks. A user agent MUST invoke the
MediaSessionActionHandler for voiceactivity
only when voice activity is detected from a microphone with one or more
live MediaStreamTracks. A user agent MAY
ignore voice activity if the microphone is not muted and all
MediaStreamTracks associated with the microphone are
enabled. It is RECOMMENDED for user agents to set a
minimal interval between invocations of the MediaSessionActionHandler
for voiceactivity based on privacy and power
efficiency policies.

voiceactivity only indicates the start of voice
activity. Applications may display a notification if the user is speaking
while the MediaStreamTrack is muted, or start an AudioWorklet for
audio processing. No action is defined for the end of voice activity.
Unlike other actions which are explicitly triggered by the user,
voiceactivity also depends on the voice activity
detection algorithm of the user agent or the system. For privacy and power
efficiency concerns, the web page may not be notified if voice activity
ends and restarts soon after the last voiceactivity
action.

A page should only register a MediaSessionActionHandler for a media
session action when it can handle the action given that the user agent
will list this as a supported media session action and update the
media session action sources.

When the media session actions update algorithm is invoked, the
user agent MUST run the following steps:

- 
Let available actions be an array of media session
actions.

- 
If the active media session is null, set available
actions to the empty array.

- 
Otherwise, set the available actions to the list of keys
available in the active media session’s supported media
session actions.

- 

For each media session action source source, run the
following substeps:

- 

Optionally, if the active media session is not null:

- 
If the active media session’s actual playback
state is playing, remove play from available
actions.

- 
Otherwise, remove pause from available
actions.

- 
If the source is a UI element created by the user
agent, it MAY remove some elements from available
actions if there are too many of them compared to the
available space.

- 
Notify the source with the updated list of
available actions.

### 4.5. Position State

A user agent MAY display the current playback position and
duration
of a media session in the platform UI depending on platform conventions.
The
position state is the combination of the following:

- 
The duration of the media in seconds.

- 
The playback rate of the media. It is a coefficient.

- 
The last reported playback position of the media. This is
the playback position of the media in seconds when the position
state
was created.

The position state is represented by a MediaPositionState which
MUST always be stored with the last position updated time. This
is the time the position state was last updated in seconds.

The RECOMMENDED way to determine the position state is to monitor
the media elements whose node document’s browsing context is the
browsing context.

The actual playback rate is a coefficient computed in the
following way:

- 
If the actual playback state is paused, then return zero.

- 
Return playback rate.

The current playback position in seconds is computed in the
following way:

- 
Set time elapsed to the system time in seconds minus the
last position updated time.

- 
Mutliply time elapsed with actual playback rate.

- 
Set position to time elapsed added to
last reported playback position.

- 
If position is less than zero, return zero.

- 
If position is greater than duration, return
duration.

- 
Return position.

## 5. The MediaSession interface

[Exposed=Window]
partial interface Navigator {
[SameObject] readonly attribute MediaSession mediaSession;
};

enum MediaSessionPlaybackState {
"none",
"paused",
"playing"
};

enum MediaSessionAction {
"play",
"pause",
"seekbackward",
"seekforward",
"previoustrack",
"nexttrack",
"skipad",
"stop",
"seekto",
"togglemicrophone",
"togglecamera",
"togglescreenshare",
"hangup",
"previousslide",
"nextslide",
"enterpictureinpicture",
"voiceactivity"
};

enum MediaSessionEnterPictureInPictureReason {
"other",
"useraction",
"contentoccluded"
};

callback MediaSessionActionHandler = undefined(MediaSessionActionDetails details);

[Exposed=Window]
interface MediaSession {
attribute MediaMetadata? metadata;

attribute MediaSessionPlaybackState playbackState;

undefined setActionHandler(MediaSessionAction action, MediaSessionActionHandler? handler);

undefined setPositionState(optional MediaPositionState state = {});

Promise<undefined> setMicrophoneActive(boolean active);

Promise<undefined> setCameraActive(boolean active);

Promise<undefined> setScreenshareActive(boolean active);
};

A MediaSession object represents a media session for a given document and
allows a document to communicate to the user agent some information about the
playback and how to handle it.

A MediaSession has an associated metadata
object represented by a MediaMetadata. It is initially null.

The mediaSession attribute
MUST return the MediaSession instance associated with the Navigator
object.

The metadata attribute
reflects the MediaSession’s metadata. On getting, it MUST
return the MediaSession’s metadata. On setting, it MUST
run the following steps with value being the new value being set:

- 
If the MediaSession’s metadata is not null, set its
media session to null.

- 
Set the MediaSession’s metadata to
value.

- 
If the MediaSession’s metadata is not null, set its
media session to the current MediaSession.

- 
In parallel, run the update metadata algorithm.

The playbackState
attribute represents the declared playback state of the media
session, by which the session declares whether its browsing context
is playing media or not. The initial value is none. On setting, the user agent MUST set
the IDL attribute to the new value if it is a valid
MediaSessionPlaybackState value. On getting, the user agent MUST return
the last valid value that was set. The playbackState
attribute is a hint for the user agent to determine whether the browsing context is playing or paused.

Setting playbackState may cause the actual playback
state to change and run the media session actions update algorithm.

The MediaSessionPlaybackState enum is used to indicate whether a
browsing context is playing media or not, the values are described as
follows:

- 
none means the
browsing context does not specify whether it’s playing or paused, it
can only be used in the playbackState attribute.

- 
playing means the
browsing context is currently playing media and it can be paused.

- 
paused means the
browsing context has paused media and it can be resumed.

The setActionHandler(action, handler)
method, when invoked, MUST run the update action handler algorithm with
action and handler on the MediaSession.

The setPositionState(state) method, when
invoked MUST perform the following steps:

- 
If state is an empty dictionary, clear the position
state
and abort these steps.

- 
If state’s duration
is not present, throw a TypeError.

- 
If state’s duration is negative or
NaN, throw a TypeError.

- 
If state’s position is not present, set
it to zero.

- 
If state’s position
is negative or greater than duration, throw a
TypeError.

- 
If state’s playbackRate is not present, set it to 1.0.

- 
If state’s playbackRate is zero, throw a
TypeError.

- 
Update the position state and last position updated time.

The setMicrophoneActive(active) method
indicates to the user agent the microphone capture state desired by the page
(e.g. if the microphone is considered "inactive" by the page since it is no
longer sending audio through a call, the page can invoke
setMicrophoneActive(false)). When invoked, it MUST perform the
following steps:

- 
Let document be this’s relevant global object’s
associated Document.

- 
Let captureKind be "microphone".

- 
Return the result of running the update capture state algorithm with
document, active and captureKind.

Similarly, the setCameraActive(active)
method indicates to the user agent the camera capture state desired by the
page. When invoked, it MUST perform the following steps:

- 
Let document be this’s relevant global object’s
associated Document.

- 
Let captureKind be "camera".

- 
Return the result of running the update capture state algorithm with
document, active and captureKind.

Similarly, the setScreenshareActive(active)
method indicates to the user agent the screenshare capture state desired by
the page. When invoked, it MUST perform the following steps:

- 
Let document be this’s relevant global object’s
associated Document.

- 
Let captureKind be "screenshare".

- 
Return the result of running the update capture state algorithm with
document, active and captureKind.

The update capture state algorithm, when invoked with
document, active and captureKind, MUST
perform the following steps:

- 
If document is not fully active, return a promise rejected with InvalidStateError.

- 
If active is true and document’s
visibility state is not "visible", the user agent MAY return
a promise rejected with InvalidStateError.

- 
Let p be a new promise.

- 

In parallel, run the following steps:

- 
Let applyPausePolicy be true if the user agent
implements a policy of pausing all input sources of type
captureKind in response to UI and false
otherwise.

- 

If applyPausePolicy is true, run the following
substeps:

- 
Let currentlyActive be false if the user
agent is currently pausing all input sources of type
captureKind
and true otherwise.

- 
If active is currentlyActive, queue a task
using the user interaction task source to resolve
p with undefined and abort these steps.

- 
If active is true, the user agent MAY wait
to proceed, for instance to prompt the user.

- 
If the user agent denies the request to update the capture state,
queue a task using the user interaction task source to
reject p with a NotAllowedError and
abort these steps.

- 
Update the user agent capture state UI according to
captureKind
and active.

- 
Queue a task using the user interaction task source
to resolve p with undefined.

- 

If applyPausePolicy is true, run the following
substeps:

- 
Let newMutedState be true if
active is
false and false otherwise.

- 
For each MediaStreamTrack whose source is of type
captureKind,
queue a task using the user interaction task source
to set a track’s muted state to newMutedState.

- 
Return p.

The setMicrophoneActive(active), setCameraActive(active)
and setScreenshareActive(active) methods can reject based on user agent
specific heuristics. This might in particular happen when the web page asks to
activate (unmute) the microphone, camera or screenshare. The user agent could
decide to require transient activation in that case. It might also require
user input through a prompt to make the actual decision.

The user agent MAY display UI which invokes handlers for
media session actions.

## 6. The MediaMetadata interface

[Exposed=Window]
interface MediaMetadata {
constructor(optional MediaMetadataInit init = {});
attribute DOMString title;
attribute DOMString artist;
attribute DOMString album;
attribute FrozenArray<object> " href="#dom-mediametadata-artwork" id="ref-for-dom-mediametadata-artwork②">artwork;
[SameObject] readonly attribute FrozenArray<ChapterInformation> " id="dom-mediametadata-chapterinfo">chapterInfo;
};

dictionary MediaMetadataInit {
DOMString title = "";
DOMString artist = "";
DOMString album = "";
sequence<MediaImage> " id="dom-mediametadatainit-artwork">artwork = [];
sequence<ChapterInformationInit> " id="dom-mediametadatainit-chapterinfo">chapterInfo = [];
};

A MediaMetadata object is a representation of the metadata associated with
a MediaSession that can be used by user agents to provide customized user
interface.

A MediaMetadata can have an associated media
session.

A MediaMetadata has an associated title,
artist and album
which are DOMString.

A MediaMetadata has an associated sequence of artwork images, which is a sequence of type
MediaImage. A MediaMetadata also has has an associated 
converted artwork images which is initially undefined.

A MediaMetadata has an associated list of 
chapter information.

A MediaMetadata is said to be an empty metadata if it is equal
to null or all the following conditions are true:

- Its title is the empty string.

- Its artist is the empty string.

- Its album is the empty string.

- Its artwork images length
is 0.

- Its chapter information length is
0.

The MediaMetadata(init)
constructor, when invoked, MUST run the following steps:

- 
Let metadata be a new MediaMetadata object.

- 
Set metadata’s title to init’s
title.

- 
Set metadata’s artist to init’s
artist.

- 
Set metadata’s album to
init’s album.

- 
Run the convert artwork algorithm with init’s
artwork as input and set
metadata’s artwork images as the
result if it succeeded.

- 
Let chapters be an empty list of type ChapterInformation.

- 
For each entry in init’s
chapterInfo, create a ChapterInformation from
entry and append it to
chapters.

- 
Set metadata’s chapter information
to the result of creating a frozen array from
chapters.

- 
Return metadata.

When the convert artwork algorithm with input parameter is
invoked, where the input is a sequence of type MediaImage, the
user agent MUST run the following steps:

- 
Let output be an empty list of type MediaImage.

- 

For each entry in input (which is a MediaImage
list), perform the following steps:

- 
Let image be a new MediaImage.

- Let baseURL be the API base URL specified by the entry
settings object. 

- 
Parse entry’s src using
baseURL. If it does not return failure, set
image’s src to the return value. Otherwise,
throw a TypeError and abort these steps.

- 
Set image’s sizes to entry’s
sizes.

- 
Set image’s type to entry’s
type.

- 
Append image to the output.

- 
Return output as result.

The title attribute reflects the
MediaMetadata’s title. On getting, it MUST return
the MediaMetadata’s title. On setting, it MUST
set the MediaMetadata’s title to the given value.

The artist attribute reflects the
MediaMetadata’s artist. On getting, it MUST
return the MediaMetadata’s artist. On setting, it
MUST set the MediaMetadata’s artist
to the given value.

The album attribute reflects the
MediaMetadata’s album. On getting, it MUST return
the MediaMetadata’s album. On setting, it MUST
set the MediaMetadata’s album to the given value.

The artwork
attribute reflects the MediaMetadata’s artwork
images. On getting, it MUST run the following steps:

- 

If the MediaMetadata’s converted artwork images is
undefined, run the following steps:

- 
Let frozenArtwork be a JavaScript Array value.

- 

For each entry in the MediaMetadata’s artwork images, perform the following steps:

- 
Let image be the result of converting to a JavaScript object entry.

- 
Perform 
SetIntegrityLevel(image, "frozen"),
to prevent accidental mutation by scripts.

- 
Push image to frozenArtwork.

- 
Perform 
SetIntegrityLevel(frozenArtwork, "frozen").

- 
Set the MediaMetadata’s converted artwork images to
frozenArtwork.

- 
Return the MediaMetadata’s converted artwork images.

On setting, it MUST run the following steps with value being the
new value being set:

- 
Let convertedArtwork be the result of converting value to a sequence of type MediaImage.

- 
Run convert artwork algorithm with convertedArtwork, and
set the MediaMetadata’s artwork images as
the result if it succeeds.

- 
Set the MediaMetadata’s converted artwork images to
undefined.

When MediaMetadata’s title, artist, album or artwork images are modified, the user agent MUST run the
following steps:

- 
If the instance has no associated media session, abort
these steps.

- 

Otherwise, queue a task to run the following substeps:

- 
If the instance no longer has an associated media
session, abort these steps.

- 
Otherwise, in parallel, run the update metadata
algorithm.

## 7. The ChapterInformation
interface

[Exposed=Window]
interface ChapterInformation {
readonly attribute DOMString title;
readonly attribute double startTime;
[SameObject] readonly attribute FrozenArray<MediaImage> " href="#dom-chapterinformation-artwork" id="ref-for-dom-chapterinformation-artwork">artwork;
};

dictionary ChapterInformationInit {
DOMString title = "";
double startTime = 0;
sequence<MediaImage> " id="dom-chapterinformationinit-artwork">artwork = [];
};

A ChapterInformation object is a representation of metadata for an
individual chapter, such as the title of the section, its timestamp, and
screenshot image data of this section, that can be used by user agents to
provide a customized user interface.

A ChapterInformation has an associated title
which is DOMString.

A ChapterInformation has an associated 
startTime which is double.

A ChapterInformation has an associated list of 
artwork images.

To create a ChapterInformation with init, run the
following steps:

- 
Let chapterInfo be a new ChapterInformation object.

- 
Set chapterInfo’s title to
init’s title.

- 
Set chapterInfo’s startTime to
init’s startTime. If the startTime is negative or greater than
duration, throw a TypeError.

- 
Let artwork be the result of running the
convert artwork algorithm with init’s
artwork as input.

- 
Set chapterInfo’s artwork
images to the result of creating a frozen
array from artwork.

- 
Return chapterInfo.

The title attribute reflects the
ChapterInformation’s title. On getting, it
MUST return the ChapterInformation’s title.

The startTime attribute reflects
the ChapterInformation’s startTime in
seconds. On getting, it MUST return the ChapterInformation’s startTime.

The artwork
attribute reflects the ChapterInformation’s artwork images. On getting, it MUST return the
ChapterInformation’s 
artwork images.

## 8. The MediaImage dictionary

dictionary MediaImage {
required USVString src;
DOMString sizes = "";
DOMString type = "";
};

The MediaImage dictionary members are inspired by
ImageResource in [IMAGE-RESOURCE].

The src dictionary member is used
to specify the MediaImage object’s source. It is a URL from which the user agent can fetch
the image’s data.

The sizes dictionary member is
used to specify the MediaImage object’s sizes. It follows the
spec of sizes attribute in the HTML link element, which is a string
consisting of an unordered set of unique space-separated tokens which are
ASCII case-insensitive that represents the dimensions of an image. Each
keyword is either an ASCII case-insensitive match for the string "any", or a
value that consists of two valid non-negative integers that do not have a
leading U+0030 DIGIT ZERO (0) character and that are separated by a single
U+0078 LATIN SMALL LETTER X or U+0058 LATIN CAPITAL LETTER X character. The
keywords represent icon sizes in raw pixels (as opposed to CSS pixels). When
multiple image objects are available, a user agent MAY use the value to decide
which icon is most suitable for a display context (and ignore any that are
inappropriate). The parsing steps for the sizes attribute MUST
follow the parsing steps for HTML
link element sizes attribute.

The type dictionary member is
used to specify the MediaImage object’s MIME type. It is a hint as to
the media type of the image. The purpose of this attribute is to allow a user
agent to ignore images of media types it does not support.

## 9. The MediaPositionState
dictionary

dictionary MediaPositionState {
unrestricted double duration;
double playbackRate;
double position;
};

The MediaPositionState dictionary is a representation of the current
playback position associated with a MediaSession that can be used by user
agents to provide a user interface that displays the current playback position
and duration.

The duration dictionary
member
is used to specify the duration in seconds. It should always be positive
and positive infinity can be used to indicate media without a defined end such
as live playback.

The playbackRate dictionary
member
is used to specify the playback rate. It can be positive to represent
forward playback or negative to represent backwards playback. It should not be
zero.

The position dictionary
member
is used to specify the last reported playback position in seconds. It
should always be positive.

## 10. The
MediaSessionActionDetails dictionary

dictionary MediaSessionActionDetails {
required MediaSessionAction action;
double seekOffset;
double seekTime;
boolean fastSeek;
boolean isActivating;
MediaSessionEnterPictureInPictureReason enterPictureInPictureReason;
};

The MediaSessionActionHandler MUST be run with the details
parameter whose dictionary type is MediaSessionActionDetails.

The action dictionary
member
is used to specify the media session action that the
MediaSessionActionHandler is associated with.

The seekOffset
dictionary member MAY be provided when the media session action
is seekbackward or seekforward. It
is the time in seconds to move the playback time by. If present, it should
always be positive. If it is not provided then the site should choose a sensible
time (e.g. a few seconds).

When the media session action is seekto:

- 
The seekTime
dictionary member MUST be provided and is the time in seconds to move
the playback time to.

- 
The fastSeek
dictionary member MAY be provided and will be true if the action is being called multiple times as part of a sequence
and this is not the last call in that sequence.

The isActivating
dictionary member will be false if the user agent is about
to pause all input sources related to the capture
action and true otherwise. This
dictionary member MUST be present if the user agent implements a policy
of pausing all input sources and the media session action
is togglecamera, togglemicrophone
or togglescreenshare.

When the media session action is enterpictureinpicture,
the enterPictureInPictureReason
dictionary member MUST be provided and is the reason the UA has triggered this
action.

enterPictureInPictureReason can have one of the following values:

- 
other: the reason for entering picture-in-picture is not one of the existing enum values

- 
useraction: the user has taken an explicit action to enter picture-in-picture (e.g. clicking a picture-in-picture button in the user agent UI)

- 
contentoccluded: the user agent is requesting picture-in-picture because the page has become occluded.
This can happen in various cases like tab switching or tab minimization.

## 11. Permissions Policy Integration

This specification defines a policy-controlled feature identified by the
string "mediasession". Its default allowlist is *.

A document’s permissions policy determines whether any content in that
document is allowed to use the MediaSession API. If disabled in the document,
the User Agent MUST NOT select the document’s media session as the active
media session.

## 12. Examples

This section is non-normative.

Setting metadata:

navigator.mediaSession.metadata = new MediaMetadata({
title: "Episode Title",
artist: "Podcast Host",
album: "Podcast Title",
artwork: [{src: "podcast.jpg"}],
chapterInfo: [
{title: "Chapter 1", startTime: 0, artwork: [{src: "chapter1.jpg"}]},
{title: "Chapter 2", startTime: 120, artwork: [{src: "chapter2.jpg"}]}
]
});

Alternatively, providing multiple artwork images in the metadata can let the user agent be able to
select different artwork images for different display purposes and better fit
for different screens (the same for the artwork in
chapterInfo):

navigator.mediaSession.metadata = new MediaMetadata({
title: "Episode Title",
artist: "Podcast Host",
album: "Podcast Title",
artwork: [
{src: "podcast.jpg", sizes: "128x128", type: "image/jpeg"},
{src: "podcast_hd.jpg", sizes: "256x256"},
{src: "podcast_xhd.jpg", sizes: "1024x1024", type: "image/jpeg"},
{src: "podcast.png", sizes: "128x128", type: "image/png"},
{src: "podcast_hd.png", sizes: "256x256", type: "image/png"},
{src: "podcast.ico", sizes: "128x128 256x256", type: "image/x-icon"}
],
chapterInfo: [
{title: "Chapter 1", startTime: 0, artwork: [
{src: "chapter1_a.jpg", sizes: "128x128", type: "image/jpeg"},
{src: "chapter1_b.png", sizes: "256x256", type: "image/png"}
]},
{title: "Chapter 2", startTime: 120, artwork: [
{src: "chapter2_a.jpg", sizes: "128x128", type: "image/jpeg"},
{src: "chapter2_b.png", sizes: "256x256", type: "image/png"}
]}
]
});

For example, if the user agent wants to use an image as icon, it may choose
"podcast.jpg" or "podcast.png" for a low-pixel-density screen, and
"podcast_hd.jpg" or "podcast_hd.png" for a high-pixel-density screen. If
the user agent wants to use an image for lockscreen background,
"podcast_xhd.jpg" will be preferred.

Changing metadata:

For playlists or chapters of an audio book, multiple media elements can
share a single media session.

var audio1 = document.createElement("audio");
audio1.src = "chapter1.mp3";

var audio2 = document.createElement("audio");
audio2.src = "chapter2.mp3";

audio1.play();
audio1.addEventListener("ended", function() {
audio2.play();
});

Because the session is shared, the metadata must be updated to reflect what is
currently playing.

function updateMetadata(event) {
navigator.mediaSession.metadata = new MediaMetadata({
title: event.target == audio1 ? "Chapter 1" : "Chapter 2",
artist: "An Author",
album: "A Book",
artwork: [{src: "cover.jpg"}]
});
}

audio1.addEventListener("play", updateMetadata);
audio2.addEventListener("play", updateMetadata);

Handling media session actions:

var tracks = ["chapter1.mp3", "chapter2.mp3", "chapter3.mp3"];
var trackId = 0;

var audio = document.createElement("audio");
audio.src = tracks[trackId];

function updatePlayingMedia() {
audio.src = tracks[trackId];
// Update metadata (omitted)
}

navigator.mediaSession.setActionHandler("previoustrack", function() {
trackId = (trackId + tracks.length - 1) % tracks.length;
updatePlayingMedia();
});

navigator.mediaSession.setActionHandler("nexttrack", function() {
trackId = (trackId + 1) % tracks.length;
updatePlayingMedia();
});

navigator.mediaSession.setActionHandler("seekto", function(details) {
audio.currentTime = details.seekTime;
});

Setting playbackState:

When a page pauses its media and plays a third-party ad in an iframe, the UA
might consider the session as "not playing", however the page wants to allow
the user to pause the ad playback and cancel the pending playback after the ad
finishes.

var adFrame;
var audio = document.createElement("audio");
audio.src = "foo.mp3";

function resetActionHandlers() {
navigator.mediaSession.setActionHandler("play", _ => audio.play());
navigator.mediaSession.setActionHandler("pause", _ => audio.pause());
}

resetActionHandlers();

// This method will be called when the page wants to play some ad.
function pauseAudioAndPlayAd() {
audio.pause();
navigator.mediaSession.playbackState = "playing";
setUpAdFrame();
adFrame.contentWindow.postMessage("play_ad");
navigator.mediaSession.setActionHandler("pause", pauseAd);
}

function pauseAd() {
adFrame.contentWindow.postMessage("pause_ad");
navigator.mediaSession.playbackState = "paused";
navigator.mediaSession.setActionHandler("play", resumeAd);
}

function resumeAd() {
adFrame.contentWindow.postMessage("resume_ad");
navigator.mediaSession.playbackState = "playing";
navigator.mediaSession.setActionHandler("pause", pauseAd);
}

window.onmessage = function(e) {
if (e.data === "ad finished") {
removeAdFrame();
navigator.mediaSession.playbackState = "none";
resetActionHandlers();
}
}

function setUpAdFrame() {
adFrame = document.createElement("iframe");
adFrame.src = "https://example.com/ad-iframe.html";
document.body.appendChild(adFrame);
}

function removeAdFrame() {
adFrame.remove();
}

Setting position state:

// Media is loaded, set the duration.
navigator.mediaSession.setPositionState({
duration: 60
});

// Media starts playing at the beginning.
navigator.mediaSession.playbackState = "playing";

// Media starts playing at 2x 10 seconds in.
navigator.mediaSession.setPositionState({
duration: 60,
playbackRate: 2,
position: 10
});

// Media is paused.
navigator.mediaSession.playbackState = "paused";

// Media is reset.
navigator.mediaSession.setPositionState(null);

Using video conferencing actions:

var isMicrophoneActive = false;
var isCameraActive = false;

navigator.mediaSession.setMicrophoneActive(isMicrophoneActive);
navigator.mediaSession.setCameraActive(isCameraActive);

navigator.mediaSession.setActionHandler("togglemicrophone", function() {
if (isMicrophoneActive) {
// Mute the microphone. Implementation omitted.
} else {
// Unmute the microphone. Implementation omitted.
}
isMicrophoneActive = !isMicrophoneActive;
navigator.mediaSession.setMicrophoneActive(isMicrophoneActive);
});

navigator.mediaSession.setActionHandler("togglecamera", function() {
if (isCameraActive) {
// Disable the camera. Implementation omitted.
} else {
// Enable the camera. Implementation omitted.
}
isCameraActive = !isCameraActive;
navigator.mediaSession.setCameraActive(isCameraActive);
});

navigator.mediaSession.setActionHandler("hangup", function() {
// End the call. Implementation omitted.
});

Handling presenting slide actions:

var currentSlideIndex = 0;

navigator.mediaSession.setActionHandler("previousslide", function() {
currentSlideIndex--;
// Set current slide. Implementation omitted.
});

navigator.mediaSession.setActionHandler("nextslide", function() {
currentSlideIndex++;
// Set current slide. Implementation omitted.
});

Handling picture-in-picture:

navigator.mediaSession.setActionHandler("enterpictureinpicture", function() {
remoteVideo.requestPictureInPicture();
});

Handling voice activity:

// Create a MediaStream with audio enabled.
const stream = await navigator.mediaDevices.getUserMedia({audio:true});
const track = stream.getAudioTracks()[0];
navigator.mediaSession.setActionHandler("voiceactivity", function() {
if (track.muted) {
// Show unmute notification. If user allows to unmute, call
// setMicrophoneActive(true) to unmute.
}
});

## Acknowledgments

The editors would like to thank Paul Adenot, Jake Archibald, Tab Atkins,
Jonathan Bailey, François Beaufort, Marcos Caceres, Domenic Denicola, Ralph
Giles, Anne van Kesteren, Tobie Langel, Michael Mahemoff, Jer Noble, Elliott
Sprehn, Chris Wilson, and Jörn Zaefferer for their participation in technical
discussions that ultimately made this specification possible.

Special thanks go to Philip Jägenstedt and David Vest for their help in
designing every aspect of media sessions and for their seemingly infinite
patience in working through the initial design issues; Jer Noble for his help in
building a model that also works well within the iOS audio focus model; and
Mounir Lamouri and Anton Vayvod for their early involvement, feedback and
support in making this specification happen.

## Conformance

### Document conventions

Conformance requirements are expressed
with a combination of descriptive assertions
and RFC 2119 terminology.
The key words “MUST”, “MUST NOT”, “REQUIRED”, “SHALL”, “SHALL NOT”, “SHOULD”, “SHOULD NOT”, “RECOMMENDED”, “MAY”, and “OPTIONAL”
in the normative parts of this document
are to be interpreted as described in RFC 2119.
However, for readability,
these words do not appear in all uppercase letters in this specification.

All of the text of this specification is normative
except sections explicitly marked as non-normative, examples, and notes. [RFC2119]

Examples in this specification are introduced with the words “for example”
or are set apart from the normative text
with class="example",
like this:

This is an example of an informative example.

Informative notes begin with the word “Note”
and are set apart from the normative text
with class="note",
like this:

Note, this is an informative note.

### Conformant Algorithms

Requirements phrased in the imperative as part of algorithms
(such as "strip any leading space characters"
or "return false and abort these steps")
are to be interpreted with the meaning of the key word
("must", "should", "may", etc)
used in introducing the algorithm.

Conformance requirements phrased as algorithms or specific steps
can be implemented in any manner,
so long as the end result is equivalent.
In particular, the algorithms defined in this specification
are intended to be easy to understand
and are not intended to be performant.
Implementers are encouraged to optimize.

## Index

### Terms defined by this specification

- action, in § 10

- active media session, in § 4.2

- actual playback rate, in § 4.5

- actual playback state, in § 4.1

- 
album

- attribute for MediaMetadata, in § 6

- dfn for MediaMetadata, in § 6

- dict-member for MediaMetadataInit, in § 6

- 
artist

- attribute for MediaMetadata, in § 6

- dfn for MediaMetadata, in § 6

- dict-member for MediaMetadataInit, in § 6

- 
artwork

- attribute for ChapterInformation, in § 7

- attribute for MediaMetadata, in § 6

- dict-member for ChapterInformationInit, in § 7

- dict-member for MediaMetadataInit, in § 6

- 
artwork images

- dfn for ChapterInformation, in § 7

- dfn for MediaMetadata, in § 6

- audio focus, in § 4.2

- 
chapterInfo

- attribute for MediaMetadata, in § 6

- dict-member for MediaMetadataInit, in § 6

- chapter information, in § 6

- ChapterInformation, in § 7

- ChapterInformationInit, in § 7

- constructor(), in § 6

- constructor(init), in § 6

- "contentoccluded", in § 10

- contentoccluded, in § 10

- convert artwork algorithm, in § 6

- converted artwork images, in § 6

- create a ChapterInformation, in § 7

- current playback position, in § 4.5

- declared playback state, in § 5

- 
duration

- definition of, in § 4.5

- dict-member for MediaPositionState, in § 9

- empty metadata, in § 6

- "enterpictureinpicture", in § 4.4

- enterpictureinpicture, in § 4.4

- enterPictureInPictureReason, in § 10

- fastSeek, in § 10

- fetch image algorithm, in § 4.3

- guessed playback state, in § 4.1

- handle media session action, in § 4.4

- "hangup", in § 4.4

- hangup, in § 4.4

- 
isActivating

- dict-member for MediaSessionActionCaptureDetails, in § 10

- dict-member for MediaSessionActionDetails, in § 10

- last position updated time, in § 4.5

- last reported playback position, in § 4.5

- MediaImage, in § 8

- MediaMetadata, in § 6

- MediaMetadata(), in § 6

- MediaMetadata(init), in § 6

- MediaMetadataInit, in § 6

- MediaPositionState, in § 9

- media session, in § 6

- MediaSession, in § 5

- mediaSession, in § 5

- media session action, in § 4.4

- MediaSessionAction, in § 5

- MediaSessionActionDetails, in § 10

- MediaSessionActionHandler, in § 5

- media session action source, in § 4.4

- media session actions update algorithm, in § 4.4

- MediaSessionEnterPictureInPictureReason, in § 5

- MediaSessionPlaybackState, in § 5

- 
metadata

- attribute for MediaSession, in § 5

- dfn for MediaSession, in § 5

- "nextslide", in § 4.4

- nextslide, in § 4.4

- "nexttrack", in § 4.4

- nexttrack, in § 4.4

- "none", in § 5

- none, in § 5

- "other", in § 10

- other, in § 10

- "pause", in § 4.4

- pause, in § 4.4

- "paused", in § 5

- paused, in § 5

- pausing all input sources, in § 5

- "play", in § 4.4

- play, in § 4.4

- playback rate, in § 4.5

- playbackRate, in § 9

- playbackState, in § 5

- "playing", in § 5

- playing, in § 5

- position, in § 9

- position state, in § 4.5

- preferred artwork image, in § 4.3

- "previousslide", in § 4.4

- previousslide, in § 4.4

- "previoustrack", in § 4.4

- previoustrack, in § 4.4

- "seekbackward", in § 4.4

- seekbackward, in § 4.4

- "seekforward", in § 4.4

- seekforward, in § 4.4

- seekOffset, in § 10

- seekTime, in § 10

- "seekto", in § 4.4

- seekto, in § 4.4

- setActionHandler(action, handler), in § 5

- setCameraActive(active), in § 5

- setMicrophoneActive(active), in § 5

- setPositionState(), in § 5

- setPositionState(state), in § 5

- setScreenshareActive(active), in § 5

- sizes, in § 8

- "skipad", in § 4.4

- skipad, in § 4.4

- source, in § 8

- src, in § 8

- 
startTime

- attribute for ChapterInformation, in § 7

- dfn for ChapterInformation, in § 7

- dict-member for ChapterInformationInit, in § 7

- "stop", in § 4.4

- stop, in § 4.4

- supported media session actions, in § 4.4

- target, in § 4.4

- 
title

- attribute for ChapterInformation, in § 7

- attribute for MediaMetadata, in § 6

- dfn for ChapterInformation, in § 7

- dfn for MediaMetadata, in § 6

- dict-member for ChapterInformationInit, in § 7

- dict-member for MediaMetadataInit, in § 6

- "togglecamera", in § 4.4

- togglecamera, in § 4.4

- "togglemicrophone", in § 4.4

- togglemicrophone, in § 4.4

- "togglescreenshare", in § 4.4

- togglescreenshare, in § 4.4

- type, in § 8

- update action handler algorithm, in § 4.4

- update capture state algorithm, in § 5

- update metadata algorithm, in § 4.3

- "useraction", in § 10

- useraction, in § 10

- "voiceactivity", in § 4.4

- voiceactivity, in § 4.4

### Terms defined by reference

- 
[FETCH] defines the following terms:

- "error"

- body

- credentials mode

- destination

- fetch

- mode

- processResponse

- request

- response

- type

- URL

- use-URL-credentials flag

- 
[HTML] defines the following terms:

- Navigator

- activation notification

- associated Document

- browsing context

- browsing context (for Document)

- browsing context (for Window)

- entry settings object

- fully active

- in parallel

- link

- media element

- muted

- navigable

- permissions policy

- potentially playing

- queue a task

- relevant global object

- sizes (for HTMLLinkElement)

- sizes (for link)

- top-level traversable

- transient activation

- unordered set of unique space-separated tokens

- user interaction task source

- visibility state

- 
[IMAGE-RESOURCE] defines the following terms:

- ImageResource

- 
[INFRA] defines the following terms:

- ASCII case-insensitive

- 
[MEDIACAPTURE-STREAMS] defines the following terms:

- MediaStreamTrack

- enabled

- live

- muted

- set a track's muted state

- 
[MIMESNIFF] defines the following terms:

- MIME type

- 
[PERMISSIONS-POLICY-1] defines the following terms:

- *

- default allowlist

- policy-controlled feature

- 
[URL] defines the following terms:

- URL parser

- 
[WEBAUDIO-1.1] defines the following terms:

- AudioWorklet

- 
[WEBIDL] defines the following terms:

- DOMString

- Exposed

- FrozenArray

- InvalidStateError

- NotAllowedError

- Promise

- SameObject

- TypeError

- USVString

- a promise rejected with

- boolean

- converted to a JavaScript value

- converted to an IDL value

- create a frozen array

- dictionary members

- double

- object

- sequence

- this

- undefined

- unrestricted double

## References

### Normative References

[FETCH]
Anne van Kesteren. Fetch Standard. Living Standard. URL: https://fetch.spec.whatwg.org/
[HTML]
Anne van Kesteren; et al. HTML Standard. Living Standard. URL: https://html.spec.whatwg.org/multipage/
[INFRA]
Anne van Kesteren; Domenic Denicola. Infra Standard. Living Standard. URL: https://infra.spec.whatwg.org/
[MEDIACAPTURE-STREAMS]
Cullen Jennings; et al. Media Capture and Streams. URL: https://w3c.github.io/mediacapture-main/
[MIMESNIFF]
Gordon P. Hemsley. MIME Sniffing Standard. Living Standard. URL: https://mimesniff.spec.whatwg.org/
[PERMISSIONS-POLICY-1]
Ian Clelland. Permissions Policy. URL: https://w3c.github.io/webappsec-permissions-policy/
[RFC2119]
S. Bradner. Key words for use in RFCs to Indicate Requirement Levels. March 1997. Best Current Practice. URL: https://datatracker.ietf.org/doc/html/rfc2119
[URL]
Anne van Kesteren. URL Standard. Living Standard. URL: https://url.spec.whatwg.org/
[WEBIDL]
Edgar Chen; Timothy Gu. Web IDL Standard. Living Standard. URL: https://webidl.spec.whatwg.org/

### Non-Normative References

[IMAGE-RESOURCE]
Aaron Gustafson; Rayan Kanso; Marcos Caceres. Image Resource. URL: https://w3c.github.io/image-resource/
[WEBAUDIO-1.1]
Paul Adenot; Hongchan Choi. Web Audio API 1.1. URL: https://webaudio.github.io/web-audio-api/

## IDL Index

[Exposed=Window]
partial interface Navigator {
[SameObject] readonly attribute MediaSession mediaSession;
};

enum MediaSessionPlaybackState {
"none",
"paused",
"playing"
};

enum MediaSessionAction {
"play",
"pause",
"seekbackward",
"seekforward",
"previoustrack",
"nexttrack",
"skipad",
"stop",
"seekto",
"togglemicrophone",
"togglecamera",
"togglescreenshare",
"hangup",
"previousslide",
"nextslide",
"enterpictureinpicture",
"voiceactivity"
};

enum MediaSessionEnterPictureInPictureReason {
"other",
"useraction",
"contentoccluded"
};

callback MediaSessionActionHandler = undefined(MediaSessionActionDetails details);

[Exposed=Window]
interface MediaSession {
attribute MediaMetadata? metadata;

attribute MediaSessionPlaybackState playbackState;

undefined setActionHandler(MediaSessionAction action, MediaSessionActionHandler? handler);

undefined setPositionState(optional MediaPositionState state = {});

Promise<undefined> setMicrophoneActive(boolean active);

Promise<undefined> setCameraActive(boolean active);

Promise<undefined> setScreenshareActive(boolean active);
};

[Exposed=Window]
interface MediaMetadata {
constructor(optional MediaMetadataInit init = {});
attribute DOMString title;
attribute DOMString artist;
attribute DOMString album;
attribute FrozenArray<object> " href="#dom-mediametadata-artwork">artwork;
[SameObject] readonly attribute FrozenArray<ChapterInformation> " href="#dom-mediametadata-chapterinfo">chapterInfo;
};

dictionary MediaMetadataInit {
DOMString title = "";
DOMString artist = "";
DOMString album = "";
sequence<MediaImage> " href="#dom-mediametadatainit-artwork">artwork = [];
sequence<ChapterInformationInit> " href="#dom-mediametadatainit-chapterinfo">chapterInfo = [];
};

[Exposed=Window]
interface ChapterInformation {
readonly attribute DOMString title;
readonly attribute double startTime;
[SameObject] readonly attribute FrozenArray<MediaImage> " href="#dom-chapterinformation-artwork">artwork;
};

dictionary ChapterInformationInit {
DOMString title = "";
double startTime = 0;
sequence<MediaImage> " href="#dom-chapterinformationinit-artwork">artwork = [];
};

dictionary MediaImage {
required USVString src;
DOMString sizes = "";
DOMString type = "";
};

dictionary MediaPositionState {
unrestricted double duration;
double playbackRate;
double position;
};

dictionary MediaSessionActionDetails {
required MediaSessionAction action;
double seekOffset;
double seekTime;
boolean fastSeek;
boolean isActivating;
MediaSessionEnterPictureInPictureReason enterPictureInPictureReason;
};

