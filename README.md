# Kinky Jars

A single-page questionnaire for adults (18+): choose a colour, rate the jars from 1–5, mark any that are **Not for me**, and save the result as a PNG. The image footer shows how many jars you filled and how many you crossed out. It runs in the browser, with no build step or JavaScript packages to install.

The first visit asks you to confirm you're 18 or over. That's a self-declaration, not age verification, and I'd rather say so than pretend otherwise.

Names and answers are saved in this browser's local storage. The app doesn't upload them; sharing an exported image is a separate, deliberate action. The fonts are bundled in `fonts/`, so the page makes no requests to other sites (the smoke test checks that). Licences are in [fonts/LICENCES.md](fonts/LICENCES.md), with the full texts in `fonts/licences/`: OFL 1.1 for Oswald, Nunito and Atkinson Hyperlegible, and Apache 2.0 for Permanent Marker.

## Running it

Serve `index.html` with any static web server. For GitHub Pages, open the repository's Settings > Pages and select deployment from `main`, at the repository root.

Use **Save my jars** to prepare the image, then choose **Download PNG** or **Share image** where file sharing is supported. The preview also lets you save the image directly. **Clear saved answers** removes the stored name and answers. It keeps your current colour or pride palette for the open session, and the easy-read setting.

## Reading it more easily

Tick **Easy-read font** at the top to switch the page to Atkinson Hyperlegible with looser letter and word spacing. Atkinson was designed so similar characters (I, l, 1, b, d, p, q) look different. Plenty of readers find that helps, but I won't claim a font fixes dyslexia; the research on that is mixed. The choice is stored under its own key, so **Clear saved answers** leaves it alone. On the exported poster the legend, jar labels and footer switch too; the title and your name keep their own faces.

## Pride palettes

Under the colour swatches there's a row of pride palettes: Rainbow, Progress, Trans, Bi, Pan, Ace, Non-binary, Lesbian, Intersex, Genderqueer and Aromantic. Pick one and each jar takes the next colour of the flag, so the poster comes out striped across the grid. Pick it again to switch it off. Choosing any single swatch, slider or hex code goes back to one colour. The palette is saved with your answers and kept through **Clear saved answers**.

Every hex value is a fill read straight out of the flag's SVG on Wikimedia Commons. White stripes are left white, so those jars read as pale glass with a coloured outline rather than coloured liquid. Other flags are easy to add: put a new entry in `PALETTES` with an `id`, a `name`, an `accent` colour for the buttons and a `colours` list.

## Compare with someone

**Copy my code** gives you a short text code (it starts `KJ1.`). Swap codes with a partner, paste theirs into **Their code** and press **Compare**. The page lists only the jars you're both into, best match first. Jars on just one of your lists are counted but never named, and no's aren't counted at all, so nobody learns about the other's no's from the screen.

Be honest with yourself about what a code is, though. It's your name and answers in base64. Anyone who has it can decode it, so only give it to someone you'd show the poster to anyway. Nothing is uploaded; the code goes wherever you paste it.

## Not for me

A jar can be empty because you skipped it or because it's a firm no. Those used to look identical. **Not for me** puts a cross on the jar, and rating a jar or pressing the button again clears it. It's saved beside your answers, and older saves load fine without it.

## WordPress plugin

There's a WordPress plugin in `wordpress/kink-jars/`. Every release on the [Releases page](https://github.com/TABARC-Code/kinky-jars/releases) has the zip attached: upload it under **Plugins > Add New > Upload Plugin**, activate it, and put `[kink_jars]` on a page. It shows this same app in an iframe, at the same version, and stores nothing on the site. Details are in [wordpress/kink-jars/README.md](wordpress/kink-jars/README.md).

It's deliberately not on the WordPress.org directory. It lives here.

To build the zip yourself, run `bash scripts/build-plugin.sh`; it writes `dist/kink-jars-<version>.zip`. Merging to `main` with a new `VERSION` publishes a release with the zip automatically.

## Changing the questions

Edit `QUESTIONS` near the start of the script. Each question has an `id` and a `label` array, with one entry per printed line. Move the whole object when reordering questions, keep existing IDs unchanged and give new questions unique IDs. Don't edit `LEGACY_IDS`: that list records the original order for migrating older answers.

There are 35 questions. The poster uses seven columns and adds rows as needed, and the on-screen preview scales itself to fit the window. Preset colours live in `PRESETS`; overflow artwork is seeded by position, so the same layout draws consistently.

## Checks and development notes

Three sets of checks. The first two need Node.js 22 or newer:

- `node --test tests/regression.cjs` runs the actual page script against a small DOM and canvas substitute. No dependencies.
- `node --test tests/smoke.cjs` drives real Chromium through Playwright: no sideways scroll at 320, 360, 390 and 1280px (standard and easy-read), no page errors, no requests to other sites, fonts load, the age gate holds, saving makes a PNG, pride palettes stick, compare works, and the desktop side column only sticks when it fits. It skips itself if Playwright isn't installed. Set `CHROMIUM_PATH` to use an existing Chromium. GitHub Actions runs both on every pull request and on pushes to `main` (`.github/workflows/test.yml`).

- `php tests/plugin-test.php` and `bash tests/build-test.sh` check the plugin: shortcode output, escaping, the height rules, and that the built zip holds the right files at the right version.

None of these proves a PNG looks right or that a phone's share sheet behaves. See [NOTES.md](NOTES.md) for the changes, trade-offs and remaining device checks.
