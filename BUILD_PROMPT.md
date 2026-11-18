# AUTONOMOUS BUILD: Recall, a voice-first notes app with People profiles, a live database, and proactive reminders

You are running unattended. I am asleep and will not answer questions. **Do not ask me anything and do not stop for confirmation.** When something is ambiguous, pick the most reasonable option, write the decision in `DECISIONS.md` (one line each), and keep going. When something is blocked, take the fallback below and keep going. I want to wake up to a working app on my iPhone.

## Step 0: set up (do this first)

1. Run `ls` and read `index.html` completely. It is a working single-file prototype (vanilla JS, IndexedDB). It already has: voice dictation, notes with auto type and #tags, natural-language date detection with reminders, a People section (profiles with birthday and favorites, auto-captured from sentences like "Sam's favorite food is tacos" or "Maya's birthday is March 4"), a live Database view, search, JSON and CSV export, and light and dark mode. Keep everything that works. Do not rewrite it from scratch.
2. Run `git init` if needed. Create `CLAUDE.md` with these rules for yourself: never lose user data; keep the Apple look (system font, translucent surfaces, 10-14px radii, system blue); local-first; run the tests before every commit; never push a broken build.
3. Create `PROGRESS.md` and update it after each phase so the state survives if you are interrupted.

## Phase 1: make it an installable iPhone app (must finish)

1. **PWA.** Add `manifest.webmanifest` (name Recall, standalone, theme colors, start_url "./"), a service worker `sw.js` that caches the app shell for offline use and updates cleanly, and register it. Generate real PNG icons (180x180 apple-touch-icon, 192, 512, and a maskable 512) with Python Pillow: a rounded yellow-orange note glyph on a soft gradient. Add the `apple-touch-icon` link and `apple-mobile-web-app-*` meta tags. Make sure it uses safe-area insets correctly in standalone mode.
2. **iPhone voice reality check.** Safari supports `webkitSpeechRecognition`, but it can be blocked inside a home-screen PWA. The app must degrade gracefully: if built-in dictation fails or is unavailable, focus the text area and show "Tap the microphone on your keyboard." (the iOS keyboard mic always works). Keep that behavior and verify the code path. Also make the Capture button create a note and focus the text area immediately, so the keyboard mic is one tap away.
3. **People polish.** Verify these flows work end to end and fix any bug: add person manually; birthday sets "Birthday in N days"; "Add to Calendar" creates a yearly .ics; saying "Maya's birthday is March 4, 1992. Maya's favorite food is pad thai." in a note creates or updates Maya; a name already in People is matched by first name; the "Mentioned in" list links back to notes; deleting a person has an undo. Make a birthday statement NOT create a note reminder.
4. **Reminders reality.** In-app notifications only fire while the app is open. Make "Add to Calendar" prominent on every reminder and show a one-time, friendly hint explaining that for guaranteed alerts when the app is closed, tap Add to Calendar. Do not pretend background push works.
5. **Tests.**
   - Write `tests/dates.test.js` (run with plain `node`, no frameworks) covering at least 30 phrases for `parseWhen` and the person-extraction regexes, including negatives: "may I ask", "march forward 5", "sat down", "I will sign it in the morning" must not create reminders or people incorrectly. Extract the parsing functions into `lib.js` if needed so Node can import them, and make `index.html` use the same code.
   - Write `tests/smoke.py` using Playwright (install with `pip install playwright --break-system-packages && playwright install chromium`, and also webkit if it installs) that loads the app from a local server at a 390x844 viewport and a 1280x800 viewport and checks: no console errors; create note; date detected; reminder appears under Reminders; person auto-created; data survives a reload; export then import round-trips; delete then undo.
   - Fix everything that fails. Take screenshots of the key screens to `screenshots/` and look at them. Fix any visual problems (clipped text, overflow, tiny tap targets, dark mode contrast).
6. Commit when green.

## Phase 2: deploy so it opens on my iPhone (must try hard)

Goal: a public HTTPS URL I can open in iPhone Safari and add to the Home Screen. Work down this ladder and stop at the first rung that succeeds. The app contains no personal data (all notes live on the device), so a public repo is fine.

1. **GitHub Pages.** Run `gh auth status`. If authenticated: create a public repo named `recall-notes` (append a short random suffix if the name is taken), push `main`, enable Pages from the root of `main` with `gh api`, poll until the site is live, then `curl -I` the URL and confirm HTTP 200 plus that `manifest.webmanifest` and `sw.js` also return 200. Record the URL.
2. **Other hosts.** If `gh` is not authenticated, check for an authenticated `netlify`, `vercel`, or `wrangler` CLI and deploy with whichever works.
3. **Fallback (no logged-in host).** Do not stall. Create `recall-deploy.zip` containing only the deployable files, and write `DEPLOY_NOW.md` with the shortest possible steps (drag the unzipped folder onto app.netlify.com/drop, then open the URL on the phone). Also create `serve.sh` that runs `python3 -m http.server 8000` so I can at least test on the Mac at `localhost:8000`.

## Phase 3: only if Phases 1 and 2 are fully done and verified

1. Add `[[note title]]` links and backlinks.
2. Add a weekly "What I learned" view that groups Learning notes by week.
3. Add a "Birthdays" section on the Reminders view for the next 30 days (already partly there; verify).
4. Do NOT start cloud sync, accounts, push servers, or any AI/API features. Instead write `NEXT_STEPS.md` describing, in plain language, how each would be built (Supabase or Firebase for sync, Web Push for installed iOS PWAs, Claude API behind a server for "ask my notes"), with what each needs from me (accounts, keys). Never put an API key in client code.

## Rules while you work

- Never leave the deployed site broken. Only push to `main` when tests pass. If a change breaks something and you can't fix it in a few attempts, revert it and note it in `PROGRESS.md`.
- Keep it dependency-free (vanilla HTML, CSS, JS). Prefer small, readable changes over big rewrites.
- Never delete or overwrite user data in the code paths you touch. Data lives in IndexedDB stores `notes` and `people`; keep migrations additive.
- Don't spend effort on things I did not ask for. Polish what exists before adding anything new.
- If you hit an error you can't fix after three attempts, document it in `PROGRESS.md` and move to the next item. Never loop.

## Final deliverable: `MORNING.md` (write this last)

A one-screen note for a half-awake non-developer, containing:
1. **My URL** (or "not deployed" and the exact fallback steps), in the first line.
2. Three-step iPhone install: open the URL in Safari, Share, Add to Home Screen.
3. A 2-minute test checklist: allow the microphone prompt; tap Capture and say "Remind me to call the caterer tomorrow at 10am. Maya's birthday is March 4. Maya's favorite food is pad thai."; confirm a reminder appears, and that Maya appears under People with a birthday and favorite food.
4. What works, what does not (be honest, especially iOS dictation inside the home-screen app, and notifications while the app is closed), and what tests passed.
5. How to back up my data (Database view, Export JSON).
6. The single most valuable next step.

Finish by printing the URL and the contents of `MORNING.md`.
