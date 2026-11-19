# Changelog

## v2 (branch `v2`, not yet merged)

### Added
- Versioned data migration (IndexedDB v3), a safety snapshot before upgrading, and JSON export and import that accept v1 backups.
- Ember brand and a new layout: Notes, Journal, Follow-ups, People and Settings tabs with a floating voice button. Light and dark.
- Journal: private by default, mood, daily prompt, gratitude line, Timeline and Calendar, optional streak (off by default).
- Multi-language dictation (40+ languages), per-note language, "Re-record in…" suggestions, manual Translate with confirmation.
- Proactive follow-ups with a Follow-ups tab (Snooze, Reschedule, Done, Undo), due-now banner, badge counts, `.ics` for follow-ups.
- Elaboration questions and an idea priority with a rising/falling/steady trend.
- Texting-style check-in threads with a 3-question interview; replies saved as dated updates.
- Accountability Coach (off by default): four personas, weekly review, nudges, next-step question. Template based, no scoring.
- Filters and saved views, People shown on notes.
- Better date parsing: this/next weekend, next month, end of day, end of week, later today.
- Tests: migration (unit and real seeded v1 database), journal, languages, dates, follow-ups, coach (gating, personas, wording), filters, contrast, service-worker shell, and a browser smoke test including offline.

### Changed
- Small text on Paper uses a darker amber (`--accent-text`) because Deep Amber on Paper measures 4.33:1, under the 4.5:1 AA requirement.
- "Overdue" reads "Earlier" while the coach is off.
- Touch targets raised to 44px.

### Known limits
- Reminders fire only while the app is open. Server web push is a stub.
- Verified in Chromium only; not tested on a real iPhone or in WebKit.
