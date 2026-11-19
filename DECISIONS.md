# Decisions

- Node was missing; installed it with Homebrew. Pillow and Playwright installed with `pip --user` (system Python 3.9).
- Parsing lives in `lib.js` (a UMD script): the browser uses the `RecallLib` global and Node uses `require`. No build step.
- A bare "1/2" no longer counts as a date (it's usually a fraction). A slash date needs a year or a lead-in word ("on/by/due/until 4/15").
- "5am"/"5pm" must not be followed by a letter, so "5 amazing ideas" isn't a 5am reminder.
- "Today I learned" / "TIL" no longer creates a reminder.
- Sentence starters ("Remember", "Tomorrow", "Call"...) are stripped from captured names, and "Everyone" etc. are never a person.
- Birthdays are parsed with a dedicated month/day parser (Feb 29 is kept, invalid dates are rejected) instead of the reminder parser.
- First-name matching: "Maya" matches "Maya Lopez" (most recently updated if several), and "Maya Lopez" upgrades an existing "Maya". It never matches two different full names.
- Status bar style is "default", not "black-translucent", because translucent forces white status-bar text that is unreadable on the light theme.
- The service worker is network-first with a cache fallback, so updates arrive immediately online and the app still opens offline.
- On iPhone, .ics files open through a `data:text/calendar` URL (iOS shows its Add to Calendar sheet). Exports use the share sheet (Save to Files). Neither is verified on a real device.
- Notifications go through the service worker's `showNotification`, which is the only path iOS Home Screen apps support. They still only fire while the app is open.
- Built-in dictation counts as failed (and the app switches to the keyboard-mic hint for the rest of the session) on not-allowed, service-not-allowed, audio-capture or network errors, a start() exception, or no start within 4 seconds.
- screenshots/ is gitignored, so it stays local and isn't deployed.
- Smoke test simulates "dictation unavailable" by setting `srBroken=true`, because headless browsers can't exercise a real microphone.
- [[links]] and backlinks appear in a card under the note (a plain textarea can't hold clickable inline links). A link to a missing title offers "+ Create".
- "What I learned" is the Learning view itself, renamed and grouped by the week each note was created (weeks start Monday).
- Birthdays (next 30 days) on the Reminders view already existed. Verified by the smoke test, no change needed.

## v2

- v2 lives on branch `v2` and lands through a reviewed pull request. `main` deploys to GitHub Pages, so it is never touched directly.
- Data: IndexedDB `recall` v3 (stores `notes`, `people`, `meta`). Upgrades are additive and idempotent, run through `migrate.js`, and take a snapshot first. Import accepts v1 backups, bare arrays and v3 backups.
- Private journal entries (`type: journal`, not `shareJournal`) are excluded from reminders, People, follow-ups, priority, the coach, filters and "mentioned in" through one check (`isPrivateJ` / `FollowUps.eligible`), and each path has a test.
- Contrast: Deep Amber `#A65F00` on Paper is 4.33:1 and fails AA for small text. Small text on Paper uses `--accent-text` `#9A5500` (5.02:1). White on Amber is 2.04:1, so amber fills carry Charcoal text (8.79:1). Amber on Paper as a UI boundary is 1.79:1, so the light-theme focus ring is Charcoal. `tests/contrast.test.js` records this.
- The coach is OFF by default and every path goes through `hasFeature("coach")` plus the user's toggle. It is template wording, never live AI. No promises score, reliability score, percentages or streak shaming, and a test scans every template for such wording.
- Overdue items read "Earlier" while the coach is off and "Overdue" when it is on.
- Rescheduling on purpose does not count as a snooze. Repeated snoozes (2 or more) let the coach gently ask whether to keep, shrink or drop the item.
- `generateQuestions(note)` is the single interface for elaboration questions: rule-based today, with `setProvider` as the hook for a language model later.
- Translation is manual only. It uses the on-device Translator API when present; otherwise it asks before opening Google Translate with the note text.
- Dictation goes to the check-in reply box while a thread is open, otherwise into the note.
- Reminders and follow-up alerts fire only while the app is open. `.ics` is the guaranteed path. Server web push is a stub (`push.js`) for a later phase.
- Saved views reuse the existing `settings.views` shape (`{id, name, filter}`).
- `node tests/*.test.js` only runs the first file, so `tests/run_all.sh` loops over them.
- Verified in Chromium only. WebKit and real iPhone behavior (dictation, Home Screen, `.ics`, share sheet) are unverified.
