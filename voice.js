"use strict";
/* Voice dictation (webkitSpeechRecognition). On iPhone it can be missing or blocked, especially in a Home Screen
   app. Every failure path lands in keyboardFallback(): focus the text area and point at the keyboard's mic,
   which always works. The recognition language comes from RecallLangs.resolve (note, then Settings, then device). */
const SR=window.SpeechRecognition||window.webkitSpeechRecognition;let rec=null,srBroken=false;
const KB_HINT="Tap the microphone on your keyboard.";
/* Dictation goes into the reply box while a check-in thread is open, otherwise into the note. */
const dictEl=()=>S.thread&&$("#ciIn")?$("#ciIn"):$("#ta");
const dictLang=()=>{const n=byId(S.sel);return RecallLangs.resolve(n&&n.lang,S.settings.lang,navigator.language)};

function keyboardFallback(){S.listening=false;S.kbHint=true;try{rec&&rec.abort()}catch(_){}rec=null;paintMic();
  const t=dictEl();if(t)t.focus();const h=$("#kbHint");if(h)h.hidden=false;toast(KB_HINT,null,6000)}

function startDictation(langOverride){
  if(!S.sel)create("");
  const ta=dictEl();if(!ta)return;
  if(!SR||srBroken){keyboardFallback();return}
  S.dictState=null;
  let heard=false,restarts=0;
  const lang=langOverride||dictLang();
  try{rec=new SR();rec.continuous=true;rec.interimResults=true;rec.lang=lang;}catch(_){srBroken=true;keyboardFallback();return}
  const mine=rec;
  rec.onstart=()=>{heard=true};
  rec.onresult=e=>{heard=true;restarts=0;let interim="";
    for(let i=e.resultIndex;i<e.results.length;i++){const r=e.results[i],txt=r[0].transcript;
      if(r.isFinal){appendText(txt);if(typeof onDictated==="function"&&dictEl().id==="ta")onDictated({text:txt,confidence:r[0].confidence,lang,override:!!langOverride})}else interim+=txt}
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
function appendText(t){const ta=dictEl();if(!ta)return;t=t.trim();if(!t)return;
  const cur=ta.value;const needsCap=!cur||/[.!?]\s*$/.test(cur)||/\n$/.test(cur);
  t=t.replace(/\b(new line|newline)\b/gi,"\n").replace(/\bnew paragraph\b/gi,"\n\n");
  if(needsCap)t=t.charAt(0).toUpperCase()+t.slice(1);
  const main=ta.id==="ta";if(main&&!S.dictState)S.dictState={base:cur,after:cur};
  ta.value=cur+(cur&&!/\s$/.test(cur)?" ":"")+t;ta.scrollTop=ta.scrollHeight;if(main){S.dictState.after=ta.value;onEdit(ta.value)}}

ACT.mic=()=>{S.listening?stopDictation():startDictation()};
ACT.fab=()=>{
  if(S.listening){stopDictation();return}
  if(S.thread&&$("#ciIn")){startDictation();return}
  if(S.tab==="journal")openTodayJournal();else create("");const ta=$("#ta");if(ta)ta.focus();startDictation();
};

/* Long-press the voice button (or the Dictate button) to pick a dictation language. A plain tap still dictates.
   Keyboard and screen-reader users get the same picker from the language chip under every note and from Settings. */
let lpTimer=null,lpAt=0;
document.addEventListener("pointerdown",e=>{const el=e.target.closest("#fab,#mic");if(!el)return;
  clearTimeout(lpTimer);lpTimer=setTimeout(()=>{lpAt=Date.now();if(S.listening)stopDictation();openLangSheet("default")},550)});
["pointerup","pointercancel","pointerleave"].forEach(ev=>document.addEventListener(ev,()=>clearTimeout(lpTimer)));
document.addEventListener("click",e=>{if(lpAt&&Date.now()-lpAt<900&&e.target.closest("#fab,#mic")){e.stopPropagation();e.preventDefault();lpAt=0}},true);
document.addEventListener("contextmenu",e=>{if(e.target.closest("#fab,#mic"))e.preventDefault()});
