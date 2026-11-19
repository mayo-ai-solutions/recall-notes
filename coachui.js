"use strict";
/* Accountability Coach UI (stage 7). Every check goes through coachOn(), which asks hasFeature("coach") AND the user's toggle.
   Off by default. Template wording only (no live AI, nothing leaves the device). No scores of any kind. */
const CO=RecallCoach;
const coachOn=()=>CO.active(S.settings);                 // CO.active calls hasFeature("coach")
const personaId=()=>CO.personaOf(S.settings.persona).id;

/* Settings */
SETTINGS.push({id:"coach",order:40,title:"Accountability Coach",html:()=>{
  const on=coachOn();
  return `<p class="hint" style="margin:.1rem 0 .6rem">Gentle nudges to follow through on your own notes. It uses fixed wording on your phone, not live AI, and nothing is sent anywhere. There are no scores. Off by default.</p>`+
    toggleHTML("pref",S.settings.coachOn,"Turn on the coach","Weekly review, nudges for things waiting, and a next-step question when you are still on something.",'data-k="coachOn"')+
    (S.settings.coachOn?`<div class="ctitle" id="personaL" style="margin-top:.9rem">Style</div><div class="personas" role="radiogroup" aria-labelledby="personaL">${CO.PERSONAS.map(p=>`<button role="radio" aria-checked="${personaId()===p.id}" data-act="persona" data-id="${p.id}"><b>${esc(p.name)}</b><small>${esc(p.blurb)}</small></button>`).join("")}</div>`:"")+
    (S.settings.coachOn&&!hasFeature("coach")?`<p class="hint" style="margin-top:.6rem">The coach isn’t included in your current plan.</p>`:"");
}});
ACT.persona=el=>{S.settings.persona=el.dataset.id;saveSettings();renderSettings()};
ACT.coachReviewDone=()=>{S.settings.lastReview=Date.now();saveSettings();renderList()};
ACT.coachKeep=el=>{const n=byId(el.dataset.id);if(!n||!n.fu)return;n.fu.snoozes=0;save(n);renderList();toast("Okay, keeping it.")};
ACT.coachSmall=el=>{const n=byId(el.dataset.id);if(n)startThread(n,"question",{question:"What is a smaller first step you could take on this?"})};
ACT.coachDrop=el=>{const n=byId(el.dataset.id);if(!n)return;const s=snapFU(n);FU.drop(n);save(n);refresh(true);renderList();toast("Dropped. The note stays.",()=>{restoreFU(n,s);refresh(true);renderList()})};

/* Cards at the top of the Follow-ups tab */
function coachCards(){
  if(!coachOn())return "";
  const pid=personaId(),pname=CO.personaOf(pid).name,now=Date.now();let h="";
  const who=`<div class="who">${ICON.bell}<span>${esc(pname)}</span></div>`;
  if(CO.reviewDue(S.settings,now)){
    const r=CO.weeklyReview(S.notes,now,pid);
    h+=`<div class="coach" role="region" aria-label="Weekly review">${who}<p>${esc(r.intro)} ${esc(r.summary)}.</p>`+
      (r.focus.length?`<p><b>Next up:</b></p><ul style="margin:.2rem 0 .4rem 1.1rem">${r.focus.map(x=>`<li>${esc(x.title)}</li>`).join("")}</ul>`:"")+
      (r.rising.length?`<p>Rising ideas: ${r.rising.map(x=>esc(x.title)).join(", ")}.</p>`:"")+
      `<div class="row"><button class="tbtn" data-act="coachReviewDone" style="min-height:2.75rem">Got it</button></div></div>`}
  const rk=CO.reasks(S.notes,pid)[0];
  if(rk)h+=`<div class="coach" role="region" aria-label="Moved a few times">${who}<p>${esc(rk.text)}</p><div class="row"><button class="tbtn" data-act="coachKeep" data-id="${rk.id}">Keep it</button><button class="tbtn" data-act="coachSmall" data-id="${rk.id}">Make it smaller</button><button class="tbtn" data-act="coachDrop" data-id="${rk.id}" style="color:var(--danger)">Drop it</button></div></div>`;
  const nd=CO.nudges(S.notes,now,pid,1).find(x=>!rk||x.id!==rk.id);
  if(nd)h+=`<div class="coach" role="region" aria-label="Nudge">${who}<p>${esc(nd.text)}</p></div>`;
  return h;
}
/* Used by the follow-up engine and notifications; empty when the coach is off. */
const coachOpts=n=>coachOn()?CO.opts(n,personaId()):{};
const coachDue=n=>coachOn()?CO.message("due",personaId(),{t:CO.titleOf(n)},n.id):"";
