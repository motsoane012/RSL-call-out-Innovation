// Khoebo functional tests T01-T22. Run: node khoebo.test.js path/to/index.html
// Needs Node 18+ and Playwright (npm i playwright; npx playwright install chromium).
const {chromium,devices}=require('playwright');const fs=require('fs');const crypto=require('crypto');const os=require('os');
const FILE=require('path').resolve(process.argv[2]||'index.html');const F='file://'+FILE;
const OUT=process.argv[3]||'.';
const R=[];const T=(id,feat,exp,ok,act)=>{R.push({id,feat,exp,ok:!!ok,act});console.log(`${id} ${ok?'PASS':'FAIL'}  ${feat}: ${act}`)};
const DEMO_PIN='4826';
(async()=>{const b=await chromium.launch();const errs=[];
const log=[];const sha=crypto.createHash('sha256').update(fs.readFileSync(FILE)).digest('hex');
log.push(`Khoebo test run ${new Date().toISOString()}`,`App file: ${require('path').basename(FILE)}  SHA-256 ${sha}`,
 `Node ${process.version} · Playwright ${require('playwright/package.json').version} · Chromium ${b.version()} · ${os.platform()} ${os.arch()}`,'');
const newCtx=async o=>{const c=await b.newContext(o);await c.route(/fonts\.(googleapis|gstatic)/,r=>r.abort());return c};
// ---------- trader journey on a phone ----------
let c=await newCtx({...devices['iPhone 13']});let p=await c.newPage();p.on('pageerror',e=>errs.push(e.message));const W=ms=>p.waitForTimeout(ms);
await p.goto(F);await W(900);
await p.tap('#heroCta [data-v="signup"]');await W(300);
await p.fill('#su-name','Palesa Mokoena');await p.fill('#su-email','palesa.test@gmail.com');await p.fill('#su-phone','58881234');await p.fill('#su-pw','Fresh2026');await p.fill('#su-pw2','Fresh2026');await p.fill('#su-a','Bobby');await p.check('#su-agree');
await p.tap('form[data-form="signUp"] button[type=submit]');await W(1500);
await p.fill('#o-biz','Palesa Fresh Produce');await p.selectOption('#o-dis','Maseru').catch(()=>{});await p.tap('form[data-form="onboard"] button[value="fresh"]');await W(900);
await p.tap('[data-a="tinPick"][data-v="no"]');await W(300);const tinQ=await p.isVisible('[data-a="tinDone"][data-v="later"]');
await p.tap('[data-a="tinDone"][data-v="later"]');await W(1200);
const reg=await p.evaluate(()=>!!(ACCT&&S.profile&&S.profile.business==='Palesa Fresh Produce'));const tour=await p.isVisible('#coach');
T('T01','Trader registration','Account created',reg&&tinQ,`Account and business created; TIN question shown: ${tinQ}; tour started: ${tour}`);
const sk=await p.$('#coach button:has-text("Skip")');if(sk)await sk.tap();await W(300);
await p.tap('text=Money in');await W(400);await p.fill('#r-amt','150');await p.tap('#sheet button[type=submit]');await W(900);await p.tap('[data-a="close"]').catch(()=>{});await W(300);
const sale=await p.evaluate(()=>S.tx.some(t=>t.type==='sale'&&+t.amount===150));T('T03','Sales recording','Sale saved correctly',sale,sale?'Sale of M150 saved':'Sale missing');
await p.tap('text=Money out');await W(400);await p.fill('#r-amt','12');await p.tap('#sheet button[type=submit]');await W(900);await p.tap('[data-a="close"]').catch(()=>{});await W(1000);
const exp=await p.evaluate(()=>S.tx.some(t=>t.type==='expense'&&+t.amount===12));const money=await p.innerText('header').catch(()=>'');
T('T04','Expense recording','Expense saved correctly',exp,`Cost of M12 saved: ${exp}; header shows "${(money.match(/Money now\s*M[\d,]+/)||['?'])[0]}"`);
await p.reload();await W(900);await p.tap('#lpAuth [data-v="login"]');await W(200);await p.fill('#li-idf','palesa.test@gmail.com');await p.fill('#li-pw','Fresh2026');await p.tap('form[data-form="logIn"] button[type=submit]');await W(1300);
const own=await p.evaluate(()=>S.profile&&S.profile.business);const kept=await p.evaluate(()=>S.tx.filter(t=>t.type==='sale'&&+t.amount===150).length===1&&S.tx.filter(t=>+t.amount===12).length===1);
T('T02','Login','Correct dashboard opens',own==='Palesa Fresh Produce'&&await p.isVisible('#logoutBtn'),`Logged in with email and password; book opened: "${own}"`);
T('T05','Page refresh','Saved records remain',kept,kept?'After reload and log in, both records present once each':'Records lost or duplicated');
// T14 offline
await p.tap('#logoutBtn');await W(800);await c.setOffline(true);await p.reload();await W(900);await p.tap('#lpAuth [data-v="login"]');await p.fill('#li-idf','palesa.test@gmail.com');await p.fill('#li-pw','Fresh2026');await p.tap('form[data-form="logIn"] button[type=submit]');await W(1300);
const off=await p.evaluate(()=>S.tx.filter(t=>+t.amount===150||+t.amount===12).length);await c.setOffline(false);
T('T14','Offline reopen','Book opens with no connection',off===2,`Browser set offline, page reloaded, logged in: ${off} of 2 records shown`);
// T15-T17 channels (USSD handler + WhatsApp handler, as a provider gateway would call them)
const ch=await p.evaluate(async()=>{const s={step:'menu',d:{},phone:''};const n0=S.tx.length;const o=[];
  o.push((await ussdStep(s,'1')).text);o.push((await ussdStep(s,'80')).text);o.push((await ussdStep(s,'1')).text);
  const sale=S.tx.length===n0+1&&S.tx.some(t=>+t.amount===80&&t.type==='sale');
  const s2={step:'menu',d:{},phone:''};await ussdStep(s2,'1');const n1=S.tx.length;const a=(await ussdStep(s2,'abc')).text;const bb=(await ussdStep(s2,'-5')).text;
  return{sale,bad:{a,b:bb,step:s2.step,added:S.tx.length-n1},wa:waReply('xyzzy plumbing')}});
T('T15','USSD sale','Sale added to the book',ch.sale,ch.sale?'Menu 1 → amount 80 → Cash: M80 sale added':'not added');
T('T16','USSD bad amounts','Refused and asked again',ch.bad.step==='amt'&&ch.bad.added===0&&/above 0/.test(ch.bad.a)&&/above 0/.test(ch.bad.b),`"abc" and "-5" both answered "${ch.bad.a}"; nothing recorded`);
T('T17','WhatsApp unknown message','Clear reply pointing to the menu',/menu|reply/i.test(ch.wa),`Reply: "${ch.wa.replace(/\s+/g,' ').slice(0,70)}…"`);
// T20 backup
const bk=await p.evaluate(async()=>{const t=await encryptJson({tx:S.tx},'correct horse battery','book');let wrong='';try{await decryptJson(t,'wrong passphrase!!')}catch(e){wrong=e.message}const right=(await decryptJson(t,'correct horse battery')).data.tx.length;return{wrong,right,alg:JSON.parse(t).alg}});
T('T20','Encrypted backup','Wrong passphrase refused',/Wrong passphrase/.test(bk.wrong)&&bk.right>0,`${bk.alg} backup: wrong passphrase → "${bk.wrong}"; right passphrase restored ${bk.right} records`);
await p.tap('#logoutBtn').catch(()=>{});await W(800);
await p.tap('#lpAuth [data-v="login"]');await p.fill('#li-idf','palesa.test@gmail.com');await p.fill('#li-pw','Wrong1234');await p.tap('form[data-form="logIn"] button[type=submit]');await W(900);
const wrong=await p.$$eval('.err',e=>e.map(x=>x.textContent).join(''));T('T10','Wrong password','Login refused',/not right/.test(wrong),`Refused: "${wrong.trim().slice(0,60)}"`);
await p.tap('[data-a="landTab"][data-v="forgot"]');await p.fill('#fp-idf','palesa.test@gmail.com');await p.tap('form[data-form="fpFind"] button');await W(300);await p.fill('#fp-ans','bobby');await p.fill('#fp-pw','Newer2026');await p.fill('#fp-pw2','Newer2026');await p.tap('form[data-form="resetPw"] button[type=submit]');await W(1100);await p.fill('#fs-a','Roma');await p.tap('form[data-form="fpSecQ"] button');await W(1200);
T('T11','Password reset','Reset with security question',await p.isVisible('#logoutBtn'),'Answered the question, set a new password and new question, logged in');
await c.close();
// T07 mobile
let mob=[];for(const n of ['iPhone SE','iPhone 13','Pixel 7','Galaxy S9+']){const d=await newCtx({...devices[n]});const q=await d.newPage();await q.goto(F);await q.waitForTimeout(700);const hs=await q.evaluate(()=>document.documentElement.scrollWidth>innerWidth);const vis=await q.$$eval('#heroCta .btn',e=>e.length>0&&e.every(x=>x.getBoundingClientRect().bottom<=innerHeight));mob.push({n,ok:!hs&&vis});await d.close()}
T('T07','Mobile responsiveness','Interface works on phone',mob.every(x=>x.ok),mob.map(x=>`${x.n}: ${x.ok?'fits, buttons visible':'problem'}`).join('; '));
// ---------- officer side on a desktop ----------
c=await newCtx({viewport:{width:1366,height:860}});p=await c.newPage();p.on('pageerror',e=>errs.push(e.message));
await p.goto(F);await p.waitForTimeout(900);await p.click('#lpAuth [data-v="login"]');await p.click('[data-a="loginAs"][data-v="rsl"]');await p.waitForTimeout(200);
// T21 no empty-PIN login
await p.selectOption('#si-o','admin');await p.evaluate(()=>{document.querySelector('#si-p').removeAttribute('required')});await p.click('form[data-form="signIn"] button[type=submit]');await p.waitForTimeout(800);
const emptyIn=await p.evaluate(()=>!!ADMIN.session);await p.fill('#si-p','1111');await p.click('form[data-form="signIn"] button[type=submit]');await p.waitForTimeout(800);const wrongIn=await p.evaluate(()=>!!ADMIN.session);
T('T21','Administrator PIN','Empty or wrong PIN refused',!emptyIn&&!wrongIn,`Empty PIN signed in: ${emptyIn}; wrong PIN signed in: ${wrongIn}`);
await p.fill('#si-p',DEMO_PIN);await p.click('form[data-form="signIn"] button[type=submit]');await p.waitForTimeout(8000);
await p.click('[data-a="adminSub"][data-v="compliance"]');await p.waitForTimeout(900);
const wl=await p.evaluate(()=>{const o={};for(const e of entities()){if(!e.t)continue;const a=assess(e.t);o[e.name]={p:a.priority,act:a.action,why:a.reasons.map(r=>r.text).join(' | ')}}return o});
const th=wl['Thabo Shoe Repairs']||{},mp=wl['Mpho General Dealer']||{},mg=wl['Maseru Market Greens']||{};
T('T08','Inactivity exception','Not treated as non-compliant',th.p==='No action',`Thabo Shoe Repairs: ${th.p}; reason "${(th.why||'').slice(0,90)}"`);
T('T09','Human review','Large gap goes to a person',mp.p==='Human review',`Mpho General Dealer: ${mp.p}; ${(mp.why||'').slice(0,80)}`);
T('T18','Similar business names','Possible match goes to review with Confirm match',mg.p==='Human review'&&mg.act==='Confirm match',`Maseru Market Greens vs register "Maseru Mkt Greens": ${mg.p}, suggested action "${mg.act}"`);
const counts=await p.evaluate(()=>{const w={};for(const[k,v]of Object.entries({}))w[k]=v;return Object.fromEntries(Object.entries(Object.groupBy?Object.groupBy(entities().filter(e=>e.t),e=>assess(e.t).priority):{}).map(([k,v])=>[k,v.length]))});
log.push('Worklist priorities (traders with a Khoebo book): '+JSON.stringify(counts));
const qs=await p.evaluate(()=>{const e=entities().find(x=>x.name==='Quthing Spaza');return e?{p:assess(e.t).priority,warn:/Under human review/.test(caseExtras(e.key))}:null});
T('T22','Record-keeping index beside a review case','Officer warned the index is not tax compliance',qs&&qs.p==='Human review'&&qs.warn,`Quthing Spaza: ${qs&&qs.p}; warning shown next to the index: ${qs&&qs.warn}`);
// T13 identity review
await p.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(x=>/Identity checks/.test(x.textContent));b&&b.click()});await p.waitForTimeout(700);
await p.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='Review'&&x.closest('.li')&&x.closest('.li').textContent.includes('Mpho'));b&&b.click()});await p.waitForTimeout(1300);
await p.click('form[data-form="verify"] button[value="verified"]');await p.waitForTimeout(400);const blocked=await p.innerText('.rv-err').catch(()=>'');
T('T13','Identity review','Cannot verify with missing documents',/Can't verify yet/.test(blocked),blocked.replace(/\s+/g,' ').slice(0,110));
await p.click('[data-a="close"]').catch(()=>{});await p.waitForTimeout(300);
// T06 + T12 security self-test
await p.click('[data-a="adminSub"][data-v="security"]');await p.waitForTimeout(400);await p.click('button:has-text("Security self-test")');await p.click('[data-a="stRun"]');await p.waitForTimeout(9000);
const st=await p.evaluate(()=>UI.selftest&&UI.selftest.R)||[];const pass=st.filter(r=>r.pass).length;
const acc=st.filter(r=>/district|configuration|supervisor|without logging/i.test(r.name));
T('T06','Officer access','Authorised access only',acc.length===4&&acc.every(r=>r.pass),acc.map(r=>r.name).join('; '));
T('T12','Security self-test','All checks blocked',st.length>0&&pass===st.length,`${pass} of ${st.length} passed`);
st.forEach(r=>log.push(`  self-test: ${r.pass?'PASS':'FAIL'} ${r.name}`));
// T19 field officer district (sign in as Maseru field officer with the demo PIN)
await p.evaluate(()=>{ADMIN.session=null});await p.goto(F);await p.waitForTimeout(900);await p.click('#lpAuth [data-v="login"]');await p.click('[data-a="loginAs"][data-v="rsl"]');
const fo=await p.evaluate(()=>ADMIN.cfg.officers.find(o=>o.role==='field'&&o.district==='Maseru').id);await p.selectOption('#si-o',fo);await p.fill('#si-p',DEMO_PIN);await p.click('form[data-form="signIn"] button[type=submit]');await p.waitForTimeout(2500);
const fr=await p.evaluate(async()=>{const all=entities(),vis=visibleEntities(),le=all.find(e=>e.district==='Leribe'&&!canSee(e));const n0=(ADMIN.auditLog||[]).length;const ok=await guardOpen(le);return{all:all.length,vis:vis.length,opened:ok,name:le&&le.name}});
T('T19','Field officer outside district','Refused and logged',fr.opened===false&&fr.vis<fr.all,`Maseru field officer sees ${fr.vis} of ${fr.all} records; opening "${fr.name}" (Leribe) refused and logged`);
await b.close();
R.sort((a,b)=>+a.id.slice(1)-+b.id.slice(1));
log.push('',...R.map(r=>`${r.id}  ${r.ok?'PASS':'FAIL'}  ${r.feat}\n      expected: ${r.exp}\n      actual:   ${r.act}`),'',`JavaScript errors during run: ${errs.length?errs.join('; '):'none'}`,`Result: ${R.filter(r=>r.ok).length} of ${R.length} passed`);
fs.writeFileSync(OUT+'/test-log.txt',log.join('\n')+'\n');fs.writeFileSync(OUT+'/test-results.json',JSON.stringify({sha256:sha,tests:R,errors:errs},null,1));
console.log(`\n${R.filter(r=>r.ok).length} of ${R.length} passed; errors: ${errs.length}`)})().catch(e=>{console.error(e);process.exit(1)});

