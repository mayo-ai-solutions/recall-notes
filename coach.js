/* Recall Accountability Coach (pure, template based). OFF by default and gated by hasFeature("coach").
   This is NOT live AI and sends nothing anywhere: it picks a wording from a fixed set for the chosen persona.
   There is deliberately no promises score, no reliability score, no percentages and no streak shaming.
   Private journal entries never reach it (FollowUps.eligible). */
(function (root) {
"use strict";
const FU = typeof require !== "undefined" ? require("./followups.js") : root.RecallFollowUps;
const ENT = typeof require !== "undefined" ? require("./entitlements.js") : { hasFeature: root.hasFeature };

const PERSONAS = [
  { id: "steady", name: "Steady", blurb: "Calm and practical. Keeps you moving without pressure." },
  { id: "straight", name: "Straight Shooter", blurb: "Short and direct. Says what is next and stops." },
  { id: "strategist", name: "Strategist", blurb: "Asks what matters most and what the smallest next move is." },
  { id: "cheerleader", name: "Cheerleader", blurb: "Warm and upbeat. Celebrates small steps." }
];
const T = {
  steady: {
    open: ["Checking back on “{t}”. How is it going?", "Quick check on “{t}”. Where does it stand?"],
    commit: ["Good. What is the next step on “{t}”, and when could you do it?"],
    nudge: ["“{t}” has been waiting a bit. Want to do it, move it, or let it go?", "“{t}” is still open. A small step today would do."],
    reask: ["You have moved “{t}” a few times. Still want it? You can keep it, make it smaller, or drop it."],
    due: ["Time to check on “{t}”.", "“{t}” is due for a check-in."],
    review: ["Here is your week.", "A quick look at the week."]
  },
  straight: {
    open: ["“{t}”. Status?", "Update on “{t}”?"],
    commit: ["Next step on “{t}”. What is it and when?"],
    nudge: ["“{t}” is waiting. Do it, move it, or drop it.", "“{t}” is open. Pick one: do, move, drop."],
    reask: ["“{t}” has been moved a few times. Keep it, shrink it, or drop it. Your call."],
    due: ["“{t}”. Check-in now.", "Check in on “{t}”."],
    review: ["This week, plainly.", "Week in numbers."]
  },
  strategist: {
    open: ["On “{t}”: is it still the right thing to be working on?", "Checking in on “{t}”. What has changed since you wrote it?"],
    commit: ["What is the smallest next move on “{t}”, and when will you make it?"],
    nudge: ["“{t}” is open. Is it still a priority, or should it move down the list?", "“{t}” is waiting. What would make it easier to start?"],
    reask: ["“{t}” keeps moving. Is it the wrong size or the wrong time? You could shrink it, keep it, or drop it."],
    due: ["Time to think through “{t}”.", "“{t}”: a good moment to decide the next move."],
    review: ["Here is the week, and what to focus on next.", "A planning look at the week."]
  },
  cheerleader: {
    open: ["Hey! Checking in on “{t}”. How is it going?", "Let’s see how “{t}” is doing!"],
    commit: ["Love it. What is the next step on “{t}”, and when could you take it?"],
    nudge: ["“{t}” is still on your list. One small step would be great.", "“{t}” is waiting for you. Even a tiny step counts!"],
    reask: ["“{t}” has been moved a few times, and that is okay. Want to keep it, make it smaller, or let it go?"],
    due: ["Time to check in on “{t}”!", "“{t}” is ready for a check-in."],
    review: ["Here is your week. Nice work showing up.", "A friendly look at the week."]
  }
};
const hash = s => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
const personaOf = id => PERSONAS.find(p => p.id === id) || PERSONAS[0];
const clip = (s, n = 60) => { s = String(s || "").replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n - 1) + "…" : s; };
const titleOf = n => clip((String(n.body || "").split("\n").map(s => s.replace(/^#+\s*/, "").trim()).find(Boolean)) || "this note");

/* The one switch. Both the plan (entitlement) and the user's setting must be on. */
const active = (settings, ents) => !!(ENT.hasFeature("coach", ents) && settings && settings.coachOn === true);

function message(kind, personaId, vars, seed) {
  const list = (T[personaOf(personaId).id] || T.steady)[kind] || T.steady[kind];
  const s = list[hash(seed == null ? (vars && vars.t) || kind : seed) % list.length];
  return s.replace(/\{(\w+)\}/g, (_, k) => (vars && vars[k] != null ? vars[k] : ""));
}
const opts = (n, personaId) => ({ opening: message("open", personaId, { t: titleOf(n) }, n.id), commit: message("commit", personaId, { t: titleOf(n) }, n.id) });

/* Oldest open items that are past due. Private journals are excluded by agenda(). */
function nudges(notes, now = Date.now(), personaId = "steady", max = 3) {
  return FU.agenda(notes).filter(e => e.at < now).slice(0, max).map(e => ({ id: e.n.id, kind: e.kind, at: e.at, text: message("nudge", personaId, { t: titleOf(e.n) }, e.n.id) }));
}
const reasks = (notes, personaId = "steady") => notes.filter(n => FU.eligible(n) && FU.needsReask(n)).map(n => ({ id: n.id, text: message("reask", personaId, { t: titleOf(n) }, n.id) }));

/* Plain counts for the last 7 days. No ratios, no scores, no grading. */
function weeklyReview(notes, now = Date.now(), personaId = "steady") {
  const wk = now - 7 * 864e5, el = notes.filter(FU.eligible);
  const added = el.filter(n => n.created >= wk).length;
  const done = el.filter(n => n.fu && n.fu.state === "done" && n.fu.doneAt >= wk).length;
  const ag = FU.agenda(notes), earlier = ag.filter(e => e.at < now).length;
  const focus = ag.slice(0, 3).map(e => ({ id: e.n.id, title: titleOf(e.n), at: e.at }));
  const rising = el.filter(n => n.type === "idea" && FU.priorityTrend(n.priorityHistory) === "rising").slice(0, 2).map(n => ({ id: n.id, title: titleOf(n) }));
  const parts = [added + (added === 1 ? " new note" : " new notes"), done + " checked off", ag.length + " coming up"];
  if (earlier) parts.push(earlier + " waiting from earlier");
  return { intro: message("review", personaId, {}, Math.floor(now / (7 * 864e5))), summary: parts.join(" · "), added, done, open: ag.length, earlier, focus, rising };
}
const reviewDue = (settings, now = Date.now()) => now - ((settings && settings.lastReview) || 0) >= 7 * 864e5;

const API = { PERSONAS, personaOf, active, message, opts, nudges, reasks, weeklyReview, reviewDue, titleOf, _T: T };
if (typeof module !== "undefined" && module.exports) module.exports = API; else root.RecallCoach = API;
})(typeof self !== "undefined" ? self : this);
