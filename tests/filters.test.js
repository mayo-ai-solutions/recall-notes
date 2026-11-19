const L=require("../lib.js");let p=0,f=0;const ok=(c,m)=>{if(c)p++;else{f++;console.log("FAIL",m)}};
const NOW=new Date(2026,10,18,15,0).getTime(),D=864e5;
const mk=(id,o)=>Object.assign({id,type:"note",body:id,tags:[],personIds:[],updated:NOW,pinned:false},o);
const people=[{id:"p1",name:"Maya Chen"},{id:"p2",name:"Sam"}];
const notes=[mk("a",{type:"idea",tags:["venue"],priority:4,lang:"es-ES",body:"Idea for the venue",updated:NOW-2*D}),
 mk("b",{type:"task",tags:["venue","admin"],body:"Call Maya Chen tomorrow",updated:NOW-20*D}),
 mk("c",{type:"learning",personIds:["p2"],body:"Learned a thing",priority:2,updated:NOW-100}),
 mk("d",{type:"journal",body:"private maya chen thoughts",updated:NOW}),
 mk("e",{type:"journal",shareJournal:true,body:"shared entry",updated:NOW})];
const ids=r=>r.map(n=>n.id).join("");
ok(ids(L.filterNotes(notes,{},NOW,people))==="abce","no filter: everything except private journals");
ok(ids(L.filterNotes(notes,{type:"idea"},NOW,people))==="a","by type");
ok(ids(L.filterNotes(notes,{tag:"venue"},NOW,people))==="ab","by tag");
ok(ids(L.filterNotes(notes,{tag:"venue",type:"task"},NOW,people))==="b","filters combine (AND)");
ok(ids(L.filterNotes(notes,{person:"p1"},NOW,people))==="b","by person via name mention, not private journal");
ok(ids(L.filterNotes(notes,{person:"p2"},NOW,people))==="c","by person via personIds");
ok(ids(L.filterNotes(notes,{priority:3},NOW,people))==="a","by minimum priority");
ok(ids(L.filterNotes(notes,{priority:2},NOW,people))==="ac","priority 2+");
ok(ids(L.filterNotes(notes,{lang:"es-ES"},NOW,people))==="a","by language");
ok(ids(L.filterNotes(notes,{date:"today"},NOW,people))==="ce","date: today");
ok(ids(L.filterNotes(notes,{date:"7d"},NOW,people))==="ace","date: last 7 days");
ok(ids(L.filterNotes(notes,{date:"30d"},NOW,people))==="abce","date: last 30 days");
ok(ids(L.filterNotes(notes,{type:"journal"},NOW,people))==="e","journal filter only returns shared entries");
ok(L.filterNotes(notes,{person:"zzz"},NOW,people).length===0,"unknown person matches nothing");
ok(L.filterCount({type:"idea",tag:"",priority:0})===1&&L.filterCount(null)===0,"filterCount ignores empties");
ok(L.sameFilter({type:"idea",tag:""},{type:"idea"})&&!L.sameFilter({type:"idea"},{type:"task"}),"sameFilter");
ok(L.filterNotes(notes,{person:"p1"},NOW,[{id:"p1",name:"A.B (x)"}]).length===0,"odd names do not break the regex");
console.log("filters tests:",p,"passed,",f,"failed");process.exit(f?1:0);
