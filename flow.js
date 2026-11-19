"use strict";
/* Recall v2 features that sit on top of the core: journal, follow-ups, check-in threads, coach, filters.
   Loaded after app.js and voice.js. Hooks used by the core: journalOpts, renderJournalList, paintExtras, rowExtras,
   metaExtras, onEditExtras, bannerHTML, renderFollowups, renderThread, chipsHTML, dueNowCount, checkFollowups. */

const toggleHTML=(act,on,title,sub,extra="")=>`<button class="toggle" role="switch" aria-checked="${!!on}" data-act="${act}" ${extra}><span><b>${title}</b>${sub?`<small>${sub}</small>`:""}</span><span class="sw" aria-hidden="true"></span></button>`;
ACT.pref=el=>{const k=el.dataset.k;S.settings[k]=!S.settings[k];saveSettings();if(S.tab==="settings")renderSettings();else renderAll()};
function insertLine(text){const ta=$("#ta");if(!ta)return;const cur=ta.value;ta.value=cur+(cur&&!/\n$/.test(cur)?"\n":"")+text;ta.focus();ta.setSelectionRange(ta.value.length,ta.value.length);onEdit(ta.value)}

/* ====================================================================== journal */
const MOODS=[["😣","Rough"],["😕","Low"],["😐","Okay"],["🙂","Good"],["😄","Great"]];
const todayKey=()=>RL.keyOf(new Date());
const fmtDay=k=>RL.fromKey(k).toLocaleDateString([],{weekday:"short",month:"short",day:"numeric"});
const monthLabel=k=>RL.fromKey(k).toLocaleDateString([],{month:"long",year:"numeric"});
S.jview="timeline";S.jmonth={y:new Date().getFullYear(),m:new Date().getMonth()};

function journalOpts(key){
  key=key||todayKey();
  return {type:"journal",typeLocked:true,journalDate:key,created:key===todayKey()?Date.now():+RL.fromKey(key)+12*36e5};
}
const journals=()=>S.notes.filter(n=>n.type==="journal");
const todaysEntry=()=>journals().filter(n=>n.journalDate===todayKey()).sort((a,b)=>b.created-a.created)[0];
function openTodayJournal(){const e=todaysEntry();if(e){if(S.tab!=="journal"){S.tab="journal";document.body.classList.remove("v-page")}open(e.id);renderAll();return e}return create("",journalOpts())}
const streakNow=()=>RL.journalStreak(journals().filter(n=>n.body.trim()).map(n=>n.journalDate),todayKey());

