# Brand assets

Add the official Sisyphus logo here as **`sisyphus-logo.png`** (a square PNG with a transparent background works best, 512 × 512 px or larger).

`src/components/brand/Logo.jsx` loads `/brand/sisyphus-logo.png` everywhere the logo appears (site navigation, dashboard sidebar, footer, loading screen). If the file is missing it falls back to `sisyphus-mark.svg`, an interim drawing of the same mark, so the app never shows a broken image.

To use the official logo as the browser tab icon as well, change the `<link rel="icon">` in `index.html` to `/brand/sisyphus-logo.png`.
