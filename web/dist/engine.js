(function (root) {
  'use strict';

  // Havaintoryhmät. `prior` on lähtöpaino ennen kuin käyttäjän omasta historiasta opitaan mitään:
  // vuorovaikutus ja vuorokausirytmi painavat lähtökohtaisesti eniten.
  const domains = {
    social: { label: 'Contact with people', prior: 1.5 },
    routine: { label: 'Daily rhythm', prior: 1.3 },
    movement: { label: 'Movement', prior: 1.0 },
    music: { label: 'Media consumption', prior: 0.7 },
  };

  const metrics = {
    calls: { label: 'Calls', domain: 'social', floor: 2, direction: -1, unit: '' },
    callMinutes: { label: 'Call time', domain: 'social', floor: 5, direction: -1, unit: 'min' },
    sms: { label: 'Text messages', domain: 'social', floor: 3, direction: -1, unit: '' },
    chat: { label: 'Messaging apps', domain: 'social', floor: 10, direction: -1, unit: 'min' },
    steps: { label: 'Steps', domain: 'movement', floor: 800, direction: -1, unit: 'steps' },
    screen: { label: 'Screen time', domain: 'routine', floor: 45, direction: 1, unit: 'min' },
    night: { label: 'Night-time use', domain: 'routine', floor: 20, direction: 1, unit: 'min' },
    appMinutes: { label: 'App use', domain: 'routine', floor: 45, direction: 1, unit: 'min' },
    musicTone: { label: 'Media consumption pattern', domain: 'music', floor: 12, direction: -1, unit: '/100' },
  };

  const extraMetrics = {
    whatsapp: { label: 'WhatsApp use', domain: 'social', floor: 8, direction: -1, unit: 'min', base: 28, changed: 4 },
    whatsappNotifications: { label: 'WhatsApp notifications', domain: 'social', floor: 5, direction: -1, unit: 'notifications', base: 22, changed: 2 },
    snapchat: { label: 'Snapchat use', domain: 'social', floor: 8, direction: -1, unit: 'min', base: 18, changed: 3 },
    snapchatNotifications: { label: 'Snapchat notifications', domain: 'social', floor: 5, direction: -1, unit: 'notifications', base: 15, changed: 1 },
    firstUse: { label: 'First phone activity', domain: 'routine', floor: 30, direction: 1, unit: 'min after midnight', base: 450, changed: 570 },
    lastUse: { label: 'Last phone activity', domain: 'routine', floor: 30, direction: 1, unit: 'min after midnight', base: 1320, changed: 1430 },
    quietPeriod: { label: 'Phone quiet period', domain: 'routine', floor: 45, direction: -1, unit: 'min', base: 540, changed: 260 },
    acceleration: { label: 'Active movement periods', domain: 'movement', floor: 2, direction: -1, unit: 'periods', base: 12, changed: 2 },
    radius: { label: 'Daily travel radius', domain: 'movement', floor: 0.5, direction: -1, unit: 'km', base: 3.2, changed: 0.2 },
  };
  Object.assign(metrics, extraMetrics);
  // Kaksi kuvitteellista esimerkkikäyttäjää. `spread` kertoo, kuinka paljon mittari
  // vaihtelee henkilön tavallisessa arjessa; `changed` on muuttuneen jakson taso.
  const personas = {
    aino: {
      name: 'Aino',
      base: { calls: 6, callMinutes: 32, sms: 24, chat: 40, steps: 6200, screen: 155, night: 10, appMinutes: 145, musicTone: 62 },
      spread: { calls: 0.06, callMinutes: 0.06, sms: 0.06, chat: 0.06, steps: 0.06, screen: 0.06, night: 0, appMinutes: 0.06, musicTone: 0.06 },
      changed: { calls: 0, callMinutes: 2, sms: 2, chat: 6, steps: 900, screen: 330, night: 80, appMinutes: 310, musicTone: 30 },
    },
    elias: {
      name: 'Elias',
      base: { calls: 3, callMinutes: 14, sms: 6, chat: 55, steps: 9200, screen: 210, night: 60, appMinutes: 195, musicTone: 55 },
      spread: { calls: 0.3, callMinutes: 0.3, sms: 0.3, chat: 0.25, steps: 0.04, screen: 0.08, night: 0.4, appMinutes: 0.08, musicTone: 0.03 },
      changed: { calls: 1, callMinutes: 4, sms: 2, chat: 20, steps: 3200, screen: 400, night: 110, appMinutes: 380, musicTone: 30 },
    },
  };
  for (const [id, p] of Object.entries(personas)) for (const [key, m] of Object.entries(extraMetrics)) {
    p.base[key] = m.base * (id === 'elias' ? 1.1 : 1);
    p.spread[key] = p.spread[key === 'radius' || key === 'acceleration' ? 'steps' : m.domain === 'social' ? 'chat' : 'screen'];
    p.changed[key] = m.changed;
  }
  const defaults = personas.aino.changed;

  // Skenaariot, joissa vain osa mittareista muuttuu.
  const partialScenarios = { movement: ['steps'], moveMusic: ['steps', 'musicTone'] };

  const HOME_START_AGE = 17; // kotijakso alkoi 17 päivää sitten; sitä vanhemmat päivät ovat hoitojaksoa
  const HISTORY_DAYS = 59;
  const LOAD_THRESHOLD = 1.8;
  const DAILY_CAP = 2;

  const median = values => {
    const s = [...values].sort((a, b) => a - b), n = s.length;
    return n ? n % 2 ? s[n >> 1] : (s[n / 2 - 1] + s[n / 2]) / 2 : null;
  };
  const valid = value => typeof value === 'number' && Number.isFinite(value) && value >= 0;
  const jitter = age => age % 5 - 2;
  // Different observation groups vary independently in the illustrative fixture.
  const metricJitter = (age, key) => jitter(age + ({social:0,routine:1,movement:2,music:3}[metrics[key].domain] || 0));

  function dataset(scenario = 'change', custom = defaults, duration = 3, personaId = 'aino') {
    const p = personas[personaId] || personas.aino;
    return Array.from({ length: 31 }, (_, index) => {
      const age = 31 - index;
      const values = {};
      for (const key of Object.keys(metrics)) values[key] = p.base[key] * (1 + metricJitter(age, key) * p.spread[key]);
      const altered = scenario === 'change' && age <= 3 || scenario === 'single' && age === 1 || scenario === 'custom' && age <= duration || scenario === 'recovery' && age >= 5 && age <= 7;
      if (altered) Object.assign(values, scenario === 'custom' ? custom : p.changed);
      if (partialScenarios[scenario] && age <= 3) for (const key of partialScenarios[scenario]) values[key] = p.changed[key];
      if (scenario === 'missing' && age <= 3) {
        for (const [key, m] of Object.entries(metrics)) if (['social','movement'].includes(m.domain)) values[key] = null;
        Object.assign(values, { screen: p.changed.screen, night: p.changed.night, appMinutes: p.changed.appMinutes });
      }
      return { age, values };
    });
  }

  // Hoitojakson aikaiset päivät ennen analyysi-ikkunaa (vain kuvaajaa varten):
  // rytmi lähenee vähitellen hoidon lopun tasoa. analyze() ei käytä näitä.
  function history(personaId = 'aino') {
    const p = personas[personaId] || personas.aino;
    return Array.from({ length: HISTORY_DAYS - 31 }, (_, index) => {
      const age = HISTORY_DAYS - index, progress = index / (HISTORY_DAYS - 32);
      const values = {};
      for (const [key, m] of Object.entries(metrics)) {
        const level = m.direction < 0 ? 0.55 + 0.45 * progress : 1.5 - 0.5 * progress;
        values[key] = p.base[key] * level * (1 + metricJitter(age, key) * p.spread[key]);
      }
      return { age, values };
    });
  }

  function dedupe(input) {
    const unique = new Map();
    for (const day of input) if (Number.isInteger(day.age) && day.age >= 1 && day.age <= 31) unique.set(day.age, day);
    return unique;
  }

  // Henkilökohtaiset painot: ryhmä, joka pysyy henkilön omassa arjessa tasaisena, kertoo
  // muutoksesta enemmän kuin ryhmä, joka vaihtelee luonnostaan. Painojen keskiarvo on 1.
  function learnWeights(input) {
    const baseline = [...dedupe(input).values()].filter(d => d.age > 3);
    const stability = {};
    for (const [key, m] of Object.entries(metrics)) {
      if (extraMetrics[key]) continue; // correlated source details do not amplify group weights
      const values = baseline.map(d => d.values[key]).filter(valid);
      if (values.length < 14) continue;
      const center = median(values);
      const variation = center > 0 ? 1.4826 * median(values.map(v => Math.abs(v - center))) / center : 0;
      (stability[m.domain] ||= []).push(1 / (1 + 4 * variation));
    }
    const raw = {};
    for (const [id, list] of Object.entries(stability)) raw[id] = domains[id].prior * list.reduce((a, b) => a + b, 0) / list.length;
    const ids = Object.keys(raw);
    const mean = ids.reduce((sum, id) => sum + raw[id], 0) / (ids.length || 1);
    const weights = {}, steadiness = {};
    for (const id of ids) {
      weights[id] = raw[id] / mean;
      steadiness[id] = raw[id] / domains[id].prior;
    }
    return { weights, steadiness };
  }

  // Ilman painoja sääntö vastaa Android-prototyyppiä. Painojen kanssa vaaditaan lisäksi,
  // että muuttuneiden ryhmien painojen summa ylittää kynnyksen.
  function analyze(input, options = {}) {
    const unique = dedupe(input);
    const baseline = [...unique.values()].filter(d => d.age > 3), recent = [3, 2, 1].map(age => unique.get(age));
    const changes = [], summaries = {}, daily = new Map();
    let sufficient = 0;
    for (const [key, m] of Object.entries(metrics)) {
      const history = baseline.map(d => d.values[key]).filter(valid);
      const observed = recent.map(d => d?.values[key]).filter(valid);
      const center = median(history), current = median(observed);
      summaries[key] = { usual: center, current, samples: history.length, recentSamples: observed.length };
      if (history.length < 14) continue;
      sufficient++;
      const scale = Math.max(m.floor, 1.4826 * median(history.map(v => Math.abs(v - center))));
      const unusual = recent.filter(d => d && valid(d.values[key]) && (d.values[key] - center) * m.direction >= 2 * scale && (d.values[key] - center) * m.direction >= Math.max(m.floor, center * 0.3));
      if (!extraMetrics[key] && observed.length === 3 && unusual.length >= 2) {
        changes.push({ key, ...m, usual: center, current, score: (current - center) * m.direction / scale });
        for (const d of unusual) { if (!daily.has(d.age)) daily.set(d.age, new Set()); daily.get(d.age).add(m.domain); }
      }
    }
    const changedDomains = [...new Set(changes.map(c => c.domain))];
    const overlap = [...daily.values()].filter(s => s.size >= 2).length;
    const weights = options.weights || {};
    const load = changedDomains.reduce((sum, id) => sum + (weights[id] ?? 1), 0);
    const observedDomains = Object.keys(domains).filter(id => Object.entries(metrics).some(([key, m]) => m.domain === id && summaries[key].recentSamples === 3 && summaries[key].samples >= 14));
    const drift = recent.every(Boolean) && changedDomains.length >= 2 && overlap >= 2 && load >= LOAD_THRESHOLD;
    return { drift, changes, domains: changedDomains, observedDomains, overlap, load, threshold: LOAD_THRESHOLD, summaries, sufficient, baselineDays: baseline.length, recentDays: recent.filter(Boolean).length };
  }

  // Ilmoitus näytetään vain, kun useamman päivän muutos on havaittu, ja enintään kaksi päivässä.
  function notify(result, sentToday = 0, cap = DAILY_CAP) {
    if (!result.drift) return { show: false, reason: 'quiet' };
    if (sentToday >= cap) return { show: false, reason: 'cap' };
    return { show: true, reason: 'drift' };
  }

  // `kind` kertoo, miten ehdotus näytetään: message = valmis viestipohja, jonka käyttäjä itse lähettää.
  const activities = [
    { id: 'friend', kind: 'message', icon: 'people', title: 'Message a close one', tag: 'Contact' },
    { id: 'daylight', kind: 'message', icon: 'sun', title: 'Daylight walk together', tag: 'Light and movement' },
    { id: 'photo', kind: 'photo', icon: 'photo', title: 'A favourite photo', tag: 'Memory' },
    { id: 'thanks', kind: 'message', icon: 'heart', title: 'Thank someone', tag: 'Giving' },
    { id: 'music', kind: 'do', icon: 'music', title: 'Your playlist', tag: 'Music' },
    { id: 'football', kind: 'message', icon: 'ball', title: 'A moment with a football', tag: 'Own interest' },
    { id: 'hobby', kind: 'hobby', icon: 'heart', title: 'Explore a small hobby step', tag: 'Your interests' },
  ];

  // Koko ehdotusjono perusteluineen. Palaute: tarttui ehdotukseen +1, ei nyt −1, ei minulle −3 (piilottaa).
  // Erillistä "miltä tuntui" -kysymystä ei ole: suostuminen tulkitaan myönteiseksi.
  function rank(result, interests = [], feedback = {}, context = {}) {
    const changed = id => result.domains.includes(id);
    return activities.filter(a => (feedback[a.id] || 0) > -3).map((a, order) => {
      const reasons = [];
      const add = (points, label) => { if (points) reasons.push({ points, label }); };
      add(context.involvement === 'more' && ['music','photo'].includes(a.id) ? 1 : 0, 'more variety requested');
      add(feedback[a.id] || 0, (feedback[a.id] || 0) > 0 ? 'said yes before' : 'said "not now"');
      add(interests.includes(a.id) ? 3 : 0, 'own interest');
      // Recent offers count even if unanswered: avoid repeating the same activity every day.
      const day = context.day ?? 1;
      const recent = (context.exposures || []).filter(e => day - e.day >= 0 && day - e.day <= 2);
      add(-6 * recent.filter(e => e.id === a.id).length, 'recently offered: room for something different');
      add(recent.some(e => e.kind === a.kind) ? -2 : 0, 'recently offered this kind of activity');
      add(a.id === 'hobby' && context.recovery && interests.some(id => ['dance', 'languages'].includes(id)) ? 7 : 0, 'routines closer to usual and a chosen interest');
      add(a.id === 'hobby' && !context.recovery ? -12 : 0, 'new hobbies wait for a steadier rhythm');
      add(a.id === 'friend' && changed('social') ? 3 : 0, 'contact has changed');
      add(a.id === 'daylight' && changed('movement') ? 2 : 0, 'movement has changed');
      add(a.id === 'daylight' && context.screen === 'feed' && context.daylight ? 3 : 0, 'scrolling while it is light outside');
      add(a.id === 'photo' && result.domains.length >= 3 ? 2 : 0, 'broad change: lightest suggestion');
      add(a.id === 'music' && changed('music') ? 2 : 0, 'media-consumption pattern has changed');
      return { ...a, order, reasons, score: reasons.reduce((sum, r) => sum + r.points, 0) };
    }).sort((a, b) => b.score - a.score || a.order - b.order);
  }
  const recommend = (result, interests, feedback, context) => rank(result, interests, feedback, context).slice(0, 3);

  // Viikon myönteiset havainnot kannustavassa muodossa. Vain toteutuneet asiat: puuttuvaa tai
  // nollaa ei mainita, ja edelliseen viikkoon verrataan vain silloin, kun suunta on ylöspäin.
  function positives(input, completed = 0) {
    const days = [...dedupe(input).values()];
    const week = days.filter(d => d.age <= 7), before = days.filter(d => d.age > 7 && d.age <= 14);
    const total = (list, key) => Math.round(list.map(d => d.values[key]).filter(valid).reduce((a, b) => a + b, 0));
    const count = (list, key, min) => list.filter(d => valid(d.values[key]) && d.values[key] >= min).length;
    const more = (now, then) => now > then && then > 0 ? ` – ${now - then} more than last week` : '';
    const list = [];
    const calls = total(week, 'calls'), callsBefore = total(before, 'calls');
    if (calls > 0) list.push({ id: 'calls', count: calls, previous: callsBefore, short: calls === 1 ? '1 call' : `${calls} calls`, text: `You made ${calls === 1 ? '1 call' : `${calls} calls`} this week${more(calls, callsBefore)}` });
    const active = count(week, 'steps', 2000), activeBefore = count(before, 'steps', 2000);
    if (active > 0) list.push({ id: 'active', count: active, previous: activeBefore, short: active === 7 ? 'on the move every day' : `on the move ${active} ${active === 1 ? 'day' : 'days'}`, text: active === 7 ? 'You were on the move every single day' : `You were on the move on ${active} ${active === 1 ? 'day' : 'days'}${more(active, activeBefore)}` });
    const chat = count(week, 'chat', 10), chatBefore = count(before, 'chat', 10);
    if (chat > 0) list.push({ id: 'chat', count: chat, previous: chatBefore, short: `messaging on ${chat} ${chat === 1 ? 'day' : 'days'}`, text: `You kept in touch by message on ${chat} ${chat === 1 ? 'day' : 'days'}${more(chat, chatBefore)}` });
    if (completed > 0) list.push({ id: 'done', count: completed, previous: 0, short: `${completed} small ${completed === 1 ? 'thing' : 'things'} tried`, text: `You said yes to ${completed} small ${completed === 1 ? 'thing' : 'things'} Arki suggested` });
    return list;
  }

  // A light one-day offer is separate from persistent drift. Same robust thresholds,
  // at least fourteen prior values, and a real latest observation are required.
  function singleDay(input) {
    const days = [...dedupe(input).values()], latest = days.find(d => d.age === 1);
    if (!latest) return false;
    return Object.entries(metrics).some(([key, m]) => {
      const prior = days.filter(d => d.age > 1).map(d => d.values[key]).filter(valid);
      if (prior.length < 14 || !valid(latest.values[key])) return false;
      const center = median(prior), scale = Math.max(m.floor, 1.4826 * median(prior.map(v => Math.abs(v - center))));
      const delta = (latest.values[key] - center) * m.direction;
      return delta >= 2 * scale && delta >= Math.max(m.floor, center * .3);
    });
  }
  function recovering(input) {
    // Require an actual prior persistent change and three fully observed, usual days.
    const oldWindow = input.filter(d => d.age >= 5).map(d => ({ ...d, age: d.age - 4 }));
    const current = analyze(input);
    return analyze(oldWindow).drift && [1, 2, 3].every(age => {
      const d = input.find(x => x.age === age);
      return d && Object.entries(metrics).every(([key, m]) => {
        const v = d.values[key], prior = input.filter(x => x.age > 7).map(x => x.values[key]).filter(valid);
        if (!valid(v) || prior.length < 14) return false;
        const center = median(prior), scale = Math.max(m.floor, 1.4826 * median(prior.map(x => Math.abs(x - center))));
        return Math.abs(v - center) < 2 * scale;
      });
    }) && !current.drift;
  }
  // Each point uses strictly earlier observations. Domain averaging prevents source
  // count from multiplying a group's importance. No baseline means a visible gap.
  function rhythmTimeline(input) {
    const ordered = [...input].sort((a, b) => b.age - a.age);
    return ordered.map((day, index) => {
      const prior = ordered.slice(Math.max(0, index - 28), index);
      const rebased = prior.map((d, i) => ({ ...d, age: prior.length - i + 3 }));
      const w = learnWeights(rebased).weights, grouped = {};
      for (const [key, m] of Object.entries(metrics)) {
        const xs = prior.map(d => d.values[key]).filter(valid), v = day.values[key];
        if (xs.length < 14 || !valid(v)) continue;
        const c = median(xs), scale = Math.max(m.floor, 1.4826 * median(xs.map(x => Math.abs(x - c))));
        (grouped[m.domain] ||= []).push(Math.abs(v - c) / scale);
      }
      const ids = Object.keys(grouped).filter(id => w[id] != null);
      const denom = ids.reduce((sum, id) => sum + w[id], 0);
      return { age: day.age, value: denom ? ids.reduce((sum, id) => sum + medianMean(grouped[id]) * w[id], 0) / denom : null, coverage: ids.length };
    });
  }
  const medianMean = xs => xs.reduce((a, b) => a + b, 0) / xs.length;
  // Future fixture is independent of whether an offer was accepted.
  function followingWeek(input, outcome = 'improving', personaId = 'aino') {
    const p = personas[personaId];
    const next = Array.from({ length: 7 }, (_, i) => {
      const values = {};
      for (const key of Object.keys(metrics)) values[key] = outcome === 'unchanged' ? input.at(-1).values[key] : p.base[key] * (1 + metricJitter(i + 1, key) * p.spread[key]);
      if (outcome === 'missing' && [1, 3, 5].includes(i)) for (const key of Object.keys(values)) values[key] = null;
      return { age: 7 - i, values };
    });
    return [...input.map(d => ({ ...d, age: d.age + 7 })), ...next];
  }
  const api = { singleDay, recovering, rhythmTimeline, followingWeek, extraMetrics, metrics, domains, personas, defaults, median, dataset, history, learnWeights, analyze, notify, rank, recommend, positives, activities, HOME_START_AGE, HISTORY_DAYS, LOAD_THRESHOLD, DAILY_CAP };
  root.Arki = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(globalThis);
