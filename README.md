# GNT Official

This project is a single-page marketing website for Global Nova Technologies.

## Local preview

Open `index.html` directly in a browser, or run a simple local server:

```bash
python -m http.server 8000
```

Then visit: http://localhost:8000

## GitHub Pages deployment

1. Create a public or private repository on GitHub.
2. Push this project to the `main` branch.
3. In GitHub, open the repository, then go to:
   - Settings
   - Pages
   - Source: Deploy from a branch
   - Branch: `main`
   - Folder: `/ (root)`
4. Save and wait for the site to publish.

Your site will be available at:

```text
https://<your-username>.github.io/<your-repository-name>/
```

## Files

- `index.html` — full website
- `.nojekyll` — prevents GitHub from processing the site as a Jekyll project

## Motion & design layer

- `assets/motion.css` — visual polish, scroll-reveal styles, page transitions, self-hosted fonts
- `assets/motion.js` — scroll animations, parallax, smooth scrolling (desktop), header hide/show, back-to-top
- `assets/vendor/lenis.min.js` — smooth-scroll library (MIT)
- `assets/fonts/` — Sora + Manrope (self-hosted, no Google request)
- Project images are served as `.webp` (≈1.3 MB total instead of ≈17 MB). The original `.png` files are kept but no longer used.

All animations switch off automatically for visitors who have "Reduce motion" enabled on their device.
