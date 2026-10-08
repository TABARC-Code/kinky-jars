# Kinky Jars

A single-page questionnaire: choose a colour, rate the jars from 1–5 and save the result as a PNG. It runs in the browser, with no build step or JavaScript packages to install.

Names and answers are saved in this browser's local storage. The app doesn't upload them; sharing an exported image is a separate, deliberate action. Google Fonts supplies the typefaces, so opening the page does make external font requests.

## Running it

Serve `index.html` with any static web server. For GitHub Pages, open the repository's Settings > Pages and select deployment from `main`, at the repository root.

Use **Save my jars** to prepare the image, then choose **Download PNG** or **Share image** where file sharing is supported. The preview also lets you save the image directly. **Clear saved answers** removes the stored name and answers; it keeps your current colour for the open session.

## Changing the questions

Edit `QUESTIONS` near the start of the script. Each question has an `id` and a `label` array, with one entry per printed line. Move the whole object when reordering questions, keep existing IDs unchanged and give new questions unique IDs. Don't edit `LEGACY_IDS`: that list records the original order for migrating older answers.

The poster uses seven columns and adds rows as needed. Preset colours live in `PRESETS`; overflow artwork is seeded by position, so the same layout draws consistently.

## Checks and development notes

Run `node --test tests/regression.cjs` with Node.js 22 or newer. The tests exercise the actual page script using a small DOM and canvas substitute, so there's no test dependency to install.

These checks cover application logic, not browser rendering or native phone sharing. See [NOTES.md](NOTES.md) for the changes, trade-offs and remaining device checks.
