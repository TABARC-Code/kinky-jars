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
- **Easy-read font.** Atkinson Hyperlegible with extra letter and word spacing and taller lines, behind a toggle at the top. Its own storage key, kept through Clear. I picked it over Lexend because its character shapes are deliberately distinct (I, l, 1, b, d, p, q); I haven't compared the two with real readers. Only the on-screen page changes. The exported poster still uses the original typefaces.
- **Grid tweak.** With easy-read's extra spacing the page overflowed by 1px at 320px. `.layout` now uses `minmax(0,1fr)` for its column, which stops text widening the page.

## 11 October 2026 — version numbers and pride palettes

Added a `VERSION` constant and a short history comment at the top of the script, plus a "Version" line in the page's privacy text. The numbers are retrospective: 1.0.0 is the 8 October reliability pass, 1.1.0 is this morning's merge, 1.2.0 is this change. A test fails if `VERSION` and the newest line of the history comment disagree, because I'd forget otherwise.

### Pride palettes

Seven palettes: Rainbow, Progress, Trans, Bi, Pan, Ace, Non-binary. Each jar uses `colours[i % colours.length]`, so the flag runs across the grid in reading order. `state.palette` is an ID or null. A single colour (swatch, slider, hex, Surprise me) sets it back to null, otherwise the swatches would appear to do nothing. Picking a palette also sets `state.color` to the palette's `accent`, which the buttons and sliders use. Clear keeps the palette, the same way it keeps the colour. Unknown IDs on load fall back to null.

Where the hex values came from, because I'd rather say than imply:

- Rainbow and Progress: the fills in Wikimedia's "LGBTQ+ rainbow flag Quasar 'Progress' variant" SVG. I read that through a page-summarising fetch, not by downloading the file, so it's one step removed.
- Trans, Bi, Ace and Non-binary: fills in the Wikimedia SVG files, downloaded and read directly. Ace's purple is the CSS name `purple`, which is #800080.
- Pan: Wikipedia's hex table, which cites a 2010 Tumblr post. Its SVG wouldn't download (rate limited, then wrong filename).
- Wikimedia's plain six-stripe "Gay Pride Flag" file uses slightly different values from the Progress file (#E50000 against #E40303, and so on). I used the Progress set for both.
- Not added: the lesbian (sunset) flag. I couldn't find hex values I could verify, and I'd rather leave it out than guess.

White jars stay white. They read as pale glass with the ink outline, which looks fine on the poster, but a white liquid on a white page is subtle. Easy to nudge to a faint grey if it bothers anyone.

Checked in real Chromium: Progress and Ace posters, and the picker on a 390px screen. Both suites pass, and the new smoke check ran three times in a row without flaking. It waits for the attribute, because `render()` is batched on an animation frame. My first version read it straight away and failed.

Still not checked: real phones, Safari and the share sheet.

## 11 October 2026, later — 1.3.0

**Flags.** Added Lesbian (2018 sunset), Intersex, Genderqueer and Aromantic. All eleven palettes are now fills read straight out of the Wikimedia SVGs. I fetched them from `upload.wikimedia.org` by the file name's MD5 path, which dodged the rate limiting on `Special:FilePath`. That also cleared the two caveats from 1.2.0: Progress is now read from the file itself, and Pan from `Pansexuality_Pride_Flag.svg`. Intersex only has two colours, yellow and purple, so its jars alternate. The palette test now accepts two.

**Compare.** A code is `KJ1.` plus base64url JSON: name, answered IDs and not-for-me IDs. Decoding runs through `cleanState`, so a pasted code gets the same checks as storage: bad ratings drop to 0, unknown IDs vanish, and a name that isn't a string becomes empty. Results are built with `textContent` only, so a name like `<b>` stays text. Only mutual jars are listed; the rest are counted, not named. A typical code is around 120–300 characters. If the clipboard is blocked, the code appears in a box to copy by hand. I didn't do the PNG-metadata version: a text code covers the same need with far less code. PNG metadata would need a chunk writer and reader, and phone galleries often strip it anyway.

**Easy-read poster.** The legend, labels and footer use Atkinson Hyperlegible when the toggle is on. Long labels such as "ddlg / mdlb" shrink a fair bit because Atkinson is wider. It's still legible, but if it bothers anyone, that label could be split across two lines in `QUESTIONS`.

**Measured, then left alone.** Save on every slider move costs about 0.007ms (0.03ms with the CPU throttled 4x in Chromium). A full render is about 2ms (7ms throttled), which is inside a frame. Throttling `persist()` would be code for nothing, so it's struck off the list.

**CI.** `actions/checkout` and `actions/setup-node` bumped to v5, which drops the Node 20 deprecation warning.

## 11 October 2026, review pass — 1.3.1

Read the whole script and the docs again before merging 1.3.0, and found these:

