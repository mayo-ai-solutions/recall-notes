# Recall v2 plan

Version 2 of the same app, on the `v2` branch. `main` (live v1) is untouched until the pull request is reviewed and merged.

## Current architecture (v1, summarized)
- Single-page PWA, vanilla JS, no build step, no dependencies. `index.html` holds markup, CSS and ~450 lines of app code.
- `lib.js` is a UMD script (browser global `RecallLib`, Node `require`) with `parseWhen`, tag/type guessing, person-fact extraction, `[[links]]`.
- Data is in IndexedDB db `recall` (version 2), stores `notes` and `people`. Settings flags are in `localStorage`.
- Notes carry `{id, body, type, tags, pinned, created, updated, reminder, ex, noAuto, typeLocked}`. People carry `{id, name, relation, birthday, favorites, notes, bn}`.
- `sw.js` is network-first with a cache fallback. Reminders only fire while the app is open.
- Voice uses `webkitSpeechRecognition` with `navigator.language`, and falls back to the keyboard mic.
- Tests: `tests/dates.test.js` (Node) and `tests/smoke.py` (Playwright + Chromium).

## Rules for v2
- Never lose data. All schema changes are additive and versioned. A snapshot of the v1 data is stored before the first migration runs.
- Still dependency-free at runtime. Fonts are self-hosted files, copied once from the `@fontsource-variable` npm packages.
- Pure logic lives in small UMD files (browser global + Node `require`), so it is unit-tested in Node. UI code lives in `app.js`.
- The pure logic modules never touch the DOM or IndexedDB.

## File structure
```
index.html            shell markup only (head, #app, script tags)
styles.css            Ember tokens, Layout A, light + dark
app.js                UI, IndexedDB, events, boot
lib.js                (kept) dates, tags, people facts, links, + note filtering
migrate.js            schema versions, migrateNote/Person, normalizeImport
entitlements.js       hasFeature(name), the single gating point
followups.js          scheduler, check-in thread engine, questions, priority trend
coach.js              personas, message templates, weekly review, gating
langs.js              dictation language list, defaults, "looks wrong" check
push.js               server push interface STUB (TODO phase 2)
fonts/                Inter + Space Grotesk (latin, variable woff2)
icons/                regenerated from the logo mark
tools/make_icons.py   renders icons from the SVG mark (Chromium)
tests/*.test.js       Node unit tests
tests/smoke.py        Playwright end-to-end
CHANGELOG.md, README.md
```

## Data schema changes (all additive)
IndexedDB version 2 -> 3. New store `meta` (settings, pre-migration snapshot). `notes` and `people` keep their keys.

Note, new fields (all optional, defaults applied by `migrateNote`):
- `schemaV: 3`
- `type`: `note | idea | learning | task | journal | person-note` (`note` stays as the generic default)
- `lang`: language code used when dictated or set, or `null`
- `mood` (1-5), `journalDate` (YYYY-MM-DD), `shareJournal` (opt in to follow-ups/coach; default false)
- `priority` (1-5 or null), `priorityHistory: [{at, v}]`
- `fu`: follow-up `{at, kind, state: open|done|dropped, snoozes, created}` or null
- `thread: [{id, at, from: recall|me, text, chips?}]`, `ci`: check-in state, `updates: [{at, q?, text}]`, `nextStep`
- `personIds: []` links to People
- `qDismissed`: the user dismissed the suggestion card

Person, new fields: `schemaV: 3`, nothing removed.

Settings (store `meta`, key `settings`): `lang` (auto), `theme`, `coachOn` (false), `persona` (steady), `showStreak` (false), `dailyPrompt` (true), `views` (saved views), `lastReview`.

Export format: `{app:"recall", version:3, notes, people, settings}`. Import accepts v1 and v2 backups (a bare array of notes too) and migrates them.

## Privacy rule for journals
Private journal entries (`type: journal`, `shareJournal` false) are excluded from: the Notes tab, follow-up proposals, priority, coach nudges and the weekly review, date-reminder detection, People extraction and "mentioned in". They are still in exports (it is the user's data).

## Build order
1. Migration + export/import (`migrate.js`, IDB v3, snapshot, tests). **Commit.**
2. Branding + Layout A shell (tokens, fonts, logo, icons, tab bar, floating voice button, dark mode, Settings skeleton). **Commit.**
3. Journaling. **Commit.**
4. Multi-language dictation. **Commit.**
5. Follow-ups: scheduler, proposals, elaboration questions, priority, Follow-ups tab, due banner, `.ics`. **Commit.**
6. Check-in threads (texting style). **Commit.**
7. Accountability Coach: personas, toggle, `hasFeature`, weekly review, nudges. **Commit.**
8. Notes as a living database: filters, saved views, People links, table view. **Commit.**
9. Polish: accessibility, contrast test, SW cache, README, CHANGELOG, final test run. **Commit, push, open PR (not merged).**

## Not building
- Promises score, promise levels, any reliability scoring of the user.
- Payments. (The coach is gated by `hasFeature('coach')`, which is `true` for everyone during the free test phase.)
- Server-side push (stubbed), live-AI coach messages (templates only), sync.

## Known limits (stated in the UI and README)
- PWA reminders only fire reliably while the app is open. `.ics` export covers Calendar alerts.
- Dictation language support varies on iOS Safari, and mixing two languages in one sentence is unreliable.
- Date detection understands English only.
- Not testable here: real iPhone behavior, Safari/WebKit dictation, Add to Home Screen, Calendar sheet. Chromium is the only engine run in this environment.

## Status

All build stages (1 to 9) are implemented on `v2` with tests. See README.md (what works and honest limits) and CHANGELOG.md. Open: real-iPhone verification, server web push, and the pull request review.
