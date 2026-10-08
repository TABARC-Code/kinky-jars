# Programmer's notes

## 8 October 2026 — reliability pass

I kept this as a single HTML page. There's no useful reason to introduce a framework just to fill some jars, and the existing drawing code is quite capable of doing its job.

The first change is at the storage boundary. I now check names, colours and ratings before letting them into the renderer, because a valid JSON object isn't necessarily valid application data. A null name used to trip over `trim()`; a numeric colour failed at `replace()`. Both now fall back to sensible defaults, as do ratings outside the integer range 0–5.

Answers are keyed by stable question IDs. The old array format still loads through a frozen list of the original IDs, then moves to the new storage key on the next successful save. Changing a label or moving a question won't quietly give someone somebody else's answer. Please leave that migration list alone; it isn't spare configuration.

## Saving and sharing

Export waits for font readiness, checks that PNG encoding actually returned an image and catches failures without discarding the form. Both save buttons are disabled while it works. A failed export gives a visible message rather than leaving the user to interpret the traditional JavaScript silence.

I split preparation from the final download or share action. Once the image is ready, the dialogue offers a download link and, where supported, a separate Share button. That gives sharing a fresh user gesture instead of relying on one surviving asynchronous image encoding. Cancelling the share sheet leaves the download available.

Only one preview URL is retained. It stays alive after closing the dialogue so a download can finish, then gets released before the next export or when the page is left. The previous implementation accumulated them.

## Interface and privacy

Text on coloured buttons now chooses black or white using calculated contrast. All twelve presets exceed 4.5:1 in the regression check. The near-black drawing ink wasn't quite enough on the default red, so I kept it for the artwork and used actual black where the button text needs it.

The export panel is now a native dialogue, with browser-managed modal behaviour and Escape handling. Closing it restores focus to the button that opened it. I've also linked the name field to its visible label and respected reduced-motion preferences when clearing the form.

The privacy wording now says what the code does: answers and names stay in browser storage unless the user shares an image, while Google Fonts still receives font requests. I haven't bundled the fonts in this pass. “Nothing leaves your phone” was a rather ambitious description of a page making external requests.

Clearing answers removes both generations of saved data instead of writing an empty form back into storage. Failed storage operations produce a message. The current colour stays on screen, but isn't persisted again until the next edit.

## Drawing work

Changing the name now redraws only the poster. Rating a jar redraws that jar and the poster; changing the colour redraws the whole set. The existing animation-frame batching remains in place, which avoids spending quite so much effort drawing things nobody changed.

## What I've checked

Ten automated checks pass against the actual page script: invalid saved fields, migration after question reordering, malformed JSON and blocked writes, preset contrast, selective redraws, failed PNG encoding, overlapping exports and URL cleanup, cancelled sharing, clearing both storage keys, and waiting for fonts.

The harness substitutes the DOM and canvas. It doesn't prove that a PNG looks right or that a particular phone's share sheet behaves itself. A Playwright package is available in the working environment, but its browser executable isn't installed, so I haven't claimed a browser pass.

Before calling the device work finished, check Android Chrome and iPhone Safari: download the PNG, share it, cancel sharing, reload saved answers and clear them. Also check Tab, Shift+Tab, Escape and focus restoration in the dialogue, plus the layout on a narrow screen. Those are outstanding checks, not results dressed up as confidence.
