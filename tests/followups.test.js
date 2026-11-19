const F=require("../followups.js");let p=0,f=0;
const ok=(c,m)=>{if(c)p++;else{f++;console.log("FAIL",m)}};
const NOW=new Date(2026,10,18,10,0).getTime();
const note=(o)=>Object.assign({id:"a1",type:"idea",body:"Build a voice widget for the venue site",reminder:null},o);
// privacy
const priv={id:"j",type:"journal",body:"private thoughts here today"};
ok(!F.eligible(priv),"private journal ineligible");
ok(F.eligible(Object.assign({},priv,{shareJournal:true})),"shared journal eligible");
ok(F.schedule(priv,NOW+1)===null&&!priv.fu,"cannot schedule private");
ok(F.generateQuestions(priv).length===0,"no questions for private");
ok(F.startCheckIn(priv,"interview",NOW)===null,"no check-in for private");
ok(F.agenda([priv,Object.assign({},priv,{reminder:{at:NOW,done:false}})]).length===0,"agenda excludes private");
ok(F.dueCount([Object.assign({},priv,{fu:{at:NOW-1,state:"open"}})],NOW)===0,"due count excludes private");
// propose / schedule
ok(F.shouldPropose(note()),"propose normal");
ok(!F.shouldPropose(note({body:"hi"})),"not tiny");
ok(!F.shouldPropose(note({qDismissed:true})),"not after dismissed");
const n=note();F.schedule(n,NOW+864e5,"followup",NOW);
ok(n.fu.state==="open"&&n.qDismissed,"scheduled");ok(!F.shouldPropose(n),"no second proposal");
// snooze counting
F.snooze(n,NOW+1);F.snooze(n,NOW+2);ok(n.fu.snoozes===2&&F.needsReask(n),"snooze x2 re-ask");
F.reschedule(n,NOW+5);ok(n.fu.snoozes===2,"reschedule keeps count");
F.complete(n,NOW);ok(n.fu.state==="done"&&!F.needsReask(n),"complete");
// buckets
const a=note({id:"1",fu:{at:NOW-1e6,state:"open",kind:"followup"}}),b=note({id:"2",reminder:{at:NOW+36e5,done:false}}),c=note({id:"3",fu:{at:NOW+3*864e5,state:"open"}}),d=note({id:"4",fu:{at:NOW,state:"done"}});
const bk=F.bucket(F.agenda([c,b,a,d]),NOW);
ok(bk.overdue.length===1&&bk.today.length===1&&bk.upcoming.length===1,"buckets");
ok(F.agenda([c,b,a])[0].n.id==="1","sorted");
ok(F.dueCount([a,b,c],NOW)===1,"due count");
// priority
const i=note();ok(F.priorityTrend(i.priorityHistory)==="new","trend new");
F.recordPriority(i,3,NOW);ok(F.priorityTrend(i.priorityHistory)==="new","one reading");
F.recordPriority(i,5,NOW+1);ok(F.priorityTrend(i.priorityHistory)==="rising","rising");
F.recordPriority(i,2,NOW+2);ok(F.priorityTrend(i.priorityHistory)==="falling","falling");
F.recordPriority(i,2,NOW+3);ok(F.priorityTrend(i.priorityHistory)==="steady","steady");
ok(F.recordPriority(note(),9,NOW)===5,"clamped");
// questions
const q=F.generateQuestions(note());ok(q.length>=2&&q.length<=3,"2-3 questions");
ok(JSON.stringify(q)===JSON.stringify(F.generateQuestions(note())),"deterministic");
F.setProvider(()=>["custom?"]);ok(F.generateQuestions(note())[0]==="custom?","provider hook");F.setProvider(null);
// interview
const m=note();F.startCheckIn(m,"interview",NOW);
let r=F.reply(m,{chip:"p:4"},NOW);ok(m.priority===4&&m.ci.step===1,"interview importance");
F.reply(m,{text:"Got a quote"},NOW);ok(m.updates.length===1&&m.ci.step===2,"changed saved as update");
r=F.reply(m,{text:"Call Sam"},NOW);ok(m.nextStep==="Call Sam"&&m.ci.stage==="offer","next step");
F.reply(m,{chip:"pick:1w"},NOW);ok(m.fu&&m.fu.state==="open"&&m.ci.stage==="closed","scheduled from offer");
ok(m.thread.filter(x=>x.from==="me").length===4,"thread has my replies");
// followup check-in
const g=note();F.startCheckIn(g,"followup",NOW);F.reply(g,{chip:"done"},NOW);ok(g.ci.stage==="closed","done closes");
const h=note({fu:{at:NOW,state:"open",snoozes:0}});F.startCheckIn(h,"followup",NOW);F.reply(h,{chip:"snooze"},NOW);ok(h.fu.snoozes===1&&h.fu.at>NOW,"snooze chip");
const k=note({fu:{at:NOW,state:"open"}});F.startCheckIn(k,"followup",NOW);F.reply(k,{chip:"drop"},NOW);ok(k.fu.state==="dropped","drop chip");
console.log("followups tests:",p,"passed,",f,"failed");process.exit(f?1:0);
