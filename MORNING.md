**Your app: https://mayo-ai-solutions.github.io/recall-notes/**

## Put it on your iPhone (30 seconds)
1. Open the link above in **Safari** (not Chrome).
2. Tap the **Share** button (square with an arrow).
3. Tap **Add to Home Screen**, then **Add**. Open Recall from the yellow note icon.

## 2-minute test
1. If asked, **allow the microphone**.
2. Tap **Capture** and say: *"Remind me to call the caterer tomorrow at 10am. Maya's birthday is March 4. Maya's favorite food is pad thai."*
   If built-in dictation doesn't start, Recall says **"Tap the microphone on your keyboard."** Tap the 🎤 on the keyboard and talk.
3. Check that the note shows **Tomorrow, 10:00 AM** with a blue **Add to Calendar** button.
4. Tap **Notes** (back), then **Reminders**: the caterer reminder is listed.
5. Tap **People**: **Maya** is there with birthday March 4 and *Favorite food: pad thai*.

## Honest status
**Works:** offline use, notes, auto types and #tags, reminders from plain sentences, People auto-filled from sentences like "Maya's birthday is…", birthday countdowns, `[[links]]` between notes, the weekly "What I learned" list, the Database view, export and import, undo on delete, light and dark mode.

**Limits:**
- **Built-in dictation inside the Home Screen app may be blocked by iOS.** The keyboard's 🎤 always works, and Recall switches to it automatically.
- **Alerts only fire while Recall is open.** No push notifications yet. For a guaranteed alert, tap **Add to Calendar** on the reminder.
- Add to Calendar and Export are tested in desktop browsers, **not yet on a real iPhone**.
- Your notes live only on this phone. There's no sync yet.

**Tests passed:** 80 of 80 date and name parsing tests, and 128 of 128 app checks (Chrome and Safari engines, phone and desktop sizes, light and dark). Plus a live-site check of the exact test above.

## Back up your data
Open **Database** (in the top chip row), then tap **Export JSON** and choose **Save to Files**. To restore, use **Database**, then **Import**.

## Most valuable next step
**Notifications when the app is closed** (Web Push). It needs a small server and sync first. See `NEXT_STEPS.md`.
