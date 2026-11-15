(() => {
  'use strict';
  const { metrics, domains, dataset, history, learnWeights, analyze, rank, activities } = Arki;
  const $ = id => document.getElementById(id);

  // ---------- Fictional people and wording ----------
  const people = {
    aino: {
      name: 'Aino', blurb: 'Regular rhythm · close contact with friends',
      close: 'Anna', thanks: 'Mum', interests: ['dance', 'football', 'daylight'], photo: 'July · on the jetty with Anna', song:'Here Comes The Sun — The Beatles', songUrl:'https://open.spotify.com/track/772dxxQxHg5uMOSFfwqpKQ',
      insights: [['Morning walks seem to suit you.', 'On walk days you were in touch with people more often.'], ['A message to Anna may be an easy first step for you.', 'You said yes to these most often.']],
      experiment: 'A thank-you message once a week',
    },
    elias: {
      name: 'Elias', blurb: 'Daily dog walks · flexible sleep and social rhythm',
      close: 'Joonas', thanks: 'Sari', interests: ['languages', 'music', 'dogs'], photo: 'August · at the lake with Joonas', song:'Blackbird — The Beatles', songUrl:'https://open.spotify.com/track/4Z92RMiyJpUrApZi3LtpJ6',
      insights: [['Music seems to suit you.', 'On playlist days you moved more than usual.'], ['The evening walk with your dog may keep your rhythm steady.', 'It is the steadiest part of your days.']],
      experiment: 'Two minutes of guitar on weekday evenings',
    },
  };
  const interestLabels = { dance: 'Dance', languages: 'Languages', films: 'Films', football: 'Football', music: 'Music', photo: 'Photos and memories', daylight: 'Being outdoors', dogs: 'Dogs' };
  const scenarios = [
    ['stable', 'sun', 'A normal week', 'Nothing unusual'],
    ['single', 'single', 'One unusual day', 'A light offer, at your pace'],
    ['change', 'change', 'Three quieter days', 'Several routines change together'],
    ['recovery', 'leaf', 'Finding your rhythm again', 'Small ways to explore your interests'],
  ];
  // What a notification says. Always an offer, never an instruction; no "don't" and no pointing out negatives.
  function copy(id) {
    const p = people[state.persona], close = linkedName();
    return {
      hobby: { text: preferredHobby() === 'dance' ? 'A free beginner dance session, or a few steps at home?' : 'A friendly language café, or a few Finnish words at home?', primary: preferredHobby() === 'dance' ? 'Explore dancing' : 'Explore languages' },
      friend: { text: `Feel like sharing a little of your day with ${close || "someone close"}?`, to: close, message: 'Hi! This made me think of you. How has your day been?' },
      daylight: { text: `A little walk with ${close || 'someone close'}?`, to: close, message: 'Hi! Would you like to share a short walk on our familiar route sometime?' },
      photo: { text: `A little memory with ${p.close}, from your favourites.`, primary: 'Open memory' },
      thanks: { text: `A little thank-you for ${thanksName() || 'someone close'}? A note is ready to make your own.`, to: thanksName(), message: 'I was thinking of you. Thank you for being there for me.' },
      music: { text: `A familiar favourite: ${p.song}?`, primary: 'Open song in Spotify ↗' },
      football: { text: `A kickabout with ${close || "someone close"}, just for the fun of it?`, to: close, message: 'Fancy a kickabout together sometime? Just for fun.' },
    }[id];
  }

  const icons = {
    leaf: 'M19 3C8 2 3 8 5 16c8 4 15-2 14-13ZM5 20l9-10', people: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M16 4a4 4 0 0 1 0 8M22 21v-2a4 4 0 0 0-3-3.87M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
    ball: 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0ZM12 7l5 4-2 6H9l-2-6 5-4ZM12 7V2M17 11l5-2M15 17l3 3M9 17l-3 3M7 11 2 9', music: 'M9 18V5l12-2v13M9 18a3 3 0 1 1-3-3c2 0 3 1 3 3ZM21 16a3 3 0 1 1-3-3c2 0 3 1 3 3Z',
    sun: 'M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.4 1.4M17.6 17.6 19 19M5 19l1.4-1.4M17.6 6.4 19 5M17 12a5 5 0 1 1-10 0 5 5 0 0 1 10 0Z', photo: 'M3 5h18v14H3ZM3 16l5-5 4 4 3-3 6 6M16 9.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z',
    clock: 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0ZM12 6v6l4 2', heart: 'M12 21C5 15 2 12 2 8a5 5 0 0 1 10-1 5 5 0 0 1 10 1c0 4-3 7-10 13Z',
    change: 'M3 17l6-6 4 3 8-10M15 4h6v6', single: 'M3 16h5l3-10 3 14 3-8h4', check: 'M4 12l5 5L20 6',
  };
  const icon = name => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${icons[name] || icons.leaf}"/></svg>`;
  const number = value => value == null ? '–' : Math.round(value).toLocaleString('en-GB');
  const decimal = value => value.toFixed(2);
  const escapeHtml = text => text.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const listWords = items => items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;
  const activity = id => activities.find(a => a.id === id);
  

  // ---------- State (kept in memory only, so every reload starts from the same clean demo) ----------
  const freshPerson = id => ({ interests: [...people[id].interests], origins: {}, feedback: {}, completed: 0, exposures: [], discoveries: true, discoveryCount:0, nextDiscoveryAt:0, discoveryHidden:[], greetings:{},
    onboarding: 0, onboarded: false, involvement: 'balanced', connections: { [people[id].close]:'connected', [people[id].thanks]:'connected' }, day: 1, sentToday: 0, offered: [], answered: new Set(), experiment: null, trialFeedback: {}, events: [] });
  const freshState = () => ({ persona: 'aino', scenario: 'stable', metric: 'steps', screen: 'onboarding',
    day: 1, sentToday: 0, answered: new Set(), notif: null, photo: false, event: '', shared: false, source: 'contact', timeline:'social', profileTab:'interests', clipIndex:0, videoPaused:false, hobbyStage:'choices', company:'alone', searchStatus:'idle', searchResults:[], searchSelected:0,
    hobby: 'dance', mode: 'home', cost: 'free', small: false, memory: { aino: freshPerson('aino'), elias: freshPerson('elias') } });
  const state = freshState();
  let data, weights, result, notifTimer, clipTimer, toastTimer, searchController, searchVersion=0, undo = null, dialogOpener;
  const me = () => state.memory[state.persona];
  const cap = () => state.scenario === 'single' || me().involvement === 'light' ? 1 : 2;
  const connected = () => Object.entries(me().connections).filter(([, status]) => status === 'connected').map(([name]) => name);
  const linkedName = () => connected()[0] || null;
  const thanksName = () => connected().includes(people[state.persona].thanks) ? people[state.persona].thanks : linkedName();
  const preferredHobby = () => ['dance','languages'].filter(id=>me().interests.includes(id) && (me().trialFeedback[id] || 0)>-3).sort((a,b)=>(me().trialFeedback[b] || 0)-(me().trialFeedback[a] || 0))[0] || 'dance';
  const currentCopy = id => { const n=state.notif; const c=n?.gesture ? {text:`Send ${n.to} ${n.gesture==='hug'?'a little hug':'some kudos'} on Arki?`,primary:n.gesture==='hug'?'Send a hug':'Send kudos'} : copy(id); if(c && state.notif?.to!==undefined)c.to=state.notif.to; return c; }; 
  const queue = () => rank(result, me().interests, me().feedback, { screen: state.screen, daylight: true, day: state.day, exposures: me().exposures, recovery: Arki.recovering(data), involvement: me().involvement });
  const automaticQueue = () => queue().filter(a => !['friend','thanks','daylight','football'].includes(a.id) || linkedName()).filter(a => a.id !== 'hobby' || Arki.recovering(data));
  function saveDay() { Object.assign(me(), { day: state.day, sentToday: state.sentToday, answered: state.answered }); }
  function loadDay() { Object.assign(state, { day: me().day, sentToday: me().sentToday, answered: me().answered }); }

  function compute() {
    data = dataset(state.scenario, undefined, 3, state.persona);
    weights = learnWeights(data);
    result = analyze(data, { weights: weights.weights });
  }

  // ---------- When a notification appears ----------
  function schedule(delay) {
    clearTimeout(notifTimer);
    if(state.scenario==='stable' && me().discoveries) {
      if(!me().nextDiscoveryAt)me().nextDiscoveryAt=Date.now()+1000;
      delay=Math.max(1000,me().nextDiscoveryAt-Date.now());
    }
    notifTimer=setTimeout(maybeNotify,Math.max(delay,(state.offerNotBefore || 0)-Date.now()));
  }

  function maybeNotify() {
    if (state.previewSuppressed || !me().onboarded || $('info-dialog').open || state.notif || state.photo || !['home', 'feed'].includes(state.screen)) return;
    const recovery = Arki.recovering(data), single = !result.drift && Arki.singleDay(data);
    let category = result.drift ? 'drift' : recovery ? 'recovery' : single ? 'single' : me().discoveries ? 'discovery' : null;
    if (!category) return;
    if(category==='discovery') {
      const m=me();if(m.discoveryCount>=1)return;
      if(Date.now()<m.nextDiscoveryAt){schedule(m.nextDiscoveryAt-Date.now());return;}
      const kind=state.persona==='aino'?'hug':'thanks';
      if(m.discoveryHidden.includes(kind)||!connected().length)return;
      m.discoveryCount++;
      state.notif={id:kind==='hug'?'friend':'thanks',stage:'offer',gentle:true,category:'discovery',discoveryKind:kind,gesture:kind,to:kind==='thanks'?thanksName():linkedName()};
      renderNotif();renderBackground();return;
    }
    if(state.sentToday>=cap())return;
    // Each automatic class is offered once per day. Drift permits two different offers.
    if (me().offered.includes(category) && (category !== 'drift' || me().offered.filter(x => x === category).length >= cap())) return;
    const pool = automaticQueue().filter(a => !state.answered.has(a.id));
    const eligible = category === 'recovery' ? pool.filter(a => a.id === 'hobby' && me().interests.some(x => ['dance','languages'].includes(x) && (me().trialFeedback[x] || 0) > -3)) : ['single','discovery'].includes(category) ? pool.filter(a => (category==='discovery'?['photo','music']:['photo','music','friend']).includes(a.id)) : pool.filter(a => a.id !== 'hobby');
    const pick = eligible[0];
    if (!pick) return;
    me().offered.push(category); state.sentToday++; saveDay();
    show(pick.id, ''); state.notif.gentle = category === 'discovery'; state.notif.category = category;
    renderNotif();
  }

  function show(id, event) {
    if(!activity(id))return;
    state.notif = { id, stage: 'offer' };
    if (!state.preview) me().exposures.push({ id, kind: activity(id).kind, day: state.day });
    me().events.push({ id, day: state.day, type: state.preview ? 'previewed' : 'shown' });
    state.preview = false;
    state.event = event;
    hideToast();
    renderNotif(); renderBackground();
  }

  function closeNotif(event) {
    state.notif = null; state.photo = false;
    if (event) state.event = event;
    renderNotif(); renderBackground();
    if (state.screen === 'home') renderScreen();
  }
  function go(screen) {
    cancelSearch();
    state.screen = screen; $('screen').scrollTop = 0;
    if (!['home', 'feed'].includes(screen)) { clearTimeout(notifTimer); state.notif = null; state.photo = false; state.shared = false; }
    renderScreen(); renderNotif(); renderBackground();
    if (screen === 'home' && !state.previewSuppressed) schedule(1400);
    if (screen === 'feed' && !state.previewSuppressed) {
      if(state.scenario==='change') {state.offerNotBefore=Date.now()+1500;schedule(1500);}
      else schedule(3200);
    }
  }
  // Acceptance records a preference, not an outcome.
  function accepted(id) {
    const m = me();
    m.feedback[id] = Math.min(5, (m.feedback[id] || 0) + 1);
    m.completed++; m.events.push({ id, day: state.day, type: 'selected' });
    state.answered.add(id);
  }

  // Short confirmation inside the phone, so every action has a visible result.
  function toast(text, undoAction) {
    undo = undoAction || null;
    $('phone-toast').innerHTML = `<span>${text}</span>${undo ? '<button data-action="undo">Undo</button>' : ''}`;
    $('phone-toast').classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, undo ? 7000 : 4200);
  }
  function hideToast() { clearTimeout(toastTimer); undo = null; $('phone-toast').classList.remove('show'); }

  // ---------- Phone: what the user sees ----------
  function renderScreen() {
    clearInterval(clipTimer);
    const p = people[state.persona], el = $('screen');
    el.className = `screen screen-${state.screen}`;
    if (state.screen === 'home') {
      const apps = [['📞', 'Phone'], ['💬', 'Messages'], ['🖼', 'Photos'], ['🎵', 'Music'], ['▶', 'Videos', 'feed'], ['📷', 'Camera'], ['🗺', 'Maps'], ['⚙', 'Settings']];
      el.innerHTML = `<div class="lock-time"><span>Saturday 14 November</span><strong>14:40</strong></div>
        <button class="widget" data-action="card"><span class="widget-character acorn-greeting" aria-hidden="true"><img class="acorn-neutral" src="./acorn.png" alt=""><img class="acorn-wave" src="./acorn-wave.png" alt=""></span><span class="widget-body"><span class="widget-title wordmark">arki</span><span class="widget-link">What works for me ›</span></span></button>
        <div class="app-grid">${apps.map(([emoji, label, action]) => action ? `<button class="app" data-action="${action}"><span>${emoji}</span>${label}</button>` : `<div class="app"><span aria-hidden="true">${emoji}</span>${label}</div>`).join('')}</div>`;
    } else if (state.screen === 'onboarding') renderOnboarding(el);
    else if (state.screen === 'hobby') renderHobby(el);
    else if (state.screen === 'followup') renderFollowup(el);
    else if (state.screen === 'feed') renderVideos(el);
    else if(state.screen==='recipient')renderRecipient(el);
    else renderCard(el, p);
  }

  function renderVideos(el) {
    const reduced=Boolean(globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
    const paused=state.videoPaused || reduced;
    const clips=ArkiVideos.clipsForScenario(state.scenario);
    state.clipIndex%=clips.length;
    el.innerHTML=`<div class="feed real-feed"><button class="feed-back" data-action="home">‹ Home</button><div class="feed-top">Following <strong>For You</strong></div>${clips.map((c,i)=>`<div class="clip ${i===state.clipIndex?'active':''}" aria-hidden="${i!==state.clipIndex}"><video src="./media/${c.id}.mp4" muted playsinline loop preload="${i===state.clipIndex?'auto':'metadata'}" aria-label="${c.title}"></video><div class="clip-caption"><strong>${c.handle}</strong><span>${c.title} #${c.tag || 'everyday'}</span><span>${c.credit || 'Stock footage'} · fictional profile</span></div></div>`).join('')}<button class="feed-tap" data-action="video-toggle" aria-label="${paused?'Play videos':'Pause videos'}">${paused?'<span>▶</span>':''}</button><div class="video-rail" aria-hidden="true"><span>♡</span><span>＋</span><span>↗</span></div></div>`;
    const list=el.querySelectorAll('.clip');
    const sync=()=>list.forEach((c,i)=>{const v=c.querySelector('video');if(!v)return;if(i===state.clipIndex&&!paused&&!state.notif&&!document.hidden)v.play?.()?.catch(()=>{});else v.pause?.();});
    sync();let elapsed=0;
    if(!paused)clipTimer=setInterval(()=>{
      sync();if(paused||state.notif||document.hidden)return;
      elapsed+=250;if(elapsed<10000)return;elapsed=0;
      const old=list[state.clipIndex];old.classList.remove('active');old.classList.add('leaving');old.setAttribute('aria-hidden','true');
      state.clipIndex=(state.clipIndex+1)%clips.length;
      const next=list[state.clipIndex];next.classList.remove('leaving');next.classList.add('active');next.setAttribute('aria-hidden','false');next.querySelector('video').currentTime=0;sync();
      setTimeout(()=>old.classList.remove('leaving'),650);
    },250);
  }

  function originFor(id) {
    return me().origins[id] || ({ dance: 'Photos', football: 'Initial questionnaire', daylight: 'Personal data', languages: 'Initial questionnaire', music: 'Personal data', dogs: 'Photos', films: 'Personal data' }[id] || 'Initial questionnaire');
  }
  function interestSources() {
    return `<div class="source-interests">${me().interests.map(id => `<span>${interestLabels[id]} <small>← ${originFor(id)}</small></span>`).join('') || '<p>Choose what feels like you.</p>'}</div><p class="fineprint">Sources: <strong>Photos · Personal data · Initial questionnaire</strong></p><details class="profile-origin"><summary>About these sources</summary><p>Photos can suggest activities and places you enjoy, with permission. Personal data can suggest interests through your own media-use and activity patterns. The initial questionnaire records what you choose.</p><p>Photo and personal-data origins here are prewritten profile examples. Your questionnaire and edited choices update this session; no photos or account data are analysed.</p></details>`;
  }
  function interestChoices(compact = false) { return `<div class="chips interest-choices">${Object.entries(interestLabels).filter(([id]) => !compact || ['music','dance','languages','football','films','daylight','dogs'].includes(id)).map(([id, label]) => `<button class="chip ${me().interests.includes(id) ? 'on' : ''}" data-action="interest" data-id="${id}" aria-pressed="${me().interests.includes(id)}">${me().interests.includes(id) ? '✓ ' : ''}${label}</button>`).join('')}</div>`; }
  function connectionChoices() {
    const names = [people[state.persona].close, people[state.persona].thanks];
    return `<p class="card-intro">Link an Arki profile. A connection shares no observation history.</p>${names.map(name => {
      const status = me().connections[name];
      return `<div class="connection"><strong>${name}</strong><small>${status === 'connected' ? 'Connected' : status === 'pending' ? 'Request pending' : 'Arki profile'}</small>${!status ? `<button class="secondary" data-action="connect" data-id="${name}">Preview request</button>` : status === 'preview' ? `<p>Invite ${name} to connect on Arki?</p><button class="secondary" data-action="request" data-id="${name}">Send connection request</button><button class="text-button" data-action="disconnect" data-id="${name}">Cancel</button>` : `${status === 'pending' ? `<button class="secondary" data-action="approve" data-id="${name}">Show ${name}'s acceptance</button>` : ''}<button class="text-button" data-action="disconnect" data-id="${name}">${status === 'pending' ? 'Cancel request' : 'Remove connection'}</button>`}${status==='connected'?`<div class="greeting-actions"><button class="secondary" data-action="greeting" data-id="hug:${name}">Send a hug</button><button class="secondary" data-action="greeting" data-id="thanks:${name}">Send kudos</button><button class="text-button" data-action="recipient" data-id="${name}">See ${name}’s Arki${(me().greetings[name] || []).length?' · '+me().greetings[name].length:''}</button></div>`:''}</div>`;
    }).join('')}`;
  }
  function renderRecipient(el) {
    const name=state.viewRecipient, messages=me().greetings[name] || [];
    el.innerHTML=`<div class="card-view recipient-view"><button class="back" data-action="return-people">‹ Back to my Arki</button><p class="eyebrow">Example recipient view</p><h2>${escapeHtml(name)}’s Arki</h2><p class="card-intro">A little warmth from someone close.</p>${messages.length?messages.slice().reverse().map(g=>`<article class="greeting-card"><span class="greeting-symbol" aria-hidden="true">${g.kind==='hug'?'♡':'✿'}</span><h3>${g.kind==='hug'?'A hug':'Kudos'} from ${escapeHtml(g.from)}</h3><p>${g.kind==='hug'?'Thinking of you. Sending a little hug your way.':'Thank you for being part of my day.'}</p></article>`).join(''):'<p>Your little greetings will appear here.</p>'}</div>`;
  }
  function involvementChoices() {
    return `<div class="involvement">${[['light','Light touch','Up to one automatic suggestion a day.'],['balanced','Balanced','Up to two, with familiar small options first.'],['more','More involved','Up to two, with more variety among your interests.']].map(([id,name,note]) => `<button class="option ${me().involvement === id ? 'active' : ''}" data-action="involvement" data-id="${id}" aria-pressed="${me().involvement === id}"><span><strong>${name}</strong><small>${note}</small></span></button>`).join('')}</div><p class="card-intro">A gentle suggestion may still appear after an unusual day.</p>`;
  }
  function onboardingConnections() {
    const names = [people[state.persona].close, people[state.persona].thanks];
    return `<p class="setup-note">Existing example Arki connections · no phone contacts imported.</p><div class="setup-people">${names.map(name => {
      const status=me().connections[name];
      return `<article class="setup-person"><div class="person-line"><span class="avatar">${name[0]}</span><strong>${name}</strong><small>${status==='pending'?'Pending':status==='connected'?'Connected':'Arki profile'}</small></div><div class="connection-actions">${!status ? `<button class="secondary" data-action="connect" data-id="${name}">Connect</button>` : status==='preview' ? `<button class="secondary" data-action="request" data-id="${name}">Send request</button><button class="text-button" data-action="disconnect" data-id="${name}">Cancel</button>` : `${status==='pending'?`<button class="secondary" data-action="approve" data-id="${name}">Show acceptance</button>`:''}<button class="text-button" data-action="disconnect" data-id="${name}">${status==='pending'?'Cancel':'Remove'}</button>`}</div></article>`;
    }).join('')}</div><p class="setup-note">You choose who to link. Observations stay private.</p>`;
  }
  function renderOnboarding(el) {
    const step = me().onboarding;
    el.innerHTML = `<div class="card-view onboarding"><div class="setup-top"><span class="setup-progress">${step + 1} of 3</span><button class="text-button" data-action="onboard-skip">${step === 1 ? 'Skip people' : 'Skip setup'}</button></div><div class="setup-heading"><img src="./acorn.png" alt="" width="38" height="44"><h2>${['What do you enjoy?','Who matters to you?','How involved would you like Arki to be?'][step]}</h2></div><div class="setup-options">${[() => `<p class="setup-note">Choose what feels like you.</p>${interestChoices(true)}<p class="setup-note">You can change or add interests later.</p>`, onboardingConnections, involvementChoices][step]()}</div><button class="primary wide-button setup-continue" data-action="onboard-next">${step === 2 ? 'Make room for my day' : 'Continue'}</button></div>`;
  }
  function profileNav() {
    const selected=state.profileTab==='activity'?'involvement':state.profileTab;
    return `<nav class="profile-tabs" aria-label="Arki settings">${[['interests','Interests'],['people','People'],['involvement','Arki'],['steps','Small steps']].map(([id,label])=>`<button data-action="profile-tab" data-id="${id}" aria-pressed="${selected===id}" class="${selected===id?'active':''}">${label}</button>`).join('')}</nav>`;
  }
  function renderCard(el) {
    const m=me(),tab=state.profileTab,e=m.experiment;
    let content;
    if(tab==='people')content=`<h2>My people</h2>${connectionChoices()}`;
    else if(tab==='involvement')content=`<h2>Arki’s involvement</h2>${involvementChoices()}<div class="discovery-setting"><div><strong>Occasional little discoveries</strong><p>One little greeting per demo day, separate from the suggestion limit. Aino offers a hug; Elias offers kudos.</p></div><button class="secondary" data-action="discoveries" aria-pressed="${m.discoveries}">${m.discoveries?'On':'Off'}</button></div><button class="text-button" data-action="profile-tab" data-id="activity">My activity</button>${activities.some(a=>(m.feedback[a.id] || 0)<=-3)?'<button class="text-button" data-action="restore">Bring back hidden suggestions</button>':''}`;
    else if(tab==='steps')content=`<h2>My small steps</h2>${e?`<div class="experiment"><strong>${escapeHtml(e.title)}</strong><p>${e.status==='paused'?'Left aside for now.':e.status==='replaced'?'You’re exploring another option.':'Saved by you. Taking part is your choice.'}</p><button class="secondary" data-action="trial-open">Open my small step</button>${m.day>e.day && !['paused','replaced'].includes(e.status) && e.reviewedDay!==m.day?'<button class="secondary" data-action="followup">Would you like to keep exploring?</button>':''}</div>`:'<p>Save a small step when something catches your interest.</p>'}${['dance','languages'].filter(id=>m.interests.includes(id)).map(id=>`<button class="secondary wide-button" data-action="hobby" data-id="${id}">Explore ${interestLabels[id].toLowerCase()}</button>`).join('')}`;
    else if(tab==='activity')content=`<h2>My activity</h2><div class="activity-cards">${Object.entries(metrics).map(([key,metric])=>`<div><strong>${metric.label}</strong><span>${number(result.summaries[key].current)} ${metric.unit || 'per day'}</span><small>Recent daily median · ${result.summaries[key].recentSamples}/3 days</small></div>`).join('')}</div>`;
    else content=`<h2>What works for me</h2>${interestChoices()}${interestSources()}<div class="interest-actions">${['dance','languages'].filter(id=>m.interests.includes(id)).map(id=>`<button class="secondary" data-action="hobby" data-id="${id}">Explore ${interestLabels[id].toLowerCase()}</button>`).join('')}</div>`;
    el.innerHTML=`<div class="card-view profile-view"><button class="back" data-action="home">‹ Home</button>${profileNav()}${content}</div>`;
  }
  function hobbyOption() {
    if(state.mode==='nearby' && state.searchStatus==='done' && state.searchResults[state.searchSelected]){
      const event=state.searchResults[state.searchSelected];return {...event,duration:'See organiser details',place:event.place,live:true};
    }
    const dance=state.hobby==='dance';
    return {title:dance?'One familiar song, a little dancing':'Three friendly words in Finnish',duration:state.small?'2 minutes':'5 minutes',price:'Free',place:'At home',instruction:dance?'Put on a familiar song and try a few comfortable steps, seated or standing. Choose your own pace.':'Try “Hei” (hello), “Kiitos” (thank you), and “Moi moi” (bye). Try one word or a tiny conversation.'};
  }
  function cancelSearch(){searchVersion++;searchController?.abort();searchController=null;}
  async function findHobby(){
    cancelSearch();state.hobbyStage='result';state.searchResults=[];state.searchSelected=0;
    if(state.mode==='home'){state.searchStatus='home';renderScreen();return;}
    const version=searchVersion,persona=state.persona;
    const controller=new AbortController();searchController=controller;const timeout=setTimeout(()=>controller.abort(),12000);
    state.searchStatus='loading';renderScreen();
    try { const events=await ArkiOpportunities.search(state.hobby,state.cost,{signal:controller.signal});
      if(version!==searchVersion || persona!==state.persona || state.screen!=='hobby')return;
      state.searchResults=events;state.searchStatus=events.length?'done':'empty';
    } catch(error){if(version!==searchVersion)return;state.searchStatus='error';}
    finally {clearTimeout(timeout);if(version===searchVersion && persona===state.persona && state.screen==='hobby')renderScreen();}
  }
  function renderHobby(el){
    const dance=state.hobby==='dance',h=hobbyOption();
    let body;
    if(state.hobbyStage==='choices')body=`<p>${dance?'A little dancing, in a way that suits you.':'A few Finnish words and a new conversation.'}</p><fieldset><legend>Where?</legend><div class="chips">${[['home','At home'],['nearby','Helsinki area']].map(([id,label])=>`<button class="chip ${state.mode===id?'on':''}" data-action="hobby-mode" data-id="${id}" aria-pressed="${state.mode===id}">${label}</button>`).join('')}</div></fieldset><fieldset><legend>Who with?</legend><div class="chips">${[['alone','On my own'],['together','With someone']].map(([id,label])=>`<button class="chip ${state.company===id?'on':''}" data-action="hobby-company" data-id="${id}" aria-pressed="${state.company===id}">${label}</button>`).join('')}</div></fieldset>${state.mode==='nearby'?`<fieldset><legend>Price</legend><div class="chips">${[['free','Free'],['low','Up to €10']].map(([id,label])=>`<button class="chip ${state.cost===id?'on':''}" data-action="hobby-cost" data-id="${id}" aria-pressed="${state.cost===id}">${label}</button>`).join('')}</div></fieldset><p class="card-intro">Continue searches public Helsinki listings. Your personal observations stay here.</p>`:''}<button class="primary wide-button" data-action="hobby-find">Continue</button>`;
    else if(state.searchStatus==='loading')body='<div class="search-state" role="status"><span class="search-leaf" aria-hidden="true">⌕</span><h3>Finding a small possibility…</h3><p>Checking public Helsinki event listings.</p></div>';
    else if(['empty','error'].includes(state.searchStatus))body=`<div class="search-state" role="status"><h3>${state.searchStatus==='empty'?'No matching listing this time.':'The event service is taking a moment.'}</h3><p>${state.searchStatus==='empty'?'Try a different price or a little version at home.':'Try again, or explore the at-home option.'}</p><button class="secondary wide-button" data-action="hobby-find">Try search again</button><button class="secondary wide-button" data-action="hobby-small">Try it at home</button></div>`;
    else body=`${state.mode==='nearby'?`<p class="card-intro">Live Helsinki listings · check organiser requirements.</p><div class="event-choices">${state.searchResults.map((event,i)=>`<button class="event-choice ${state.searchSelected===i?'active':''}" data-action="hobby-select" data-id="${i}" aria-pressed="${state.searchSelected===i}"><strong>${escapeHtml(event.title)}</strong><small>${escapeHtml(event.price)} · ${new Date(event.start).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}</small></button>`).join('')}</div>`:''}<article class="opportunity"><strong>${escapeHtml(h.title)}</strong><p>${escapeHtml(h.duration)} · ${escapeHtml(h.price)}</p><p>${escapeHtml(h.place)}</p><p>${escapeHtml(h.instruction || h.summary || '')}</p>${h.live?`<p>${new Date(h.start).toLocaleString('en-GB',{timeZone:'Europe/Helsinki',dateStyle:'medium',timeStyle:'short'})} · Helsinki time</p><a class="secondary external-link" href="${h.url}" target="_blank" rel="noopener noreferrer">View organiser’s listing ↗</a><p class="card-intro">Source: Helsinki Linked Events. No booking has been made.</p>`:''}</article><button class="primary wide-button" data-action="hobby-save">Save this small step</button>${state.company==='together'?'<button class="secondary wide-button" data-action="hobby-invite">Invite someone</button>':''}<button class="text-button" data-action="hobby-small">Make it smaller at home</button>`;
    el.innerHTML=`<div class="card-view hobby-view"><button class="back" data-action="home">‹ Home</button><h2>${dance?'A little room for dancing.':'A few words. A new connection.'}</h2>${body}${state.hobbyStage==='result'?'<button class="text-button" data-action="hobby-edit">Change my choices</button>':''}</div>`;
  }
  function renderFollowup(el) {
    const e = me().experiment;
    el.innerHTML = `<div class="card-view"><button class="back" data-action="home">‹ Home</button><span class="eyebrow">YOUR CHOICE, AT YOUR PACE</span><h2>Would you like to keep exploring this?</h2><p>${e ? e.title : 'A small step for you'}</p><p>Saving a step does not mean you took part. What would suit you now?</p>${[['keep','Keep it'],['smaller','Make it smaller'],['replace','Try something else'],['pause','Leave it for now']].map(([id,label]) => `<button class="secondary wide-button" data-action="trial" data-id="${id}">${label}</button>`).join('')}<button class="text-button" data-action="followup-skip">Skip this for now</button></div>`;
  }
  function renderNotif() {
    const el = $('notif'), p = people[state.persona];
    if (state.photo) {
      el.className = 'notif photo-open';
      el.innerHTML = `<div class="photo-view"><button class="photo-x" data-action="photo-close" aria-label="Close photo">×</button><svg viewBox="0 0 300 300" role="img" aria-label="Fictional favourite photo: two people on a jetty by a lake at sunset."><defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6c98b"/><stop offset=".55" stop-color="#f3a783"/><stop offset="1" stop-color="#b77a8c"/></linearGradient><linearGradient id="lake" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c98a86"/><stop offset="1" stop-color="#3f5a6b"/></linearGradient></defs><rect width="300" height="170" fill="url(#sky)"/><circle cx="205" cy="128" r="30" fill="#fde7b0"/><path d="M0 150 60 118 110 142 170 108 240 140 300 120V170H0Z" fill="#6d5a6e" opacity=".75"/><rect y="170" width="300" height="130" fill="url(#lake)"/><path d="M190 185h34M178 200h58M196 216h26" stroke="#fde7b0" stroke-width="3" stroke-linecap="round" opacity=".7"/><path d="M0 250h150v12H0ZM30 262v38M120 262v38" fill="#4a3a36" stroke="#4a3a36" stroke-width="6"/><g fill="#2b2530"><circle cx="72" cy="196" r="9"/><path d="M60 250v-30q0-14 12-14t12 14v30Z"/><circle cx="104" cy="200" r="8.5"/><path d="M93 250v-27q0-13 11-13t11 13v27Z"/></g></svg>
        <div class="photo-caption"><strong>${p.photo}</strong><span>From your favourites</span></div>
        <button class="primary" data-action="photo-send" ${connected().includes(p.close)?'':'disabled'}>Share this moment with ${p.close}</button><button class="ghost" data-action="photo-close">Close</button></div>`;
      return;
    }
    if (!state.notif) { el.className = 'notif'; el.innerHTML = ''; return; }
    const { id, stage } = state.notif, c = currentCopy(id);
    const head = `<div class="notif-head"><span class="app-mark tiny lantern-app-mark"><img src="./acorn.png" alt="" width="22" height="26"></span><span class="wordmark">arki</span>${state.notif.gentle?'<small>Little discovery</small>':''}<span class="notif-time">now</span></div>`;
    let body;
    if (stage === 'offer') {
      const draft = state.notif.draft ?? c.message;
      const compose = c.message ? `<label class="compose"><span>${c.to ? `Message to ${c.to} · tap to edit` : 'No connected recipient selected'}</span><textarea id="draft" rows="2" maxlength="200">${escapeHtml(draft)}</textarea></label>` : '';
      body = `<p class="notif-text">${c.text}</p>${compose}<div class="notif-actions"><button class="primary" data-action="accept" ${c.message && (!draft.trim() || !c.to) ? 'disabled' : ''}>${c.message ? c.to ? `Send to ${c.to}` : 'Choose a close person' : c.primary}</button><button data-action="later">Not now</button><button data-action="never">Not for me</button></div>`;
    } else {
      body = `<p class="notif-text">No problem. Would one of these suit you better?</p><div class="notif-actions column">${state.notif.options.map(a => `<button data-action="pick" data-id="${a.id}">${icon(a.icon)} ${a.title}</button>`).join('')}<button class="ghost" data-action="dismiss">Not today</button></div>`;
    }
    el.className = 'notif open';
    el.innerHTML = `<div class="notif-card" role="group" aria-label="Notification from Arki">${head}${body}</div>`;
  }
  $('notif').addEventListener('input', event => {
    if (event.target.id !== 'draft' || !state.notif) return;
    state.notif.draft = event.target.value;
    $('notif').querySelector('[data-action=accept]').disabled = !event.target.value.trim() || !currentCopy(state.notif.id).to;
  });

  // ---------- Behind the scenes ----------
  function renderBackground() {
    const p = people[state.persona], r = result;
    $('personas').innerHTML = Object.entries(people).map(([id, x]) => `<button class="option ${state.persona === id ? 'active' : ''}" data-action="persona" data-id="${id}" aria-pressed="${state.persona === id}"><span class="avatar">${x.name[0]}</span><span><strong>${x.name}</strong><small>${x.blurb}</small></span></button>`).join('');
    $('scenarios').innerHTML = scenarios.map(([id, i, title, note]) => `<button class="option ${state.scenario === id ? 'active' : ''}" data-action="scenario" data-id="${id}" aria-pressed="${state.scenario === id}"><span class="option-icon">${icon(i)}</span><span><strong>${title}</strong><small>${note}</small></span></button>`).join('');
    $('mobile-controls').innerHTML = `<div class="chips">${Object.entries(people).map(([id,p])=>`<button class="chip ${state.persona === id ? 'on' : ''}" data-action="persona" data-id="${id}" aria-pressed="${state.persona===id}">${p.name}</button>`).join('')}</div><div class="chips">${scenarios.map(([id,,title])=>`<button class="chip ${state.scenario===id?'on':''}" data-action="scenario" data-id="${id}" aria-pressed="${state.scenario===id}">${title}</button>`).join('')}</div>`;
    $('day-label').textContent = `Day ${state.day}`;
    const verdict = decide();
    $('decision').className = `decision ${verdict.tone}`;
    $('decision').innerHTML = `<strong>${verdict.title}</strong><p>${verdict.text}</p>`;
    $('domains').innerHTML = Object.entries(domains).map(([id,d]) => {
      const w = weights.weights[id];
      return `<div class="weight-row weight-${w==null?'unknown':w>=1.15?'high':w<=.85?'low':'medium'}"><span><strong>${d.label}</strong><small>${({social:'Calls and app metadata',routine:'Phone timing, not measured sleep',movement:'Steps, acceleration and travel',music:'Patterns in media consumption'})[id]}</small></span><meter min="0" max="2" value="${w || 0}" aria-label="${d.label} importance"></meter><span class="weight-value"><b>${w == null ? '—' : decimal(w)}</b><small>${w==null?'No data':w>=1.15?'High':w<=.85?'Low':'Medium'}</small></span></div>`;
    }).join('');
    $('weights-note').textContent = `Personal importance weights for ${p.name}’s data. Higher values give a group more influence on change detection.`;
    $('interests-panel').innerHTML = interestSources();
    $('cap-label').textContent = `Daily suggestion notification limit: ${state.sentToday} of ${cap()} used`;

    renderChart();
    renderEvidence();
    renderQueue();
  }

  function decide() {
    const name = people[state.persona].name;
    if (result.drift) {
      const pick = automaticQueue().filter(a => a.id !== 'hobby')[0];
      return { tone:'drift', title:'Several routines have changed together', text:`${listWords(result.domains.map(id => domains[id].label))} differ from ${name}’s own pattern on ${result.overlap} overlapping days. ${me().interests.includes('dance') ? 'Dance is a familiar interest.' : 'Their own interests shape a small next step.'} → ${pick ? pick.title : 'Their choices have left no automatic options'}. The person decides.` };
    }
    if (Arki.recovering(data)) return {tone:'',title:'A little closer to their own rhythm',text:'After an earlier multi-day change, the latest three complete days are close to the personal baseline. A chosen interest can become a small dance or language experiment. This does not measure mood.'};
    if (Arki.singleDay(data)) return {tone:'',title:'One different day, one light offer',text:'A latest-day observation differs from the personal baseline. This is separate from a lasting change. A memory, favourite music or an easy message is available, with at most one unusual-day offer.'};
    return {tone:'',title:'Room for little discoveries',text:`Observations are within ${name}’s usual pattern. When enabled, one little greeting can appear per demo day, separately from suggestion notifications.`};
  }

  function niceScale(values) {
    const max=Math.max(1,...values.filter(v=>v!=null && Number.isFinite(v)));
    const rough=max/3, power=10**Math.floor(Math.log10(rough));
    const step=[1,2,5,10].find(n=>n*power>=rough)*power;
    return { max:step*3, ticks:[0,step,step*2,step*3] };
  }
  function linePath(values, x, y) {
    let gap=true,path='';
    values.forEach((v,i)=>{if(v==null || !Number.isFinite(v)){gap=true;return;}path+=`${gap?'M':'L'}${x(i).toFixed(2)},${y(v).toFixed(2)} `;gap=false;});
    return path;
  }
  function renderEvidence() {
    const stories={
      contact:{title:'Social interaction',key:'calls',label:'Daily calls',unit:'calls / day',source:'Call counts and duration, text-message counts, messaging-app use time and notification counts.',note:'This view shows call frequency, not the quality of contact.'},
      rhythm:{title:'Own rhythm',key:'quietPeriod',label:'Phone quiet period',unit:'minutes / day',source:'First and last phone activity, night-time screen use and accelerometer proxies.',note:'Phone quiet time is not measured sleep.'},
      movement:{title:'Movement',key:'steps',label:'Daily steps',unit:'steps / day',source:'Step totals, accelerometer activity periods and coarse travel radius.',note:'These sources belong to one movement group.'}
    };
    const story=stories[state.source] || stories.contact,key=story.key,summary=result.summaries[key];
    const values=data.slice(-12).map(d=>d.values[key]);
    const scale=niceScale([...values,summary.usual]),x=i=>56+i/11*440,y=v=>190-v/scale.max*145;
    $('evidence').innerHTML=`<div class="source-tabs" role="group" aria-label="Observation group">${Object.entries(stories).map(([id,item])=>`<button data-action="source" data-id="${id}" class="${state.source===id?'active':''}" aria-pressed="${state.source===id}">${item.title}</button>`).join('')}</div><div class="plot-card"><div class="plot-heading"><strong>${story.label}</strong><span>${story.unit}</span></div><svg class="source-spark" viewBox="0 0 530 235" role="img" aria-label="${story.label} over twelve days, with a numeric vertical axis and this person's own baseline"><title>${people[state.persona].name}: ${story.label}. Dashed line: usual ${number(summary.usual)} ${story.unit}.</title>${scale.ticks.map(v=>`<line class="plot-grid" x1="56" x2="496" y1="${y(v)}" y2="${y(v)}"/><text class="plot-tick" x="45" y="${y(v)+4}" text-anchor="end">${number(v)}</text>`).join('')}<path class="plot-axis" d="M56 37V190H503"/>${summary.usual==null?'':`<line class="plot-baseline" x1="56" x2="496" y1="${y(summary.usual)}" y2="${y(summary.usual)}"/>`}<path class="plot-line" d="${linePath(values,x,y)}"/>${values.map((v,i)=>v==null?'':`<circle class="plot-point" cx="${x(i)}" cy="${y(v)}" r="3.5"><title>${12-i} days ago: ${number(v)} ${story.unit}</title></circle>`).join('')}${[[0,'12 days ago'],[5,'7 days ago'],[11,'Yesterday']].map(([i,label])=>`<line class="plot-axis" x1="${x(i)}" x2="${x(i)}" y1="190" y2="195"/><text class="plot-tick" x="${x(i)}" y="215" text-anchor="${i===0?'start':i===11?'end':'middle'}">${label}</text>`).join('')}</svg><div class="plot-legend"><span><i class="legend-line"></i>Daily observation</span><span><i class="legend-line baseline"></i>Own usual level</span></div></div><div class="measurement-note"><strong>Measured from</strong><p>${story.source}</p><small>${story.note}</small></div>`;

  }
  function renderChart() {
    const days=[...history(state.persona),...data], x=i=>55+i/(days.length-1)*495;
    const top=42,bottom=210;
    const series=[{id:'social',key:'calls',label:'Social interaction',color:'#326b60',dash:''},{id:'movement',key:'steps',label:'Movement',color:'#98501f',dash:'8 3'},{id:'routine',key:'quietPeriod',label:'Own rhythm',color:'#68518b',dash:''}].filter(item=>item.id===state.timeline);
    const normalised=series.map(item=>({...item,values:days.map(d=>{const v=d.values[item.key],baseline=result.summaries[item.key].usual;return v==null || !baseline?null:v/baseline;})}));
    const max=Math.max(1.5,...normalised.flatMap(s=>s.values.filter(v=>v!=null)))*1.05;
    const py=v=>bottom-v/max*(bottom-top),home=days.findIndex(d=>d.age<=Arki.HOME_START_AGE),recent=days.findIndex(d=>d.age<=3),homeX=x(home),recentX=x(recent)-4;
    $('chart').innerHTML=`<div class="source-tabs timeline-tabs" role="group" aria-label="Timeline group">${[['social','Social interaction'],['movement','Movement'],['routine','Own rhythm']].map(([id,label])=>`<button data-action="timeline" data-id="${id}" class="${state.timeline===id?'active':''}" aria-pressed="${state.timeline===id}">${label}</button>`).join('')}</div><div class="plot-card treatment-plot"><div class="plot-heading"><strong>${series[0].label} over time</strong><span>Relative to your own usual level</span></div><svg viewBox="0 0 580 265" role="img" aria-label="${series[0].label} across treatment and home, with the latest three days highlighted"><title>One daily series relative to its own baseline. Missing values are gaps.</title><rect class="treatment-band" x="55" y="${top}" width="${homeX-55}" height="${bottom-top}"/><rect class="home-band" x="${homeX}" y="${top}" width="${550-homeX}" height="${bottom-top}"/><rect class="recent-band" x="${recentX}" y="${top}" width="${554-recentX}" height="${bottom-top}"/>${[0,.5,1,1.5].filter(v=>v<=max).map(v=>`<line class="plot-grid" x1="55" x2="550" y1="${py(v)}" y2="${py(v)}"/><text class="plot-tick" x="45" y="${py(v)+4}" text-anchor="end">${v===1?'Usual':`${Math.round(v*100)}%`}</text>`).join('')}<path class="plot-axis" d="M55 35V210H555"/><line class="plot-baseline" x1="55" x2="550" y1="${py(1)}" y2="${py(1)}"/><line class="home-boundary" x1="${homeX}" x2="${homeX}" y1="30" y2="210"/><text class="plot-tick phase-label" x="65" y="25">Treatment</text><text class="plot-tick phase-label" x="${homeX+8}" y="25">Home period</text>${normalised.map(item=>`<path d="${linePath(item.values,x,py)}" fill="none" stroke="${item.color}" stroke-width="2.5" stroke-dasharray="${item.dash}"/>`).join('')}<text class="plot-tick" x="55" y="231">8 weeks ago</text><text class="plot-tick" x="${homeX}" y="250" text-anchor="middle">Home period starts</text><text class="plot-tick" x="550" y="231" text-anchor="end">Yesterday</text></svg><div class="plot-legend">${series.map(item=>`<span><i class="legend-line" style="border-color:${item.color};${item.dash?'border-top-style:dashed;':''}"></i>${item.label}</span>`).join('')}</div><div class="phase-legend"><span><i class="treatment-band"></i>Treatment</span><span><i class="home-band"></i>Home</span><span><i class="recent-band"></i>Latest 3 days</span></div></div>`;
  }

  function galleryTitle(a) {
    const p=people[state.persona],name=linkedName();
    return ({friend:name?`Message ${name}`:a.title,thanks:thanksName()?`Thank ${thanksName()}`:a.title,daylight:name?`A walk with ${name}`:a.title,photo:`A memory with ${p.close}`,football:name?`Football with ${name}`:a.title,hobby:preferredHobby()==='dance'?'A little dancing':'A language café'})[a.id] || a.title;
  }
  function renderQueue() {
    const ranked=queue(),hidden=activities.filter(a=>(me().feedback[a.id] || 0)<=-3);
    $('queue').innerHTML=[...ranked,...hidden.map(a=>({...a,hidden:true}))].map(a=>`<li class="suggestion-tile"><span class="queue-icon">${icon(a.icon)}</span><div class="queue-main"><strong>${galleryTitle(a)}</strong>${a.hidden?'<span class="queue-tag">Hidden from automatic suggestions</span>':''}</div><div class="queue-actions"><button class="secondary" data-action="force" data-id="${a.id}">Show on phone</button><button class="reason-button" data-action="reason" data-id="${a.id}" aria-label="Why this suggestion: ${galleryTitle(a)}">i</button></div></li>`).join('');
  }

  function restart(delay = 1100) {
    state.offerNotBefore = Date.now() + delay;
    cancelSearch(); clearInterval(clipTimer); clearTimeout(notifTimer); hideToast();
    state.notif = null; state.photo = false;
    state.previewSuppressed=false; loadDay(); compute(); state.screen = me().onboarded ? 'home' : 'onboarding'; $('screen').scrollTop=0;
    renderScreen(); renderNotif(); renderBackground(); schedule(delay);
  }
  function openInfo(title, body, intro = false) {
    clearTimeout(notifTimer); dialogOpener = document.activeElement;
    $('dialog-title').textContent = title; $('dialog-body').innerHTML = body;
    $('dialog-close').textContent = intro ? 'Explore Arki' : 'Close';
    $('info-dialog').showModal(); $('dialog-close').focus();
  }
  // ---------- Actions ----------
  const actions = {
    guide() { openInfo('A little room for everyday life', '<p>Arki lives in a home-screen widget and works quietly in the background. It learns your everyday rhythm and offers a small helping hand through notifications when a change calls for one. You always choose what to do.</p><p>Choose a person and situation, then complete or skip setup on the phone. Tap the widget to explore preferences, or open Videos to see an offer while browsing. Try any suggestion from the gallery; Next day explores later choices. Restart demo starts fresh.</p>', true); },
    info(id) {
      const items={
        cap:['Why the daily limit?',[['Keep each offer meaningful','Too many notifications can become easy to tune out. We keep offers occasional so each one has room to matter.'],['Less frustration','A small daily limit keeps interruptions manageable. One unusual day and Light touch allow one; other situations at other levels allow at most two.'],['One shared allowance','Unusual-day offers and hobbies share this limit. One normal-day greeting is shown separately in this demo. Manual previews use none.']]],
        calculation:['How the weights work',[['Your own pattern','A normally steady signal counts more when it changes.'],['Reading the number','1.3 contributes more than 0.7. Weights average 1.0.'],['A repeated-change offer','Two groups, two overlapping days, and at least 1.8 total weight.'],['What it means','Consistency in past observations, not clinical benefit.']]],
        timeline:['Your patterns over time',[['Three daily observations','Social interaction: calls. Movement: steps. Own rhythm: phone quiet time, not measured sleep.'],['One shared scale','Each series is divided by its own 28-day baseline. Usual = 100%. This is not a mood score.'],['Three visible periods','Treatment, home, and the latest three days. Missing observations are gaps.']]]
      };
      const item=items[id];if(item)openInfo(item[0],`<div class="info-cards">${item[1].map(([title,text])=>`<article><h3>${title}</h3><p>${text}</p></article>`).join('')}</div>`);
    },
    'close-info'() { if (!$('info-dialog').open) return; $('info-dialog').close(); dialogOpener?.focus?.(); if(me().onboarded && !state.previewSuppressed) schedule(1400); },
    'onboard-next'() { if(me().onboarding < 2) { me().onboarding++; $('screen').scrollTop=0; renderScreen(); } else {me().onboarded=true; go('home');} },
    'onboard-skip'() { if(me().onboarding === 1) {me().onboarding++;$('screen').scrollTop=0;renderScreen();} else {me().onboarded=true;go('home');} },
    involvement(id) { me().involvement=id;renderScreen();renderBackground(); $('screen').querySelector(`[data-action=involvement][data-id="${id}"]`)?.focus?.(); },
    greeting(value) {
      const [kind,to]=value.split(':');if(!['hug','thanks'].includes(kind)||!connected().includes(to))return;
      clearTimeout(notifTimer);state.photo=false;
      state.notif={id:kind==='hug'?'friend':'thanks',stage:'offer',gesture:kind,to};renderNotif();
    },
    recipient(name) { if(!connected().includes(name))return;state.viewRecipient=name;go('recipient'); },
    'return-people'() {state.profileTab='people';go('card');},
    connect(name) { me().connections[name]='preview';renderScreen(); },
    request(name) { me().connections[name]='pending';renderScreen(); },
    approve(name) { if(me().connections[name] === 'pending') me().connections[name]='connected';renderScreen(); },
    disconnect(name) { delete me().connections[name]; state.notif=null; state.photo=false; delete me().lastDraft; renderNotif(); renderScreen(); renderBackground(); },
    hobby(id) { cancelSearch();state.hobby=id || preferredHobby();state.mode='home';state.company='alone';state.cost='free';state.small=false;state.hobbyStage='choices';state.searchStatus='idle';go('hobby'); },
    'hobby-mode'(id) { cancelSearch();state.mode=id;state.hobbyStage='choices';renderScreen(); },
    'hobby-cost'(id) { cancelSearch();state.cost=id;state.hobbyStage='choices';renderScreen(); },
    'hobby-company'(id) { state.company=id;renderScreen(); },
    'hobby-find'() { findHobby(); },
    'hobby-select'(id) { state.searchSelected=Number(id);renderScreen(); },
    'hobby-edit'() { cancelSearch();state.hobbyStage='choices';renderScreen(); },
    'hobby-small'() { cancelSearch();state.small=true;state.mode='home';state.cost='free';state.hobbyStage='result';state.searchStatus='home';renderScreen(); },
    'hobby-save'() { if(state.hobbyStage!=='result' || !['done','home'].includes(state.searchStatus))return;me().experiment={...hobbyOption(),hobby:state.hobby,day:state.day,status:'saved',mode:state.mode,cost:state.cost,company:state.company};me().events.push({id:'hobby',type:'selected',day:state.day});state.profileTab='steps';go('card');toast('Added to your small steps.'); },
    'hobby-invite'() { const draft=`Would you like to try ${hobbyOption().title.toLowerCase()} together?`;go('home');state.preview=true;show('friend','');state.notif.draft=draft;renderNotif(); },
    'trial-open'() { const e=me().experiment;if(!e)return;cancelSearch();Object.assign(state,{hobby:e.hobby,mode:e.live?'nearby':'home',company:e.company || 'alone',cost:e.cost || 'free',small:e.duration==='2 minutes',hobbyStage:'result',searchStatus:e.live?'done':'home',searchResults:e.live?[e]:[],searchSelected:0});go('hobby'); },
    followup() { go('followup'); },
    'followup-skip'() { if(me().experiment) me().experiment.reviewedDay=state.day;go('card'); },
    trial(id) { const e=me().experiment;if(!e)return; e.reviewedDay=state.day; me().trialFeedback[e.hobby]=(me().trialFeedback[e.hobby] || 0)+(id==='pause' ? -3 : id==='replace' ? -2 : 2); me().feedback.hobby=Math.max(-2,(me().feedback.hobby || 0)+(id==='pause' ? -1 : 1)); if(id==='pause') {e.status='paused';go('card');toast('We’ll leave this one aside.');} else if(id==='replace') {e.status='replaced'; actions.hobby(e.hobby === 'dance' ? 'languages' : 'dance');} else if(id==='smaller') { actions.hobby(e.hobby);actions['hobby-small']();} else {e.status='continuing';go('card');toast('More small ideas like this.');} },
    reason(id) { const a=activity(id);if(!a)return;const item=queue().find(x=>x.id===id);const text=!item?'Hidden by this person. A manual preview does not restore it.':item.reasons.length?item.reasons.map(r=>r.label).join(' · '):'An available small option, with no special preference yet.';openInfo(galleryTitle(a),`<p>${escapeHtml(text)}</p>`); },
    home() { go('home'); },
    feed() { state.videoPaused=Boolean(globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);go('feed'); },
    'video-toggle'() { state.videoPaused=!state.videoPaused;renderScreen(); },
    'video-next'() { state.clipIndex=(state.clipIndex+1)%ArkiVideos.clipsForScenario(state.scenario).length;renderScreen(); },
    'profile-tab'(id) { state.profileTab=id;go('card'); },
    timeline(id) { state.timeline=id;renderChart();$('chart').querySelector(`[data-id="${id}"]`)?.focus?.(); },
    card() { go('card'); },
    source(id) { state.source = id; renderEvidence(); $('evidence').querySelector(`[data-id="${id}"]`)?.focus?.(); },
    discoveries() {
      me().discoveries = !me().discoveries;
      renderScreen(); renderBackground();
      if (!me().discoveries && state.notif?.gentle) closeNotif('Optional discoveries turned off.');
    },

    persona(id) { saveDay(); state.persona = id; restart(); },
    scenario(id) { state.scenario = id; restart(id==='stable'?1000:6500); },
    metric(id) { state.metric = id; renderChart(); },
    'next-day'() { saveDay(); Object.assign(me(), { day: me().day + 1, sentToday: 0, discoveryCount:0, nextDiscoveryAt:0, offered: [], answered: new Set() }); restart(); },
    force(id) {
      if(!activity(id))return;
        clearTimeout(notifTimer); state.photo = false;
      if (!['home', 'feed'].includes(state.screen)) { state.screen = 'home'; renderScreen(); }
      state.previewSuppressed = true; state.preview = true; show(id, '');
      $('phone').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    },
    accept() {
      if(state.notif?.gesture){
        const {gesture,to}=state.notif;if(!connected().includes(to))return;
        (me().greetings[to] ||= []).push({kind:gesture,from:people[state.persona].name,day:state.day});
        closeNotif();state.viewRecipient=to;go('recipient');return;
      }
      const { id } = state.notif, kind = activity(id).kind, c = currentCopy(id);
      if (c.message && (!c.to || !(state.notif.draft ?? c.message).trim())) return;
      if (c.message) me().lastDraft = { to:c.to, text:state.notif.draft ?? c.message };
      accepted(id);
      if (id === 'hobby') { closeNotif(); actions.hobby(preferredHobby()); return; }
      if (kind === 'photo') { state.photo = true; state.event = 'the user opened a favourite photo.'; renderNotif(); renderBackground(); return; }
      if (id === 'music') { const p=people[state.persona];globalThis.open?.(p.songUrl,'_blank','noopener,noreferrer');closeNotif();toast(`Opening ${p.song.split(' — ')[0]} in Spotify ↗`);return; }
      closeNotif(kind === 'message' ? `the user sent the message. ${activity(id).title} moves up for next time.` : `the user said yes. ${activity(id).title} moves up for next time.`);
      toast(kind === 'message' ? `Your message to ${c.to} is ready ✓` : c.done);
    },
    later() {
      if(state.notif?.gentle || state.notif?.gesture){closeNotif();return;}
      const { id } = state.notif, m = me(), title = activity(id).title;
      m.feedback[id] = Math.max(-2, (m.feedback[id] || 0) - 1); state.answered.add(id);
      const options = queue().filter(a => !state.answered.has(a.id)).slice(0, 2);
      if (!options.length) return closeNotif(`"not now". ${title} moves down the list.`);
      state.notif = { id, stage: 'alt', options };
      state.event = `"not now". ${title} moves down the list, and Arki offers two other options.`;
      renderNotif(); renderBackground();
    },
    never() {
      if(state.notif?.gesture && !state.notif.gentle){closeNotif();return;}
      if(state.notif?.gentle){me().discoveryHidden.push(state.notif.discoveryKind);closeNotif();return;}
      const { id } = state.notif, m = me(), title = activity(id).title, before = m.feedback[id];
      m.feedback[id] = -3; state.answered.add(id);
      closeNotif(`"not for me". ${title} is removed from the list.`);
      toast('Okay. Arki will leave this one out.', () => {
        if (before == null) delete m.feedback[id]; else m.feedback[id] = before;
        state.answered.delete(id); state.event = `undone. ${title} is back on the list.`;
        renderBackground();
      });
    },
    undo() { const action = undo; hideToast(); if (action) action(); },
    // Choosing an alternative is already a yes, so Arki does it without asking again.
    pick(id) { state.notif = { id, stage: 'offer' }; if (activity(id).kind === 'message') { state.event = 'the user chose another option.'; renderNotif(); renderBackground(); } else actions.accept(); },
    dismiss() { closeNotif('"not today". That is useful information too.'); },
    'photo-send'() { const name=people[state.persona].close;if(!connected().includes(name))return;closeNotif();state.preview=true;show('friend','');state.notif.to=name;state.notif.draft='Remember this? It made me think of you.';renderNotif(); },
    'photo-close'() { closeNotif(); },
    share() { toast('Your draft is ready.'); },
    interest(id) { const m = me(); m.origins[id] = state.screen === 'onboarding' ? 'Initial questionnaire' : 'Your choice'; m.interests = m.interests.includes(id) ? m.interests.filter(x => x !== id) : [...m.interests, id]; renderScreen(); renderBackground(); $('screen').querySelector(`[data-action=interest][data-id="${id}"]`)?.focus?.(); },
    restore() { const m = me(); for (const a of activities) if ((m.feedback[a.id] || 0) <= -3) delete m.feedback[a.id]; renderScreen(); renderBackground(); toast('Hidden suggestions are back.'); },
    reset() { actions['close-info'](); Object.assign(state, freshState()); $('page').setAttribute('data-theme','forest'); restart(); actions.guide(); globalThis.scrollTo?.({ top:0, behavior:'instant' }); },
  };
  document.addEventListener('click', event => {
    const target = event.target.closest('[data-action]');
    if (target && !target.disabled && actions[target.dataset.action]) {
      const previousScreen = state.screen;
      actions[target.dataset.action](target.dataset.id);
      // Re-rendered controls keep their place in the keyboard sequence.
      if (target.isConnected === false && !$('info-dialog').open) {
        const same = `[data-action="${target.dataset.action}"]${target.dataset.id ? `[data-id="${target.dataset.id}"]` : ''}`;
        const next = previousScreen !== state.screen ? $('screen').querySelector('button') : document.querySelector?.(same);
        next?.focus?.({ preventScroll: true });
      }
    }
  });
  document.addEventListener('keydown', event => { if (event.key === 'Tab' && $('info-dialog').open) { event.preventDefault(); $('dialog-close').focus(); return; } if (event.key === 'Escape') { if ($('info-dialog').open) { actions['close-info'](); return; } if (state.photo) actions['photo-close'](); else if (state.notif) actions.dismiss(); else if (!['home', 'feed'].includes(state.screen)) go('home'); } });

  document.querySelectorAll?.('.panel-section')?.forEach(panel => panel.addEventListener('toggle', () => {
    if (panel.open) {
      const container=panel.closest('.engine-side');
      if (container && container.scrollHeight>container.clientHeight) container.scrollTop=panel.offsetTop-container.offsetTop;
    }
  }));
  $('info-dialog').addEventListener('cancel', event => { event.preventDefault(); actions['close-info'](); });
  compute(); renderScreen(); renderNotif(); renderBackground();
  actions.guide();
})();
