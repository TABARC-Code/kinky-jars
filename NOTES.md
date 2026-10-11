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

## 11 October 2026 — small fixes and a nudge

Checked it in real Chromium this time (fonts blocked, so fallback typefaces). The page scrolled sideways at 320px wide. Cause: six swatch columns with a 40px minimum each need 290px, and a 320px phone leaves about 244px inside the panel. First attempt, `auto-fill` with `minmax(40px,1fr)`, made it worse (450px), because the grid's own width is indefinite there. What worked: six columns of `minmax(0,1fr)`, and four across under 420px. Swatches are about 57px on a 320px screen, so the touch targets got bigger, not smaller. Checked at 320, 360, 390 and 1280.

Also: `role="group"` on the swatches so the label is actually announced, an "Adults only (18+)" line under the intro, and a "N of 28 jars filled" footer on the poster. The footer has a test that captures the text the poster draws.

Still not checked: real phones, Safari, the share sheet. Same list as before.

### Follow-up the same day

All five ideas from the list I'd drafted, plus an easy-read font:

- **CI and a browser smoke test.** Added `.github/workflows/test.yml` and `tests/smoke.cjs`. I proved the smoke test can fail: reverting the swatch and grid CSS makes both 320px checks go red, and a wrong font path fails the font check. Both restored afterwards.
- **Not for me.** Stored as a separate `no` map rather than a sentinel value such as -1 in `answers`, so rating validation, the legacy array migration and the old tests didn't have to change. It is dropped on load if the jar also has a rating, and unknown IDs are ignored. Drawn as a cross on the jar.
- **Age gate.** A modal on the first visit; Escape is blocked, "Leave" goes to a blank page, and a yes is remembered under `kinkjars-18`. It's a self-declaration. It stays in storage after Clear because it isn't personal data. If storage is blocked it asks every visit.
- **Fonts bundled.** Oswald, Nunito and Permanent Marker, plus Atkinson Hyperlegible, now live in `fonts/` (about 125KB of Latin subsets). Oswald and Nunito are variable, so one file each covers every weight. The page makes zero outside requests, and the privacy line says so. I haven't verified the licence texts upstream; see `fonts/LICENCES.md`.
- **Easy-read font.** Atkinson Hyperlegible with extra letter and word spacing and taller lines, behind a toggle at the top. Its own storage key, kept through Clear. I picked it over Lexend because its character shapes are deliberately distinct, which is the thing that bites me; I haven't compared the two on other readers. Only the on-screen page changes. The exported poster still uses the original typefaces.
- **Grid tweak.** With easy-read's extra spacing the page overflowed by 1px at 320px. `.layout` now uses `minmax(0,1fr)` for its column, which stops text widening the page.

### Ideas, not built

- Compare mode: load two exports side by side and highlight overlaps. Needs a way to read a poster back, so probably a small encoded payload in the PNG metadata.
- Throttle `persist()` on slider drags. Harmless at this size; I'd want a measurement before touching it.
- Option to apply the easy-read font to the exported poster as well.
