/* Recall shared logic: date parsing, tags, note typing, person-fact extraction.
   Plain script (browser global `RecallLib`) and CommonJS module (Node tests). No dependencies. */
(function (root) {
"use strict";
const MON = ["january","february","march","april","may","june","july","august","september","october","november","december"];
const DAYN = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
const NUMW = {a:1,an:1,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10};
const MONTH_RE = "(january|february|march|april|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sept|sep|oct|nov|dec|may)";
const monthIndex = s => MON.findIndex(x => x.startsWith(s.toLowerCase().slice(0, 3)));

/* Returns {at: Date, hasTime: bool} or null. `now` is injectable for tests. */
function parseWhen(text, now = new Date()) {
  // "today I learned" / "TIL" is a statement, not a plan.
  const t = String(text).toLowerCase().replace(/\b(today i learned|learned today|til)\b/g, " ");
  let d = new Date(now); d.setSeconds(0, 0);
  let dateFound = false, timeFound = false, m;
  if ((m = t.match(/\bin\s+(\d+|a|an|one|two|three|four|five|six|seven|eight|nine|ten)\s+(minute|min|hour|hr|day|week|month)s?\b/))) {
    const n = NUMW[m[1]] || +m[1], u = m[2];
    if (u.startsWith("min")) return { at: new Date(now.getTime() + n * 6e4), hasTime: true };
    if (u.startsWith("h")) return { at: new Date(now.getTime() + n * 36e5), hasTime: true };
    if (u === "day") d.setDate(d.getDate() + n); else if (u === "week") d.setDate(d.getDate() + 7 * n); else d.setMonth(d.getMonth() + n);
    dateFound = true;
  } else if (/\bday after tomorrow\b/.test(t)) { d.setDate(d.getDate() + 2); dateFound = true; }
  else if (/\btomorrow\b/.test(t)) { d.setDate(d.getDate() + 1); dateFound = true; }
  else if (/\b(today|tonight)\b/.test(t)) { dateFound = true; }
  else if (/\bnext week\b/.test(t)) { d.setDate(d.getDate() + 7); dateFound = true; }
  else if ((m = t.match(/\b(?:next |this |on )?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/))) {
    let diff = (DAYN.indexOf(m[1]) - now.getDay() + 7) % 7; if (diff === 0) diff = 7;
    d.setDate(d.getDate() + diff); dateFound = true;
  } else if ((m = t.match(new RegExp("\\b" + MONTH_RE + "\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b(?!\\s*%)(?:,?\\s+(20\\d{2}))?")))) {
    const mi = monthIndex(m[1]), day = +m[2];
    if (day >= 1 && day <= 31) {
      d = new Date(m[3] ? +m[3] : now.getFullYear(), mi, day, 9, 0);
      if (!m[3] && d < new Date(now.getFullYear(), now.getMonth(), now.getDate())) d.setFullYear(d.getFullYear() + 1);
      dateFound = true;
    }
  } else if ((m = t.match(/\b(?:on|by|due|until|till|before)\s+(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/) || t.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/))) {
    // Bare "1/2" is usually a fraction, so a slash date needs a year or a lead-in word.
    const mo = +m[1] - 1, day = +m[2];
    if (mo >= 0 && mo < 12 && day >= 1 && day <= 31) {
      const y = m[3] ? (+m[3] < 100 ? 2000 + +m[3] : +m[3]) : now.getFullYear();
      d = new Date(y, mo, day, 9, 0);
      if (!m[3] && d < new Date(now.getFullYear(), now.getMonth(), now.getDate())) d.setFullYear(y + 1);
      dateFound = true;
    }
  }
  let hh = null, mm = 0;
  if ((m = t.match(/(?:\bat\s+|@\s*|\b)(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)(?![a-z])/)) && +m[1] >= 1 && +m[1] <= 12) {
    hh = +m[1] % 12; if (/^p/.test(m[3])) hh += 12; mm = +(m[2] || 0); timeFound = mm < 60;
  }
  else if ((m = t.match(/\bat\s+(\d{1,2}):(\d{2})\b/))) { hh = +m[1]; mm = +m[2]; timeFound = hh < 24 && mm < 60; }
  else if (/\bnoon\b/.test(t)) { hh = 12; timeFound = true; }
  else if (/\bmidnight\b/.test(t)) { hh = 23; mm = 59; timeFound = true; }
  else if (/\btonight\b/.test(t)) { hh = 20; timeFound = true; }
  else if (/\b(this )?morning\b/.test(t) && dateFound) { hh = 9; timeFound = true; }
  else if (/\bafternoon\b/.test(t) && dateFound) { hh = 14; timeFound = true; }
  else if (/\bevening\b/.test(t) && dateFound) { hh = 18; timeFound = true; }
  if (!dateFound && !timeFound) return null;
  if (timeFound) { d.setHours(hh, mm, 0, 0); if (!dateFound && d <= now) d.setDate(d.getDate() + 1); }
  else {
    d.setHours(9, 0, 0, 0);
    if (/\btoday\b/.test(t) && d <= now) { d = new Date(now.getTime() + 36e5); d.setMinutes(0, 0, 0); }
  }
  return { at: d, hasTime: timeFound };
}

/* Birthday statements describe a person, not a to-do: remove them before reminder detection. */
const BDAY_STRIP = /\bbirthday\s+(?:is\s+|on\s+|falls on\s+)?(?:[A-Za-z]+\.?\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s*(?:19|20)\d{2})?|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/gi;
const stripBirthdays = s => String(s).replace(BDAY_STRIP, "");

/* "March 4", "Mar 4th, 1992", "3/4", "3/4/92" -> {m, d, y?} or null */
function parseMonthDay(s) {
  let m, mo, d, y;
  if ((m = String(s).match(new RegExp("^" + MONTH_RE + "\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s*((?:19|20)\\d{2}))?", "i")))) { mo = monthIndex(m[1]) + 1; d = +m[2]; y = m[3] ? +m[3] : undefined; }
  else if ((m = String(s).match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/))) { mo = +m[1]; d = +m[2]; y = m[3] ? (+m[3] < 100 ? (+m[3] > 30 ? 1900 : 2000) + +m[3] : +m[3]) : undefined; }
  else return null;
  const max = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mo - 1];
  if (!max || d < 1 || d > max) return null;
  return y ? { m: mo, d, y } : { m: mo, d };
}

