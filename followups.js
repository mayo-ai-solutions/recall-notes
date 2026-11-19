/* Recall follow-ups: scheduler, agenda, elaboration questions, priority history, and the check-in conversation engine.
   Pure logic (no DOM, no storage). Browser global `RecallFollowUps`, or Node `require`.

   A follow-up lives on the note as `fu = {at, kind, state: open|done|dropped, snoozes, created}`.
   Private journal entries are never eligible (see `eligible`). */
(function (root) {
"use strict";
const DAY = 864e5;

/* ---------------------------------------------------------------- privacy gate */
const isPrivateJournal = n => !!n && n.type === "journal" && !n.shareJournal;
/* Can this note take part in follow-ups, priority, coach and the weekly review at all? */
const eligible = n => !!n && !isPrivateJournal(n) && typeof n.body === "string" && n.body.trim().length > 0;

/* ---------------------------------------------------------------- time helpers */
const at9 = (base, days) => { const d = new Date(base); d.setDate(d.getDate() + days); d.setHours(9, 0, 0, 0); return +d; };
function quickPicks(now = Date.now()) {
  return [{ id: "tomorrow", label: "Tomorrow", at: at9(now, 1) }, { id: "3d", label: "In 3 days", at: at9(now, 3) }, { id: "1w", label: "In 1 week", at: at9(now, 7) }];
}
function snoozeOptions(now = Date.now()) {
  const later = new Date(now + 3 * 36e5); later.setMinutes(0, 0, 0);
  return [{ id: "later", label: "Later today", at: +later }, { id: "tomorrow", label: "Tomorrow", at: at9(now, 1) }, { id: "3d", label: "In 3 days", at: at9(now, 3) }, { id: "1w", label: "Next week", at: at9(now, 7) }];
}
const startOfTomorrow = now => { const d = new Date(now); d.setHours(24, 0, 0, 0); return +d; };

/* ---------------------------------------------------------------- scheduler */
/* Should Recall offer to check back on this note? Not for private journals, empty or tiny notes,
   notes that already have an open follow-up, or ones the user already waved away. */
function shouldPropose(n) {
  if (!eligible(n) || n.qDismissed) return false;
  if (n.fu && n.fu.state === "open") return false;
  return n.body.trim().length >= 12;
}
function schedule(n, at, kind = "followup", now = Date.now()) {
  if (!eligible(n)) return null;
  n.fu = { at, kind, state: "open", snoozes: 0, created: now };
  n.qDismissed = true;               // the proposal has been answered
  return n.fu;
}
function complete(n, now = Date.now()) { if (n && n.fu) { n.fu.state = "done"; n.fu.doneAt = now; } return n; }
function drop(n) { if (n && n.fu) n.fu.state = "dropped"; return n; }
/* Snoozing counts (the coach can gently ask after repeated snoozes). Rescheduling on purpose does not. */
function snooze(n, until) { if (n && n.fu) { n.fu.at = until; n.fu.snoozes = (n.fu.snoozes || 0) + 1; n.fu.state = "open"; n.fu.notified = false; } return n; }
function reschedule(n, at) { if (n && n.fu) { n.fu.at = at; n.fu.state = "open"; n.fu.notified = false; } return n; }
const needsReask = n => !!(n && n.fu && n.fu.state === "open" && (n.fu.snoozes || 0) >= 2);

/* ---------------------------------------------------------------- agenda (reminders + follow-ups, one list) */
/* entries: {n, kind: "reminder" | "followup" | "checkin", at} sorted by time. Private journals never appear. */
function agenda(notes) {
  const out = [];
  for (const n of notes) {
    if (!eligible(n)) continue;
    if (n.reminder && !n.reminder.done) out.push({ n, kind: "reminder", at: n.reminder.at });
    if (n.fu && n.fu.state === "open") out.push({ n, kind: n.fu.kind === "checkin" ? "checkin" : "followup", at: n.fu.at });
  }
  return out.sort((a, b) => a.at - b.at);
}
function bucket(entries, now = Date.now()) {
  const end = startOfTomorrow(now);
  return { overdue: entries.filter(e => e.at < now), today: entries.filter(e => e.at >= now && e.at < end), upcoming: entries.filter(e => e.at >= end) };
}
const dueCount = (notes, now = Date.now()) => agenda(notes).filter(e => e.at <= now).length;

/* ---------------------------------------------------------------- priority */
function recordPriority(n, v, now = Date.now()) {
  v = Math.max(1, Math.min(5, Math.round(+v)));
  if (!isFinite(v)) return null;
  n.priority = v; n.priorityHistory = (n.priorityHistory || []).concat({ at: now, v });
  return v;
}
/* "new" with fewer than two readings, else rising / steady / falling by the last two. */
function priorityTrend(history) {
  const h = history || [];
  if (h.length < 2) return "new";
  const a = h[h.length - 2].v, b = h[h.length - 1].v;
  return b > a ? "rising" : b < a ? "falling" : "steady";
}

/* ---------------------------------------------------------------- elaboration questions */
/* ONE interface: generateQuestions(note). Rule-based templates today. A language-model provider can be plugged in
   later with setProvider(fn): fn(note) may return an array or a Promise of one; callers use Promise.resolve(). */
const TEMPLATES = {
  idea: ["Who is this for, and what problem does it solve for them?", "What is the smallest version you could try this week?", "What would make you drop this idea?", "What do you need to find out before you start?", "Who could you talk to about this?"],
  task: ["What does “done” look like?", "What is blocking you, if anything?", "Who else needs to know about this?", "What is the very first step, and when could you do it?"],
  learning: ["How could you use this in the next week?", "How would you explain this to someone else?", "What is still unclear?", "What does this connect to that you already know?"],
  "person-note": ["Is there something to follow up on with them?", "What would be good to remember next time you see them?", "Is there anything they would appreciate hearing from you?"],
  note: ["What is the one thing to do about this?", "Does this connect to something you are working on?", "What would you want to remember about this in a month?", "Who, if anyone, should hear about this?"]
};
let provider = null;
const setProvider = fn => { provider = typeof fn === "function" ? fn : null; };
const hash = s => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
function ruleQuestions(n, count) {
  const list = TEMPLATES[n.type] || TEMPLATES.note;
  const answered = new Set((n.updates || []).map(u => u.q).filter(Boolean));
  const start = hash(n.id || n.body) % list.length, out = [];
  for (let i = 0; i < list.length && out.length < count; i++) { const q = list[(start + i) % list.length]; if (!answered.has(q)) out.push(q); }
  return out;
}
/* Returns an array (rule-based) or whatever the provider returns. Empty for notes that must stay private. */
function generateQuestions(n, count = 3) {
  if (!eligible(n)) return [];
  if (provider) return provider(n, count);
  return ruleQuestions(n, Math.max(2, Math.min(3, count)));
}

/* ---------------------------------------------------------------- check-in conversation engine */
const short = (s, n = 48) => { s = String(s || "").replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n - 1) + "…" : s; };
const titleOf = n => { const l = String(n.body || "").split("\n").map(s => s.replace(/^#+\s*/, "").trim()).find(Boolean); return l || "this note"; };
let msgSeq = 0;
const msg = (from, text, chips, now) => ({ id: "m" + (now || Date.now()).toString(36) + (msgSeq++).toString(36), at: now || Date.now(), from, text, chips: chips || null });
const push = (n, m) => { n.thread = n.thread || []; n.thread.push(m); return m; };
const offerChips = now => quickPicks(now).map(p => ({ id: "pick:" + p.id, label: p.label })).concat({ id: "none", label: "No more check-ins" });
const ASK_CHIPS = [{ id: "done", label: "Done" }, { id: "still", label: "Still on it" }, { id: "snooze", label: "Snooze" }, { id: "drop", label: "Drop it" }];
const INTERVIEW = [
  n => ({ id: "importance", text: "Quick check-in on “" + short(titleOf(n)) + "”. How important is this now? (1 = barely, 5 = top priority)", chips: [1, 2, 3, 4, 5].map(i => ({ id: "p:" + i, label: String(i) })) }),
  () => ({ id: "changed", text: "What has changed since you wrote this?" }),
  () => ({ id: "next", text: "What is the next step?" })
];
function addUpdate(n, text, now = Date.now(), q) {
  const t = String(text || "").trim(); if (!t) return null;
  n.updates = n.updates || []; const u = { at: now, text: t }; if (q) u.q = q; n.updates.push(u); return u;
}

/* Begin a conversation. kind: "followup" | "interview" | "question" (opts.question). Returns the first Recall message. */
function startCheckIn(n, kind, now = Date.now(), opts = {}) {
  if (!eligible(n)) return null;
  if (kind === "interview") { n.ci = { kind, stage: "ask", step: 0 }; const q = INTERVIEW[0](n); return push(n, msg("recall", q.text, q.chips, now)); }
  if (kind === "question") { n.ci = { kind, stage: "ask", q: opts.question }; return push(n, msg("recall", opts.question, null, now)); }
  n.ci = { kind: "followup", stage: "ask" };
  return push(n, msg("recall", "Checking back on “" + short(titleOf(n)) + "”. How is it going?", ASK_CHIPS, now));
}

/* The user answers (chip id or free text). Returns the new Recall messages (already appended to the note's thread).
   opts.fmt(ms) formats a time for confirmations. */
function reply(n, input, now = Date.now(), opts = {}) {
  const fmt = opts.fmt || (ms => new Date(ms).toLocaleString());
  const ci = n.ci; if (!ci || ci.stage === "closed") return [];
  const chip = input && input.chip, text = String((input && input.text) || "").trim();
  const label = chip ? (((n.thread || []).slice().reverse().find(m => m.from === "recall" && m.chips) || {}).chips || []).find(c => c.id === chip) : null;
  push(n, msg("me", text || (label ? label.label : ""), null, now));
  const say = (t, chips) => push(n, msg("recall", t, chips, now));
  const close = t => { ci.stage = "closed"; return say(t); };
  const offer = t => { ci.stage = "offer"; return say(t, offerChips(now)); };
  const out = [];

  if (ci.stage === "offer") {
    if (chip && chip.startsWith("pick:")) {
      const p = quickPicks(now).find(x => "pick:" + x.id === chip) || quickPicks(now)[0];
      schedule(n, p.at, "followup", now); out.push(close("Okay, I will check back " + fmt(p.at) + "."));
    } else if (chip === "none") { complete(n, now); out.push(close("Okay. No more check-ins on this one. It stays in your notes.")); }
    else if (text) { addUpdate(n, text, now); out.push(offer("Saved to your note. When should I check back?")); }
    else out.push(offer("When should I check back?"));
    return out;
  }
  if (ci.kind === "followup") {
    if (chip === "done") { complete(n, now); out.push(close("Marked done. Nice work.")); }
    else if (chip === "still") out.push(offer("Got it. When should I check back?"));
    else if (chip === "snooze") { const t = snoozeOptions(now)[1].at; snooze(n, t); out.push(close("Okay, I will ask again " + fmt(t) + ".")); }
    else if (chip === "drop") { drop(n); out.push(close("Dropped. The note stays in your notes.")); }
    else if (text) { addUpdate(n, text, now); out.push(offer("Saved to your note. When should I check back?")); }
    else out.push(say("Tap an option, or just tell me how it is going.", ASK_CHIPS));
    return out;
  }
  if (ci.kind === "question") {
    if (text) { addUpdate(n, text, now, ci.q); out.push(offer("Saved to your note.")); }
    else out.push(say(ci.q));
    return out;
  }
  // interview
  const step = ci.step;
  if (step === 0) {
    const m = chip && chip.match(/^p:(\d)$/) || text.match(/^\s*([1-5])\b/);
    if (!m) { out.push(say("Pick a number from 1 to 5.", INTERVIEW[0](n).chips)); return out; }
    const before = n.priority; recordPriority(n, +m[1], now);
    ci.step = 1; out.push(say((before ? "Was " + before + ", now " + m[1] + ". " : "Noted: " + m[1] + ". ") + INTERVIEW[1]().text));
  } else if (step === 1) {
    if (!text) { out.push(say(INTERVIEW[1]().text)); return out; }
    addUpdate(n, text, now, "What has changed?"); ci.step = 2; out.push(say(INTERVIEW[2]().text));
  } else {
    if (!text) { out.push(say(INTERVIEW[2]().text)); return out; }
    n.nextStep = text; addUpdate(n, text, now, "Next step"); out.push(offer("Got it, saved as your next step. Want me to check back?"));
  }
  return out;
}

const F = { DAY, eligible, isPrivateJournal, quickPicks, snoozeOptions, startOfTomorrow, shouldPropose, schedule, complete, drop, snooze, reschedule, needsReask,
  agenda, bucket, dueCount, recordPriority, priorityTrend, TEMPLATES, setProvider, generateQuestions, startCheckIn, reply, addUpdate, INTERVIEW };
if (typeof module !== "undefined" && module.exports) module.exports = F; else root.RecallFollowUps = F;
})(typeof self !== "undefined" ? self : this);
