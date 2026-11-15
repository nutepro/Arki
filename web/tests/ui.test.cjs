const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
// Lightweight integration harness: executes the actual app, event handlers, and timers.
// Does not replace a visual browser check.
function demo(setup = true, options = {}) {
  const elements = new Map(), handlers = {}, timeouts = new Map(), intervals = new Map();
  let next = 0, now=Date.now();const opened=[],timerDelays=[];
  const element = id => {
    if (!elements.has(id)) {
      const classes = new Set();
      elements.set(id, { innerHTML:'', textContent:'', className:'', attributes:{},
        classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),toggle(x,on){if(on)classes.add(x);else classes.delete(x);},contains:x=>classes.has(x)},
        showModal(){this.open=true;},close(){this.open=false;},focus(){},setAttribute(k,v){this.attributes[k]=v;},addEventListener(n,f){handlers[`${id}:${n}`]=f;},querySelector(){return element('button');},querySelectorAll(){return [element('clip0'),element('clip1'),element('clip2'),element('clip3')];},scrollIntoView(){} });
    }
    return elements.get(id);
  };
  const context = {Date:class extends Date {static now(){return now;}},URL,AbortController,fetch:options.fetch || (async()=>({ok:true,json:async()=>({data:[]})})),open:(...args)=>opened.push(args),document:{getElementById:element,addEventListener:(n,f)=>handlers[n]=f},
    setTimeout(f,delay){timerDelays.push({name:f.name,delay});timeouts.set(++next,f);return next;},clearTimeout:id=>timeouts.delete(id),
    setInterval(f){intervals.set(++next,f);return next;},clearInterval:id=>intervals.delete(id)};
  vm.createContext(context);
  for (const name of ['engine.js','opportunities.js','videos.js','app.js']) vm.runInContext(fs.readFileSync(`${__dirname}/../dist/${name}`,'utf8'),context);
  const api = {element,intervals,opened,timerDelays,advance(ms){now+=ms;},async flush(){await new Promise(resolve=>setImmediate(resolve));},
    click(action,id){handlers.click({target:{closest:()=>({dataset:{action,id}})}});},
    notify(){for(const [id,f] of timeouts)if(f.name==='maybeNotify'){timeouts.delete(id);f();break;}},
    input(value){handlers['notif:input']({target:{id:'draft',value}});},
  };
  if(setup) {api.click('close-info');api.click('onboard-skip');}
  return api;
}
function link(d,name='Anna') {d.click('card');d.click('connect',name);d.click('request',name);d.click('approve',name);d.click('home');}
test('intro and optional setup gate automatic notifications',()=>{
 const d=demo(false);assert.match(d.element('screen').innerHTML,/What do you enjoy/);d.click('scenario','change');d.notify();assert.equal(d.element('notif').innerHTML,'');d.click('close-info');d.click('onboard-next');assert.match(d.element('screen').innerHTML,/Who matters/);d.click('onboard-skip');assert.match(d.element('screen').innerHTML,/How involved/);d.click('onboard-next');d.notify();assert.match(d.element('notif').innerHTML,/Notification from Arki/);
});
test('normal week discovery; single-day offer once without a persistent-change claim',()=>{
 const d=demo();d.advance(15000);d.notify();assert.match(d.element('notif').innerHTML,/Little discovery/);d.click('dismiss');d.click('scenario','single');d.notify();assert.match(d.element('notif').innerHTML,/Notification from Arki/);assert.match(d.element('cap-label').textContent,/1 of 1/);assert.match(d.element('decision').innerHTML,/One different day/);d.click('dismiss');d.click('scenario','stable');d.click('scenario','single');d.notify();assert.equal(d.element('notif').innerHTML,'');
});
test('persona and scenario switches preserve allowance and hidden preferences',()=>{
 const d=demo();d.click('scenario','change');d.notify();d.click('never');d.click('persona','elias');d.click('onboard-skip');d.notify();assert.match(d.element('cap-label').textContent,/1 of 2/);d.click('persona','aino');assert.match(d.element('cap-label').textContent,/1 of 2/);assert.match(d.element('queue').innerHTML,/Hidden from automatic/);d.notify();assert.match(d.element('cap-label').textContent,/2 of 2/);d.click('dismiss');d.click('scenario','single');d.notify();assert.equal(d.element('notif').innerHTML,'');
});
test('light touch has one daily offer while all tiers keep the single-day offer',()=>{
 for(const level of ['light','balanced','more']) {const d=demo();d.click('card');d.click('profile-tab','involvement');d.click('involvement',level);d.click('scenario','single');d.notify();assert.match(d.element('notif').innerHTML,/Notification from Arki/);d.click('dismiss');d.click('scenario','change');d.notify();assert.match(d.element('cap-label').textContent,level==='light'?/1 of 1/:/2 of 2/);}
});
test('song acceptance hands off directly to a Spotify track, with no internal player',()=>{
 const d=demo();d.click('force','music');d.click('accept');assert.match(d.opened[0][0],/^https:\/\/open.spotify.com\/track\//);assert.match(d.element('phone-toast').innerHTML,/Spotify/);assert.doesNotMatch(d.element('screen').innerHTML,/music-view|album-art/);
});
test('default thank-you and friend drafts have different ready-to-use recipients',()=>{
 const d=demo();d.click('force','thanks');assert.match(d.element('notif').innerHTML,/Message to Mum/);assert.doesNotMatch(d.element('notif').innerHTML,/Link a close/);d.click('force','friend');assert.match(d.element('notif').innerHTML,/Message to Anna/);d.input('   ');assert.equal(d.element('button').disabled,true);d.input('Hello Anna');assert.equal(d.element('button').disabled,false);d.click('accept');assert.match(d.element('phone-toast').innerHTML,/Your message to Anna is ready/);
});
test('explicit removal and pending requests are respected despite ready-made initial contacts',()=>{
 const d=demo();d.click('card');d.click('profile-tab','people');d.click('disconnect','Anna');d.click('disconnect','Mum');d.click('connect','Anna');d.click('request','Anna');assert.match(d.element('screen').innerHTML,/Request pending/);d.click('force','friend');assert.match(d.element('notif').innerHTML,/Choose a close person/);d.click('accept');assert.match(d.element('notif').innerHTML,/Notification from Arki/);d.click('card');d.click('approve','Anna');d.click('force','friend');assert.match(d.element('notif').innerHTML,/Message to Anna/);
});
test('photo sharing names the pictured person and opens an editable draft to them',()=>{
 const d=demo();d.click('force','photo');d.click('accept');assert.match(d.element('notif').innerHTML,/Share this moment with Anna/);d.click('photo-send');assert.match(d.element('notif').innerHTML,/Message to Anna/);assert.match(d.element('notif').innerHTML,/Remember this/);assert.match(d.element('notif').innerHTML,/textarea/);
});
test('one greeting per persona per day, outside suggestion allowance, can be disabled',()=>{
 const d=demo();d.advance(3000);d.notify();assert.match(d.element('notif').innerHTML,/Send Anna a little hug/);assert.match(d.element('cap-label').textContent,/0 of 2/);
 d.click('dismiss');d.click('home');d.advance(120000);d.notify();assert.equal(d.element('notif').innerHTML,'');
 d.click('persona','elias');d.click('onboard-skip');d.advance(3000);d.notify();assert.match(d.element('notif').innerHTML,/kudos/);assert.doesNotMatch(d.element('notif').innerHTML,/Send a hug/);d.click('dismiss');
 d.click('next-day');d.advance(3000);d.notify();assert.match(d.element('notif').innerHTML,/kudos/);d.click('dismiss');
 d.click('card');d.click('profile-tab','involvement');d.click('discoveries');d.click('next-day');d.advance(3000);d.notify();assert.equal(d.element('notif').innerHTML,'');
});

test('only the seven retained suggestions preview without spending budget or restoring hidden entries',()=>{
 const d=demo(),A=require('../dist/engine');assert.equal(A.activities.length,7);for(const a of A.activities){d.click('force',a.id);assert.match(d.element('notif').innerHTML,/Notification from Arki/);assert.match(d.element('cap-label').textContent,/0 of 2/);}d.click('force','music');d.click('never');d.click('force','music');d.click('dismiss');d.click('home');d.notify();assert.equal(d.element('notif').innerHTML,'');assert.match(d.element('queue').innerHTML,/Hidden from automatic/);for(const id of ['chore','movement','routine','discovery'])assert.doesNotMatch(d.element('queue').innerHTML,new RegExp(`data-id="${id}"`));
});
test('at-home hobby requires choices then Continue, saves and follows up without any web call',async()=>{
 let calls=0;for(const hobby of ['dance','languages']){const d=demo(true,{fetch:async()=>{calls++;throw Error('should stay local');}});d.click('hobby',hobby);assert.match(d.element('screen').innerHTML,/Who with/);d.click('hobby-find');assert.match(d.element('screen').innerHTML,hobby==='dance'?/One familiar song/:/Three friendly words/);d.click('hobby-small');assert.match(d.element('screen').innerHTML,/2 minutes · Free/);d.click('hobby-save');assert.match(d.element('screen').innerHTML,/Saved by you/);d.click('next-day');d.click('card');d.click('profile-tab','steps');d.click('followup');d.click('trial','keep');assert.match(d.element('phone-toast').innerHTML,/More small ideas/);}assert.equal(calls,0);
});
test('recovery names a personal hobby immediately, including languages for Elias',()=>{
 const d=demo();d.click('scenario','recovery');d.notify();assert.match(d.element('notif').innerHTML,/dance session/);d.click('accept');assert.match(d.element('screen').innerHTML,/room for dancing/);d.click('persona','elias');d.click('onboard-skip');d.notify();assert.match(d.element('notif').innerHTML,/friendly language café/);d.click('accept');assert.match(d.element('screen').innerHTML,/new connection/);
});
test('a skipped or paused trial does not become a required task',()=>{
 const d=demo();d.click('hobby','dance');d.click('hobby-find');d.click('hobby-save');d.click('next-day');d.click('followup');d.click('followup-skip');assert.doesNotMatch(d.element('screen').innerHTML,/data-action="followup"/);d.click('next-day');d.click('followup');d.click('trial','pause');assert.match(d.element('screen').innerHTML,/Left aside for now/);
});
test('profile pages separate interests, people and involvement, with provenance below interests',()=>{
 const d=demo();d.click('card');assert.ok(d.element('interests-panel').innerHTML.indexOf('source-interests')<d.element('interests-panel').innerHTML.indexOf('Sources:'));d.click('interest','dogs');assert.match(d.element('screen').innerHTML,/Dogs <small>← Your choice/);d.click('profile-tab','people');assert.match(d.element('screen').innerHTML,/My people/);assert.doesNotMatch(d.element('screen').innerHTML,/interest-choices/);d.click('profile-tab','involvement');assert.match(d.element('screen').innerHTML,/Light touch/);assert.doesNotMatch(d.element('screen').innerHTML,/interest-choices|class="connection"/);
});
test('timeline selects a single group while source plots and weights retain real fixture values',()=>{
 const d=demo();d.click('scenario','change');d.click('source','movement');assert.match(d.element('evidence').innerHTML,/900 steps \/ day/);d.click('source','rhythm');assert.match(d.element('evidence').innerHTML,/not measured sleep/);d.click('timeline','movement');assert.match(d.element('chart').innerHTML,/Movement over time/);assert.doesNotMatch(d.element('chart').innerHTML,/Social interaction over time/);assert.match(d.element('chart').innerHTML,/Home period starts/);assert.match(d.element('domains').innerHTML,/Media consumption/);assert.match(d.element('domains').innerHTML,/High|Medium|Low/);assert.match(d.element('weights-note').textContent,/Personal importance weights/);
});
test('videos render moving drawings, support pause and next, and clear the playback interval on leaving',()=>{
 const d=demo();d.click('feed');assert.match(d.element('screen').innerHTML,/real-feed/);assert.match(d.element('screen').innerHTML,/5269588.mp4/);assert.equal(d.intervals.size,1);d.click('video-toggle');assert.equal(d.intervals.size,0);d.click('video-next');assert.match(d.element('screen').innerHTML,/9314156.mp4/);d.click('video-toggle');assert.equal(d.intervals.size,1);d.click('home');assert.equal(d.intervals.size,0);assert.doesNotMatch(d.element('screen').innerHTML,/Here in the background/);assert.match(d.element('screen').innerHTML,/acorn-wave/);
});
test('daily-limit explanation gives its design reason and reset clears per-person trial and allowance',()=>{
 const d=demo();d.click('info','cap');assert.match(d.element('dialog-title').textContent,/Why the daily limit/);assert.match(d.element('dialog-body').innerHTML,/tune out|frustration/);d.click('close-info');d.click('hobby','dance');d.click('hobby-find');d.click('hobby-save');d.click('scenario','change');d.notify();d.click('reset');assert.match(d.element('screen').innerHTML,/What do you enjoy/);assert.match(d.element('cap-label').textContent,/0 of 2/);assert.equal(d.element('notif').innerHTML,'');d.click('close-info');d.click('onboard-skip');d.click('profile-tab','steps');assert.doesNotMatch(d.element('screen').innerHTML,/Saved by you/);
});
function liveEvent(extra={}){return{id:'helsinki:demo',event_status:'EventScheduled',name:{en:'A public dance workshop'},start_time:new Date(Date.now()+86400000).toISOString(),location:{name:{en:'A real listing venue'}},offers:[{is_free:true}],...extra};}
test('nearby Continue performs a real-shaped query and renders source/date/price instead of fixture distance',async()=>{
 let request;const d=demo(true,{fetch:async(...args)=>{request=args;return{ok:true,json:async()=>({data:[liveEvent()]})};}});d.click('hobby','dance');d.click('hobby-mode','nearby');d.click('hobby-company','together');d.click('hobby-find');assert.match(d.element('screen').innerHTML,/Finding a small possibility/);await d.flush();assert.match(request[0],/api\.hel\.fi/);assert.match(d.element('screen').innerHTML,/A public dance workshop/);assert.match(d.element('screen').innerHTML,/Source: Helsinki Linked Events/);assert.doesNotMatch(d.element('screen').innerHTML,/0.8 km|Tapiola/);d.click('hobby-save');assert.match(d.element('screen').innerHTML,/A public dance workshop/);d.click('trial-open');assert.match(d.element('screen').innerHTML,/Source: Helsinki Linked Events/);assert.match(d.element('screen').innerHTML,/helsinki%3Ademo/);
});
test('failed and empty live searches offer a local alternative, never a made-up event',async()=>{
 for(const fetch of [async()=>{throw Error('offline');},async()=>({ok:true,json:async()=>({data:[]})})]){const d=demo(true,{fetch});d.click('hobby','languages');d.click('hobby-mode','nearby');d.click('hobby-find');await d.flush();assert.match(d.element('screen').innerHTML,/Try it at home/);assert.doesNotMatch(d.element('screen').innerHTML,/data-action="hobby-save"/);d.click('hobby-small');assert.match(d.element('screen').innerHTML,/Three friendly words/);}
});
test('late search responses cannot overwrite another person or a reset',async()=>{
 let resolve;const d=demo(true,{fetch:()=>new Promise(r=>resolve=r)});d.click('hobby','dance');d.click('hobby-mode','nearby');d.click('hobby-find');d.click('persona','elias');resolve({ok:true,json:async()=>({data:[liveEvent()]})});await d.flush();assert.match(d.element('screen').innerHTML,/What do you enjoy/);assert.doesNotMatch(d.element('screen').innerHTML,/public dance workshop/);
});

test('brainrot footage appears only in single and change scenarios',()=>{
 const d=demo();
 for(const scenario of ['single','change','stable','recovery']) {
  d.click('scenario',scenario);d.click('feed');const html=d.element('screen').innerHTML;
  if(['single','change'].includes(scenario)) {assert.match(html,/brainrot-1.mp4/);assert.match(html,/Party Tunes/);assert.doesNotMatch(html,/5269588.mp4/);}
  else {assert.match(html,/5269588.mp4/);assert.doesNotMatch(html,/brainrot-1.mp4/);}
 }
});

test('situation offer delay survives opening Videos',()=>{
 const d=demo();d.click('scenario','single');
 const latest=()=>d.timerDelays.filter(t=>t.name==='maybeNotify').at(-1).delay;
 assert.ok(latest()>=6400 && latest()<=6500);
 d.click('feed');assert.ok(latest()>=6400 && latest()<=6500);
 d.click('home');assert.ok(latest()>=6400 && latest()<=6500);
});

test('hugs and thanks appear in the selected connected recipient profile',()=>{
 const d=demo();d.click('card');d.click('profile-tab','people');
 assert.match(d.element('screen').innerHTML,/Send a hug/);
 d.click('greeting','hug:Anna');assert.match(d.element('notif').innerHTML,/Send Anna a little hug/);
 d.click('accept');assert.match(d.element('screen').innerHTML,/Anna’s Arki/);assert.match(d.element('screen').innerHTML,/A hug from Aino/);assert.match(d.element('cap-label').textContent,/0 of 2/);
 d.click('return-people');d.click('greeting','thanks:Mum');d.click('accept');assert.match(d.element('screen').innerHTML,/Mum’s Arki/);assert.match(d.element('screen').innerHTML,/Kudos from Aino/);assert.doesNotMatch(d.element('screen').innerHTML,/A hug from Aino/);
 d.click('return-people');d.click('recipient','Anna');assert.match(d.element('screen').innerHTML,/A hug from Aino/);
 d.click('return-people');d.click('disconnect','Anna');d.click('greeting','hug:Anna');assert.equal(d.element('notif').innerHTML,'');
 d.click('connect','Anna');d.click('request','Anna');d.click('greeting','hug:Anna');assert.equal(d.element('notif').innerHTML,'');
 d.click('persona','elias');d.click('onboard-skip');d.click('recipient','Joonas');assert.doesNotMatch(d.element('screen').innerHTML,/A hug from Aino/);
 d.click('reset');d.click('close-info');d.click('onboard-skip');d.click('recipient','Anna');assert.doesNotMatch(d.element('screen').innerHTML,/A hug from Aino/);
});

test('normal-day greeting appears quickly but never repeats on screen or scenario switches',()=>{
 const d=demo();d.notify();assert.equal(d.element('notif').innerHTML,'');
 d.advance(3000);d.notify();assert.match(d.element('notif').innerHTML,/Little discovery/);d.click('dismiss');
 d.click('feed');d.advance(3000);d.notify();assert.equal(d.element('notif').innerHTML,'');
 d.click('scenario','single');d.click('scenario','stable');d.advance(3000);d.notify();assert.equal(d.element('notif').innerHTML,'');
 d.advance(120000);d.click('home');d.notify();assert.equal(d.element('notif').innerHTML,'');
});

test('quieter-days Videos offer uses a shorter 1.5-second delay',()=>{
 const d=demo();d.click('scenario','change');d.click('feed');
 assert.equal(d.timerDelays.filter(t=>t.name==='maybeNotify').at(-1).delay,1500);
});
