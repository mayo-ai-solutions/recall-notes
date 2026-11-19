// Run: node tests/journal.test.js
"use strict";
const L = require("../lib.js");
let pass = 0, fail = 0;
function ok(c, n, i) { if (c) pass++; else { fail++; console.log("FAIL:", n, i !== undefined ? JSON.stringify(i) : ""); } }

// prompts: stable within a day, includes the classic one, never empty
ok(L.promptFor("2026-11-18") === L.promptFor("2026-11-18"), "same prompt all day");
ok(L.JOURNAL_PROMPTS.includes("What went well today? What drained you?"), "classic prompt present");
const seen = new Set(); for (let d = 1; d <= 28; d++) seen.add(L.promptFor("2026-11-" + String(d).padStart(2, "0")));
ok(seen.size >= 6, "prompts vary across days", seen.size);
ok(L.JOURNAL_PROMPTS.every(p => p.length > 10 && p.endsWith("?")), "prompts are questions");

// streak
const T = "2026-11-18";
ok(L.journalStreak([], T) === 0, "no entries -> 0");
ok(L.journalStreak(["2026-11-18"], T) === 1, "today only -> 1");
ok(L.journalStreak(["2026-11-18", "2026-11-17", "2026-11-16"], T) === 3, "three in a row");
ok(L.journalStreak(["2026-11-17", "2026-11-16"], T) === 2, "ran through yesterday still counts");
ok(L.journalStreak(["2026-11-16"], T) === 0, "gap -> 0");
ok(L.journalStreak(["2026-11-18", "2026-11-16"], T) === 1, "gap ends the streak");
ok(L.journalStreak(["2026-10-31", "2026-11-01"], "2026-11-01") === 2, "across a month boundary");
ok(L.shiftKey("2026-03-01", -1) === "2026-02-28", "shiftKey across Feb");

// calendar grid: Nov 2026 starts on a Sunday and has 30 days
const g = L.monthGrid(2026, 10);
ok(g[0][0] === 1 && g.length === 5, "Nov 2026 starts Sunday, 5 weeks", [g[0], g.length]);
ok(g.flat().filter(Boolean).length === 30, "30 days");
const g2 = L.monthGrid(2026, 1); // Feb 2026 starts on Sunday, 28 days -> 4 weeks
ok(g2.length === 4 && g2.flat().filter(Boolean).length === 28, "Feb 2026", g2.length);
const g3 = L.monthGrid(2026, 2); // Mar 2026 starts Sunday
ok(g3[0][0] === 1, "Mar 2026 starts Sunday");
const g4 = L.monthGrid(2026, 11); // Dec 2026 starts Tuesday
ok(g4[0].slice(0, 2).every(x => x === null) && g4[0][2] === 1, "Dec 2026 starts Tuesday", g4[0]);
ok(g4.every(w => w.length === 7), "weeks are 7 wide");

console.log(`journal tests: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