/* Words that can sit before a name at the start of a sentence ("Remember Maya's ...") or that aren't people. */
const STOP = new Set(("i it its my our your his her their the a an and but or so also remember remind reminder note notes " +
  "today tomorrow tonight yesterday everyone everybody someone somebody nobody anyone this that what when where who why how " +
  "hey oh ok okay yes no then plus btw ps call text email ask tell buy get send wish happy dear mr mrs ms dr " +
  "january february march april may june july august september october november december " +
  "monday tuesday wednesday thursday friday saturday sunday").split(" "));
function cleanName(raw) {
  const w = raw.split(" ");
  while (w.length && STOP.has(w[0].toLowerCase())) w.shift();
  return w.length ? w.join(" ") : null;
}
const NAME = "([A-Z][a-z]{1,20}(?: [A-Z][a-z]{1,20})?)";
/* Pure: find person facts in a note body. Keys match the ones older versions stored in note.ex, so nothing re-applies. */
function extractFacts(body) {
  const out = []; let m;
  let re = new RegExp(NAME + "(?:'s|’s)\\s+birthday\\s+(?:is\\s+|on\\s+|falls on\\s+)?([A-Za-z]+\\.?\\s+\\d{1,2}(?:st|nd|rd|th)?(?:,?\\s*(?:19|20)\\d{2})?|\\d{1,2}\\/\\d{1,2}(?:\\/\\d{2,4})?)", "g");
  while ((m = re.exec(body))) {
    const name = cleanName(m[1]), b = parseMonthDay(m[2]);
    if (name && b) out.push({ kind: "birthday", name, key: "b:" + m[1] + m[2], birthday: b });
  }
  re = new RegExp(NAME + "(?:'s|’s)\\s+(favou?rite [a-z ]{2,24}?|allerg(?:y|ies)|hobbies|sizes?|phone(?: number)?)\\s+(?:is|are|=)\\s+([^.\\n#]{1,60})", "g");
  while ((m = re.exec(body))) {
    const name = cleanName(m[1]), v = m[3].trim().replace(/[,;]$/, "");
    if (!name || v.length < 2) continue;
    let k = m[2].trim().replace(/favourite/, "favorite"); k = k[0].toUpperCase() + k.slice(1);
    out.push({ kind: "fav", name, key: "f:" + m[1] + m[2] + v, k, v });
  }
  return out;
}

