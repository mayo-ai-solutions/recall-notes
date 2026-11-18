// Run: node tests/dates.test.js   (no frameworks)
"use strict";
const L = require("../lib.js");
let pass = 0, fail = 0;
function ok(cond, name, info) { if (cond) pass++; else { fail++; console.log("FAIL:", name, info !== undefined ? JSON.stringify(info) : ""); } }

// Fixed clock: Wednesday 18 Nov 2026, 08:00 local time.
const NOW = new Date(2026, 10, 18, 8, 0, 0);
const at = (y, mo, d, h = 9, mi = 0) => +new Date(y, mo, d, h, mi);
function when(text, expected, hasTime) {
  const r = L.parseWhen(text, NOW);
  if (expected === null) return ok(r === null, `"${text}" -> no reminder`, r && r.at.toString());
  ok(r && +r.at === expected, `"${text}" -> ${new Date(expected).toString()}`, r && r.at.toString());
  if (hasTime !== undefined && r) ok(r.hasTime === hasTime, `"${text}" hasTime=${hasTime}`);
}

// ---- positives ----
when("Call the caterer tomorrow at 10am", at(2026, 10, 19, 10), true);
when("Remind me to call the caterer tomorrow at 10am.", at(2026, 10, 19, 10), true);
when("dentist tomorrow", at(2026, 10, 19, 9), false);
when("pay rent day after tomorrow at 9:30 pm", at(2026, 10, 20, 21, 30), true);
when("in 2 hours check the oven", +NOW + 2 * 36e5, true);
when("in 30 minutes stretch", +NOW + 30 * 6e4, true);
when("in three days follow up", at(2026, 10, 21, 9));
when("in a week review budget", at(2026, 10, 25, 9));
when("submit form on Friday at 2pm", at(2026, 10, 20, 14), true);
when("next monday team sync", at(2026, 10, 23, 9));
when("Wednesday standup", at(2026, 10, 25, 9)); // same weekday means next week
when("Lunch with Sam on March 4", at(2027, 2, 4, 9));
when("Book flights by Dec 1st", at(2026, 11, 1, 9));
when("Party on December 31, 2026 at 8pm", at(2026, 11, 31, 20), true);
when("Taxes due 4/15", at(2027, 3, 15, 9)); // "due 4/15"
when("file it on 12/3", at(2026, 11, 3, 9));
when("renew 1/5/2027", at(2027, 0, 5, 9));
when("pick up dry cleaning at noon", at(2026, 10, 18, 12), true);
when("take out the trash tonight", at(2026, 10, 18, 20), true);
when("call mom at 7am", at(2026, 10, 19, 7), true); // 7am already passed today -> tomorrow
when("meeting at 3pm", at(2026, 10, 18, 15), true);
when("meeting at 3 p.m.", at(2026, 10, 18, 15), true);
when("standup at 14:30", at(2026, 10, 18, 14, 30), true);
when("tomorrow morning go running", at(2026, 10, 19, 9), true);
when("tomorrow afternoon nap", at(2026, 10, 19, 14), true);
when("finish slides today", at(2026, 10, 18, 9));
when("next week plan trip", at(2026, 10, 25, 9));
when("May 5 at 3pm haircut", at(2027, 4, 5, 15), true);

// ---- negatives ----
when("may I ask a question", null);
when("May I ask what you think?", null);
when("march forward 5 steps", null);
when("I sat down and read", null);
when("I will sign it in the morning", null);
when("I have 5 amazing ideas", null);
when("add 1/2 cup of sugar", null);
when("Today I learned that octopuses have three hearts", null);
when("TIL honey never spoils", null);
when("the clock said 13pm", null);
// Birthday statements must not create reminders once stripped (this is what enrich() does).
ok(L.parseWhen(L.stripBirthdays("Maya's birthday is March 4, 1992."), NOW) === null, "birthday sentence stripped -> no reminder");
ok(L.parseWhen(L.stripBirthdays("Sam's birthday is 3/4"), NOW) === null, "slash birthday stripped -> no reminder");
const mixed = L.parseWhen(L.stripBirthdays("Remind me to call the caterer tomorrow at 10am. Maya's birthday is March 4. Maya's favorite food is pad thai."), NOW);
ok(mixed && +mixed.at === at(2026, 10, 19, 10), "mixed note keeps the real reminder", mixed && mixed.at.toString());

// ---- person extraction ----
function facts(text) { return L.extractFacts(text); }
let f = facts("Maya's birthday is March 4, 1992. Maya's favorite food is pad thai.");
ok(f.length === 2, "Maya: two facts", f);
ok(f[0].kind === "birthday" && f[0].name === "Maya" && f[0].birthday.m === 3 && f[0].birthday.d === 4 && f[0].birthday.y === 1992, "Maya birthday Mar 4 1992", f[0]);
ok(f[1].kind === "fav" && f[1].name === "Maya" && f[1].k === "Favorite food" && f[1].v === "pad thai", "Maya favorite food", f[1]);
f = facts("Sam’s favourite colour is green");
ok(f.length === 1 && f[0].name === "Sam" && f[0].k === "Favorite colour" && f[0].v === "green", "curly apostrophe + British spelling", f);
f = facts("Remember Maya's birthday is March 4");
ok(f.length === 1 && f[0].name === "Maya", "leading 'Remember' is not part of the name", f);
f = facts("Tomorrow Jordan Lee's birthday is 7/9");
ok(f.length === 1 && f[0].name === "Jordan Lee" && f[0].birthday.m === 7 && f[0].birthday.d === 9, "two-word name, slash date", f);
f = facts("Leap's birthday is Feb 29");
ok(f.length === 1 && f[0].birthday.m === 2 && f[0].birthday.d === 29, "Feb 29 kept as-is", f);
ok(facts("Ana's birthday is February 30").length === 0, "invalid date rejected");
ok(facts("may I ask").length === 0, "negative: may I ask");
ok(facts("march forward 5").length === 0, "negative: march forward");
ok(facts("I sat down with Sam").length === 0, "negative: sat down");
ok(facts("I will sign it in the morning").length === 0, "negative: sign it in the morning");
ok(facts("Everyone's favorite food is pizza").length === 0, "negative: Everyone is not a person");
ok(facts("my mom's birthday is May 2").length === 0, "lowercase 'mom' not captured as a name");
f = facts("Priya's allergies are peanuts, shellfish");
ok(f.length === 1 && f[0].k === "Allergies" && f[0].v === "peanuts, shellfish", "allergies", f);
ok(facts("Maya's favorite food is x").length === 0, "too-short value ignored");

// ---- misc helpers ----
ok(JSON.stringify(L.tagsOf("hi #Work and #work #ideas-2")) === '["work","ideas-2"]', "tags dedupe/lowercase");
ok(L.guessType("Book a table for Friday") === "task", "book a table is a task");
ok(L.guessType("Read a great book on habits") === "learning", "book is learning");
ok(L.guessType("Idea: open-mic night") === "idea", "idea");
ok(JSON.stringify(L.linksOf("see [[Trip plan]] and [[Trip plan]] and [[Budget]]")) === '["Trip plan","Budget"]', "wiki links");
ok(+L.weekStart(+NOW) === +new Date(2026, 10, 16), "week starts Monday");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
