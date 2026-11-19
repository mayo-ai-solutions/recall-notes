"use strict";
/* Follow-ups UI (stage 5): proposal card, status card, priority, Follow-ups tab, banner, notifications.
   Pure logic lives in followups.js. Private journal entries never reach any of this (FU.eligible). */
const FU=RecallFollowUps;
const kindLabel={reminder:"Reminder",followup:"Follow-up",checkin:"Check-in"};
dueNowCount=()=>FU.dueCount(S.notes,Date.now());
const snapFU=n=>JSON.stringify({r:n.reminder||null,f:n.fu||null,q:!!n.qDismissed,p:n.priority||null,h:n.priorityHistory||[]});
const restoreFU=(n,s)=>{const o=JSON.parse(s);n.reminder=o.r;n.fu=o.f;n.qDismissed=o.q;n.priority=o.p;n.priorityHistory=o.h;save(n)};
const prioWords=["","Barely","Low","Medium","High","Top priority"];

/* ---------- note editor: proposal / status / priority ---------- */
function fuPart(n){
  if(!FU.eligible(n)||n.type==="journal")return "";
  const ta=$("#ta");if(ta&&document.activeElement===ta)return "";   // don't interrupt typing
  let h="";
  if(n.fu&&n.fu.state==="open"){
    h+=`<div class="card fu-status"><div class="row">${ICON.bell}<b>Check back ${esc(fmtWhen(n.fu.at))}</b></div><div class="row"><button class="tbtn" data-act="fuSnz" data-id="${n.id}" data-k="followup">Snooze</button><button class="tbtn" data-act="fuRes" data-id="${n.id}" data-k="followup">Reschedule</button><button class="tbtn" data-act="fuCal">Add to Calendar</button><button class="tbtn" data-act="fuCancel" style="color:var(--danger)">Cancel</button></div></div>`;
  }else if(FU.shouldPropose(n)){
    const qs=FU.generateQuestions(n);
    h+=`<div class="suggest" role="group" aria-label="Follow-up suggestion"><h3>${ICON.bell}<span>Want me to check back on this?</span><button class="x" data-act="fuNot" aria-label="Dismiss suggestion">×</button></h3>
      <div class="sugg">${FU.quickPicks().map(p=>`<button data-act="fuPick" data-at="${p.at}">${esc(p.label)}</button>`).join("")}<button data-act="fuRes" data-id="${n.id}" data-k="followup">Pick a time</button></div>`+
      (Array.isArray(qs)&&qs.length?`<div class="bnote" style="margin-top:.7rem">Something to think about:</div><div class="sugg" style="flex-direction:column;align-items:stretch">${qs.map((q,i)=>`<button data-act="fuQ" data-i="${i}" style="text-align:left;padding:.5rem .8rem;height:auto">${esc(q)}</button>`).join("")}</div>`:"")+`</div>`;
  }
  if(n.type==="idea"&&n.body.trim().length>=12){
    const t=FU.priorityTrend(n.priorityHistory);
    h+=`<div class="card fu-prio" role="group" aria-label="Idea priority"><div class="row sp"><b>How important is this now?</b>${n.priority?`<span class="trend ${t==="rising"?"up":t==="falling"?"down":""}">${t==="rising"?"↑ Rising":t==="falling"?"↓ Falling":t==="steady"?"→ Steady":""}</span>`:""}</div>
      <div class="sugg">${[1,2,3,4,5].map(v=>`<button data-act="prio" data-v="${v}" aria-pressed="${n.priority===v}" aria-label="${v}, ${prioWords[v]}">${v}</button>`).join("")}</div>${n.priority?`<div class="bnote">${prioWords[n.priority]}. I’ll ask again later so you can see the trend.</div>`:""}</div>`;
  }
  return h;
}
EXTRA_PARTS.push(fuPart);
document.addEventListener("focusout",e=>{if(e.target&&e.target.id==="ta"){const n=byId(S.sel);if(n&&typeof onEditExtras==="function")setTimeout(()=>onEditExtras(byId(S.sel)||n),0)}});

