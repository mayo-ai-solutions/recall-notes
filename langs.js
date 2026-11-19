/* Dictation languages. Pure data and helpers (no DOM). Browser global `RecallLangs`, or Node `require`. */
(function (root) {
"use strict";
/* [BCP-47 tag for SpeechRecognition.lang, display name in its own language, English name] */
const LANGS = [
  ["en-US", "English (US)", "English (US)"], ["en-GB", "English (UK)", "English (UK)"], ["en-AU", "English (Australia)", "English (Australia)"],
  ["en-IN", "English (India)", "English (India)"], ["es-ES", "Español (España)", "Spanish (Spain)"], ["es-MX", "Español (México)", "Spanish (Mexico)"],
  ["es-US", "Español (EE. UU.)", "Spanish (US)"], ["fr-FR", "Français", "French"], ["fr-CA", "Français (Canada)", "French (Canada)"],
  ["de-DE", "Deutsch", "German"], ["pt-BR", "Português (Brasil)", "Portuguese (Brazil)"], ["pt-PT", "Português (Portugal)", "Portuguese (Portugal)"],
  ["it-IT", "Italiano", "Italian"], ["nl-NL", "Nederlands", "Dutch"], ["sv-SE", "Svenska", "Swedish"], ["da-DK", "Dansk", "Danish"],
  ["nb-NO", "Norsk", "Norwegian"], ["fi-FI", "Suomi", "Finnish"], ["pl-PL", "Polski", "Polish"], ["cs-CZ", "Čeština", "Czech"],
  ["ro-RO", "Română", "Romanian"], ["hu-HU", "Magyar", "Hungarian"], ["el-GR", "Ελληνικά", "Greek"], ["tr-TR", "Türkçe", "Turkish"],
  ["ru-RU", "Русский", "Russian"], ["uk-UA", "Українська", "Ukrainian"], ["he-IL", "עברית", "Hebrew"], ["ar-SA", "العربية", "Arabic"],
  ["hi-IN", "हिन्दी", "Hindi"], ["bn-BD", "বাংলা", "Bengali"], ["ta-IN", "தமிழ்", "Tamil"], ["th-TH", "ไทย", "Thai"],
  ["vi-VN", "Tiếng Việt", "Vietnamese"], ["id-ID", "Bahasa Indonesia", "Indonesian"], ["ms-MY", "Bahasa Melayu", "Malay"],
  ["fil-PH", "Tagalog / Filipino", "Tagalog (Filipino)"], ["zh-CN", "中文 (普通话)", "Chinese (Mandarin, Simplified)"],
  ["zh-TW", "中文 (台灣)", "Chinese (Mandarin, Taiwan)"], ["yue-Hant-HK", "粵語 (香港)", "Cantonese (Hong Kong)"],
  ["ja-JP", "日本語", "Japanese"], ["ko-KR", "한국어", "Korean"]
];
const known = tag => LANGS.some(l => l[0] === tag);
const nameOf = tag => { const l = LANGS.find(x => x[0] === tag); return l ? l[1] : tag; };

/* Best supported tag for a browser locale ("es" -> "es-ES", "pt-BR" -> "pt-BR", "xx" -> "en-US"). */
function bestMatch(locale) {
  const loc = String(locale || "").replace("_", "-");
  if (known(loc)) return loc;
  const base = loc.split("-")[0].toLowerCase();
  const hit = LANGS.find(l => l[0].split("-")[0].toLowerCase() === base);
  return hit ? hit[0] : "en-US";
}
/* Effective dictation language: a per-note choice wins, then the Settings choice, then the device language. */
function resolve(noteLang, settingLang, deviceLang) {
  if (noteLang && known(noteLang)) return noteLang;
  if (settingLang && settingLang !== "auto" && known(settingLang)) return settingLang;
  return bestMatch(deviceLang);
}
/* "Auto" mode: a result looks wrong when the recognizer is unsure or returned almost nothing. */
function looksWrong(result) {
  if (!result) return false;
  const t = String(result.text || "").trim();
  if (!t) return true;
  if (typeof result.confidence === "number" && result.confidence > 0 && result.confidence < 0.55) return true;
  return false;
}
/* Languages to offer in "Re-record in: ..." besides the one just tried (device language first). */
function alternatives(tried, deviceLang, n = 3) {
  const out = [], push = t => { if (t && t !== tried && !out.includes(t)) out.push(t); };
  push(bestMatch(deviceLang)); ["en-US", "es-ES", "fr-FR", "pt-BR", "de-DE"].forEach(push);
  return out.slice(0, n);
}
const L = { LANGS, known, nameOf, bestMatch, resolve, looksWrong, alternatives };
if (typeof module !== "undefined" && module.exports) module.exports = L; else root.RecallLangs = L;
})(typeof self !== "undefined" ? self : this);
