const C=require("../coach.js"),F=require("../followups.js"),E=require("../entitlements.js"),M=require("../migrate.js");let p=0,f=0;
const ok=(c,m)=>{if(c)p++;else{f++;console.log("FAIL",m)}};
const NOW=new Date(2026,10,18,10,0).getTime(),DAY=864e5;
// ---- gating: both the plan and the setting must be on; off by default
ok(M.defaultSettings().coachOn===false,"coach OFF by default");
ok(C.active({coachOn:true})===true,"on when setting on and entitlement on");
ok(C.active({coachOn:false})===false,"off when setting off");
ok(C.active({})===false&&C.active(null)===false,"off when setting missing");
ok(C.active({coachOn:true},{coach:false})===false,"off when entitlement off, even if toggled on");
ok(C.active({coachOn:true},{})===false,"unknown feature is off");
ok(E.hasFeature("coach")===true&&E.hasFeature("nope")===false,"hasFeature");
// ---- persona selection
const ids=C.PERSONAS.map(x=>x.id);ok(JSON.stringify(ids)===JSON.stringify(["steady","straight","strategist","cheerleader"]),"four personas");
const texts=new Set(ids.map(id=>C.message("nudge",id,{t:"Call Sam"},"x")));ok(texts.size===4,"each persona has its own wording");
ok(C.message("nudge","bogus",{t:"A"},"x")===C.message("nudge","steady",{t:"A"},"x"),"unknown persona falls back to Steady");
ok(C.message("nudge","straight",{t:"A"},"s1")===C.message("nudge","straight",{t:"A"},"s1"),"deterministic for the same note");
ok(C.message("open","cheerleader",{t:"Call Sam"},"a").includes("Call Sam"),"title filled in");
ok(C.personaOf("strategist").name==="Strategist"&&C.personaOf("straight").name==="Straight Shooter","persona names");
// ---- safe wording: no scoring, shaming or percentages in ANY template
const BAD=/score|reliab|rating|rank|grade|\bfail|lazy|disappoint|you always|you never|ashamed|shame|\bbad\b|broke|broken|promises? (kept|broken)|\d+\s*%|streak/i;
let n=0;for(const id of ids)for(const k of Object.keys(C._T[id]))for(const s of C._T[id][k]){n++;ok(!BAD.test(s),"unsafe wording: "+id+"/"+k+": "+s);ok(s.length<=140,"too long: "+s)}
ok(n>=40,"templates present ("+n+")");
ok(ids.every(id=>Object.keys(C._T.steady).every(k=>C._T[id][k]&&C._T[id][k].length>=1)),"every persona covers every kind");
// ---- engine content
const mk=(o)=>Object.assign({id:"n"+Math.random(),type:"task",body:"Call the caterer about the deposit",created:NOW-9*DAY,updated:NOW},o);
const a=mk({id:"a",fu:{at:NOW-2*DAY,state:"open",kind:"followup",snoozes:2}}),b=mk({id:"b",body:"Order flowers",reminder:{at:NOW-DAY,done:false}}),c=mk({id:"c",fu:{at:NOW+3*DAY,state:"open"}});
const priv=mk({id:"j",type:"journal",body:"private overdue thing",fu:{at:NOW-DAY,state:"open",snoozes:5}});
const nd=C.nudges([a,b,c,priv],NOW,"steady");ok(nd.length===2&&nd[0].id==="a"&&nd.every(x=>x.id!=="j"),"nudges: overdue only, oldest first, no private");
ok(C.reasks([a,b,priv]).length===1&&C.reasks([a,b,priv])[0].id==="a","re-ask after repeated snoozes, no private");
const r=C.weeklyReview([a,b,c,priv],NOW,"steady");
ok(r.open===3&&r.earlier===2&&r.focus.length===3&&r.focus.every(x=>x.id!=="j"),"review counts exclude private");
ok(!BAD.test(r.summary)&&!BAD.test(r.intro),"review wording safe");
ok(/\d+ new note/.test(r.summary),"review is plain counts");
ok(C.reviewDue({lastReview:0},NOW)&&!C.reviewDue({lastReview:NOW-2*DAY},NOW)&&C.reviewDue({lastReview:NOW-8*DAY},NOW),"review due weekly");
// ---- commit-to-next-step (coach only)
const k=mk({id:"k"});const co=C.opts(k,"straight");F.startCheckIn(k,"followup",NOW,co);
ok(k.thread[0].text===co.opening,"coach opening used");
F.reply(k,{chip:"still"},NOW,Object.assign({fmt:String},co));ok(k.ci.stage==="commit"&&k.thread.slice(-1)[0].text===co.commit,"still-on-it asks for the next step");
F.reply(k,{text:"Email the deposit form"},NOW,Object.assign({fmt:String},co));ok(k.nextStep==="Email the deposit form"&&k.ci.stage==="offer","next step saved, then offers a check-in");
const k2=mk({id:"k2"});F.startCheckIn(k2,"followup",NOW);F.reply(k2,{chip:"still"},NOW);ok(k2.ci.stage==="offer","coach OFF: no commit prompt");
console.log("coach tests:",p,"passed,",f,"failed");process.exit(f?1:0);
