"use strict";
/* Recall v2 app: state, data, shell, lists, editors, Settings. Plain script, no build step.
   Pure logic lives in lib.js / migrate.js / followups.js / coach.js (unit-tested in Node). Voice is in voice.js,
   v2 features (journal, follow-ups, check-ins, coach, filters) are in flow.js, startup and events in boot.js. */

/* ---------- tiny helpers ---------- */
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const RM=RecallMigrate, RL=RecallLib;
const uid=RM.genId;
const ACT={}, INP={}, CHG={};           // data-act / data-in / data-chg handlers, filled in by every file
const SETTINGS=[];                      // Settings sections: {id, order, html()}
const flag=(k,v)=>{try{if(v===undefined)return localStorage.getItem(k);localStorage.setItem(k,v)}catch(_){}return null};

const BUBBLE="M10 6h44a6 6 0 0 1 6 6v28a6 6 0 0 1-6 6H34L22 58V46H10a6 6 0 0 1-6-6V12a6 6 0 0 1 6-6z";
const SPARK="M32 14l3.5 8.5L44 26l-8.5 3.5L32 38l-3.5-8.5L20 26l8.5-3.5z";
const logo=(cls="logo")=>`<svg class="${cls}" viewBox="0 0 64 64" aria-hidden="true"><path d="${BUBBLE}" fill="#F5A524" stroke="none"/><path d="${SPARK}" fill="#15171C" stroke="none"/></svg>`;
const ICON={
 note:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h5"/></svg>',
 journal:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>',
 follow:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 4v5h-5"/><path d="m8.5 12 2.5 2.5 4.5-5"/></svg>',
 person:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.6"/><path d="M5 20c.6-3.6 3.4-5.6 7-5.6s6.4 2 7 5.6"/></svg>',
 gear:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
 bell:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 17V11a6 6 0 0 1 12 0v6l2 2H4z"/><path d="M10 21a2 2 0 0 0 4 0"/></svg>',
 check:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
 pin:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4h6l-1 6 3 3H7l3-3zM12 13v8"/></svg>',
 trash:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
 cal:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="3"/><path d="M4 10h16M9 3v4M15 3v4"/></svg>',
 mic:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
 stop:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor"/></svg>',
 back:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5-7 7 7 7"/></svg>',
 plus:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
 pen:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z"/><path d="M13.5 6.5l4 4"/></svg>',
 send:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6"/></svg>',
 spark:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/></svg>',
 filter:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4"/></svg>',
 lock:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
 globe:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/></svg>'
};
const TABS=[["notes","Notes","note"],["journal","Journal","journal"],["followups","Follow-ups","follow"],["people","People","person"],["settings","Settings","gear"]];
const TYPES=[["note","Note"],["idea","Idea"],["learning","Learning"],["task","Task"],["person-note","Person"],["journal","Journal"]];
const typeLabel=t=>(TYPES.find(x=>x[0]===t)||TYPES[0])[1];
const COLLECTIONS=[["all","All"],["pinned","Pinned"],["idea","Ideas"],["learning","Learning"],["task","Tasks"],["person-note","People notes"]];

