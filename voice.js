"use strict";
/* Voice dictation (webkitSpeechRecognition). On iPhone it can be missing or blocked, especially in a Home Screen
   app. Every failure path lands in keyboardFallback(): focus the text area and point at the keyboard's mic,
   which always works. The recognition language comes from RecallLangs.resolve (note, then Settings, then device). */
const SR=window.SpeechRecognition||window.webkitSpeechRecognition;let rec=null,srBroken=false;
const KB_HINT="Tap the microphone on your keyboard.";
const dictLang=()=>{const n=byId(S.sel);return RecallLangs.resolve(n&&n.lang,S.settings.lang,navigator.language)};

function keyboardFallback(){S.listening=false;S.kbHint=true;try{rec&&rec.abort()}catch(_){}rec=null;paintMic();
  const t=$("#ta");if(t)t.focus();const h=$("#kbHint");if(h)h.hidden=false;toast(KB_HINT,null,6000)}

function startDictation(langOverride){
  if(!S.sel)create("");
  const ta=$("#ta");if(!ta)return;
  if(!SR||srBroken){keyboardFallback();return}
  let heard=false,restarts=0;
  const lang=langOverride||dictLang();
  try{rec=new SR();rec.continuous=true;rec.interimResults=true;rec.lang=lang;}catch(_){srBroken=true;keyboardFallback();return}
  const mine=rec;
  rec.onstart=()=>{heard=true};
  rec.onresult=e=>{heard=true;restarts=0;let interim="";
    for(let i=e.resultIndex;i<e.results.length;i++){const r=e.results[i],txt=r[0].transcript;
      if(r.isFinal){appendText(txt);if(typeof onDictated==="function")onDictated({text:txt,confidence:r[0].confidence,lang})}else interim+=txt}
    S.interim=interim;const el=$("#interim");if(el)el.textContent=interim||"Listening…"};
  rec.onerror=e=>{if(rec!==mine)return;if(e.error==="no-speech"||e.error==="aborted")return;
    if(e.error==="not-allowed"||e.error==="service-not-allowed"||e.error==="audio-capture"||e.error==="network")srBroken=true;
    if(e.error==="language-not-supported"){toast("This device can’t dictate in that language. Try the keyboard mic.",null,5000)}
    keyboardFallback()};
  rec.onend=()=>{if(rec!==mine||!S.listening)return;
    if(++restarts>3){stopDictation();return}
    try{rec.start()}catch(_){keyboardFallback()}};
  try{rec.start();S.listening=true;paintMic()}catch(_){srBroken=true;keyboardFallback();return}
  // Some iOS builds accept start() but never begin. Don't leave the user staring at "Listening…".
  setTimeout(()=>{if(rec===mine&&S.listening&&!heard){srBroken=true;keyboardFallback()}},4000);
}
function stopDictation(){const cur=byId(S.sel);if(cur)setTimeout(()=>extractPeople(cur),200);S.listening=false;try{rec&&rec.stop()}catch(_){}rec=null;S.interim="";paintMic()}
function paintMic(){const m=$("#mic"),s=$("#strip");
  if(m){m.classList.toggle("live",S.listening);m.setAttribute("aria-pressed",S.listening);m.innerHTML=S.listening?ICON.stop+"Stop":ICON.mic+"Dictate"}
  if(s)s.classList.toggle("on",S.listening);const el=$("#interim");if(el)el.textContent="Listening…";paintFab()}
function appendText(t){const ta=$("#ta");if(!ta)return;t=t.trim();if(!t)return;
  const cur=ta.value;const needsCap=!cur||/[.!?]\s*$/.test(cur)||/\n$/.test(cur);
  t=t.replace(/\b(new line|newline)\b/gi,"\n").replace(/\bnew paragraph\b/gi,"\n\n");
  if(needsCap)t=t.charAt(0).toUpperCase()+t.slice(1);
  ta.value=cur+(cur&&!/\s$/.test(cur)?" ":"")+t;ta.scrollTop=ta.scrollHeight;onEdit(ta.value)}

ACT.mic=()=>{S.listening?stopDictation():startDictation()};
ACT.fab=()=>{
  if(S.listening){stopDictation();return}
  if(S.tab==="journal")openTodayJournal();else create("");const ta=$("#ta");if(ta)ta.focus();startDictation();
};
