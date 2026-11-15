const test=require('node:test'),assert=require('node:assert/strict'),O=require('../dist/opportunities');
const now=new Date('2026-11-14T12:00:00Z');
const event=(id='helsinki:test',extra={})=>({id,event_status:'EventScheduled',name:{en:'A beginner dance session'},start_time:'2026-11-16T17:00:00Z',location:{name:{en:'Community hall'},street_address:{en:'Example street 1'}},offers:[{is_free:true}],...extra});
test('live query sends an activity, date and price filter, not profile or observation data',()=>{
 const u=new URL(O.requestUrl('languages','free',now));assert.equal(u.origin,'https://api.hel.fi');assert.equal(u.searchParams.get('text'),'kielikahvila');assert.equal(u.searchParams.get('is_free'),'true');assert.equal(u.searchParams.get('start'),now.toISOString());assert.doesNotMatch(u.href,/Aino|steps|calls|Anna/);assert.equal(new URL(O.requestUrl('dance','low',now)).searchParams.has('is_free'),false);
});
test('only future scheduled distinct affordable listings are returned, with official source links',()=>{
 const payload={data:[event(),event(),event('helsinki:old',{start_time:'0026-09-23T11:20:11Z'}),event('helsinki:cancel',{event_status:'EventCancelled'}),event('helsinki:parent',{super_event_type:'recurring'}),event('helsinki:paid',{offers:[{is_free:false,price:{fi:'15 €'}}]}),event('helsinki:unknown',{offers:[]})]};
 const xs=O.normalise(payload,'free',now);assert.equal(xs.length,1);assert.equal(xs[0].price,'Free');assert.equal(xs[0].url,'https://tapahtumat.hel.fi/en/events/helsinki%3Atest');assert.equal(xs[0].source,'Helsinki Linked Events');
});
test('price ceiling and audience restrictions are respected rather than presented as a universal match',()=>{
 const xs=O.normalise({data:[event('helsinki:low',{offers:[{is_free:false,price:{en:'5–8 €'}}]}),event('helsinki:high',{offers:[{is_free:false,price:{en:'8–18 €'}}]}),event('helsinki:child',{audience_max_age:12}),event('helsinki:senior',{name:{fi:'Senioritanssi'}})]},'low',now);assert.equal(xs.length,1);assert.equal(xs[0].price,'€8');
});
test('untrusted listing text is plain data and cannot supply a link URL',()=>{
 const xs=O.normalise({data:[event('javascript:alert(1)'),event('helsinki:safe',{name:{en:'<b>Dance</b>'},info_url:{en:'javascript:alert(1)'},short_description:{en:'<script>bad()</script> hello'}})]},'free',now);assert.equal(xs.length,1);assert.equal(xs[0].title,'Dance');assert.match(xs[0].url,/^https:\/\/tapahtumat\.hel\.fi\//);assert.doesNotMatch(xs[0].summary,/[<>]/);
});
test('fetch omits credentials and referrer, propagates failure, and never manufactures a fallback event',async()=>{
 let request;const result=await O.search('dance','free',{now,fetcher:async(...args)=>{request=args;return{ok:true,json:async()=>({data:[]})};}});assert.deepEqual(result,[]);assert.equal(request[1].credentials,'omit');assert.equal(request[1].referrerPolicy,'no-referrer');await assert.rejects(()=>O.search('dance','free',{now,fetcher:async()=>({ok:false})}));assert.throws(()=>O.normalise({error:true},'free',now));
});
test('broad API text matches do not turn unrelated exhibitions into a hobby recommendation',()=>{
 const data=[event('helsinki:print',{name:{en:'Autumn Salon - Printmaking Art'}}),event('helsinki:dance',{name:{fi:'Rivitanssia'}}),event('helsinki:show',{name:{en:'Dance performance'}})];assert.deepEqual(O.normalise({data},'free',now,'dance').map(x=>x.id),['helsinki:dance']);assert.equal(O.normalise({data:[event('helsinki:lang',{name:{en:'Language café'}})]},'free',now,'languages').length,1);
});