function rowFU(n){
  if(!FU.eligible(n))return "";
  let s="";
  if(n.fu&&n.fu.state==="open"){const late=n.fu.at<Date.now();s+=`<span class="pill ${late?"late":"due"}">${ICON.bell}${esc(fmtWhen(n.fu.at))}</span>`}
  if(n.type==="idea"&&n.priority){const t=FU.priorityTrend(n.priorityHistory);s+=`<span class="pill">P${n.priority}${t==="rising"?" ↑":t==="falling"?" ↓":""}</span>`}
  return s;
}

/* ---------- actions on a note ---------- */
ACT.fuPick=el=>{const n=byId(S.sel);if(!n)return;const s=snapFU(n);FU.schedule(n,+el.dataset.at);save(n);paintExtras();refresh(true);
  toast("I’ll check back "+fmtWhen(+el.dataset.at),()=>{restoreFU(n,s);paintExtras();refresh(true)});askNotif()};
ACT.fuNot=()=>{const n=byId(S.sel);if(!n)return;n.qDismissed=true;save(n);paintExtras()};
ACT.fuCancel=()=>{const n=byId(S.sel);if(!n)return;const s=snapFU(n);FU.drop(n);save(n);paintExtras();refresh(true);toast("Check-in removed",()=>{restoreFU(n,s);paintExtras();refresh(true)})};
ACT.fuCal=()=>{const n=byId(S.sel);if(n&&n.fu)downloadICS(n,n.fu.at)};
ACT.prio=el=>{const n=byId(S.sel);if(!n)return;const s=snapFU(n);FU.recordPriority(n,+el.dataset.v);save(n);paintExtras();refresh();toast("Priority "+n.priority,()=>{restoreFU(n,s);paintExtras();refresh()})};

/* ---------- Snooze / Reschedule (sheets) ---------- */
function fuTarget(el){const n=byId(el.dataset.id);return n?{n,k:el.dataset.k}:null}
function applyAt(n,k,at,how){
  const s=snapFU(n);
  if(k==="reminder"&&n.reminder){n.reminder.at=at;n.reminder.notified=false;n.reminder.done=false;if(how==="snooze")n.reminder.snoozes=(n.reminder.snoozes||0)+1}
  else if(n.fu){how==="snooze"?FU.snooze(n,at):FU.reschedule(n,at)}
  else FU.schedule(n,at);
  save(n);return s}
function afterChange(n,s,msg){closeSheet();refresh(true);if(S.tab==="followups")renderList();paintExtras&&$("#extraBox")&&paintExtras();toast(msg,()=>{restoreFU(n,s);renderAll()})}
ACT.fuSnz=el=>{const t=fuTarget(el);if(!t)return;
  openSheet(`<h3 style="margin:.2rem 0 .6rem">Snooze until…</h3><div class="sugg" style="flex-direction:column;align-items:stretch">${FU.snoozeOptions().map(o=>`<button data-act="fuSnzPick" data-id="${t.n.id}" data-k="${t.k}" data-at="${o.at}" style="text-align:left">${esc(o.label)} <small style="color:var(--text2)">${esc(fmtWhen(o.at))}</small></button>`).join("")}</div><button class="tbtn" data-act="sheetClose" style="margin-top:.6rem">Cancel</button>`,"Snooze")};
ACT.fuSnzPick=el=>{const t=fuTarget(el);if(!t)return;const s=applyAt(t.n,t.k,+el.dataset.at,"snooze");afterChange(t.n,s,"Snoozed until "+fmtWhen(+el.dataset.at))};
ACT.fuRes=el=>{const t=fuTarget(el);if(!t)return;const cur=(t.k==="reminder"&&t.n.reminder?t.n.reminder.at:t.n.fu?t.n.fu.at:Date.now()+864e5);
  openSheet(`<h3 style="margin:.2rem 0 .6rem">Pick a time</h3><div class="row"><input type="datetime-local" id="fuIn" value="${toLocalInput(cur)}" aria-label="New time" style="flex:1;min-height:2.75rem;border:1px solid var(--line);border-radius:.6rem;padding:0 .6rem;background:var(--surface)"><button class="tbtn" data-act="fuResPick" data-id="${t.n.id}" data-k="${t.k}" style="background:var(--amber);color:var(--charcoal);min-height:2.75rem;padding:0 1.2rem">Set</button></div><button class="tbtn" data-act="sheetClose" style="margin-top:.6rem">Cancel</button>`,"Reschedule")};