- **Compare hidden on desktop.** The compare panel lived in the sticky side column, which made that column 1298px tall. While you scrolled, the bottom of it never came into view. On an 800px-tall screen even "Clear saved answers" was cut off, which was older than compare. Compare now sits below the two columns, the same width as the questions, and the side column only sticks when the window is at least 900px tall. There's a smoke test for both heights.
- **Compare counted the wrong things.** "N more didn't match" also counted jars where either of you had said Not for me, so the count quietly hinted at no's. Now it counts only jars on exactly one list, and the wording says that.
- **Wording.** "Them" with a capital in the middle of "you 4, Them 5" is now "them". The error message said "Kinky Jars code" while the page calls itself Kink Jars.
- **Docs.** The README said Clear only keeps your colour; it keeps the palette and the easy-read setting too. CI runs on pull requests and on `main`, not every push. I also took out a line that read as the author describing their own reading, which wasn't mine to publish.

- **Font licences, wrong.** I'd written that all four families were "believed OFL". I checked the `google/fonts` repository: Oswald, Nunito and Atkinson Hyperlegible are OFL 1.1, but Permanent Marker is Apache 2.0. The four licence texts are now bundled in `fonts/licences/` and `fonts/LICENCES.md` says what's what.

29 logic and 15 browser checks pass.

## 11 October 2026 — 1.4.0, seven more jars

Added seven jars, picked to fill gaps rather than pad the list: being a brat, taming brats, primal play, pet play, praise, blindfolds and watching others. That's exactly one more poster row (35 jars, five rows of seven). Brat and taming are a pair, like tying and being tied up. Praise balances the two degradation jars. Blindfolds is an easy starter. Watching others is the other side of "doing stuff in public". Each has a new ID, so older saves load with the new jars empty. A test checks that.

Aftercare isn't a kink, so it isn't a jar. It's one line in the compare panel instead: agree a safeword and talk about aftercare before you start.

A taller poster broke the sticky column again: the new guard test caught it at 1010px in a 1000px window. Rather than raise the threshold every time a row gets added, the preview poster now scales to the window height (`max-height: calc(100vh - 400px)`), and the column sticks from 700px tall. The smoke test checks 650, 800 and 1000px. The exported PNG is unaffected, at 2400 by 4000.

## 11 October 2026 — 1.5.0, WordPress plugin

`wordpress/kink-jars/kink-jars.php` registers `[kink_jars]`, which prints an iframe pointing at the app bundled inside the plugin. I went for an iframe instead of rewriting the app into a mountable widget. The app owns the whole page (fixed bar, two modal dialogues, body styles), and an iframe keeps theme CSS and app CSS apart with no refactor and no second copy of the logic. It's same-origin, so storage, downloads and the clipboard work as they do standalone. The cost is a scrolling box, which is why `height` is adjustable and there's a full-screen link.

- **One source.** The app isn't committed twice. `scripts/build-plugin.sh` copies `index.html` and `fonts/` into the zip and stamps the plugin header with `VERSION` from `index.html`, so there's one number to bump.
- **Attributes.** `height` only accepts `NNNpx` or `NNvh`; anything else falls back to 90vh, so it can't leak into the CSS. `title` is escaped. `tests/plugin-test.php` throws hostile values at both, using small stand-ins for the WordPress functions.
- **Build check.** `tests/build-test.sh` builds the zip and checks the files, the stamped version, that the bundled app matches `index.html` byte for byte, and that the built PHP parses and passes the shortcode tests. I proved it can fail: dropping the fonts copy makes it fail with "missing oswald.woff2".
- **Iframe smoke test.** `tests/fixtures/embed.html` mimics a theme page. The test checks the age gate is fully visible inside the frame, that neither the frame nor the page scrolls sideways, and that saving makes a PNG. It found one honest quirk: the save bar is fixed to the bottom of the iframe, so it's only on screen once the iframe is scrolled into view.
- **Releases.** `.github/workflows/release.yml` runs on pushes to `main`. If there's no release for the current `VERSION`, it builds the zip, runs both plugin checks and publishes `v<VERSION>` with the zip attached.
- **Not on WordPress.org,** by choice: it's distributed from GitHub releases.

**Real WordPress, after all.** WordPress Playground's command-line tool runs a real WordPress locally, so I installed the built zip in one and put `[kink_jars height="800px"]` on a page. It loads the bundled app at 1.5.0 from the plugin folder. The fonts load, and the age gate, a palette, a rating and saving a 2400px PNG all work, with no errors. One thing it showed: the default theme's text column is 645px, so desktop visitors got the phone layout. Hence `align="wide|full"`, which reuses the theme's own `alignwide` and `alignfull` classes; that gave 1340px and 1440px in a 1440px window. Other values are ignored, and there's a test for that.

### Ideas, not built

Nothing queued. Still owed: other themes and a real host (only the default block theme in Playground so far), plus real Android and iPhone checks of download, share, cancel, reload and clear, and the compare clipboard on Safari, which is the one most likely to sulk.
