// Run: node tests/migrate.test.js   (no frameworks)
"use strict";
const assert = require("assert");
const M = require("../migrate.js");
let pass = 0, fail = 0;
function ok(cond, name, info) { if (cond) pass++; else { fail++; console.log("FAIL:", name, info !== undefined ? JSON.stringify(info) : ""); } }
const eq = (a, b, name) => { try { assert.deepStrictEqual(a, b); pass++; } catch (e) { fail++; console.log("FAIL:", name, "\n  got ", JSON.stringify(a), "\n  want", JSON.stringify(b)); } };

// ---- seeded v1 data, exactly the shape v1 stored (no schemaV, no v2 fields) ----
const V1_NOTES = [
  { id: "n1", body: "Call the caterer tomorrow at 10am #events", type: "task", tags: ["events"], pinned: true, created: 1700000000000, updated: 1700000500000,
    reminder: { at: 1700090000000, auto: true, done: false, notified: false } },
  { id: "n2", body: "Idea: monthly open-mic night", type: "idea", tags: [], pinned: false, created: 1700001000000, updated: 1700001000000, reminder: null, typeLocked: true },
  { id: "n3", body: "Maya's birthday is March 4, 1992.", type: "note", tags: [], pinned: false, created: 1700002000000, updated: 1700002000000, reminder: null, ex: { "b:Mayamarch 4, 1992": 1 }, noAuto: true },
  { id: "n4", body: "Weird legacy type", type: "mystery", created: 1700003000000, updated: 1700003000000 }
];
const V1_PEOPLE = [
  { id: "p1", name: "Maya Lopez", relation: "Friend", birthday: { m: 3, d: 4, y: 1992 }, favorites: [{ k: "Favorite food", v: "Pad thai" }], notes: "Met at the studio.", created: 1700002000000, updated: 1700002000000, bn: { "2027-7": 1 } }
];

// 1. Nothing is lost: every v1 field survives with the same value.
for (const n of V1_NOTES) {
  const m = M.migrateNote(n);
  for (const k of Object.keys(n)) if (k !== "type") eq(m[k], n[k], `note ${n.id} keeps "${k}"`);
  ok(m.schemaV === 3, `note ${n.id} stamped schemaV 3`);
}
const m1 = M.migrateNote(V1_NOTES[0]);
eq(m1.reminder, V1_NOTES[0].reminder, "reminder object untouched");
ok(m1.type === "task" && m1.pinned === true, "type and pin kept");
ok(M.migrateNote(V1_NOTES[1]).typeLocked === true, "unknown extra field typeLocked preserved");
eq(M.migrateNote(V1_NOTES[2]).ex, V1_NOTES[2].ex, "ex (applied facts) preserved so people aren't re-added");
ok(M.migrateNote(V1_NOTES[3]).type === "note", "unknown type falls back to note");
ok(M.migrateNote(V1_NOTES[3]).tags.length === 0 && M.migrateNote(V1_NOTES[3]).pinned === false, "missing basics defaulted");

// 2. New fields get safe defaults.
eq([m1.lang, m1.mood, m1.priority, m1.fu, m1.ci, m1.journalDate], [null, null, null, null, null, null], "null defaults");
eq([m1.priorityHistory, m1.thread, m1.updates, m1.personIds], [[], [], [], []], "empty array defaults");
ok(m1.shareJournal === false && m1.qDismissed === false && m1.nextStep === "", "boolean/string defaults");

// 3. Journal notes get a journalDate derived from created.
const j = M.migrateNote({ id: "j1", body: "Dear diary", type: "journal", created: new Date(2026, 10, 3, 22, 15).getTime() });
ok(j.journalDate === "2026-11-03", "journalDate derived", j.journalDate);
ok(j.shareJournal === false, "journals are private by default");

// 4. Idempotent, and does not mutate its input.
const before = JSON.stringify(V1_NOTES[0]);
const once = M.migrateNote(V1_NOTES[0]), twice = M.migrateNote(once);
eq(twice, once, "migrateNote is idempotent");
ok(JSON.stringify(V1_NOTES[0]) === before, "input not mutated");
eq(M.migratePerson(M.migratePerson(V1_PEOPLE[0])), M.migratePerson(V1_PEOPLE[0]), "migratePerson idempotent");

// 5. People keep everything.
const p = M.migratePerson(V1_PEOPLE[0]);
for (const k of Object.keys(V1_PEOPLE[0])) eq(p[k], V1_PEOPLE[0][k], `person keeps "${k}"`);
ok(p.schemaV === 3, "person stamped");
ok(Array.isArray(M.migratePerson({ id: "x" }).favorites), "person without favorites gets []");

// 6. needsMigration
ok(M.needsMigration(V1_NOTES[0]) && !M.needsMigration(once), "needsMigration");

// 7. Settings defaults: coach OFF by default, persona valid.
const d = M.defaultSettings();
ok(d.coachOn === false, "coach default OFF");
ok(d.showStreak === false, "streak default OFF");
eq(M.migrateSettings(null), d, "null settings -> defaults");
ok(M.migrateSettings({ persona: "bogus", theme: "neon", coachOn: "yes" }).persona === "steady", "bad persona fixed");
ok(M.migrateSettings({ coachOn: "yes" }).coachOn === false, "coachOn only true when exactly true");
ok(M.migrateSettings({ theme: "neon" }).theme === "system", "bad theme fixed");
ok(M.migrateSettings({ views: [{ name: "A", filter: {} }, { nope: 1 }, null] }).views.length === 1, "bad saved views dropped");

// 8. Import accepts v1 object, bare array, v3 object; skips junk; rejects non-backups.
const v1file = { app: "recall", version: 2, notes: V1_NOTES, people: V1_PEOPLE };
const r1 = M.normalizeImport(v1file);
ok(r1.notes.length === 4 && r1.people.length === 1 && r1.settings === null && r1.skipped === 0, "v1 backup imports", [r1.notes.length, r1.people.length, r1.skipped]);
ok(r1.notes.every(n => n.schemaV === 3) && r1.people.every(x => x.schemaV === 3), "imported data migrated");
const r2 = M.normalizeImport(V1_NOTES);
ok(r2.notes.length === 4 && r2.people.length === 0, "bare array imports");
const r3 = M.normalizeImport({ app: "recall", version: 3, notes: [once, null, { id: "bad" }, 5], people: [p, "x"], settings: { coachOn: true, persona: "strategist" } });
ok(r3.notes.length === 1 && r3.people.length === 1 && r3.skipped === 4, "junk entries skipped, counted", r3.skipped);
ok(r3.settings.coachOn === true && r3.settings.persona === "strategist", "settings imported");
let threw = 0; for (const bad of [null, {}, { notes: "x" }, "hello", 12]) { try { M.normalizeImport(bad); } catch (_) { threw++; } }
ok(threw === 5, "non-backups rejected", threw);

// 9. Export -> import round trip keeps every v3 note exactly.
const exported = JSON.parse(JSON.stringify({ app: "recall", version: 3, notes: r1.notes, people: r1.people, settings: d }));
const back = M.normalizeImport(exported);
eq(back.notes, r1.notes, "round trip notes identical");
eq(back.people, r1.people, "round trip people identical");

// 10. Snapshot contains an untouched copy of the originals.
const snap = M.snapshotBefore(V1_NOTES, V1_PEOPLE);
ok(snap.notes.length === 4 && snap.people.length === 1 && snap.app === "recall", "snapshot built");

console.log(`migrate tests: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
