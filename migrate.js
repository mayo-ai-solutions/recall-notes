/* Recall data migrations. Pure functions: no DOM, no IndexedDB. Plain script (browser global `RecallMigrate`)
   and CommonJS module (Node tests).

   Rules: migrations only ADD fields or fix invalid ones. They never delete a field, never drop a note, and
   are idempotent (running them twice gives the same result). Unknown fields are preserved. */
(function (root) {
"use strict";
const SCHEMA = 3;
const NOTE_TYPES = ["note", "idea", "learning", "task", "journal", "person-note"];
const PERSONAS = ["steady", "straight", "strategist", "cheerleader"];
const THEMES = ["system", "light", "dark"];

const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const num = (v, d) => (typeof v === "number" && isFinite(v) ? v : d);
const arr = v => (Array.isArray(v) ? v : []);
/* Local calendar day as YYYY-MM-DD. */
function dateKey(ms) {
  const d = new Date(ms);
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

function migrateNote(n) {
  const o = Object.assign({}, n);
  o.id = o.id || genId();
  o.body = typeof o.body === "string" ? o.body : o.body == null ? "" : String(o.body);
  o.type = NOTE_TYPES.includes(o.type) ? o.type : "note";
  o.tags = Array.isArray(o.tags) ? o.tags : [];
  o.pinned = !!o.pinned;
  o.created = num(o.created, Date.now());
  o.updated = num(o.updated, o.created);
  if (o.reminder === undefined) o.reminder = null;
  // ---- added in schema 3 ----
  if (o.lang === undefined) o.lang = null;
  if (o.mood === undefined) o.mood = null;
  if (o.type === "journal" && !o.journalDate) o.journalDate = dateKey(o.created);
  if (o.journalDate === undefined) o.journalDate = null;
  o.shareJournal = !!o.shareJournal;
  if (o.priority === undefined) o.priority = null;
  o.priorityHistory = arr(o.priorityHistory);
  if (o.fu === undefined) o.fu = null;
  o.thread = arr(o.thread);
  if (o.ci === undefined) o.ci = null;
  o.updates = arr(o.updates);
  if (typeof o.nextStep !== "string") o.nextStep = "";
  o.personIds = arr(o.personIds);
  o.qDismissed = !!o.qDismissed;
  o.schemaV = SCHEMA;
  return o;
}

function migratePerson(p) {
  const o = Object.assign({}, p);
  o.id = o.id || genId();
  o.name = typeof o.name === "string" ? o.name : "";
  o.relation = typeof o.relation === "string" ? o.relation : "";
  if (o.birthday === undefined) o.birthday = null;
  o.favorites = arr(o.favorites);
  o.notes = typeof o.notes === "string" ? o.notes : "";
  o.created = num(o.created, Date.now());
  o.updated = num(o.updated, o.created);
  o.schemaV = SCHEMA;
  return o;
}

function defaultSettings() {
  return { lang: "auto", theme: "system", coachOn: false, persona: "steady", showStreak: false, dailyPrompt: true, views: [], lastReview: 0 };
}
function migrateSettings(s) {
  const o = Object.assign(defaultSettings(), s && typeof s === "object" ? s : {});
  if (!PERSONAS.includes(o.persona)) o.persona = "steady";
  if (!THEMES.includes(o.theme)) o.theme = "system";
  o.coachOn = o.coachOn === true;
  o.showStreak = o.showStreak === true;
  o.dailyPrompt = o.dailyPrompt !== false;
  o.views = arr(o.views).filter(v => v && typeof v.name === "string" && v.filter && typeof v.filter === "object");
  o.lastReview = num(o.lastReview, 0);
  if (typeof o.lang !== "string" || !o.lang) o.lang = "auto";
  return o;
}

const needsMigration = x => !x || x.schemaV !== SCHEMA;

/* Parse a backup file (v1 object, v1/v2 bare array of notes, or v3) into migrated notes/people/settings.
   Never throws on a bad entry: bad entries are counted in `skipped`. Throws only when nothing usable is there. */
function normalizeImport(raw) {
  const rawNotes = Array.isArray(raw) ? raw : raw && Array.isArray(raw.notes) ? raw.notes : null;
  if (!rawNotes) throw new Error("not a Recall backup");
  const notes = [], people = [];
  let skipped = 0;
  for (const n of rawNotes) { if (!n || typeof n !== "object" || typeof n.body !== "string") { skipped++; continue; } notes.push(migrateNote(n)); }
  for (const p of (!Array.isArray(raw) && Array.isArray(raw.people) ? raw.people : [])) { if (!p || typeof p !== "object") { skipped++; continue; } people.push(migratePerson(p)); }
  const settings = !Array.isArray(raw) && raw.settings ? migrateSettings(raw.settings) : null;
  return { notes, people, settings, skipped };
}

/* What gets stored in the `meta` store before the first migration touches existing data. */
function snapshotBefore(notes, people) {
  return { at: Date.now(), app: "recall", note: "Automatic copy of your data taken before Recall v2 upgraded it.", notes, people };
}

const M = { SCHEMA, NOTE_TYPES, PERSONAS, THEMES, migrateNote, migratePerson, migrateSettings, defaultSettings, needsMigration, normalizeImport, snapshotBefore, dateKey, genId };
if (typeof module !== "undefined" && module.exports) module.exports = M; else root.RecallMigrate = M;
})(typeof self !== "undefined" ? self : this);
