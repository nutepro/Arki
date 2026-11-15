(function(root){
  'use strict';
  const localText = value => typeof value === 'string' ? value : value?.en || value?.fi || value?.sv || '';
  const plain = value => String(localText(value)).replace(/<[^>]*>/g,'').replace(/\s+/g,' ').trim();
  function requestUrl(hobby, cost='free', now=new Date()) {
    const url=new URL('https://api.hel.fi/linkedevents/v1/event/');
    const end=new Date(now.getTime()+90*86400000);
    const params={text:hobby==='languages'?'kielikahvila':'tanssi',start:now.toISOString(),end:end.toISOString(),page_size:'100',include:'location',sort:'start_time'};
    if(cost==='free')params.is_free='true';
    for(const [key,value] of Object.entries(params))url.searchParams.set(key,value);
    return url.href;
  }
  function normalise(payload, cost='free', now=new Date(), hobby='dance') {
    if(!Array.isArray(payload?.data))throw new Error('Invalid event response');
    const seen=new Set();
    return payload.data.flatMap(event=>{
      const title=plain(event.name),place=plain(event.location?.name),start=new Date(event.start_time),id=event.id;
      if(!/^[a-z0-9_-]+:[a-zA-Z0-9_-]+$/.test(id || '') || !title || event.deleted || event.event_status!=='EventScheduled' || event.super_event_type==='recurring' || !Number.isFinite(start.getTime()) || start<now || start-now>90*86400000 || seen.has(id))return [];
      // The API text search also matches long venue descriptions. Require the
      // event's own title to match the chosen activity, not unrelated gallery shows.
      const relevant=hobby==='languages'?/kielikahv|language caf|språkcaf|conversation|suomen kiel|finnish/i.test(title):/tanssi|danc|ballet|balett|salsa|swing|bachata|zumba|flamenco|lindy|tango/i.test(title);
      if(!relevant || /näyttely|exhibition|tanssiesitys|dance performance|tanssimusiikki|dance music|konsertti|concert/i.test(title))return [];
      if(/senior|seniori|eläkelä|pensioner|palvelukeskus/i.test(`${title} ${place}`) || event.audience_min_age>18 || event.audience_max_age && event.audience_max_age<18)return [];
      const offers=Array.isArray(event.offers)?event.offers:[],free=offers.some(o=>o.is_free===true);
      const prices=offers.flatMap(o=>{const nums=plain(o.price).match(/\d+(?:[.,]\d+)?/g);return nums?nums.map(n=>Number(n.replace(',','.'))):[];});
      const amount=prices.length?Math.max(...prices):null;
      if(!free && (cost==='free' || amount==null || amount>10))return [];
      seen.add(id);
      return [{id,title,place:place||'Helsinki area',address:plain(event.location?.street_address),start:start.toISOString(),price:free?'Free':`€${amount}`,summary:plain(event.short_description).slice(0,220),url:`https://tapahtumat.hel.fi/en/events/${encodeURIComponent(id)}`,source:'Helsinki Linked Events'}];
    }).slice(0,3);
  }
  async function search(hobby,cost='free',options={}){
    const now=options.now || new Date(),response=await (options.fetcher || root.fetch)(requestUrl(hobby,cost,now),{signal:options.signal,credentials:'omit',referrerPolicy:'no-referrer'});
    if(!response.ok)throw new Error('Event search unavailable');
    return normalise(await response.json(),cost,now,hobby);
  }
  const api={requestUrl,normalise,search};root.ArkiOpportunities=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(globalThis);
