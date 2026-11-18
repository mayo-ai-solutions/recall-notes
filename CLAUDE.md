# Recall: working rules

- Never lose user data. IndexedDB stores `notes` and `people` (db `recall`); migrations must be additive.
- Keep the Apple look: system font, translucent surfaces, 10-14px radii, system blue.
- Local-first, dependency-free (vanilla HTML/CSS/JS). No API keys in client code.
- Run the tests before every commit: `node tests/dates.test.js && python3 tests/smoke.py`.
- Never push a broken build to `main` (it deploys to GitHub Pages).
- Shared parsing logic lives in `lib.js` (used by both `index.html` and the Node tests).
- Bump `CACHE` in `sw.js` whenever app-shell files change.
