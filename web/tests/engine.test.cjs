const test=require('node:test');
const assert=require('node:assert/strict');
const A=require('../dist/engine.js');
test('normal routine does not trigger',()=>assert.equal(A.analyze(A.dataset('stable')).drift,false));
test('persistent change in every domain triggers',()=>{const r=A.analyze(A.dataset('change'));assert.equal(r.drift,true);assert.equal(r.changes.length,9);assert.equal(r.overlap,3);});
test('one changed day does not trigger',()=>assert.equal(A.analyze(A.dataset('single')).drift,false));
test('recovered rhythm stops trigger',()=>assert.equal(A.analyze(A.dataset('recovery')).drift,false));
test('missing values are not inactivity',()=>{const r=A.analyze(A.dataset('missing'));assert.equal(r.drift,false);assert.equal(r.summaries.steps.current,null);});
test('requires fourteen historical readings per metric',()=>assert.equal(A.analyze(A.dataset('change').filter(d=>d.age<=16)).drift,false));
test('empty data is not a change',()=>assert.equal(A.analyze([]).drift,false));
test('missing recent day prevents trigger',()=>assert.equal(A.analyze(A.dataset('change').filter(d=>d.age!==2)).drift,false));
test('today is ignored',()=>assert.equal(A.analyze([...A.dataset('stable'),{age:0,values:A.defaults}]).drift,false));
test('duplicate days do not increase coverage',()=>assert.equal(A.analyze([...A.dataset('change'),...A.dataset('change')]).baselineDays,28));
test('screen and app time are one domain',()=>assert.equal(A.analyze(A.dataset('custom',{calls:6,callMinutes:32,sms:24,steps:6200,screen:400,night:100,appMinutes:380})).drift,false));
test('custom sliders can produce persistent change',()=>assert.equal(A.analyze(A.dataset('custom',A.defaults,3)).drift,true));
test('custom one-day change cannot trigger',()=>assert.equal(A.analyze(A.dataset('custom',A.defaults,1)).drift,false));
test('changes must overlap on at least two dates',()=>{const d=A.dataset('stable');d[28].values.calls=0;d[29].values.calls=0;d[29].values.steps=0;d[30].values.steps=0;assert.equal(A.analyze(d).drift,false);});
test('partial metric cannot contaminate domain dates',()=>{const d=A.dataset('stable');Object.assign(d[28].values,{sms:0,calls:0});Object.assign(d[29].values,{sms:0,calls:null,steps:0});Object.assign(d[30].values,{calls:0,steps:0});assert.equal(A.analyze(d).drift,false);});
test('invalid values do not become sensor data',()=>{const d=A.dataset('change');for(const day of d)day.values.steps=NaN;assert.equal(A.analyze(d).summaries.steps.samples,0);});
test('interests influence ranking',()=>assert.equal(A.recommend(A.analyze(A.dataset('stable')),['football'])[0].id,'football'));
test('disliked activities stay hidden',()=>assert.equal(A.recommend(A.analyze(A.dataset('change')),['football'],{football:-3}).some(a=>a.id==='football'),false));
test('all activities can be declined',()=>assert.equal(A.recommend(A.analyze(A.dataset('change')),[],Object.fromEntries(A.activities.map(a=>[a.id,-3]))).length,0));
test('helpful feedback influences ranking',()=>assert.equal(A.recommend(A.analyze(A.dataset('stable')),[],{music:5})[0].id,'music'));
const P=(scenario,persona)=>{const d=A.dataset(scenario,undefined,3,persona),w=A.learnWeights(d).weights;return{d,w,r:A.analyze(d,{weights:w})};};
test('default weights keep the two-domain rule',()=>{const d=A.dataset('moveMusic');assert.equal(A.analyze(d).drift,true);});
test('learned weights average one',()=>{const w=Object.values(P('stable','aino').w);assert.ok(Math.abs(w.reduce((a,b)=>a+b,0)/w.length-1)<1e-9);});
test('steady social rhythm weighs most for Aino',()=>{const {w}=P('stable','aino');assert.ok(w.social>w.movement&&w.social>w.music);});
test('naturally varying contact weighs less for Elias',()=>{const {w}=P('stable','elias');assert.ok(w.movement>w.social);});
test('weights come from baseline, not recent days',()=>assert.deepEqual(P('change','aino').w,P('stable','aino').w));
test('movement alone never triggers',()=>{assert.equal(P('movement','aino').r.drift,false);assert.equal(P('movement','elias').r.drift,false);});
test('same change triggers for one person only',()=>{assert.equal(P('moveMusic','aino').r.drift,false);assert.equal(P('moveMusic','elias').r.drift,true);});
test('habitual night use is not a change for Elias',()=>{assert.ok(P('change','aino').r.changes.some(c=>c.key==='night'));assert.equal(P('change','elias').r.changes.some(c=>c.key==='night'),false);});
test('missing social data is not observed',()=>assert.equal(P('missing','aino').r.observedDomains.includes('social'),false));
test('treatment history is outside analysis',()=>{const d=A.dataset('change');assert.deepEqual(A.analyze([...A.history(),...d]).changes,A.analyze(d).changes);assert.equal(A.history().every(day=>day.age>31),true);});
test('no notification without drift',()=>assert.deepEqual(A.notify(P('stable','aino').r,0),{show:false,reason:'quiet'}));
test('daily notification cap',()=>{const {r}=P('change','aino');assert.equal(A.notify(r,1).show,true);assert.equal(A.notify(r,2).reason,'cap');});
test('social suggestion comes first when contact drops',()=>assert.equal(A.rank(P('change','aino').r,['football'])[0].id,'friend'));
test('not now reorders the queue without hiding',()=>{const {r}=P('change','aino'),q=A.rank(r,['football'],{friend:-1});assert.equal(q[0].id,'football');assert.ok(q.some(a=>a.id==='friend'));});
test('daylight suggestion leads during a feed session',()=>assert.equal(A.rank(P('change','aino').r,['football'],{},{screen:'feed',daylight:true})[0].id,'daylight'));
test('positives never mention zero or missing',()=>{const d=A.dataset('missing');for(const day of d)day.values.calls=day.age<=7?null:day.values.calls;const list=A.positives(d,0);assert.equal(list.some(p=>p.id==='calls'||p.id==='done'),false);assert.ok(list.every(p=>p.count>0));});
test('week comparison appears only when it is upward',()=>{const d=A.dataset('stable');for(const day of d)if(day.age>7&&day.age<=14)day.values.calls=2;assert.match(A.positives(d).find(p=>p.id==='calls').text,/more than last week/);assert.doesNotMatch(A.positives(A.dataset('change')).find(p=>p.id==='calls').text,/last week/);});
test('accepting a suggestion moves it up',()=>{const {r}=P('change','aino');assert.equal(A.rank(r,[],{thanks:4})[0].id,'thanks');});
test('recently shown offers yield to other interests even without an answer',()=>{
  const {r}=P('change','aino');
  const context={day:2,exposures:[{id:'friend',kind:'message',day:1}]};
  assert.notEqual(A.rank(r,['football'],{},context)[0].id,'friend');
  assert.ok(A.rank(r,['football'],{},context).some(a=>a.id==='friend'));
});
test('offer cooldown expires and never restores a hidden activity',()=>{
  const {r}=P('change','aino'),exposures=[{id:'friend',kind:'message',day:1}];
  assert.equal(A.rank(r,['football'],{},{day:4,exposures})[0].id,'friend');
  assert.equal(A.rank(r,[],{friend:-3},{day:4,exposures}).some(a=>a.id==='friend'),false);
});
test('music interest personalises the song offer and retired suggestions stay absent',()=>{
  const {r}=P('change','elias');
  assert.equal(A.rank(r,['music'])[0].id,'music');
  assert.equal(A.activities.some(a=>['routine','movement','chore','discovery'].includes(a.id)),false);
});
test('separate one-day rule requires an actual latest value and sufficient prior history',()=>{
 assert.equal(A.singleDay(A.dataset('single')),true);assert.equal(A.singleDay(A.dataset('stable')),false);assert.equal(A.singleDay([]),false);assert.equal(A.singleDay(A.dataset('single').filter(d=>d.age<10)),false);assert.equal(A.singleDay(A.dataset('single').filter(d=>d.age!==1)),false);
});
test('recovery requires previous drift and three complete usual days for both people',()=>{
 for(const p of ['aino','elias']) {assert.equal(A.recovering(A.dataset('recovery',undefined,3,p)),true);assert.equal(A.recovering(A.dataset('stable',undefined,3,p)),false);const d=A.dataset('recovery',undefined,3,p);d.at(-1).values.steps=null;assert.equal(A.recovering(d),false);}
});
test('timeline uses only earlier history and gaps insufficient or absent data',()=>{
 const d=[...A.history(),...A.dataset('change')],before=A.rhythmTimeline(d);assert.equal(before.slice(0,14).every(p=>p.value===null),true);const changed=d.map(day=>day.age===1?{...day,values:{...day.values,steps:999999}}:day);assert.deepEqual(A.rhythmTimeline(changed).slice(0,-1),before.slice(0,-1));const empty=A.dataset('stable').map(d=>({...d,values:{}}));assert.ok(A.rhythmTimeline(empty).every(p=>p.value===null));
});
test('following-week fixtures preserve past and include missing coverage without turning it into zero',()=>{
 const d=A.dataset('change'),f=A.followingWeek(d,'missing');assert.equal(f.length,d.length+7);assert.equal(f.slice(-7).filter(x=>x.values.steps==null).length,3);assert.deepEqual(f.slice(0,-7).map(x=>x.values),d.map(x=>x.values));assert.deepEqual(A.followingWeek(d,'unchanged').slice(-7).map(x=>x.values.steps),Array(7).fill(900));
});
test('new source metadata does not multiply weights or persistent-change evidence',()=>{
 const d=A.dataset('stable');for(const day of d)if(day.age<=3)for(const key of Object.keys(A.extraMetrics))day.values[key]=A.personas.aino.changed[key];assert.equal(A.analyze(d).drift,false);assert.deepEqual(A.learnWeights(d).weights,A.learnWeights(A.dataset('stable')).weights);
});
test('fixture groups have distinct daily trajectories without changing the stable classification',()=>{
 const d=A.dataset('stable'),p=A.personas.aino;
 const social=d.map(x=>x.values.calls/p.base.calls),movement=d.map(x=>x.values.steps/p.base.steps),rhythm=d.map(x=>x.values.quietPeriod/p.base.quietPeriod);
 assert.notDeepEqual(social,movement);assert.notDeepEqual(social,rhythm);assert.notDeepEqual(movement,rhythm);assert.equal(A.analyze(d).drift,false);
});
