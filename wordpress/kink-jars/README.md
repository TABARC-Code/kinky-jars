# Kink Jars for WordPress (the bare-bones one)

> The maintained plugin lives at **[TABARC-Code/Wordpress-Plugin---KinkyJars](https://github.com/TABARC-Code/Wordpress-Plugin---KinkyJars)**. It has a setup screen and a proper beginner's guide. This folder is the original shortcode-only version and is kept for anyone already using it.

Puts the Kink Jars questionnaire on any WordPress page or post. Drop in the shortcode and that's it:

```
[kink_jars]
```

It's the same app as the standalone page, same version, built from the same `index.html`. Pride palettes, Not for me, compare codes, easy-read font, the 18+ gate: all of it.

## Installing

1. Download `kink-jars-x.y.z.zip` from the [Releases page](https://github.com/TABARC-Code/kinky-jars/releases).
2. In WordPress go to **Plugins > Add New > Upload Plugin**, choose the zip, install, activate.
3. Add `[kink_jars]` to a page. In the block editor, use a Shortcode block.

It isn't on the WordPress.org plugin directory and won't be. Adults can decide what goes on their own sites, so it lives here on GitHub instead.

## Options

| Attribute | Default | What it does |
| --- | --- | --- |
| `height` | `90vh` | Height of the embedded app. Use px (300–9999) or vh (10–999), e.g. `[kink_jars height="800px"]`. Anything else falls back to 90vh. |
| `align` | none | `wide` or `full` uses your theme's own wide and full-width alignment. Most themes keep page text in a narrow column (about 645px in Twenty Twenty-Five), which squeezes the app into its phone layout; `[kink_jars align="wide"]` gives desktop visitors the two-column layout. |
| `title` | Kink Jars questionnaire | The iframe's accessible title, read out by screen readers. |

There's an "Open Kink Jars full screen" link under the app for anyone on a small phone who'd rather not scroll inside a box.

## What it stores

Nothing. No database tables, no options, no cookies, nothing sent to your server. Names and answers live in each visitor's own browser storage, exactly as on the standalone page. That also means there's nothing to clean up when you delete the plugin.

## Why an iframe

The app owns a whole page: a fixed save bar, two modal dialogues, its own fonts and body styles. Dropped straight into a theme, the two would fight. In an iframe neither can touch the other. It's served from your own site, so storage, downloads and copying the compare code work exactly as they do standalone.

The cost is a scrolling box inside the page, which is why the height is adjustable and there's a full-screen link.

## Tested on

The built zip, installed into a real WordPress (WordPress Playground, the default block theme), on a page with the shortcode in a Shortcode block. The age gate, a pride palette, a rating and saving a PNG all worked inside the iframe, the fonts loaded from the plugin, and there were no errors. `align="wide"` and `align="full"` widened it to 1340px and 1440px in a 1440px window.

## Requirements

WordPress 5.8 or newer, PHP 7.4 or newer. No other plugins needed.

Author: TABARC-Code
