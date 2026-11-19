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
function paintExtras(){
  const n=byId(S.sel);if(!n)return;
  if(n.type==="journal"){paintJournalTop(n);paintJournalBottom(n)}
  else{const t=$("#topBox"),b=$("#extraBox");if(t)t.innerHTML="";if(b)b.innerHTML=""}
}
const rowExtras=n=>"";
const metaExtras=n=>n.type==="journal"&&n.mood?`<span aria-label="Mood: ${MOODS[n.mood-1][1]}">${MOODS[n.mood-1][0]}</span>`:"";

/* ====================================================================== settings sections */
SETTINGS.push({id:"journal",order:30,title:"Journal",html:()=>
  toggleHTML("pref",S.settings.dailyPrompt,"Daily prompt","A new question each day in your journal entries.",'data-k="dailyPrompt"')+
  toggleHTML("pref",S.settings.showStreak,"Show writing streak","Off by default. Just a count of days in a row, never a nag.",'data-k="showStreak"')+
  `<p class="hint">Journal entries are private: they stay out of the Notes tab, follow-ups, reminders, People and the coach unless you switch an entry on.</p>`});

/* The Settings "Your data" section loads its snapshot row after it renders. */
const _renderSettings=renderSettings;
renderSettings=function(){_renderSettings();paintSnapshot()};