ACT.fuResPick=el=>{const t=fuTarget(el),v=$("#fuIn")&&$("#fuIn").value;if(!t||!v)return;const at=new Date(v).getTime();if(!isFinite(at))return;
  const s=applyAt(t.n,t.k,at,"reschedule");afterChange(t.n,s,"Set for "+fmtWhen(at))};
ACT.fuDone=el=>{const t=fuTarget(el);if(!t)return;const n=t.n,s=snapFU(n);
  if(t.k==="reminder"&&n.reminder){n.reminder.done=true;n.reminder.notified=true}else FU.complete(n);
  save(n);refresh(true);renderList();toast("Done",()=>{restoreFU(n,s);refresh(true);renderList()})};

/* ---------- Follow-ups tab ---------- */
function agendaRow(e){
  const n=e.n,late=e.at<Date.now();
  return `<div class="fu ${late?"late":""}"><button class="fu-t" data-act="openNote" data-id="${n.id}">${esc(titleOf(n))}</button>
    <div class="m"><span class="pill ${late?"late":"due"}">${ICON.bell}${esc(fmtWhen(e.at))}</span><span class="pill">${kindLabel[e.kind]}</span>${e.kind==="followup"&&FU.needsReask(n)?`<span class="pill">Snoozed ${n.fu.snoozes}×</span>`:""}</div>
    <div class="row fu-a"><button class="tbtn" data-act="fuDone" data-id="${n.id}" data-k="${e.kind==="reminder"?"reminder":"followup"}">${ICON.check}Done</button><button class="tbtn" data-act="fuSnz" data-id="${n.id}" data-k="${e.kind==="reminder"?"reminder":"followup"}">Snooze</button><button class="tbtn" data-act="fuRes" data-id="${n.id}" data-k="${e.kind==="reminder"?"reminder":"followup"}">Reschedule</button>${typeof checkInBtn==="function"?checkInBtn(n,e):""}</div></div>`;
}
function birthdaysSoon(){return S.people.filter(p=>p.birthday).map(p=>({p,d:daysTo(nextBday(p))})).filter(x=>x.d<=30).sort((a,b)=>a.d-b.d)}
function renderFollowups(){
  const q=S.q.trim().toLowerCase();
  let es=FU.agenda(S.notes);if(q)es=es.filter(e=>(e.n.body||"").toLowerCase().includes(q));
  const b=FU.bucket(es),bd=q?[]:birthdaysSoon();
  const sec=(label,list)=>list.length?`<div class="sec">${label}</div>`+list.map(agendaRow).join(""):"";
  let h=sec(coachActive()?"Overdue":"Earlier",b.overdue)+sec("Today",b.today)+sec("Upcoming",b.upcoming);
  if(bd.length)h+=`<div class="sec">Birthdays</div>`+bd.map(x=>`<button class="item" data-act="openPerson" data-pid="${x.p.id}"><div class="body"><div class="t">🎂 ${esc(x.p.name||"Someone")}</div><div class="s">${x.d===0?"Today":x.d===1?"Tomorrow":"In "+x.d+" days"}</div></div></button>`).join("");
  $("#items").innerHTML=h||`<div class="empty"><b>${q?"No matches":"Nothing to follow up on"}</b>${q?"Try fewer words.":"Mention a date in a note, or tap “Check back” on one, and it shows up here."}<span class="tag">Notes that follow up.</span></div>`;
}

/* ---------- banner + notifications ---------- */
function bannerHTML(){
  if(S.tab==="followups"||S.tab==="settings")return "";
  const c=dueNowCount();if(!c)return "";
  return `<div class="banner" role="status"><span>${c} due now</span><button data-act="tab" data-tab="followups" style="min-height:2.75rem">Review</button></div>`;
}
function checkFollowups(){
  let changed=false;
  S.notes.forEach(n=>{const f=n.fu;
    if(f&&f.state==="open"&&!f.notified&&f.at<=Date.now()&&FU.eligible(n)){
      f.notified=true;changed=true;dbPut(n);
      notify(titleOf(n),"Check-in · "+fmtWhen(f.at),n.id);
      toast("🔔 "+titleOf(n),()=>{S.tab="followups";document.body.classList.remove("v-page");open(n.id);renderAll()});
    }});
  return changed;
}
