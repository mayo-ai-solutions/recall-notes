# Recall

**Notes that follow up.** A voice-first notes app for iPhone that runs as a Progressive Web App: speak or type a note, and Recall offers to check back on it later.

Recall is a **note-taking agent**, not a general chatbot. It acts only on your notes, reminders and check-ins. It asks before sending anything anywhere, spending anything, or deleting anything, and it offers Undo.

Live: https://mayo-ai-solutions.github.io/recall-notes/ (v1 until v2 is merged).

## What is in v2

- **Voice-first capture** with a floating mic button. Long-press it to pick a dictation language.
- **Notes as a living database:** types (note, idea, learning, task, person note), tags, [[links]], People profiles, filters (type, tag, person, priority, language, updated), saved views, search, and a Table view.
- **Journal:** private by default. Mood, a daily prompt, a gratitude line, a Timeline and a Calendar. An optional writing streak, off by default. Private entries never feed follow-ups, priority, the coach, reminders, People or "mentioned in". Turn on "Include in follow-ups" per entry to opt one in.
- **Languages:** 40+ dictation languages, stored per note. "Auto" offers a one-tap "Re-record in…" when a result looks wrong. Translation is manual and asks before sending text anywhere.
- **Follow-ups:** Recall offers to check back (tomorrow, 3 days, 1 week, or a time you pick) and asks a couple of questions to help you think. A Follow-ups tab lists what is earlier, today and upcoming with Snooze, Reschedule and Done. Ideas get a 1 to 5 priority with a rising/falling/steady trend.
- **Check-in threads:** texting-style conversations (type or dictate). A 3-question interview asks how important it is, what changed, and the next step. Replies are saved on the note as dated updates.
- **Accountability Coach (off by default):** four styles (Steady, Straight Shooter, Strategist, Cheerleader), a weekly review, nudges for things that are waiting, and a next-step question. It uses fixed wording on your phone, not live AI. There is no promises score or reliability score of any kind.
- **Your data stays yours:** everything is stored on your device (IndexedDB). JSON export and import are in Settings. A safety snapshot is taken before any upgrade.
- **Ember brand:** Charcoal, Slate, Ember Amber, Deep Amber, Paper. Space Grotesk and Inter are self-hosted. Light and dark.

## Honest limits

- **Reminders only fire while Recall is open.** A web app cannot wake your phone on its own. Use **Add to Calendar** (an `.ics`) for an alert that is guaranteed even when the app is closed. Server web push is a stub for a later phase (`push.js`).
- **Dictation depends on the browser.** iPhone support for built-in speech recognition varies, especially in a Home Screen app. When it fails, Recall points you to the keyboard's own mic, which always works. Mixing languages in one sentence is unreliable. Date detection understands English only.
- **The coach is templates, not AI.** Elaboration questions come from a `generateQuestions(note)` interface with rule-based questions today. A language-model provider can be plugged in later with `RecallFollowUps.setProvider`.
- **Tested in Chromium only.** There is no WebKit in the build environment and no real iPhone, so Safari and Home Screen behavior is **not verified**.
- No sync between devices, no payments, no accounts.

## Run it

No build step and no runtime dependencies. Serve the folder over HTTP (a service worker needs it):

```
python3 -m http.server 8000
```

then open http://localhost:8000.

## Tests

```
tests/run_all.sh
```

That runs the Node unit tests (`tests/*.test.js`), the migration test that seeds real v1 IndexedDB data (`tests/migration_e2e.py`), and the browser smoke test (`tests/smoke.py`, needs `pip install playwright` and `playwright install chromium`). Set `SMOKE_QUICK=1` for a faster single-theme run.

## How it is built

Vanilla HTML, CSS and JS. Logic that can be tested without a browser lives in UMD modules (`lib.js`, `migrate.js`, `followups.js`, `coach.js`, `langs.js`, `entitlements.js`, `push.js`). The UI is `app.js`, `voice.js`, `flow.js`, `followui.js`, `coachui.js`, `filters.js` and `boot.js`. Clickable things use `data-act` handlers. See `V2_PLAN.md`, `DECISIONS.md` and `CLAUDE.md`.

Data model: IndexedDB database `recall` version 3 with stores `notes`, `people` and `meta`. Schema changes are additive and go through `migrate.js`.

Feature gating goes through `hasFeature(name)` in `entitlements.js`. During the free test phase everything is on; the coach additionally needs the user's own toggle.