function jrow(n,q){
  const title=titleOf(n),mood=n.mood?MOODS[n.mood-1]:null;
  return `<button class="item ${S.sel===n.id?"on":""}" data-act="openNote" data-id="${n.id}"><div class="body"><div class="t">${hl(title==="New Note"?"(empty entry)":title,q)}</div><div class="s">${hl(previewOf(n),q)||"&nbsp;"}</div><div class="m"><span class="ty ty-journal">${esc(fmtDay(n.journalDate||RM.dateKey(n.created)))}</span>${mood?`<span aria-label="Mood: ${mood[1]}">${mood[0]}</span>`:""}<span class="priv">${ICON.lock}${n.shareJournal?"Shared with follow-ups":"Private"}</span></div></div></button>`;
}
function calendarHTML(by){
  const {y,m}=S.jmonth,weeks=RL.monthGrid(y,m),tk=todayKey();
  const label=new Date(y,m,1).toLocaleDateString([],{month:"long",year:"numeric"});
  const dow=["S","M","T","W","T","F","S"].map((d,i)=>`<div class="dow" aria-hidden="true">${d}</div>`).join("");
  const cells=weeks.flat().map(d=>{
    if(!d)return `<span></span>`;
    const key=y+"-"+String(m+1).padStart(2,"0")+"-"+String(d).padStart(2,"0"),list=by[key]||[],fut=key>tk;
    return `<button class="day ${list.length?"has":""} ${key===tk?"today":""}" data-act="jDay" data-d="${key}" ${fut?"disabled":""} aria-label="${esc(fmtDay(key))}${list.length?", "+list.length+(list.length>1?" entries":" entry"):", no entry"}">${d}${list.length?'<i class="dot"></i>':""}</button>`}).join("");
  return `<div class="row sp" style="margin:.4rem 0"><button class="ibtn" data-act="jMonth" data-d="-1" aria-label="Previous month">${ICON.back}</button><b style="font-family:var(--font-head)">${label}</b><button class="ibtn" data-act="jMonth" data-d="1" aria-label="Next month" style="transform:scaleX(-1)">${ICON.back}</button></div><div class="cal">${dow}${cells}</div>`;
}
function renderJournalList(){
  const q=S.q.trim().toLowerCase(),all=journals();
  const rows=all.filter(n=>!q||n.body.toLowerCase().includes(q)).sort((a,b)=>(b.journalDate||"").localeCompare(a.journalDate||"")||b.created-a.created);
  const te=todaysEntry(),st=S.settings.showStreak?streakNow():0;
  let html=`<button class="today" data-act="jToday">${ICON.pen}<span><b>${te?"Add to today’s entry":"Write or speak today’s entry"}</b><small>${st?`${st} day${st===1?"":"s"} in a row · `:""}Private by default</small></span></button>`;
  html+=`<div class="seg" role="group" aria-label="Journal view" style="margin:.2rem 0 .5rem"><button data-act="jview" data-v="timeline" aria-pressed="${S.jview==="timeline"}">Timeline</button><button data-act="jview" data-v="calendar" aria-pressed="${S.jview==="calendar"}">Calendar</button></div>`;
  if(S.jview==="calendar"){const by={};all.forEach(n=>{(by[n.journalDate]=by[n.journalDate]||[]).push(n)});html+=calendarHTML(by)}
  else if(!rows.length)html+=`<div class="empty"><b>${q?"No matches":"Your private journal"}</b>${q?"Try fewer words.":"Write or speak a few lines each day. Entries here are never used for follow-ups or reminders unless you choose."}${q?"":`<span class="tag">Notes that follow up. Journals that don’t.</span>`}</div>`;
  else{let cur="";rows.forEach(n=>{const ml=monthLabel(n.journalDate||RM.dateKey(n.created));if(ml!==cur){cur=ml;html+=`<div class="grp">${esc(ml)}</div>`}html+=jrow(n,S.q)})}
  $("#items").innerHTML=html;
}
ACT.jToday=()=>openTodayJournal();
ACT.jview=el=>{S.jview=el.dataset.v;renderList()};
ACT.jMonth=el=>{let {y,m}=S.jmonth;m+=+el.dataset.d;if(m<0){m=11;y--}if(m>11){m=0;y++}S.jmonth={y,m};renderList()};
ACT.jDay=el=>{const k=el.dataset.d,list=journals().filter(n=>n.journalDate===k).sort((a,b)=>b.created-a.created);
  if(list.length)open(list[0].id); else create("",journalOpts(k))};

/* The journal part of the editor: mood, daily prompt, gratitude, and the privacy switch. */
function paintJournalTop(n){
  const el=$("#topBox");if(!el)return;
  const key=n.journalDate||RM.dateKey(n.created);
  el.innerHTML=`<div class="card"><div class="row sp"><span class="priv">${ICON.lock}${n.shareJournal?"Shared with follow-ups":"Private"}</span><span class="hint" style="margin:0">${esc(fmtDay(key))}</span></div>
    <div class="ctitle" style="margin-top:.7rem" id="moodL">How are you feeling? (optional)</div>
    <div class="mood" role="group" aria-labelledby="moodL">${MOODS.map(([e,l],i)=>`<button data-act="mood" data-v="${i+1}" aria-pressed="${n.mood===i+1}" aria-label="${l}" title="${l}">${e}</button>`).join("")}</div>
    ${S.settings.dailyPrompt?`<div class="ctitle" style="margin-top:.9rem">Today’s prompt</div><div class="prompt">${esc(RL.promptFor(key))}</div>`:""}
    <div class="row" style="margin-top:.7rem">${S.settings.dailyPrompt?`<button class="btn" data-act="usePrompt">Use this prompt</button>`:""}<button class="btn" data-act="gratitude">Add a gratitude line</button></div></div>`;
}
function paintJournalBottom(n){
  const el=$("#extraBox");if(!el)return;
  el.innerHTML=`<div class="card">${toggleHTML("shareJ",n.shareJournal,"Include in follow-ups and coach","Off by default. When on, dates in this entry can make reminders and the coach can see it.")}</div>`;
}
ACT.mood=el=>{const n=byId(S.sel);if(!n)return;const v=+el.dataset.v;n.mood=n.mood===v?null:v;save(n);paintJournalTop(n);paintMeta();refresh()};
ACT.usePrompt=()=>{const n=byId(S.sel);if(n)insertLine(RL.promptFor(n.journalDate||RM.dateKey(n.created)))};
ACT.gratitude=()=>insertLine("Grateful for: ");
ACT.shareJ=()=>{const n=byId(S.sel);if(!n)return;n.shareJournal=!n.shareJournal;
  if(n.shareJournal){enrich(n,{keepType:true});toast("This entry can now appear in follow-ups and the coach.",()=>{n.shareJournal=false;enrich(n,{keepType:true});save(n);renderEditor();refresh(true)})}
  else{if(n.reminder&&n.reminder.auto)n.reminder=null;toast("Entry is private again.")}
  save(n);renderEditor();refresh(true)};

