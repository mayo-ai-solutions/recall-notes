"use strict";
/* Notes as a living database (stage 8): filters, saved views, People chips on notes. Pure logic is RecallLib.filterNotes.
   Private journal entries are never returned by the filter, so they can't be reached through a saved view either. */
const FL={type:"Type",tag:"Tag",person:"Person",priority:"Priority",lang:"Language",date:"Updated"};
const DATE_OPTS=[["","Any time"],["today","Today"],["7d","Last 7 days"],["30d","Last 30 days"]];
const views=()=>Array.isArray(S.settings.views)?S.settings.views:(S.settings.views=[]);
const activeView=()=>views().find(v=>RL.sameFilter(v.filter,S.filter));

const _chips=chipsHTML;
chipsHTML=()=>{
  const c=RL.filterCount(S.filter),av=activeView();
  return _chips()+
    `<button class="chip ghost" data-act="filters" aria-haspopup="dialog" aria-pressed="${c>0&&!av}">Filters${c?` · ${c}`:""}</button>`+
    views().map(v=>`<button class="chip" data-act="viewApply" data-id="${esc(v.id)}" aria-pressed="${!!av&&av.id===v.id}">${esc(v.name)}</button>`).join("")+
    (c&&!av?`<button class="chip" data-act="fClear" aria-label="Clear filters">Clear ✕</button>`:"");
};
const optsHTML=(list,sel)=>list.map(([v,l])=>`<option value="${esc(v)}" ${String(sel||"")===String(v)?"selected":""}>${esc(l)}</option>`).join("");
function sheetFilters(){
  const f=S.filter,notes=S.notes.filter(n=>!isPrivateJ(n)&&n.type!=="journal");
  const tags=[...new Set(notes.flatMap(n=>n.tags||[]))].sort(),langs=[...new Set(notes.map(n=>n.lang).filter(Boolean))];
  const sel=(id,label,list,val)=>`<div style="margin-bottom:.6rem"><label for="${id}" class="ctitle" style="display:block">${label}</label><select id="${id}" style="width:100%;min-height:2.75rem;border:1px solid var(--line);border-radius:.6rem;background:var(--surface);padding:0 .6rem">${optsHTML(list,val)}</select></div>`;
  openSheet(`<h3 style="margin:.2rem 0 .8rem">Filter notes</h3>`+
    sel("fType","Type",[["","Any type"]].concat(TYPES.filter(t=>t[0]!=="journal").map(t=>[t[0],t[1]])),f.type)+
    sel("fTag","Tag",[["","Any tag"]].concat(tags.map(t=>[t,"#"+t])),f.tag)+
    sel("fPerson","Person",[["","Anyone"]].concat(S.people.map(p=>[p.id,p.name||"Unnamed"])),f.person)+
    sel("fPrio","Priority",[["","Any"],["2","2 or higher"],["3","3 or higher"],["4","4 or higher"],["5","5 only"]],f.priority)+
    sel("fLang","Language",[["","Any language"]].concat(langs.map(l=>[l,RecallLangs.nameOf(l)])),f.lang)+
    sel("fDate","Updated",DATE_OPTS,f.date)+
    `<div class="row" style="margin:.4rem 0 .8rem"><input id="fName" aria-label="Name for a saved view" placeholder="Name this view (optional)" maxlength="30" style="flex:1;min-height:2.75rem;border:1px solid var(--line);border-radius:.6rem;background:var(--surface);padding:0 .7rem"><button class="tbtn" data-act="fSave" style="min-height:2.75rem">Save view</button></div>`+
    (views().length?`<div class="ctitle">Saved views</div>`+views().map(v=>`<div class="row sp"><span>${esc(v.name)}</span><button class="tbtn" data-act="viewDel" data-id="${esc(v.id)}" aria-label="Delete view ${esc(v.name)}" style="color:var(--danger);min-height:2.75rem">Delete</button></div>`).join(""):"")+
    `<div class="row" style="margin-top:.8rem"><button class="btn block" data-act="fApply">Show notes</button><button class="btn block" data-act="fClear">Clear</button></div>`,"Filter notes");
}
const readFilter=()=>RL.cleanFilter({type:$("#fType").value,tag:$("#fTag").value,person:$("#fPerson").value,priority:$("#fPrio").value,lang:$("#fLang").value,date:$("#fDate").value});
ACT.filters=()=>sheetFilters();
ACT.fApply=()=>{S.filter=readFilter();closeSheet();S.tab="notes";if(S.view!=="db")S.view="all";S.tag=null;renderAll()};
ACT.fClear=()=>{S.filter={};if($("#sheetHost .sheet"))closeSheet();renderAll()};
ACT.fSave=()=>{const f=readFilter();if(!RL.filterCount(f)){toast("Pick at least one filter first.");return}
  const name=($("#fName").value||"").trim()||Object.entries(f).map(([k,v])=>k==="person"?(pById(v)||{}).name:k==="lang"?RecallLangs.nameOf(v):k==="priority"?"P"+v+"+":k==="date"?(DATE_OPTS.find(o=>o[0]===v)||[])[1]:v).filter(Boolean).join(" · ").slice(0,30);
  views().push({id:RM.genId(),name,filter:f});saveSettings();S.filter=f;closeSheet();S.tab="notes";if(S.view!=="db")S.view="all";renderAll();toast("Saved view “"+name+"”")};
ACT.viewApply=el=>{const v=views().find(x=>x.id===el.dataset.id);if(!v)return;S.filter=activeView()&&activeView().id===v.id?{}:Object.assign({},v.filter);S.tab="notes";S.view="all";S.tag=null;renderAll()};
ACT.viewDel=el=>{const i=views().findIndex(x=>x.id===el.dataset.id);if(i<0)return;const [v]=views().splice(i,1);saveSettings();closeSheet();renderAll();toast("Deleted view “"+v.name+"”",()=>{views().splice(i,0,v);saveSettings();renderAll()})};

/* People linked to a note, shown under the text. */
function peoplePart(n){
  if(isPrivateJ(n)||!S.people.length)return "";
  const ids=new Set(n.personIds||[]);
  S.people.forEach(p=>{if(p.name&&new RegExp("\\b"+p.name.trim().replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"\\b","i").test(n.body||""))ids.add(p.id)});
  const ps=[...ids].map(pById).filter(Boolean);
  return ps.length?`<div class="card links" role="group" aria-label="People in this note"><b>People</b><div class="row" style="margin-top:.4rem">${ps.map(p=>`<button class="tbtn mention" data-act="openPerson" data-pid="${p.id}">${esc(p.name||"Unnamed")}</button>`).join("")}</div></div>`:"";
}
EXTRA_PARTS.push(peoplePart);
