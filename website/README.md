# Carbon Roots Website

Static one-page website for Carbon Roots.

## Files

- `index.html`
- `styles.css`
- `script.js`

## Local preview

Open `index.html` directly in a browser, or run a simple static server:

```bash
python3 -m http.server 8080
```

Then visit `http://localhost:8080`.

## Deploy

### Vercel

1. Push this repository to GitHub.
2. In Vercel, create a new project and import the repo.
3. Framework preset: **Other**.
4. Build command: *(none)*
5. Output directory: `/website` (or set project root to `/website`).
6. Deploy.

### Netlify

1. Push this repository to GitHub.
2. In Netlify, add new site from Git.
3. Base directory: `website`
4. Build command: *(none)*
5. Publish directory: `website`
6. Deploy.

### GitHub Pages

Option A (root publish):
1. Copy `website/*` to repository root on a `gh-pages` branch.
2. In GitHub repo settings, enable Pages from `gh-pages` branch root.

Option B (Actions workflow):
1. Keep files in `website/`.
2. Configure a GitHub Actions Pages workflow that uploads `website/` as artifact.
3. Enable Pages with GitHub Actions source.

## Notes

- Site is intentionally lightweight (no framework, no build step).
- Copy uses early-stage, indicative, and screening-level language.
- Content avoids claims of guaranteed issuance, formal validation, or investment certainty.
