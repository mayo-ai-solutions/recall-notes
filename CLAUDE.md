# Recall: working rules (v2, Ember brand)

- Never lose user data. IndexedDB db `recall` (v3): stores `notes`, `people`, `meta`. Schema changes are additive and go through `migrate.js` (bump `SCHEMA`, extend `migrateNote`, add tests).
- Brand = Ember. Tokens live in `styles.css`: Charcoal #15171C, Slate #2C303A, Ember Amber #F5A524, Deep Amber #A65F00, Paper #F3F0E9. Space Grotesk (headings) + Inter (body), self-hosted in `fonts/`. Amber fills carry Charcoal text (white on amber fails contrast). Small text on Paper uses `--accent-text` (#9A5500), because Deep Amber on Paper is only 4.33:1.
- Local-first, dependency-free at runtime (vanilla HTML/CSS/JS, no build step). No API keys in client code. No payments.
- Pure logic goes in UMD modules (`lib.js`, `migrate.js`, `followups.js`, `coach.js`, `langs.js`, `entitlements.js`) so Node can test it. UI is `app.js`, `voice.js`, `flow.js`, `boot.js`. Clickable things use `data-act` handlers (the `ACT` map).
- Run all tests before every commit: `node tests/*.test.js && python3 tests/migration_e2e.py && python3 tests/smoke.py`.
- Private journal entries (`type: journal`, not `shareJournal`) never feed follow-ups, priority, coach, reminders, People or "mentioned in". Use `isPrivateJ(n)` / `FollowUps.eligible(n)`.
- The Accountability Coach is OFF by default and every check goes through `hasFeature("coach")`. Do not build a promises score or any reliability scoring.
- Never push a broken build to `main` (it deploys to GitHub Pages). v2 lands via a reviewed pull request.
- Bump `CACHE` in `sw.js` and add any new file to `SHELL` whenever app-shell files change.
