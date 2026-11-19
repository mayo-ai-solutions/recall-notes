// Run: node tests/langs.test.js
"use strict";
const L = require("../langs.js");
let pass = 0, fail = 0;
function ok(c, n, i) { if (c) pass++; else { fail++; console.log("FAIL:", n, i !== undefined ? JSON.stringify(i) : ""); } }

const need = ["English","Spanish","French","German","Portuguese","Italian","Mandarin","Japanese","Korean","Hindi","Arabic","Russian","Tagalog","Vietnamese"];
for (const n of need) ok(L.LANGS.some(l => l[2].includes(n)), "language list includes " + n);
ok(L.LANGS.length >= 30, "broad list", L.LANGS.length);
ok(new Set(L.LANGS.map(l => l[0])).size === L.LANGS.length, "no duplicate tags");
ok(L.LANGS.every(l => /^[a-z]{2,3}(-[A-Za-z]+)+$/.test(l[0])), "all tags look like BCP-47");

// device locale -> supported tag
ok(L.bestMatch("en-US") === "en-US" && L.bestMatch("pt-BR") === "pt-BR", "exact match kept");
ok(L.bestMatch("es") === "es-ES" && L.bestMatch("fr-CH") === "fr-FR", "same base language", [L.bestMatch("es"), L.bestMatch("fr-CH")]);
ok(L.bestMatch("pt_PT") === "pt-PT", "underscore locale");
ok(L.bestMatch("xx-YY") === "en-US" && L.bestMatch("") === "en-US" && L.bestMatch(undefined) === "en-US", "unknown falls back to English");

// resolve: note > Settings > device
ok(L.resolve("ja-JP", "es-ES", "en-US") === "ja-JP", "note language wins");
ok(L.resolve(null, "es-ES", "en-US") === "es-ES", "then Settings");
ok(L.resolve(null, "auto", "de-AT") === "de-DE", "auto uses device language");
ok(L.resolve("bogus", "auto", "fr-CA") === "fr-CA", "unknown note language ignored");
ok(L.resolve(null, "bogus", "en-GB") === "en-GB", "unknown setting ignored");

// "looks wrong"
ok(L.looksWrong({ text: "", confidence: 0.9 }) === true, "empty result looks wrong");
ok(L.looksWrong({ text: "hola que tal", confidence: 0.3 }) === true, "low confidence looks wrong");
ok(L.looksWrong({ text: "hello there", confidence: 0.92 }) === false, "confident result is fine");
ok(L.looksWrong({ text: "hello there", confidence: 0 }) === false, "confidence 0 means unknown (Safari), not wrong");
ok(L.looksWrong(null) === false, "null is not wrong");

// alternatives
const alt = L.alternatives("en-US", "es-MX", 3);
ok(alt.length === 3 && !alt.includes("en-US") && alt[0] === "es-MX", "device language first, never the one just tried", alt);
ok(L.alternatives("es-ES", "es-ES", 3).every(t => t !== "es-ES"), "excludes tried language");

console.log(`langs tests: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