/* ====================================================================== editor hooks */
const EXTRA_PARTS=[];          // each: n => html for the box under the text (non-journal notes)
function paintExtras(){
  const n=byId(S.sel);if(!n)return;
  if(n.type==="journal"){paintJournalTop(n);paintJournalBottom(n)}
  else{const t=$("#topBox"),b=$("#extraBox");if(t)t.innerHTML="";S.extraSig=EXTRA_PARTS.map(f=>f(n)||"").join("");if(b)b.innerHTML=S.extraSig}
  paintLangBox();
}
/* Repaint the box under the text only when what it should show has changed (not on every keystroke). */
function onEditExtras(n){
  if(n.type==="journal")return;const b=$("#extraBox");if(!b)return;
  const sig=EXTRA_PARTS.map(f=>f(n)||"").join("");if(sig!==S.extraSig){S.extraSig=sig;b.innerHTML=sig}
}
const rowExtras=n=>typeof rowFU==="function"?rowFU(n):"";
const langName=n=>n.lang?RecallLangs.nameOf(n.lang):"Auto";
const metaExtras=n=>(n.type==="journal"&&n.mood?`<span aria-label="Mood: ${MOODS[n.mood-1][1]}">${MOODS[n.mood-1][0]}</span>`:"")+
  `<button class="tbtn" data-act="noteLang" aria-label="Note language: ${esc(langName(n))}. Change" style="min-height:2.75rem">${ICON.globe} ${esc(langName(n))}</button>`;

/* ====================================================================== settings sections */
SETTINGS.push({id:"journal",order:30,title:"Journal",html:()=>
  toggleHTML("pref",S.settings.dailyPrompt,"Daily prompt","A new question each day in your journal entries.",'data-k="dailyPrompt"')+
  toggleHTML("pref",S.settings.showStreak,"Show writing streak","Off by default. Just a count of days in a row, never a nag.",'data-k="showStreak"')+
  `<p class="hint">Journal entries are private: they stay out of the Notes tab, follow-ups, reminders, People and the coach unless you switch an entry on.</p>`});

/* The Settings "Your data" section loads its snapshot row after it renders. */
const _renderSettings=renderSettings;
renderSettings=function(){_renderSettings();paintSnapshot()};

/* ====================================================================== language */
const devLang=()=>RecallLangs.bestMatch(navigator.language);
function openLangSheet(scope){
  S.langScope=scope==="note"&&byId(S.sel)?"note":"default";
  const n=byId(S.sel),cur=S.langScope==="note"?(n.lang||"auto"):S.settings.lang;
  const opts=[["auto","Auto","device: "+RecallLangs.nameOf(devLang())]].concat(RecallLangs.LANGS.map(l=>[l[0],l[1],l[2]!==l[1]?l[2]:""]));
  openSheet(`<h2>${S.langScope==="note"?"Language of this note":"Dictation language"}</h2>
    <p class="hint" style="margin-top:0">${S.langScope==="note"?"Used the next time you dictate into this note.":"Used for new notes. Notes you’ve already dictated keep their own language."} iPhone dictation support varies by language, and mixing two languages in one sentence isn’t reliable.</p>
    <div role="radiogroup" aria-label="Language">${opts.map(([t,name,sub])=>`<button class="opt" role="radio" aria-checked="${cur===t}" data-act="pickLang" data-l="${t}">${esc(name)}<small>${esc(sub)}</small></button>`).join("")}</div>
    <div class="row" style="margin-top:.8rem"><button class="btn block" data-act="sheetClose">Done</button></div>`,"Choose a language");
  const on=$("#sheetHost [aria-checked=true]");if(on)on.scrollIntoView({block:"center"});
}
ACT.sheetClose=()=>closeSheet();
ACT.noteLang=()=>openLangSheet("note");
ACT.pickLang=el=>{const l=el.dataset.l,n=byId(S.sel);
  if(S.langScope==="note"&&n){n.lang=l==="auto"?null:l;save(n)}
  else{S.settings.lang=l;saveSettings();if(n&&l!=="auto"&&$("#ta")){n.lang=l;save(n)}}
  closeSheet();toast(l==="auto"?"Dictation language: Auto":"Dictating in "+RecallLangs.nameOf(l));
  paintMeta();if(S.tab==="settings")renderSettings();paintExtras()};
