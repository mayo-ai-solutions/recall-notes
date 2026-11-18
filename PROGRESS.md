# Progress

- [x] Step 0: git init, CLAUDE.md, tooling (node via brew, Pillow, Playwright chromium + webkit)
- [x] Phase 1: PWA (manifest, sw.js, icons), iPhone dictation fallback, People fixes, honest reminders + calendar, tests
  - `node tests/dates.test.js`: 80 passed
  - `python3 tests/smoke.py`: 112 passed (chromium + webkit × 390x844 + 1280x800 × light + dark)
  - Bugs fixed: debounced save could resurrect a deleted note/person; "5 amazing ideas" read as 5am; "1/2 cup" read as Jan 2;
    "Remember Maya's..." created "Remember Maya"; same first name created duplicates; dark-mode toast unreadable;
    toast covered Capture on phones; birthday month dropdown misaligned; iOS-only paths for calendar/export/notifications.
- [ ] Phase 2: deploy
- [ ] Phase 3
