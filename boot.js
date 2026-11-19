"use strict";
/* Events and startup. Every clickable thing carries data-act="name"; the handler lives in the ACT map (any file). */

/* ---------- core actions ---------- */
ACT.tab=el=>setTab(el.dataset.tab);
ACT.view=el=>setView(el.dataset.view);
ACT.tag=el=>{const t=el.dataset.tag;S.tab="notes";S.view=S.view==="db"?"all":S.view;S.tag=S.tag===t?null:t;document.body.classList.remove("v-page","pane-editor");renderAll()};
ACT.new=()=>create("");
ACT.newJournal=()=>create("",journalOpts());
ACT.newPerson=()=>createPerson();
ACT.openNote=el=>open(el.dataset.id);
ACT.openFromTable=el=>{setView("all");open(el.dataset.id)};
ACT.mention=el=>{const n=byId(el.dataset.id);if(!n)return;S.tab=n.type==="journal"?"journal":"notes";if(S.view==="db")S.view="all";document.body.classList.remove("v-page");renderAll();open(n.id)};
ACT.newlink=el=>{const cur=byId(S.sel);if(cur)extractPeople(cur);create(el.dataset.t+"\n");const ta=$("#ta");if(ta){ta.focus();ta.setSelectionRange(ta.value.length,ta.value.length)}};
ACT.openPerson=el=>openPerson(el.dataset.pid);
ACT.delPerson=()=>removePerson(S.selP);
ACT.favDel=el=>{const p=pById(S.selP);p.favorites.splice(+el.dataset.i,1);pSave(p);paintFavs()};
ACT.favAdd=el=>{const p=pById(S.selP),k=el.dataset.k;p.favorites.push({k,v:""});pSave(p,false);paintFavs();
  const rows=$$("[data-fv]");const target=k?rows[rows.length-1]:$$("[data-fk]")[rows.length-1];target&&target.focus()};
ACT.pcal=()=>downloadBdayICS(pById(S.selP));
ACT.back=()=>{if(S.listening)stopDictation();const n=byId(S.sel);if(n)extractPeople(n);S.thread=null;document.body.classList.remove("pane-editor");renderList();renderChrome()};
ACT.pin=()=>{const n=byId(S.sel);n.pinned=!n.pinned;save(n);renderEditor();refresh(true)};
ACT.del=()=>remove(S.sel);
ACT.type=el=>{const n=byId(S.sel);if(!n)return;const t=el.dataset.type,was=n.type;n.type=t;n.typeLocked=true;
  if(t==="journal"){n.journalDate=n.journalDate||RM.dateKey(n.created);if(n.reminder&&n.reminder.auto)n.reminder=null;if(S.tab==="notes")S.tab="journal";toast("Moved to Journal. It stays private.")}
  else{enrich(n,{keepType:true});if(S.tab==="journal"){S.tab="notes";S.view="all"}}
  save(n);renderAll();if(was==="journal"&&t!=="journal")toast("Moved to Notes")};
ACT.kbX=()=>{S.kbHint=false;$("#kbHint").hidden=true};
ACT.calHintOk=()=>dismissCalHint();
ACT.theme=el=>{S.settings.theme=el.dataset.v;saveSettings();applyTheme();renderSettings()};
ACT.askNotif=()=>askNotif();
ACT.exJson=()=>exportJSON();
ACT.exCsv=()=>exportCSV();
ACT.imp=()=>$("#impF").click();
ACT.exSnap=async()=>{const s=await metaGet("preMigrationBackup");if(s)download("recall-original-v1-data.json",JSON.stringify({app:"recall",version:1,notes:s.notes,people:s.people},null,2),"application/json")};
ACT.sort=el=>{const k=el.dataset.k;S.sort=S.sort.k===k?{k,asc:!S.sort.asc}:{k,asc:k==="title"||k==="reminder"};renderDB()};

document.addEventListener("click",e=>{
  const el=e.target.closest("[data-act]");if(!el)return;
  const fn=ACT[el.dataset.act];if(fn)fn(el,e);
});
document.addEventListener("input",e=>{
  const t=e.target,d=t.dataset||{};
  if(d.in&&INP[d.in]){INP[d.in](t,e);return}
  if(d.pf||d.fk!==undefined||d.fv!==undefined){const p=pById(S.selP);if(!p)return;
    if(d.fk!==undefined)p.favorites[+d.fk].k=t.value; else if(d.fv!==undefined)p.favorites[+d.fv].v=t.value;
    else if(["bm","bd","by"].includes(d.pf)){const g=x=>document.querySelector('[data-pf="'+x+'"]').value;const m=+g("bm"),dd=+g("bd"),y=+g("by");
      p.birthday=m&&dd>=1&&dd<=31?{m,d:dd,y:y>=1900?y:undefined}:null;paintBnote()}
    else{p[d.pf]=t.value;if(d.pf==="name"){const av=$("#pav");av.textContent=initials(p.name);av.style.background=avColor(p.name);paintMent()}}
    pSave(p);return}
  if(t.id==="q"||t.id==="dq"){S.q=t.value;if(t.id==="q")renderList();else{const p=t.selectionStart;renderDB();const i=$("#dq");i.focus();i.setSelectionRange(p,p)}}
});
document.addEventListener("change",e=>{
  const t=e.target,d=t.dataset||{};
  if(d.chg&&CHG[d.chg]){CHG[d.chg](t,e);return}
  if(d.pf==="bm"){t.dispatchEvent(new Event("input",{bubbles:true}));return}
  if(t.id==="impF"&&t.files[0]){importJSON(t.files[0]);t.value=""}
});
document.addEventListener("focusout",e=>{if(e.target.id==="ta"){const n=byId(S.sel);if(n)extractPeople(n)}});
document.addEventListener("keydown",e=>{
  if(e.key==="Escape"&&$("#sheetHost .sheet")){closeSheet();return}
  // Spans and rows that act like buttons: Enter / Space activate them.
  const t=e.target;if((e.key==="Enter"||e.key===" ")&&t.dataset&&t.dataset.act&&!/^(BUTTON|INPUT|TEXTAREA|SELECT|A)$/.test(t.tagName)){e.preventDefault();t.click();return}
  if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==="n"){e.preventDefault();create("")}
  if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==="k"){e.preventDefault();setTab("notes");$("#q").focus()}
  if((e.metaKey||e.ctrlKey)&&e.shiftKey&&e.key.toLowerCase()==="d"){e.preventDefault();S.listening?stopDictation():startDictation()}
});
$("#side").addEventListener("keydown",()=>{});
matchMedia("(prefers-color-scheme:dark)").addEventListener&&matchMedia("(prefers-color-scheme:dark)").addEventListener("change",()=>applyTheme());

