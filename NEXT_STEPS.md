# Next steps (not built yet, on purpose)

Recall is local-first today: notes and people live only in your phone's browser storage. These three features would each need an outside service. Here is how each would work and what it would need from you.

## 1. Sync between devices (phone, laptop)

**How:** Add a hosted database, **Supabase** (Postgres) or **Firebase** (Firestore). You'd sign in once. Every note and person gets saved to your local storage first (so it still works offline), then copied up to the cloud. Other devices pull the changes down. When the same note is edited in two places, the newest edit wins (each note already has an `updated` timestamp).

**What it needs from you:**
- A free Supabase or Firebase account and a new project.
- The project's public URL and *public* (anon) key. These are designed to be in client code, and access rules ("row-level security") make sure each person only sees their own rows.
- A decision on how you sign in: email magic link (simplest) or Sign in with Apple.

**Cost:** Free tier is plenty for one person.

## 2. Notifications when the app is closed

**How:** iPhones support **Web Push** for Home Screen apps (iOS 16.4+). The app asks permission, the phone gives back a "push subscription", and the app sends it to a small server. The server stores your reminders and, at the right minute, sends a push. Apple delivers it even when Recall is closed.

**What it needs from you:**
- A server that runs on a schedule, such as a Supabase Edge Function with a cron job, a Cloudflare Worker with a Cron Trigger, or a Firebase Cloud Function.
- A VAPID key pair (generated once by a command). The private key stays on the server only.
- Reminders must be synced to that server (so this builds on step 1).

**Until then:** "Add to Calendar" is the reliable way to get an alert.

## 3. "Ask my notes" with Claude

**How:** A box where you type "What does Maya like?" or "What did I learn about memory this month?" The app sends your question plus the relevant notes to a **small server you control**, and that server calls the **Claude API** and returns the answer. The API key lives only on that server. It never goes in the app's code, because anyone could read it there.

**What it needs from you:**
- An Anthropic API account and key (console.anthropic.com), with a spending limit set.
- A place to run the server, such as a Supabase Edge Function, a Cloudflare Worker, or Vercel. The key is stored as a secret environment variable.
- Sign-in (from step 1) in front of that server, so strangers can't spend your credits.
- Your OK that the notes relevant to a question get sent to Anthropic when you ask one.

## Suggested order
1 → 2 → 3. Sync gives you accounts and a server, which both push and "ask my notes" need.