const tagsOf = b => [...new Set((String(b).match(/(^|\s)#([\w-]{1,32})/g) || []).map(s => s.trim().slice(1).toLowerCase()))];
function guessType(b) {
  const t = String(b).toLowerCase();
  if (/\b(learned|learning|til\b|lesson|study|studied|how to|takeaway|insight|read that|book(?!\s+(?:a|an|the)\b)|course)\b/.test(t)) return "learning";
  if (/\b(idea|what if|we could|i could|build a|startup|concept|brainstorm)\b/.test(t)) return "idea";
  if (/\b(call|buy|send|pay|email|schedule|remind|book a|pick up|submit|finish|follow up|due)\b/.test(t)) return "task";
  return "note";
}

/* [[Note title]] links */
const linksOf = b => [...new Set((String(b).match(/\[\[([^\[\]\n]{1,120})\]\]/g) || []).map(s => s.slice(2, -2).trim()).filter(Boolean))];

/* Monday 00:00 of the week containing ms (local time) */
function weekStart(ms) { const d = new Date(ms); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d; }

/* ---------- journal helpers ---------- */
const JOURNAL_PROMPTS = [
  "What went well today? What drained you?",
  "What are you grateful for today?",
  "What is one thing you want to remember about today?",
  "What did you learn today?",
  "What is on your mind right now?",
  "What would make tomorrow a good day?",
  "Who made a difference to you today, and how?",
  "What is something small you are proud of?",
  "What did you avoid today, and why?",
  "What do you need more of this week? Less of?",
  "What surprised you today?",
  "What are you looking forward to?"
];
/* The same prompt all day, a different one each day. */
function promptFor(dateKey) {
  let h = 0; for (const c of String(dateKey)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return JOURNAL_PROMPTS[h % JOURNAL_PROMPTS.length];
}
const keyOf = d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
const fromKey = k => { const [y, m, d] = String(k).split("-").map(Number); return new Date(y, m - 1, d); };
const shiftKey = (k, days) => { const d = fromKey(k); d.setDate(d.getDate() + days); return keyOf(d); };
/* Days in a row with an entry, ending today. If today has none yet, a streak that ran through yesterday still counts. */
function journalStreak(keys, todayKey) {
  const have = new Set(keys); let k = have.has(todayKey) ? todayKey : shiftKey(todayKey, -1), n = 0;
  while (have.has(k)) { n++; k = shiftKey(k, -1); }
  return n;
}
/* Weeks (Sunday first) for a month; days outside the month are null. month is 0-11. */
function monthGrid(year, month) {
  const first = new Date(year, month, 1), days = new Date(year, month + 1, 0).getDate();
  const cells = Array(first.getDay()).fill(null);
  for (let d = 1; d <= days; d++) cells.push(d);
  while (cells.length % 7) cells.push(null);
  const weeks = []; for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

const L = { JOURNAL_PROMPTS, promptFor, journalStreak, monthGrid, keyOf, fromKey, shiftKey, MON, DAYN, parseWhen, stripBirthdays, parseMonthDay, extractFacts, cleanName, tagsOf, guessType, linksOf, weekStart };
if (typeof module !== "undefined" && module.exports) module.exports = L; else root.RecallLib = L;
})(typeof self !== "undefined" ? self : this);
