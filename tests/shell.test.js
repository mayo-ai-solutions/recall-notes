/* The service worker's SHELL must list every file the page loads, or the app breaks offline. */
const fs=require("fs"),path=require("path");const root=path.join(__dirname,"..");let p=0,f=0;
const ok=(c,m)=>{if(c)p++;else{f++;console.log("FAIL",m)}};
const sw=fs.readFileSync(root+"/sw.js","utf8"),html=fs.readFileSync(root+"/index.html","utf8"),css=fs.readFileSync(root+"/styles.css","utf8");
const shell=[...sw.match(/SHELL\s*=\s*\[([\s\S]*?)\]/)[1].matchAll(/"([^"]+)"/g)].map(m=>m[1]);
const norm=s=>s.replace(/^\.\//,"");const inShell=new Set(shell.map(norm));
const loaded=[...html.matchAll(/(?:src|href)="([^":#]+\.[a-z0-9]+)"/gi)].map(m=>m[1]).filter(s=>!/^https?:/.test(s));
for(const u of new Set(loaded)){ok(fs.existsSync(path.join(root,u)),"index.html references a missing file: "+u);ok(inShell.has(u)||u==="manifest.webmanifest"&&inShell.has(u),"not in SHELL: "+u)}
for(const m of css.matchAll(/url\(([^)]+\.woff2)\)/g)){const u=m[1].replace(/['"]/g,"");ok(inShell.has(u),"font not in SHELL: "+u)}
for(const u of shell){if(u==="./"||u==="")continue;ok(fs.existsSync(path.join(root,norm(u))),"SHELL lists a file that does not exist: "+u)}
const mf=JSON.parse(fs.readFileSync(root+"/manifest.webmanifest","utf8"));
for(const i of mf.icons)ok(fs.existsSync(path.join(root,i.src)),"manifest icon missing: "+i.src);
const scripts=[...html.matchAll(/<script src="([^"]+)"/g)].map(m=>m[1]);
ok(scripts.indexOf("followups.js")<scripts.indexOf("coach.js"),"followups.js loads before coach.js");
ok(scripts[scripts.length-1]==="boot.js","boot.js loads last");
const cache=sw.match(/CACHE\s*=\s*"([^"]+)"/);ok(cache&&/^recall-v\d+$/.test(cache[1]),"CACHE is versioned: "+(cache&&cache[1]));
console.log("shell tests:",p,"passed,",f,"failed");process.exit(f?1:0);