/* ---------- IndexedDB (db "recall", v3: stores notes, people, meta) ---------- */
let DB;
const idb=()=>new Promise((res,rej)=>{const r=indexedDB.open("recall",3);r.onupgradeneeded=()=>{const d=r.result;["notes","people","meta"].forEach(n=>{if(!d.objectStoreNames.contains(n))d.createObjectStore(n,{keyPath:n==="meta"?"key":"id"})})};r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
const tx=(st,mode,fn)=>new Promise((res,rej)=>{const t=DB.transaction(st,mode);const out=fn(t.objectStore(st));t.oncomplete=()=>res(out&&out.result);t.onerror=()=>rej(t.error)});
const dbAll=(st="notes")=>tx(st,"readonly",o=>o.getAll());
const dbPut=(n,st="notes")=>tx(st,"readwrite",o=>o.put(n));
const dbDel=(id,st="notes")=>tx(st,"readwrite",o=>o.delete(id));
const metaGet=key=>tx("meta","readonly",o=>o.get(key)).then(r=>r?r.value:undefined);
const metaPut=(key,value)=>tx("meta","readwrite",o=>o.put({key,value}));
const saveSettings=()=>metaPut("settings",S.settings).catch(()=>{});
/* Upgrade stored data in place (additive only). The first time old data is found, a snapshot copy goes into the
   meta store, so the v1 data can always be recovered. */
async function migrateStored(){
  const notes=await dbAll(),people=await dbAll("people");
  const oldN=notes.filter(RM.needsMigration),oldP=people.filter(RM.needsMigration);
  if(oldN.length||oldP.length){
    if(!(await metaGet("preMigrationBackup")))await metaPut("preMigrationBackup",RM.snapshotBefore(notes,people));
    for(const n of oldN)await dbPut(RM.migrateNote(n));
    for(const p of oldP)await dbPut(RM.migratePerson(p),"people");
  }
  S.settings=RM.migrateSettings(await metaGet("settings"));
}

/* ---------- dates (parsing is in lib.js, shared with the tests) ---------- */
const {parseWhen,stripBirthdays,extractFacts,tagsOf,guessType,linksOf,weekStart}=RL;
const sameDay=(a,b)=>a.toDateString()===b.toDateString();
function fmtWhen(ms){
  const d=new Date(ms),now=new Date(),tm=new Date(now);tm.setDate(now.getDate()+1);
  const time=d.toLocaleTimeString([],{hour:"numeric",minute:"2-digit"});
  if(sameDay(d,now))return"Today, "+time; if(sameDay(d,tm))return"Tomorrow, "+time;
  const far=Math.abs(d-now)>150*864e5;
  return d.toLocaleDateString([],{weekday:"short",month:"short",day:"numeric",year:far?"numeric":undefined})+", "+time;
}
const toLocalInput=ms=>{const d=new Date(ms);d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,16)};

/* ---------- state ---------- */
const S={settings:RM.defaultSettings(),notes:[],people:[],tab:"notes",view:"all",tag:null,q:"",sel:null,selP:null,
  sort:{k:"updated",asc:false},listening:false,interim:"",kbHint:false};
const byId=id=>S.notes.find(n=>n.id===id);
const pById=id=>S.people.find(p=>p.id===id);
const now=()=>Date.now();
const isDue=n=>n.reminder&&!n.reminder.done;
const isLate=n=>isDue(n)&&n.reminder.at<now();
/* A private journal entry: kept out of follow-ups, priority, coach, reminders and People unless the user opts in. */
const isPrivateJ=n=>!!n&&n.type==="journal"&&!n.shareJournal;

/* ---------- note model ---------- */
const titleOf=n=>{const l=(n.body||"").split("\n").map(s=>s.replace(/^#+\s*/,"").trim()).find(Boolean);return l||"New Note"};
const previewOf=n=>{const ls=(n.body||"").split("\n").map(s=>s.trim()).filter(Boolean);return ls.slice(1).join(" ")||""};
function enrich(n,{keepType=false}={}){
  n.tags=tagsOf(n.body);
  if(!keepType&&!n.typeLocked)n.type=guessType(n.body);
  if(isPrivateJ(n)){ if(n.reminder&&n.reminder.auto)n.reminder=null; return n }   // private diary text never creates reminders
  if(!n.noAuto&&(!n.reminder||n.reminder.auto)){
    const p=parseWhen(stripBirthdays(n.body));
    if(p){ if(!n.reminder||n.reminder.at!==+p.at) n.reminder={at:+p.at,auto:true,done:false,notified:false}; }
    else if(n.reminder&&n.reminder.auto)n.reminder=null;
  }
  return n;
}
function newNote(body="",extra={}){
  const n=RM.migrateNote(Object.assign({id:uid(),body,type:"note",tags:[],pinned:false,created:Date.now(),updated:Date.now(),reminder:null},extra));
  return enrich(n,{keepType:!!extra.typeLocked});
}

/* ---------- list filtering ---------- */
function visible(){
  let a=S.notes.filter(n=>n.type!=="journal");
  const v=S.view;
  if(v==="pinned")a=a.filter(n=>n.pinned); else if(v!=="all"&&v!=="db")a=a.filter(n=>n.type===v);
  if(S.tag)a=a.filter(n=>n.tags.includes(S.tag));
  const q=S.q.trim().toLowerCase();
  if(q){const ws=q.split(/\s+/);a=a.filter(n=>{const h=(n.body+" "+n.tags.join(" ")+" "+n.type).toLowerCase();return ws.every(w=>h.includes(w))})}
  a.sort((x,y)=>(y.pinned-x.pinned)||(y.updated-x.updated));
  return a;
}
const hl=(s,q)=>{s=esc(s);const ws=q.trim().split(/\s+/).filter(w=>w.length>1);if(!ws.length)return s;
  return s.replace(new RegExp("("+ws.map(w=>w.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")).join("|")+")","gi"),"<mark>$1</mark>")};
/* Reminders due now (overdue or due today and already reached). flow.js overrides this to include follow-ups. */
let dueNowCount=()=>S.notes.filter(n=>!isPrivateJ(n)&&isDue(n)&&n.reminder.at<=now()).length;

/* ---------- shell: tab bar, rail, header, chips ---------- */
function count(v){const a=S.notes.filter(n=>n.type!=="journal");if(v==="all")return a.length;if(v==="pinned")return a.filter(n=>n.pinned).length;return a.filter(n=>n.type===v).length}
function renderChrome(){
  const due=dueNowCount();
  $("#tabbar").innerHTML=TABS.map(([id,label,ic])=>`<button class="tab" data-act="tab" data-tab="${id}" ${S.tab===id?'aria-current="page"':""}>${ICON[ic]}<span>${label}</span>${id==="followups"&&due?`<span class="badge" aria-label="${due} due now">${due}</span>`:""}</button>`).join("");
  const tags={};S.notes.forEach(n=>{if(n.type!=="journal")n.tags.forEach(t=>tags[t]=(tags[t]||0)+1)});
  $("#side").innerHTML=`<div class="brand">${logo()}<div><b>Recall</b><small>Notes that follow up.</small></div></div>`+
    TABS.map(([id,label,ic])=>`<button class="nav" data-act="tab" data-tab="${id}" ${S.tab===id?'aria-current="page"':""}>${ICON[ic]}${label}${id==="followups"&&due?`<span class="badge" aria-label="${due} due now">${due}</span>`:""}</button>`).join("")+
    (S.tab==="notes"&&Object.keys(tags).length?`<div class="sec">Tags</div>`+Object.entries(tags).sort((a,b)=>b[1]-a[1]).map(([t,n])=>`<button class="tagbtn" data-act="tag" data-tag="${esc(t)}" aria-pressed="${S.tag===t}"><span aria-hidden="true">#</span><span>${esc(t)}</span><span style="margin-left:auto;font-size:.75rem">${n}</span></button>`).join(""):"");
  const titles={notes:"Notes",journal:"Journal",followups:"Follow-ups",people:"People"};
  const acts={notes:["new","New note",ICON.pen],journal:["newJournal","New journal entry",ICON.plus],people:["newPerson","Add person",ICON.plus]}[S.tab];
  $("#lh").innerHTML=(S.tab==="notes"&&!S.tag?logo():"")+`<span id="ltitle">${S.tag&&S.tab==="notes"?"#"+esc(S.tag):titles[S.tab]||""}</span>`+(acts?`<span class="acts"><button class="ibtn" data-act="${acts[0]}" aria-label="${acts[1]}" title="${acts[1]}">${acts[2]}</button></span>`:"");
  $("#q").placeholder={notes:"Search notes",journal:"Search journal",followups:"Search follow-ups",people:"Search people"}[S.tab]||"Search";
  const showChips=S.tab==="notes";$("#chips").hidden=!showChips;
  if(showChips)$("#chips").innerHTML=chipsHTML();
  const late=due;document.title=(late?`(${late}) `:"")+"Recall";
  try{if(navigator.setAppBadge){late?navigator.setAppBadge(late):navigator.clearAppBadge()}}catch(_){}
  $("#fab").innerHTML=ICON.mic+`<span class="sr">Capture a voice note</span>`;
  paintFab();
}
/* flow.js replaces this to add saved views and the Filters button. */
let chipsHTML=()=>COLLECTIONS.map(([k,l])=>`<button class="chip" data-act="view" data-view="${k}" aria-pressed="${S.view===k&&!S.tag}">${l}</button>`).join("")+
  `<button class="chip ghost" data-act="view" data-view="db" aria-pressed="${S.view==="db"}">Table</button>`+
  (S.tag?`<button class="chip" data-act="tag" data-tag="${esc(S.tag)}" aria-pressed="true">#${esc(S.tag)} ✕</button>`:"");
function paintFab(){const f=$("#fab");if(!f)return;f.classList.toggle("live",S.listening);f.setAttribute("aria-pressed",S.listening);
  f.innerHTML=(S.listening?ICON.stop:ICON.mic)+`<span class="sr">${S.listening?"Stop dictation":"Capture a voice note"}</span>`}

function setTab(t,o={}){
  S.tab=t;
  if(t==="notes"){S.view=o.view||(S.view==="db"&&o.keepDb?"db":S.view==="db"?"all":S.view);S.tag=o.tag||null}else S.tag=null;
  document.body.classList.toggle("v-page",t==="settings"||(t==="notes"&&S.view==="db"));
  document.body.classList.remove("pane-editor");
  S.q="";$("#q").value="";renderAll();
}
function setView(v){S.view=v;S.tag=null;document.body.classList.toggle("v-page",v==="db");document.body.classList.remove("pane-editor");renderAll()}
function renderAll(){renderChrome();renderList();renderEditor();renderPage()}
function refresh(chrome){renderList();if(chrome)renderChrome();if(S.tab==="notes"&&S.view==="db")renderDB()}

/* ---------- lists ---------- */
function renderList(){
  const box=$("#items");
  $("#searchBox").hidden=S.tab==="settings";
  $("#banner").innerHTML=typeof bannerHTML==="function"?bannerHTML():"";
  if(S.tab==="people")return renderPeopleList();
  if(S.tab==="journal"&&typeof renderJournalList==="function")return renderJournalList();
  if(S.tab==="followups"&&typeof renderFollowups==="function")return renderFollowups();
  if(S.tab==="followups")return renderRemindersBasic();
  const a=S.tab==="journal"?S.notes.filter(n=>n.type==="journal"):visible(),q=S.q;
  box.innerHTML=a.length?a.map(n=>row(n,q)).join(""):emptyNotes(q);
}
function emptyNotes(q){
  return `<div class="empty"><b>${q?"No matches":"No notes yet"}</b>${q?"Try fewer words.":"Tap the mic and just start talking."}${q?"":`<span class="tag">Notes that follow up.</span>`}</div>`}
function row(n,q){
  const r=n.reminder;
  const rp=r&&!isPrivateJ(n)?`<span class="pill ${r.done?"":isLate(n)?"late":"due"}">${ICON.bell}${esc(fmtWhen(r.at))}</span>`:"";
  const extra=typeof rowExtras==="function"?rowExtras(n):"";
  return `<button class="item ${S.sel===n.id?"on":""}" data-act="openNote" data-id="${n.id}"><div class="body"><div class="t">${n.pinned?"📌 ":""}${hl(titleOf(n),q)}</div><div class="s">${hl(previewOf(n),q)||"&nbsp;"}</div><div class="m"><span class="ty ty-${n.type}">${typeLabel(n.type)}</span>${rp}${extra}${n.tags.slice(0,3).map(t=>"<span>#"+esc(t)+"</span>").join("")}<span>${new Date(n.updated).toLocaleDateString([],{month:"short",day:"numeric"})}</span></div></div></button>`;
}
/* Basic reminders list; flow.js replaces it with the full Follow-ups tab. */
function renderRemindersBasic(){
  const a=S.notes.filter(n=>isDue(n)&&!isPrivateJ(n)).sort((x,y)=>x.reminder.at-y.reminder.at);
  $("#items").innerHTML=a.length?a.map(n=>row(n,S.q)).join(""):`<div class="empty"><b>Nothing coming up</b>Mention a date in any note and it shows up here.</div>`;
}
const check=()=>ICON.check;

/* ---------- people ---------- */
const AVC=["#B3261E","#9A5500","#2E6B45","#0F6B6B","#2F5FA3","#4B3FA3","#7A3FA3","#A33A6A"];
const avColor=n=>AVC[[...(n||"?")].reduce((a,c)=>a+c.charCodeAt(0),0)%AVC.length];
const initials=n=>(n||"").trim().split(/\s+/).slice(0,2).map(w=>w[0]).join("").toUpperCase()||"?";
const MN=["January","February","March","April","May","June","July","August","September","October","November","December"];
const today0=()=>{const n=new Date();return new Date(n.getFullYear(),n.getMonth(),n.getDate())};
function nextBday(p){if(!p.birthday)return null;const t=today0();let d=new Date(t.getFullYear(),p.birthday.m-1,p.birthday.d);if(d<t)d=new Date(t.getFullYear()+1,p.birthday.m-1,p.birthday.d);return d}
const daysTo=d=>Math.round((d-today0())/864e5);
function bdayText(p){const d=nextBday(p);if(!d)return"";const n=daysTo(d);
  const when=n===0?"Today":n===1?"Tomorrow":"in "+n+" days";
  const age=p.birthday.y?" · turns "+(d.getFullYear()-p.birthday.y):"";
  return(n===0?"🎂 Birthday ":"Birthday ")+when.toLowerCase().replace(/^./,c=>n<2?c.toUpperCase():c)+age}
function upcomingBdays(days){return S.people.filter(p=>p.birthday&&daysTo(nextBday(p))<=days).sort((a,b)=>nextBday(a)-nextBday(b))}
function personRow(p){const d=nextBday(p),n=d?daysTo(d):999;
  const fav=p.favorites.filter(f=>f.v).slice(0,2).map(f=>esc(f.v)).join(" · ");
  return `<button class="item ${S.selP===p.id?"on":""}" data-act="openPerson" data-pid="${p.id}"><span class="av" style="background:${avColor(p.name)}" aria-hidden="true">${esc(initials(p.name))}</span><div class="body"><div class="t">${esc(p.name||"New Person")}</div><div class="s">${esc([p.relation,fav].filter(Boolean).join(" · "))||"&nbsp;"}</div>${d&&n<=45?`<div class="m"><span class="pill ${n<=7?"due":""}">${esc(bdayText(p))}</span></div>`:""}</div></button>`}
function renderPeopleList(){
  const q=S.q.trim().toLowerCase();
  let a=S.people.filter(p=>!q||(p.name+" "+p.relation+" "+p.notes+" "+p.favorites.map(f=>f.k+" "+f.v).join(" ")).toLowerCase().includes(q));
  let html="";
  if(!S.people.length)html=`<div class="empty"><b>Nobody here yet</b>Tap + to add someone, or say “Sam’s birthday is March 4” in any note and Recall adds them.</div>`;
  else if(!a.length)html=`<div class="empty"><b>No matches</b>Try fewer words.</div>`;
  else{const soon=a.filter(p=>p.birthday&&daysTo(nextBday(p))<=45).sort((x,y)=>nextBday(x)-nextBday(y));
    if(soon.length&&!q)html+=`<div class="grp">Birthdays soon</div>`+soon.map(personRow).join("");
    html+=`<div class="grp">${q?"Results":"Everyone"}</div>`+a.slice().sort((x,y)=>(x.name||"~").localeCompare(y.name||"~")).map(personRow).join("")}
  $("#items").innerHTML=html;
}
const SUGG=["Favorite food","Favorite drink","Favorite color","Favorite place","Hobbies","Gift ideas","Allergies","Sizes","Phone","How we met"];
/* Notes linked to a person: explicit links plus notes that mention their first name. Private journals never count. */
function notesAbout(p){
  const first=(p.name||"").trim().split(/\s+/)[0];
  const re=first.length>1?new RegExp("\\b"+first.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"\\b","i"):null;
  return S.notes.filter(n=>!isPrivateJ(n)&&((n.personIds||[]).includes(p.id)||(re&&re.test(n.body))));
}
function renderPerson(){
  const p=pById(S.selP),ed=$("#editor");
  if(!p){ed.innerHTML=`<div class="placeholder">${ICON.person}<p>Select a person or add someone new</p></div>`;return}
  const b=p.birthday||{};
  ed.innerHTML=`<div class="bar"><button class="back" data-act="back">${ICON.back}People</button><span style="flex:1"></span><button class="ibtn danger" data-act="delPerson" aria-label="Delete person" title="Delete person">${ICON.trash}</button></div>
  <div class="scroll">
   <div class="phead"><div class="av lg" id="pav" style="background:${avColor(p.name)}" aria-hidden="true">${esc(initials(p.name))}</div><div style="flex:1;min-width:0"><input class="pname" id="pname" data-pf="name" value="${esc(p.name)}" placeholder="Name" aria-label="Name" autocomplete="off"><input class="prel" data-pf="relation" list="rels" value="${esc(p.relation)}" placeholder="Relationship" aria-label="Relationship"><datalist id="rels">${["Partner","Family","Friend","Colleague","Client","Mentor","Neighbor"].map(r=>`<option value="${r}">`).join("")}</datalist></div></div>
   <div class="card"><div class="ctitle">Birthday</div><div class="brow"><select class="field" data-pf="bm" aria-label="Month" style="width:auto"><option value="">Month</option>${MN.map((m,i)=>`<option value="${i+1}" ${b.m===i+1?"selected":""}>${m}</option>`).join("")}</select><input class="field" type="number" min="1" max="31" data-pf="bd" value="${b.d||""}" placeholder="Day" style="width:5.5rem" aria-label="Day"><input class="field" type="number" min="1900" max="2100" data-pf="by" value="${b.y||""}" placeholder="Year (optional)" style="width:9.5rem" aria-label="Year"></div><div class="bnote" id="bnote"></div></div>
   <div class="card"><div class="ctitle">Favorites and details</div><div id="favs"></div><div class="sugg" id="sugg"></div></div>
   <div class="card"><div class="ctitle">Notes</div><textarea class="field" data-pf="notes" aria-label="Notes about this person" placeholder="Anything worth remembering: what they’re going through, things they’ve said, things to ask about.">${esc(p.notes)}</textarea></div>
   <div class="card"><div class="ctitle">Notes about ${esc((p.name||"them").split(" ")[0]||"them")}</div><div id="ment"></div></div>
  </div>`;
  paintFavs();paintBnote();paintMent();
}
function paintFavs(){const p=pById(S.selP),el=$("#favs");if(!p||!el)return;
  el.innerHTML=p.favorites.map((f,i)=>`<div class="frow"><input data-fk="${i}" value="${esc(f.k)}" placeholder="Label" aria-label="Label"><input data-fv="${i}" value="${esc(f.v)}" placeholder="Value" aria-label="Value"><button data-act="favDel" data-i="${i}" aria-label="Remove ${esc(f.k||"detail")}">×</button></div>`).join("")||`<div class="hint">Nothing yet. Add a detail below.</div>`;
  const have=p.favorites.map(f=>f.k.toLowerCase());
  $("#sugg").innerHTML=SUGG.filter(x=>!have.includes(x.toLowerCase())).map(x=>`<button data-act="favAdd" data-k="${esc(x)}">+ ${esc(x)}</button>`).join("")+`<button data-act="favAdd" data-k="">+ Custom</button>`}
function paintBnote(){const p=pById(S.selP),el=$("#bnote");if(!p||!el)return;
  el.innerHTML=p.birthday?`${esc(bdayText(p))}<button data-act="pcal">Add to Calendar</button>`:"Add a birthday and Recall will remind you a week before and on the day."}
function paintMent(){const p=pById(S.selP),el=$("#ment");if(!p||!el)return;const first=(p.name||"").trim().split(/\s+/)[0];
  const list=notesAbout(p);
  el.innerHTML=list.length?list.slice(0,12).map(n=>`<button class="mention" data-act="mention" data-id="${n.id}">${esc(titleOf(n))}</button>`).join(""):`<span class="hint">Notes that mention ${esc(first||"them")} will appear here.</span>`}
let pSaveT;
function pSave(p,list=true){p.updated=Date.now();clearTimeout(pSaveT);pSaveT=setTimeout(()=>dbPut(p,"people"),250);if(list&&S.tab==="people")renderPeopleList();renderChrome()}
function createPerson(name=""){const p=RM.migratePerson({id:uid(),name});S.people.unshift(p);dbPut(p,"people");openPerson(p.id);setTimeout(()=>{const i=$("#pname");i&&i.focus()},50);return p}
function openPerson(id){if(S.tab!=="people"){S.tab="people";S.tag=null;document.body.classList.remove("v-page")}S.selP=id;document.body.classList.add("pane-editor");renderAll()}
function removePerson(id){const i=S.people.findIndex(p=>p.id===id);if(i<0)return;clearTimeout(pSaveT);const [g]=S.people.splice(i,1);dbDel(id,"people");S.selP=null;document.body.classList.remove("pane-editor");renderEditor();renderList();renderChrome();toast(`${g.name||"Person"} deleted`,()=>{S.people.push(g);dbPut(g,"people");renderList();renderChrome()})}
/* Exact name first. Otherwise match by first name only when one side is just a first name
   ("Maya" -> "Maya Lopez", or "Maya Lopez" -> an existing "Maya", which then gets the full name). */
function findPerson(name){const l=name.toLowerCase().trim(),f=l.split(/\s+/)[0],single=!/\s/.test(l);
  const m=S.people.find(p=>(p.name||"").toLowerCase().trim()===l);if(m)return m;
  const fm=S.people.filter(p=>{const pn=(p.name||"").toLowerCase().trim();return pn.split(/\s+/)[0]===f&&(single||!/\s/.test(pn))}).sort((a,b)=>b.updated-a.updated);
  if(fm[0]&&!single&&!/\s/.test(fm[0].name.trim()))fm[0].name=name;
  return fm[0]||null}
function extractPeople(n){
  if(!n||!n.body||isPrivateJ(n))return;n.ex=n.ex||{};const touched=new Set();let created=0;
  const get=name=>{let p=findPerson(name);if(!p){p=RM.migratePerson({id:uid(),name});S.people.unshift(p);created++}touched.add(p);return p};
  for(const f of extractFacts(n.body)){if(n.ex[f.key])continue;const p=get(f.name);
    if(f.kind==="birthday")p.birthday={m:f.birthday.m,d:f.birthday.d,y:f.birthday.y||(p.birthday&&p.birthday.y)||undefined};
    else{const ex=p.favorites.find(x=>x.k.toLowerCase()===f.k.toLowerCase());if(ex)ex.v=f.v;else p.favorites.push({k:f.k,v:f.v})}
    n.ex[f.key]=1}
  if(touched.size){touched.forEach(p=>{p.updated=Date.now();dbPut(p,"people");if(!(n.personIds||[]).includes(p.id)){n.personIds=(n.personIds||[]).concat(p.id)}});dbPut(n);renderChrome();if(S.tab==="people"){renderPeopleList();if(pById(S.selP))renderPerson()}
    const names=[...touched].map(p=>p.name.split(" ")[0]).join(", ");toast(created?`Added ${names} to People`:`Updated ${names}’s profile`)}
}
function downloadBdayICS(p){const d=nextBday(p),f=x=>x.getFullYear()+String(x.getMonth()+1).padStart(2,"0")+String(x.getDate()).padStart(2,"0");
  const e=new Date(d);e.setDate(e.getDate()+1);
  const ics=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Recall//EN","BEGIN:VEVENT","UID:bday-"+p.id+"@recall","DTSTAMP:"+new Date().toISOString().replace(/[-:]/g,"").replace(/\.\d{3}/,""),"DTSTART;VALUE=DATE:"+f(d),"DTEND;VALUE=DATE:"+f(e),"RRULE:FREQ=YEARLY","SUMMARY:"+p.name.replace(/[,;]/g," ")+"'s birthday","BEGIN:VALARM","TRIGGER:-P7D","ACTION:DISPLAY","DESCRIPTION:Birthday in a week","END:VALARM","BEGIN:VALARM","TRIGGER:PT9H","ACTION:DISPLAY","DESCRIPTION:Birthday today","END:VALARM","END:VEVENT","END:VCALENDAR"].join("\r\n");
  openICS((p.name||"birthday")+" birthday.ics",ics)}

/* ---------- editor ---------- */
const BACKLABEL={notes:"Notes",journal:"Journal",followups:"Follow-ups",people:"People"};
function renderEditor(){
  if(S.tab==="people"){renderPerson();return}
  const n=byId(S.sel),ed=$("#editor");
  if(!n||(S.tab==="notes"&&n.type==="journal")||(S.tab==="journal"&&n.type!=="journal")){ed.innerHTML=`<div class="placeholder">${ICON[S.tab==="journal"?"journal":"note"]}<p>${S.tab==="journal"?"Select an entry or write today’s":"Select a note or tap the mic"}</p></div>`;return}
  if(typeof renderThread==="function"&&S.tab==="followups"&&S.thread===n.id){renderThread(n);return}
  ed.innerHTML=`<div class="bar">
    <button class="back" data-act="back">${ICON.back}${BACKLABEL[S.tab]||"Notes"}</button>
    <button class="mic ${S.listening?"live":""}" id="mic" data-act="mic" aria-pressed="${S.listening}">${S.listening?ICON.stop+"Stop":ICON.mic+"Dictate"}</button>
    <span style="flex:1"></span>
    <button class="ibtn ${n.pinned?"on":""}" data-act="pin" aria-pressed="${n.pinned}" aria-label="Pin note" title="Pin">${ICON.pin}</button>
    <button class="ibtn danger" data-act="del" aria-label="Delete note" title="Delete">${ICON.trash}</button>
  </div>
  <div class="typebar" role="group" aria-label="Note type">${TYPES.map(([k,l])=>`<button class="chip" data-act="type" data-type="${k}" aria-pressed="${n.type===k}">${l}</button>`).join("")}</div>
  <div class="scroll">
    <div class="kbhint" id="kbHint" ${S.kbHint?"":"hidden"}>${ICON.mic}<span>${KB_HINT} It works even when built-in dictation doesn’t.</span><button data-act="kbX" aria-label="Dismiss">×</button></div>
    <div id="topBox"></div>
    <div id="remBox"></div>
    <textarea id="ta" aria-label="Note text" placeholder="${n.type==="journal"?"Write or speak today’s entry. This stays private.":"Start typing or tap Dictate. Mention a date like “call Sam tomorrow at 3pm” and I’ll set the reminder."}" spellcheck="true"></textarea>
    <div id="extraBox"></div>
    <div id="linkBox"></div>
    <div class="meta" id="metaRow" style="margin-top:.9rem"></div>
  </div>
  <div class="live-strip ${S.listening?"on":""}" id="strip" role="status"><i class="dot"></i><span id="interim">Listening…</span></div>`;
  const ta=$("#ta");ta.value=n.body;
  ta.addEventListener("input",()=>onEdit(ta.value));
  paintRem();paintMeta();paintLinks();if(typeof paintExtras==="function")paintExtras();
}
function paintRem(){
  const n=byId(S.sel);if(!n)return;const r=n.reminder,box=$("#remBox");if(!box)return;
  if(isPrivateJ(n)){box.innerHTML="";return}
  if(!r){box.innerHTML=`<div class="rem"><span style="color:var(--text2)">${ICON.bell}</span><span class="l" style="font-weight:500;color:var(--text2)">No reminder</span><input type="datetime-local" id="remIn" aria-label="Set reminder time"><button id="remSet">Set</button></div>`;
    $("#remSet").onclick=()=>{const v=$("#remIn").value;if(v)setRem(new Date(v).getTime(),false)};return}
  box.innerHTML=`<div class="rem"><span style="color:${isLate(n)?"var(--danger)":"var(--accent-text)"}">${ICON.bell}</span>
    <span class="l">${esc(fmtWhen(r.at))}<small>${r.done?"Done":isLate(n)?(coachActive()?"Overdue":"Earlier"):r.auto?"Detected from your note":"Set by you"}</small></span>
    <input type="datetime-local" id="remIn" value="${toLocalInput(r.at)}" aria-label="Reminder time">
    <button id="remSet">Change</button><button id="remDone">${r.done?"Reopen":"Mark done"}</button><button id="remClr" style="color:var(--danger)">Remove</button>
    <button class="calbtn" id="remCal">${ICON.cal}Add to Calendar</button></div>${calHintHTML()}`;
  $("#remSet").onclick=()=>{const v=$("#remIn").value;if(v)setRem(new Date(v).getTime(),false)};
  $("#remDone").onclick=()=>{n.reminder.done=!n.reminder.done;n.reminder.notified=n.reminder.done;save(n);paintRem();refresh(true)};
  $("#remCal").onclick=()=>{dismissCalHint();downloadICS(n)};
  $("#remClr").onclick=()=>{n.reminder=null;n.noAuto=true;save(n);paintRem();refresh(true)};
}
const coachActive=()=>typeof coachOn==="function"&&coachOn();
/* Honest about notifications: they only fire while Recall is open. The calendar is the guaranteed path. */
function calHintHTML(){return flag("recall.calHint")?"":`<div class="calhint" id="calHint"><b>Want an alert even when Recall is closed?</b> Recall can only remind you while it’s open. Tap <b>Add to Calendar</b> and your phone’s Calendar will alert you, guaranteed.<button data-act="calHintOk">Got it</button></div>`}
function dismissCalHint(){flag("recall.calHint","1");const h=$("#calHint");if(h)h.remove()}
function setRem(at,auto){const n=byId(S.sel);n.reminder={at,auto,done:false,notified:false};if(!auto)n.noAuto=false;save(n);paintRem();refresh(true);askNotif();toast("Reminder set for "+fmtWhen(at))}
/* [[Note title]] links: outgoing links and backlinks, shown under the note. */
const noteByTitle=t=>{t=t.toLowerCase();return S.notes.find(n=>titleOf(n).toLowerCase()===t)};
function paintLinks(){const n=byId(S.sel),el=$("#linkBox");if(!n||!el)return;
  if(isPrivateJ(n)){el.innerHTML="";return}
  const out=linksOf(n.body),me=titleOf(n).toLowerCase();
  const back=S.notes.filter(m=>m.id!==n.id&&!isPrivateJ(m)&&linksOf(m.body).some(t=>t.toLowerCase()===me));
  if(!out.length&&!back.length){el.innerHTML="";return}
  const outH=out.map(t=>{const m=noteByTitle(t);return m&&m.id!==n.id&&!isPrivateJ(m)?`<button class="mention" data-act="mention" data-id="${m.id}">${esc(titleOf(m))}</button>`:m?"":`<button class="mention newlink" data-act="newlink" data-t="${esc(t)}">+ Create “${esc(t)}”</button>`}).join("");
  el.innerHTML=`<div class="card links">${outH?`<div class="ctitle">Links</div>${outH}`:""}${back.length?`<div class="ctitle" ${outH?'style="margin-top:.8rem"':""}>Linked from</div>${back.map(m=>`<button class="mention" data-act="mention" data-id="${m.id}">${esc(titleOf(m))}</button>`).join("")}`:""}</div>`}
function paintMeta(){const n=byId(S.sel),el=$("#metaRow");if(!n||!el)return;
  const w=(n.body.trim().match(/\S+/g)||[]).length;
  el.innerHTML=`<span>${w} word${w===1?"":"s"}</span><span>·</span><span>Edited ${new Date(n.updated).toLocaleString([],{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})}</span>${isPrivateJ(n)?`<span class="priv">${ICON.lock}Private</span>`:""}${n.tags.map(t=>`<span class="pill">#${esc(t)}</span>`).join("")}${typeof metaExtras==="function"?metaExtras(n):""}`}

/* ---------- page: Settings and Table ---------- */
function renderPage(){
  const pg=$("#page");
  if(S.tab==="settings")renderSettings(); else if(S.tab==="notes"&&S.view==="db")renderDB(); else pg.innerHTML="";
}
function renderSettings(){
  const secs=SETTINGS.slice().sort((a,b)=>a.order-b.order).map(s=>`<section class="card" aria-labelledby="st-${s.id}"><div class="ctitle" id="st-${s.id}">${s.title}</div>${s.html()}</section>`).join("");
  const keep=$("#page").scrollTop;
  $("#page").innerHTML=`<div class="phead2"><h1>Settings</h1></div><div class="pbody">${secs}</div>`;
  $("#page").scrollTop=keep;
}
SETTINGS.push({id:"appearance",order:10,title:"Appearance",html:()=>`<div class="seg" role="group" aria-label="Theme">${[["system","System"],["light","Light"],["dark","Dark"]].map(([k,l])=>`<button data-act="theme" data-v="${k}" aria-pressed="${S.settings.theme===k}">${l}</button>`).join("")}</div>`});
SETTINGS.push({id:"notifs",order:60,title:"Reminders and notifications",html:()=>{
  const st="Notification" in window?Notification.permission:"unsupported";
  return `<p style="margin:.1rem 0 .6rem">Recall shows reminders and follow-ups <b>while the app is open</b>, with a “Due now” banner and a badge. It cannot wake your phone when it’s closed. For a guaranteed alert, tap <b>Add to Calendar</b> on any reminder and your Calendar will do it.</p>
  <div class="row">${st==="granted"?`<span class="pill">Notifications allowed</span>`:st==="denied"?`<span class="pill">Notifications blocked in browser settings</span>`:st==="unsupported"?`<span class="pill">Not available in this browser</span>`:`<button class="btn p" data-act="askNotif">Allow notifications</button>`}</div>
  <p class="hint">Closed-app push needs a small server. It’s stubbed for a later version.</p>`}});
SETTINGS.push({id:"data",order:70,title:"Your data",html:()=>`<p style="margin:.1rem 0 .6rem">Everything is stored on this device. Back it up now and then.</p>
  <div class="row"><button class="btn" data-act="exJson">Export JSON</button><button class="btn" data-act="exCsv">Export CSV</button><button class="btn p" data-act="imp">Import backup</button><input type="file" id="impF" accept=".json,application/json" hidden></div>
  <p class="hint">Backups include notes, journal entries, people and settings. Import merges into what you have and upgrades older (v1) backups.</p>
  <div class="row" id="snapRow"></div>`});
SETTINGS.push({id:"about",order:90,title:"About",html:()=>`<div class="row" style="gap:.8rem">${logo("logo")}<div><b style="font-family:var(--font-head);font-size:1.2rem">Recall 2</b><div class="hint" style="margin:0">Notes that follow up.</div></div></div>
  <p class="hint" style="margin-top:.8rem">Recall is a note-taking agent. It only acts on your notes, reminders and check-ins. It asks before sending, spending or deleting anything, and offers Undo. It is not a general chatbot.</p>
  <p class="hint">Known limits: reminders fire only while the app is open; date detection understands English; dictation support varies by language on iPhone.</p>`});

/* Table view of every note (sortable). */
const COLS=[["title","Title"],["type","Type"],["tags","Tags"],["reminder","Reminder"],["updated","Updated"],["created","Created"]];
function renderDB(){
  const a=S.notes.filter(n=>n.type!=="journal"),q=S.q.trim().toLowerCase();
  let rows=q?a.filter(n=>(n.body+" "+n.tags.join(" ")+" "+n.type).toLowerCase().includes(q)):a;
  const {k,asc}=S.sort,dir=asc?1:-1;
  const val=n=>k==="title"?titleOf(n).toLowerCase():k==="type"?n.type:k==="tags"?n.tags.join(","):k==="reminder"?(n.reminder?n.reminder.at:Infinity):n[k];
  rows.sort((x,y)=>{const a=val(x),b=val(y);return(a>b?1:a<b?-1:0)*dir});
  const wk=Date.now()-7*864e5;
  $("#page").innerHTML=`<div class="phead2"><h1>Table</h1><label class="search" style="min-width:14rem"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></svg><span class="sr">Filter rows</span><input id="dq" type="search" placeholder="Filter rows" value="${esc(S.q)}"></label><button class="btn" data-act="view" data-view="all">Done</button></div>
   <div class="stat"><div><b>${a.length}</b><small>Notes</small></div><div><b>${a.filter(n=>n.created>wk).length}</b><small>Added this week</small></div><div><b>${a.filter(isDue).length}</b><small>Open reminders</small></div><div><b>${new Set(a.flatMap(n=>n.tags)).size}</b><small>Tags</small></div><div><b>${S.people.length}</b><small>People</small></div></div>
   <div class="tw"><table><thead><tr>${COLS.map(([c,l])=>`<th scope="col" data-act="sort" data-k="${c}" tabindex="0" class="${k===c?"s "+(asc?"asc":""):""}">${l}</th>`).join("")}</tr></thead><tbody>${
    rows.map(n=>`<tr class="r" data-act="openFromTable" data-id="${n.id}" tabindex="0"><td class="ti">${esc(titleOf(n))}</td><td class="ty ty-${n.type}">${typeLabel(n.type)}</td><td>${n.tags.map(t=>"#"+esc(t)).join(" ")||"—"}</td><td>${n.reminder?`<span class="pill ${n.reminder.done?"":isLate(n)?"late":"due"}">${esc(fmtWhen(n.reminder.at))}</span>`:"—"}</td><td>${new Date(n.updated).toLocaleDateString()}</td><td>${new Date(n.created).toLocaleDateString()}</td></tr>`).join("")||`<tr><td colspan="6" class="empty">No rows</td></tr>`}</tbody></table></div>`;
}

/* ---------- actions ---------- */
let saveT;
function save(n){n.updated=Date.now();dbPut(n).catch(()=>toast("Couldn't save. Storage may be full or blocked."))}
function onEdit(v){
  const n=byId(S.sel);if(!n)return;
  const had=n.reminder?n.reminder.at:null,hadDone=n.reminder&&n.reminder.done;
  n.body=v;enrich(n,{keepType:!!n.typeLocked});n.updated=Date.now();
  clearTimeout(saveT);saveT=setTimeout(()=>dbPut(n),250);
  if((n.reminder?n.reminder.at:null)!==had){paintRem();if(n.reminder&&!hadDone)askNotif()}
  $$("[data-act=type]").forEach(b=>b.setAttribute("aria-pressed",b.dataset.type===n.type));
  paintMeta();paintLinks();refresh(true);if(typeof onEditExtras==="function")onEditExtras(n);
  clearTimeout(exT);exT=setTimeout(()=>extractPeople(n),1800);
}
let exT;
function open(id,{focus=true}={}){const prev=byId(S.sel);if(prev&&prev.id!==id)extractPeople(prev);S.sel=id;S.thread=null;document.body.classList.add("pane-editor");renderEditor();renderList();if(focus&&matchMedia("(min-width:861px)").matches)$("#ta")&&$("#ta").focus()}
function create(body="",opts={}){
  const n=newNote(body,opts);S.notes.unshift(n);dbPut(n);S.q="";$("#q").value="";
  const want=n.type==="journal"?"journal":S.tab==="journal"?"journal":"notes";
  if(S.tab!==want||S.view==="db"){S.tab=want;if(want==="notes"&&S.view==="db")S.view="all";document.body.classList.remove("v-page");S.tag=null}
  open(n.id);renderAll();return n}
function remove(id){const i=S.notes.findIndex(n=>n.id===id);if(i<0)return;clearTimeout(saveT);clearTimeout(exT);const [gone]=S.notes.splice(i,1);dbDel(id);
  S.sel=null;S.thread=null;if(S.listening)stopDictation();document.body.classList.remove("pane-editor");renderEditor();refresh(true);
  toast("Note deleted",()=>{S.notes.push(gone);dbPut(gone);refresh(true)})}
function applyTheme(){
  const t=S.settings.theme,r=document.documentElement;
  if(t==="system")r.removeAttribute("data-theme"); else r.setAttribute("data-theme",t);
  const dark=t==="dark"||(t==="system"&&matchMedia("(prefers-color-scheme:dark)").matches);
  $("#themeColor").setAttribute("content",dark?"#15171C":"#F3F0E9");
}

/* ---------- notifications + calendar ---------- */
function askNotif(){if("Notification" in window&&Notification.permission==="default")Notification.requestPermission().then(()=>{if(S.tab==="settings")renderSettings()}).catch(()=>{})}
function notify(title,body,tag){
  if(!("Notification" in window)||Notification.permission!=="granted")return;
  const opts={body,tag,icon:"icons/icon-192.png",badge:"icons/icon-192.png"};
  if(navigator.serviceWorker&&navigator.serviceWorker.controller)navigator.serviceWorker.ready.then(r=>r.showNotification(title,opts)).catch(()=>{});
  else try{new Notification(title,opts)}catch(_){}}
function downloadICS(n){
  const f=ms=>new Date(ms).toISOString().replace(/[-:]/g,"").replace(/\.\d{3}/,"");
  const at=n.reminder.at;
  const ics=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Recall//EN","BEGIN:VEVENT","UID:"+n.id+"@recall","DTSTAMP:"+f(Date.now()),"DTSTART:"+f(at),"DTEND:"+f(at+36e5),
   "SUMMARY:"+titleOf(n).replace(/[,;\n]/g," "),"DESCRIPTION:"+(n.body||"").replace(/\n/g,"\\n").replace(/[,;]/g," ").slice(0,900),
   "BEGIN:VALARM","TRIGGER:-PT15M","ACTION:DISPLAY","DESCRIPTION:Reminder","END:VALARM","END:VEVENT","END:VCALENDAR"].join("\r\n");
  openICS((titleOf(n).slice(0,30)||"reminder")+".ics",ics);
}
/* iPhone: a downloaded .ics just lands in Files. Opening it as a text/calendar page makes iOS show its
   "Add to Calendar" sheet, including from a Home Screen app. Elsewhere a normal download opens Calendar. */
const isIOS=/iP(hone|ad|od)/.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
function openICS(name,ics){
  if(isIOS){location.href="data:text/calendar;charset=utf-8,"+encodeURIComponent(ics);return}
  download(name,ics,"text/calendar")}

/* ---------- import / export ---------- */
/* On iPhone, the share sheet ("Save to Files", AirDrop, Mail) is the dependable way to get a file out of a
   Home Screen app. Everywhere else, a plain download. */
async function download(name,text,type){
  if(isIOS&&navigator.canShare){try{const f=new File([text],name,{type});if(navigator.canShare({files:[f]})){await navigator.share({files:[f],title:name});return}}catch(e){if(e&&e.name==="AbortError")return}}
  const a=document.createElement("a"),u=URL.createObjectURL(new Blob([text],{type}));a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),4000)}
function exportJSON(){download("recall-backup-"+new Date().toISOString().slice(0,10)+".json",JSON.stringify({app:"recall",version:RM.SCHEMA,notes:S.notes,people:S.people,settings:S.settings},null,2),"application/json")}
function exportCSV(){const q=s=>'"'+String(s).replace(/"/g,'""')+'"';
  const rows=[["title","type","tags","reminder","done","created","updated","body"]].concat(S.notes.map(n=>[titleOf(n),n.type,n.tags.join(" "),n.reminder?new Date(n.reminder.at).toISOString():"",n.reminder&&n.reminder.done?"yes":"",new Date(n.created).toISOString(),new Date(n.updated).toISOString(),n.body]));
  download("recall-"+new Date().toISOString().slice(0,10)+".csv",rows.map(r=>r.map(q).join(",")).join("\n"),"text/csv")}
async function importJSON(file){
  let r;try{r=RM.normalizeImport(JSON.parse(await file.text()))}catch(_){toast("That file isn’t a Recall backup.");return}
  for(const p of r.people){const i=S.people.findIndex(x=>x.id===p.id);if(i>=0)S.people[i]=p;else S.people.push(p);await dbPut(p,"people")}
  for(const n of r.notes){const i=S.notes.findIndex(x=>x.id===n.id);if(i>=0)S.notes[i]=n;else S.notes.push(n);await dbPut(n)}
  if(r.settings){S.settings=r.settings;await saveSettings();applyTheme()}
  renderAll();toast("Imported "+r.notes.length+" notes"+(r.people.length?" and "+r.people.length+" people":"")+(r.skipped?` (${r.skipped} skipped)`:""))}
async function paintSnapshot(){
  const el=$("#snapRow");if(!el)return;const snap=await metaGet("preMigrationBackup").catch(()=>null);
  if(snap)el.innerHTML=`<button class="btn" data-act="exSnap">Download my original v1 data (${snap.notes.length} notes)</button>`}

/* ---------- toast + sheets ---------- */
let toastT;
function toast(msg,undo,ms,label){const t=$("#toast");t.innerHTML=esc(msg)+(undo?`<button data-act="toastAct">${label||(/⏰|🎂/.test(msg)?"Open":"Undo")}</button>`:"");t.classList.add("on");
  t._undo=undo||null;
  clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove("on"),ms||(undo?6500:3200))}
ACT.toastAct=()=>{const t=$("#toast");if(t._undo){const f=t._undo;t._undo=null;f()}t.classList.remove("on")};
let sheetReturn=null;
function openSheet(html,label){
  sheetReturn=document.activeElement;
  $("#sheetHost").innerHTML=`<div class="scrim" data-act="sheetScrim"><div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(label||"Options")}">${html}</div></div>`;
  const f=$("#sheetHost .sheet button,#sheetHost .sheet select,#sheetHost .sheet input");if(f)f.focus();
}
function closeSheet(){$("#sheetHost").innerHTML="";if(sheetReturn&&sheetReturn.focus)try{sheetReturn.focus()}catch(_){}sheetReturn=null}
ACT.sheetScrim=(el,e)=>{if(e.target===el)closeSheet()};