/* ---------- reminders (checked while the app is open) ---------- */
function checkReminders(){
  let changed=false;
  S.notes.forEach(n=>{const r=n.reminder;if(r&&!r.done&&!r.notified&&r.at<=Date.now()&&!isPrivateJ(n)){
    r.notified=true;changed=true;dbPut(n);
    notify(titleOf(n),"Reminder · "+fmtWhen(r.at),n.id);
    toast("⏰ "+titleOf(n),()=>{S.tab="followups";document.body.classList.remove("v-page");open(n.id);renderAll()});
  }});
  S.people.forEach(p=>{if(!p.birthday)return;const nb=nextBday(p),dt=daysTo(nb);
    [[0,"is today 🎂"],[7,"is in one week"]].forEach(([lead,txt])=>{if(dt!==lead)return;const key=nb.getFullYear()+"-"+lead;p.bn=p.bn||{};if(p.bn[key])return;p.bn[key]=1;dbPut(p,"people");changed=true;
      notify((p.name||"Someone")+"’s birthday","Birthday "+txt,"b"+p.id);
      toast("🎂 "+(p.name||"Someone")+"’s birthday "+txt,()=>openPerson(p.id))})});
  if(typeof checkFollowups==="function"&&checkFollowups())changed=true;
  if(changed)refresh(true);
}

/* ---------- boot ---------- */
async function seed(){
  const samples=[
   "Welcome to Recall\nNotes that follow up. Tap the mic and talk, or type. Mention a date and I’ll set a reminder. #start",
   "Idea: monthly open-mic night for local comedians #ideas\nWhat if we ran it once a month and recorded each set for clips?",
   "Learned: spaced repetition beats cramming\nReview a new fact after 1 day, 3 days, then 7 days. Lesson from the memory course. #learning",
   "Call the caterer tomorrow at 10am to confirm the headcount and deposit #events",
   "Submit insurance renewal on Friday at 2pm #admin"];
  for(let i=0;i<samples.length;i++){const n=newNote(samples[i],i===0?{type:"note",typeLocked:true}:{});n.created=n.updated=Date.now()-i*3600e3;S.notes.push(n);await dbPut(n)}
}
(async function boot(){
  try{DB=await idb();await migrateStored();S.notes=await dbAll();S.people=await dbAll("people");
    let seeded=false;try{seeded=localStorage.getItem("recall.seeded")}catch(_){}
    if(!S.notes.length&&!seeded){await seed();try{localStorage.setItem("recall.seeded","1")}catch(_){}}
    let sp=false;try{sp=localStorage.getItem("recall.seededP")}catch(_){}
    if(!S.people.length&&!sp){const d=new Date();d.setDate(d.getDate()+12);const p=RM.migratePerson({id:uid(),name:"Sam Rivera",relation:"Friend (sample)",birthday:{m:d.getMonth()+1,d:d.getDate()},favorites:[{k:"Favorite food",v:"Birria tacos"},{k:"Favorite drink",v:"Oat flat white"},{k:"Gift ideas",v:"Vinyl records, hot sauce"}],notes:"Sample profile. Edit or delete it. Try saying “Sam’s favorite color is green” in a note."});S.people.push(p);await dbPut(p,"people");try{localStorage.setItem("recall.seededP","1")}catch(_){}}
    if(navigator.storage&&navigator.storage.persist)navigator.storage.persist().catch(()=>{});
  }catch(err){toast("Storage unavailable. Notes won’t be saved in this browser mode.")}
  applyTheme();
  renderAll();paintSnapshot();
  if(matchMedia("(min-width:861px)").matches){const v=visible();if(v.length)open(v[0].id,{focus:false})}
  if("serviceWorker" in navigator&&location.protocol!=="file:")navigator.serviceWorker.register("sw.js").catch(()=>{});
  checkReminders();setInterval(checkReminders,20000);
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)checkReminders()});
  window.__recallReady=true;
})();
