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
