# Original assets and attribution

All executable code, styles, UI symbols, the Sebams logo, and extension icons are original local sources. No Momentum code, logo, screenshots, or proprietary assets are bundled. System fonts are read from the device; no font network request is made.

Three original wallpapers were created with the built-in ImageGen tool and converted to optimized JPG without changing their composition:

- `assets/backgrounds/alpine.jpg`: a calm alpine lake, mist, mountains, and sunrise.
- `assets/backgrounds/coast.jpg`: peaceful sea cliffs and a softly lit ocean shore.
- `assets/backgrounds/forest.jpg`: a misty evergreen forest and gentle morning light.

These are generated scenes and are not claims about particular real locations. The final complete prompt set and generation method are saved in [assets/image-prompts.json](assets/image-prompts.json). The reusable SVG source for the original Sebams mark is [assets/logo.svg](assets/logo.svg), with PNG extension icons at 16, 32, 48, and 128 pixels.

The four bundled quote excerpts were checked against primary texts:

- Ralph Waldo Emerson, *Self-Reliance*, in [Essays, First Series](https://www.gutenberg.org/files/2944/2944-h/2944-h.htm), first published in 1841. Two short excerpts, 18 words combined.
- Henry David Thoreau, *Where I Lived, and What I Lived For*, in [Walden](https://www.gutenberg.org/files/205/205-h/205-h.htm), first published in 1854. Two short excerpts, 20 words combined. The longer sentence is excerpted and closed with a period.

These underlying works are public domain in the United States; other jurisdictions can apply different terms. Source links are available inside the quotes panel. User-added quotes and uploaded images remain the user's responsibility. Weather attribution and service terms are explained in [PRIVACY.md](PRIVACY.md).

## Optional online photos and website icons

The optional online collection is served by [Lorem Picsum](https://picsum.photos/), which exposes photo IDs, photographer names, and Unsplash source links. Twelve scenic photo IDs are selected in `lib/photos.js`; image bytes are fetched at runtime rather than bundled in this ZIP. Photographer/source links appear in the photo gallery and on the dashboard when an online photograph is displayed. The local generated wallpapers remain available without this service.

Pinned website icons are supplied at runtime by Google's favicon service or Chrome's favicon cache. They belong to their respective websites and are not bundled as Sebams brand assets. A neutral globe is the original local fallback in `assets/site-icon.svg`. The icons are used to identify the user's saved destinations. External request and cache details are documented in [PRIVACY.md](PRIVACY.md).
