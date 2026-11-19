/* WCAG contrast for the Ember tokens, read from styles.css so the test can't drift from the real values. */
const fs=require("fs");const css=fs.readFileSync(__dirname+"/../styles.css","utf8");let p=0,f=0;
const ok=(c,m)=>{if(c)p++;else{f++;console.log("FAIL",m)}};
function block(re){const m=css.match(re);if(!m)throw new Error("missing block "+re);const o={};m[1].replace(/--([\w-]+):\s*([^;]+);/g,(_,k,v)=>{o[k]=v.trim()});return o}
const light=block(/:root\{([^}]*)\}/),dark=Object.assign({},light,block(/:root\[data-theme="dark"\]\{([^}]*)\}/));
const resolve=(t,v)=>{v=t[v]||v;let n=0;while(/^var\(--/.test(v)&&n++<5)v=t[v.match(/var\(--([\w-]+)\)/)[1]];return v};
const rgb=h=>{h=h.replace("#","");if(h.length===3)h=[...h].map(c=>c+c).join("");return [0,2,4].map(i=>parseInt(h.slice(i,i+2),16))};
const lum=h=>{const [r,g,b]=rgb(h).map(c=>{c/=255;return c<=.03928?c/12.92:Math.pow((c+.055)/1.055,2.4)});return .2126*r+.7152*g+.0722*b};
const ratio=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
const T=(name,t)=>{const c=k=>resolve(t,k);
  const pairs=[["text","bg",4.5],["text","surface",4.5],["text","surface2",4.5],["text2","bg",4.5],["text2","surface",4.5],["accent-text","bg",4.5],["accent-text","surface",4.5],
    ["chip-on-fg","chip-on-bg",4.5],["danger","bg",4.5],["ok","bg",4.5],["c-note","bg",4.5],["c-idea","bg",4.5],["c-learning","bg",4.5],["c-task","bg",4.5],["c-person","bg",4.5],["c-journal","bg",4.5]];
  for(const [a,b,min] of pairs){const r=ratio(c(a),c(b));ok(r>=min,`${name}: ${a} on ${b} is ${r.toFixed(2)}:1 (needs ${min})`)}
  // UI boundaries and focus ring need 3:1
  ok(ratio(c("focus"),c("bg"))>=3,`${name}: focus ring on bg`);ok(ratio(c("focus"),c("surface"))>=3,`${name}: focus ring on surface`)};
T("light",light);T("dark",dark);
// Amber fills carry Charcoal text.
ok(ratio("#15171C","#F5A524")>=8,"Charcoal on Amber is "+ratio("#15171C","#F5A524").toFixed(2));
// Recorded brand findings (documentation tests): these are why small text uses --accent-text.
const dp=ratio("#A65F00","#F3F0E9");ok(Math.abs(dp-4.33)<.02,"Deep Amber on Paper stays 4.33:1 (fails AA for small text): "+dp.toFixed(2));
ok(ratio("#9A5500","#F3F0E9")>=4.5,"--accent-text passes on Paper");
ok(ratio("#FFFFFF","#F5A524")<3,"white on Amber fails, so it is never used");
ok(ratio("#F5A524","#F3F0E9")<3,"amber as UI on Paper fails 3:1, so the light focus ring is Charcoal");
ok(light["accent-text"]==="#9A5500","accent-text token is the documented value");
console.log("contrast tests:",p,"passed,",f,"failed");process.exit(f?1:0);