SETTINGS.push({id:"lang",order:20,title:"Dictation language",html:()=>`
  <label class="sr" for="langSel">Dictation language</label>
  <select class="field" id="langSel" data-chg="setLang"><option value="auto" ${S.settings.lang==="auto"?"selected":""}>Auto (device: ${esc(RecallLangs.nameOf(devLang()))})</option>${RecallLangs.LANGS.map(l=>`<option value="${l[0]}" ${S.settings.lang===l[0]?"selected":""}>${esc(l[1])}${l[2]!==l[1]?" · "+esc(l[2]):""}</option>`).join("")}</select>
  <p class="hint">Each note remembers the language it was dictated in. Long-press the voice button to switch quickly. In Auto, if the first result looks wrong, Recall offers a one-tap “Re-record in…”. Nothing is translated unless you press Translate.</p>
  <p class="hint"><b>Honest note:</b> dictation support varies by language on iPhone Safari, and code-switching (mixing two languages in one sentence) is not reliably supported. If your language isn’t available, use the microphone on your keyboard. Date detection for reminders understands English only.</p>`});
CHG.setLang=el=>{S.settings.lang=el.value;saveSettings();toast(el.value==="auto"?"Dictation language: Auto":"Dictating in "+RecallLangs.nameOf(el.value))};

/* "Sounds off?" after the first result in Auto mode. */
function onDictated(res){
  const n=byId(S.sel);if(!n)return;
  if(!n.lang||res.override){n.lang=res.lang;save(n);paintMeta();onEditExtras(n)}
  if(S.settings.lang==="auto"&&!res.override&&RecallLangs.looksWrong(res)){S.langHint={tried:res.lang};paintLangBox()}
}
function paintLangBox(){
  const el=$("#langBox");if(!el)return;const h=S.langHint;
  if(!h){el.innerHTML="";return}
  const alts=RecallLangs.alternatives(h.tried,navigator.language,3);
  el.innerHTML=`<div class="suggest" role="group" aria-label="Re-record in another language"><h3>${ICON.globe} Sounds off? <button class="x" data-act="langHintX" aria-label="Dismiss">×</button></h3>
    <div class="row"><span>Re-record in:</span>${alts.map(t=>`<button class="chip" data-act="reRecord" data-l="${t}">${esc(RecallLangs.nameOf(t))}</button>`).join("")}<button class="chip ghost" data-act="noteLang">More…</button></div></div>`;
}
ACT.langHintX=()=>{S.langHint=null;paintLangBox()};
ACT.reRecord=el=>{const l=el.dataset.l,ta=$("#ta"),st=S.dictState,n=byId(S.sel);
  if(S.listening)stopDictation();
  if(st&&ta&&ta.value===st.after){ta.value=st.base;onEdit(ta.value)}   // drop the take that came out wrong
  if(n){n.lang=l;save(n);paintMeta()}
  S.langHint=null;paintLangBox();startDictation(l)};

/* Manual translate button: never automatic. On-device translator when the browser has one, otherwise an explicit
   confirmation before anything is sent to Google Translate. */
EXTRA_PARTS.push(n=>{
  if(!n.lang||/^en/i.test(n.lang)||!n.body.trim())return "";
  return `<div class="card" id="trCard"><div class="row sp"><span>Written in ${esc(RecallLangs.nameOf(n.lang))}</span><button class="btn" data-act="translate">Translate to English</button></div><div id="trOut"></div></div>`});
ACT.translate=async()=>{const n=byId(S.sel);if(!n)return;const src=(n.lang||"").split("-")[0];
  if("Translator" in self){try{const t=await Translator.create({sourceLanguage:src,targetLanguage:"en"});showTranslation(await t.translate(n.body));return}catch(_){}}
  openSheet(`<h2>Translate to English</h2><p>This browser can’t translate on the device. Recall can open Google Translate in a new tab, which <b>sends this note’s text to Google</b>. Nothing is sent unless you continue.</p>
    <div class="row"><button class="btn p" data-act="trWeb">Continue to Google Translate</button><button class="btn" data-act="sheetClose">Cancel</button></div>`,"Confirm translation")};
ACT.trWeb=()=>{const n=byId(S.sel);closeSheet();if(n)window.open("https://translate.google.com/?sl=auto&tl=en&op=translate&text="+encodeURIComponent(n.body),"_blank","noopener")};
function showTranslation(text){const el=$("#trOut");if(!el)return;S.trText=text;
  el.innerHTML=`<div class="card" style="margin:.7rem 0 0"><div class="ctitle">English translation</div><div style="white-space:pre-wrap">${esc(text)}</div><div class="row" style="margin-top:.6rem"><button class="btn" data-act="trInsert">Insert below my note</button><button class="btn" data-act="trCopy">Copy</button></div></div>`}
ACT.trInsert=()=>{if(S.trText)insertLine("\n— English translation —\n"+S.trText)};
ACT.trCopy=()=>{try{navigator.clipboard.writeText(S.trText||"");toast("Copied")}catch(_){toast("Couldn’t copy")}};
