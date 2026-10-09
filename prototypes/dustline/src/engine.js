(function (root) {
  'use strict';
  const D = root.DustlineData || require('./data.js');
  const clone = x => JSON.parse(JSON.stringify(x));
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const ok = message => ({ ok: true, message });
  const no = message => ({ ok: false, message });
  function random(s) { let x = s.rng >>> 0; x ^= x << 13; x ^= x >>> 17; x ^= x << 5; s.rng = x >>> 0 || 1; return s.rng / 4294967296; }
  function pick(s, list) { return list[Math.floor(random(s) * list.length)]; }
  function uid(s, prefix) { s.serial += 1; return `${prefix}${s.serial}`; }
  function log(s, text, kind = 'info') { s.log.unshift({ id: uid(s, 'l'), time: s.time, day: day(s), text, kind }); s.log = s.log.slice(0, 60); }
  function day(s) { return Math.floor(s.time / D.DAY_SECONDS) + 1; }
  function station(id) { return D.stations.find(x => x.id === id); }
  function active(s) { return s && !s.result; }
  function atStation(s) { return active(s) && s.phase === 'station'; }
  function car(s, type, level = 1) { return { uid: uid(s, 'c'), type, level, training: 0, charge: 0, occupied: 0 }; }
  const sumCargo = s => Object.values(s.cargo).reduce((a, b) => a + b, 0);
  function defaultMeta() {
    return { version: 1, coins: 0, unlocked: Object.keys(D.artifacts).filter(id => !D.artifacts[id].price), locked: [], captains: ['ada'], perksEnabled: true,
      stats: { runs: 0, victories: 0, delivered: 0, frost: 0 }, collection: {}, history: [], heritage: { available: false, traits: [], locks: [], enabled: true },
      settings: { sound: false, volume: 30, particles: true, reducedMotion: false, autoDecision: true, autoArrival: true, offline: false,
        keys: { pause: 'Space', map: 'KeyM', train: 'KeyC', market: 'KeyT', decisions: 'KeyD' } } };
  }
  function perks(meta) { return meta.perksEnabled ? [1, 2, 3].filter(page => Object.entries(D.artifacts).filter(([, a]) => a.page === page).every(([id]) => meta.unlocked.includes(id))).length : 0; }
  function heritageEffects(meta) {
    const result = {}; if (!meta.heritage.available || !meta.heritage.enabled) return result;
    meta.heritage.traits.forEach(id => { const t = [...D.heritage.positives, ...D.heritage.negatives].find(x => x.id === id); if (t) Object.entries(t.effects).forEach(([key, value]) => result[key] = (result[key] || 0) + value); });
    return result;
  }
  function newRun(meta, captain = 'ada', mode = 'journey', difficulty = 0, seed = Date.now()) {
    if (!meta.captains.includes(captain)) return null;
    const h = heritageEffects(meta), c = D.captains[captain], p = perks(meta);
    const s = { version: 1, captain, mode: ['journey', 'loop', 'career'].includes(mode) ? mode : 'journey', difficulty: clamp(Math.floor(difficulty), 0, 3),
      rng: (seed >>> 0) || 1234567, serial: 0, phase: 'station', paused: true, speed: 1, time: 0, cycleProgress: 0, node: 'sunset', segment: null,
      cash: c.cash + (h.cash || 0) + 15 * p, coal: 18 + (h.coal || 0), morale: clamp(c.morale + (h.morale || 0), 1, 100), hull: 100, reputation: 0,
      basePassengers: 6, baseSlots: 4 + (captain === 'ada' ? 1 : 0) + (h.slots || 0), heritageEffects: h,
      cargo: { grain: 2, medicine: 0, parts: 0 }, cars: [], reserve: [], artifacts: [], artifactUsage: {}, decisions: [], decision: null,
      tension: 0, stability: { economy: 65, trust: 65, order: 65 }, status: { backlash: 0, wound: 0 }, guards: [], guests: [], contracts: [], contractOffers: [],
      offer: null, event: null, queue: [], artifactPool: meta.unlocked.filter(id => !meta.locked.includes(id)), landmarkAvailable: true, visited: ['sunset'], visitCounts: { sunset: 1 }, market: {}, laps: 0, path: [], log: [],
      stats: { cycles: 0, gross: 0, spent: 0, delivered: 0, failed: 0, defended: 0, produced: 0, moraleProduced: 0, goodsMade: 0, recycled: 0, landmarks: 0, tensionEvents: 0, totalDistance: 0 },
      contribution: {}, transportEntries: 0, level: 1, exp: 0, rescueUsed: 0, result: null };
    s.cars = [car(s, 'freight'), car(s, 'diner'), car(s, captain === 'silas' ? 'guard' : 'mail')];
    s.reserve = [car(s, 'guard')];
    initMarket(s); contractOffers(s);
    log(s, '출발 기적이 울립니다. 화물을 준비하고 다음 정류장으로 떠나세요.', 'arrival');
    return s;
  }
  function metrics(s) {
    const counts = Object.fromEntries(Object.keys(D.tags).map(id => [id, 0]));
    let capacity = 0, defense = s.captain === 'silas' ? 12 : 0, speed = 100, income = 1, cycle = 8, morale = 0, slots = s.baseSlots, passengers = s.basePassengers;
    let sale = s.captain === 'clara' ? .12 : 0, contract = 1, choices = 3, dailyMorale = 0, fuel = 1.45, xp = 2, tension = 12 + s.difficulty * 5, hire = 1, maxHull = 100, crit = 0, repeat = 0, contractLimit = 2, stabilityLoss = 0;
    s.cars.forEach(c => { const d = D.cars[c.type]; d.tags.forEach(id => counts[id]++); capacity += d.capacity ? d.capacity + (c.level - 1) * 2 : 0; defense += (d.defense || 0) * c.level + c.training; speed += (d.speed || 0) * c.level; if (c.type === 'power') fuel += .35 * c.level; if (c.type === 'observation') xp += 1; });
    if (counts.trade >= 2) sale += .12; if (counts.trade >= 3) contract += .2;
    if (counts.community >= 2) morale += 2; if (counts.community >= 3) passengers += 2;
    if (counts.industry >= 2) cycle -= 2; if (counts.industry >= 3) speed += 15;
    if (counts.security >= 2) defense += 15; if (counts.security >= 3) tension -= 4;
    if (counts.explorer >= 2) choices += 1; if (counts.explorer >= 3) xp += 2;
    s.artifacts.forEach(a => {
      if (a.id === 'clock') cycle -= 1;
      if (a.id === 'compass') { choices++; xp++; }
      if (a.id === 'coin') crit += .18;
      if (a.id === 'band') { defense += 12; maxHull += 15; }
      if (a.id === 'crate') capacity += 3;
      if (a.id === 'ledger') sale += .1;
      if (a.id === 'rusty') speed += a.age >= 140 ? 10 : -8;
      if (a.id === 'flower') morale += 1;
      if (a.id === 'bell') xp += 1;
      if (a.id === 'medal') { slots++; choices--; }
      if (a.id === 'amp') repeat += .25;
      if (a.id === 'lens') { xp += 2; speed -= 5; }
      if (a.id === 'scarf') { defense += s.guards.length * 8; morale += s.guards.length; }
      if (a.id === 'bank') income += Math.min(.3, Math.floor(s.cash / 100) * .05);
      if (a.id === 'map') speed += 8;
      if (a.id === 'teapot') { dailyMorale -= 2; passengers += 2; }
    });
    s.decisions.forEach(id => { const d = D.decisions.find(x => x.id === id); Object.entries(d.effects).forEach(([key, value]) => {
      if (key === 'speed') speed += value; if (key === 'sale') sale += value; if (key === 'morale') morale += value; if (key === 'defense') defense += value;
      if (key === 'tension') tension += value; if (key === 'fuel') fuel += value; if (key === 'cycle') cycle += value; if (key === 'capacity') capacity += value;
      if (key === 'contract') contract += value; if (key === 'contracts') contractLimit += value; if (key === 'passengers') passengers += value;
      if (key === 'dailyMorale') dailyMorale += value; if (key === 'income') income += value; if (key === 'hire') hire += value; if (key === 'stability') stabilityLoss += value;
    }); });
    capacity += s.heritageEffects.capacity || 0; speed += s.heritageEffects.speed || 0;
    s.guards.forEach(g => defense += g.defense);
    passengers += s.guests.length;
    const crowd = Math.max(0, passengers - 12); speed -= crowd;
    if (s.coal <= 0) speed *= .35;
    if (s.captain === 'clara' && s.stability.economy <= 0) income *= .6;
    return { counts, capacity, used: sumCargo(s) + s.guests.length, defense: Math.round(defense), speed: Math.max(25, speed), income: Math.max(.2, income),
      cycle: Math.max(2, cycle), morale, slots: Math.min(9, slots), passengers: Math.max(1, passengers), sale, contract, choices: clamp(choices, 2, 5), dailyMorale,
      fuel, xp, tension: Math.max(1, tension), hire, maxHull, crit, repeat, contractLimit, stabilityLoss,
      dailyLoss: Math.max(1, 2 + s.difficulty * 1.2 + Math.floor(day(s) / 4) + passengers * .1 + dailyMorale + s.status.backlash * 2) };
  }
  function gainXP(s, amount) {
    s.exp += amount;
    while (s.level < 8 && s.exp >= s.level * 4) { s.exp -= s.level * 4; s.level++; if (s.level % 2 === 0) { s.baseSlots++; s.basePassengers++; } s.coal += s.captain === 'silas' ? 3 : 1; log(s, `레벨 ${s.level}. ${s.level % 2 === 0 ? '배치 공간 +1, 승객 +1. ' : ''}석탄을 보급받았습니다.`, 'level'); }
  }
  function credit(s, amount) { s.cash += amount; s.stats.gross += amount; }
  function spend(s, amount) { s.cash -= amount; s.stats.spent += amount; }
  function moraleGain(s, amount) { s.morale = clamp(s.morale + amount, 0, 100); }
  function addCargo(s, id, count) { const room = Math.max(0, metrics(s).capacity - metrics(s).used); const n = Math.min(count, room); s.cargo[id] += n; return n; }
  function production(s) {
    const m = metrics(s); s.stats.cycles++;
    let remaining = m.passengers, entries = 0, cash = 0, joy = m.morale;
    const start = (s.stats.cycles - 1) % s.cars.length;
    s.cars.forEach(c => c.occupied = 0);
    for (let j = 0; j < s.cars.length; j++) {
      const c = s.cars[(start + j) % s.cars.length], d = D.cars[c.type]; c.occupied = Math.min(d.seats, remaining); remaining -= c.occupied;
      if (!c.occupied) continue;
      if (d.tags.includes('express')) entries += c.occupied;
      const ratio = c.occupied / d.seats;
      let mult = (random(s) < m.crit ? 2 : 1) * (random(s) < m.repeat ? 2 : 1);
      const money = Math.round(d.cash * c.level * ratio * m.income * mult), happy = d.morale * c.level * ratio * mult;
      let extra = 0;
      if (c.type === 'saloon') extra += random(s) < .2 ? -2 : 1;
      if (c.type === 'diner' && s.stats.cycles % 4 === 0 && s.cargo.grain > 0) { s.cargo.grain--; extra += 5; }
      if (c.type === 'guard') c.training = Math.min(c.level * 12, c.training + .8);
      if (c.type === 'workshop') { c.charge++; if (c.charge >= 3 && addCargo(s, 'parts', 1)) { c.charge = 0; s.stats.goodsMade++; } }
      cash += money; joy += happy + extra;
      const record = s.contribution[c.uid] || (s.contribution[c.uid] = { type: c.type, cash: 0, morale: 0, cycles: 0, parts: 0 });
      record.cash += money; record.morale += happy + extra; record.cycles++; if (c.type === 'workshop' && c.charge === 0) record.parts++;
    }
    credit(s, cash); moraleGain(s, joy); s.stats.produced += cash; s.stats.moraleProduced += Math.max(0, joy);
    if (m.counts.express >= 2) { s.transportEntries += entries; const need = m.counts.express >= 3 ? 28 : 40; while (s.transportEntries >= need) { s.transportEntries -= need; s.coal += 2; } }
    if (s.artifacts.some(a => a.id === 'basket') && s.stats.cycles % 8 === 0) { addCargo(s, 'grain', 1); s.coal += 2; }
    if (s.captain === 'clara' && m.defense >= 20) s.stability.order = clamp(s.stability.order + 1, 0, 100);
    s.artifacts.forEach(a => s.artifactUsage[a.id] = (s.artifactUsage[a.id] || 0) + 1);
  }
  function daily(s) {
    const m = metrics(s); s.coal = Math.max(0, s.coal - m.fuel); moraleGain(s, -m.dailyLoss);
    if (!s.coal) s.hull = Math.max(0, s.hull - 6);
    if (s.status.wound) s.hull = Math.max(0, s.hull - s.status.wound);
    if (!s.cars.some(c => c.type === 'cold') && day(s) % 3 === 0 && s.cargo.medicine > 0) { s.cargo.medicine--; log(s, '의약품 1개가 긴 주행 중 변질됐습니다. 냉장칸으로 보호할 수 있습니다.', 'warning'); }
    if (s.captain === 'silas') { s.tension += m.tension; if (s.tension >= 100) { s.tension = 45; s.basePassengers = Math.max(1, s.basePassengers - 1); moraleGain(s, -10); s.hull -= 8; s.stats.tensionEvents++; log(s, '긴장이 한계에 도달했습니다. 승객 1명 이탈, 사기 -10, 내구도 -8. 긴장은 45로 낮아집니다.', 'warning'); } }
    if (s.captain === 'clara') { s.stability.economy = clamp(s.stability.economy - (7 + s.difficulty), 0, 100); s.stability.trust = clamp(s.stability.trust - Math.max(0, 6 + s.difficulty + m.stabilityLoss), 0, 100); s.stability.order = clamp(s.stability.order - Math.max(0, 6 + s.difficulty + m.stabilityLoss), 0, 100); }
    s.contracts.forEach(c => { if (c.state === 'active' && day(s) > c.due) { c.state = 'failed'; s.stats.failed++; s.reputation = Math.max(0, s.reputation - 1); moraleGain(s, -5); s.guests = s.guests.filter(g => g.contract !== c.id); log(s, `${c.name}의 기한을 넘겼습니다. 사기 -5, 평판 -1.`, 'warning'); } });
  }
  function routes(s) { return D.edges.filter(e => e.from === s.node && (e.id !== 'd-s' || s.mode !== 'journey')); }
  function queueRoute(s, edgeId) {
    if (!active(s)) return no('진행 중인 여정이 없습니다.');
    const last = (s.queue || []).at(-1), from = last ? D.edges.find(e => e.id === last).to : s.segment ? D.edges.find(e => e.id === s.segment.edgeId).to : s.node;
    const edge = D.edges.find(e => e.id === edgeId && e.from === from && (e.id !== 'd-s' || s.mode !== 'journey'));
    if (!edge || (s.queue || []).length >= 8) return no('연결되는 노선을 최대 8구간까지 예약하세요.');
    (s.queue || (s.queue = [])).push(edgeId); return ok('다음 구간을 예약했습니다.');
  }
  function depart(s, edgeId) {
    if (!atStation(s)) return no('정류장에서 출발할 수 있습니다.');
    const e = routes(s).find(x => x.id === edgeId); if (!e) return no('현재 정류장에서 연결되는 노선을 고르세요.');
    if (s.captain === 'clara' && s.stability.order <= 0) return no('치안이 무너졌습니다. 통치 행위로 치안을 회복하세요.');
    if (s.coal < 2) return no('출발에 필요한 석탄이 부족합니다. 보급하거나 긴급 지원을 받으세요.');
    if (s.cash < e.toll) return no('통행료가 부족합니다.');
    if (e.toll) spend(s, e.toll);
    s.segment = { edgeId, progress: 0, eventDone: false }; s.phase = 'travel'; s.paused = false; s.offer = null; s.landmarkAvailable = false;
    s.path.push(edgeId); log(s, `${station(e.to).name}행 출발. ${e.name}${e.toll ? ` · 통행료 $${e.toll}` : ''}.`, 'departure'); return ok('출발합니다.');
  }
  function initMarket(s) {
    const d = station(s.node), visits = s.visitCounts[s.node] || 1;
    s.market = { stock: {}, changes: {} };
    Object.keys(D.goods).forEach(id => { s.market.stock[id] = d.stock[id] + Math.floor(random(s) * 3) - 1; s.market.changes[id] = Math.round(Math.sin(visits * 1.7 + D.stations.indexOf(d) + Object.keys(D.goods).indexOf(id)) * 2); });
  }
  function quote(s, id, side = 'buy') {
    const base = station(s.node).prices[id] + (s.market.changes[id] || 0);
    return side === 'buy' ? Math.max(2, base) : Math.min(Math.max(1, base - 1), Math.max(1, Math.floor(base * .86 * (1 + metrics(s).sale))));
  }
  function trade(s, id, side, amount = 1) {
    if (!atStation(s) || !D.goods[id]) return no('거래는 정류장에서 가능합니다.');
    amount = Math.floor(amount); if (amount < 1 || amount > 100) return no('거래 수량을 확인하세요.');
    const price = quote(s, id, side), m = metrics(s);
    if (side === 'buy') {
      if (s.cash < price * amount) return no('현금이 부족합니다.'); if (s.market.stock[id] < amount) return no('시장의 재고가 부족합니다.'); if (m.used + amount > m.capacity) return no('적재 공간이 부족합니다.');
      spend(s, price * amount); s.cargo[id] += amount; s.market.stock[id] -= amount; s.market.changes[id] += Math.floor(amount / 3);
    } else if (side === 'sell') {
      if (s.cargo[id] < amount) return no('팔 화물이 부족합니다.'); s.cargo[id] -= amount; credit(s, price * amount); s.market.stock[id] += amount; s.market.changes[id] = Math.max(-8, s.market.changes[id] - Math.ceil(amount / 2));
    } else return no('거래 종류를 확인하세요.');
    if (s.captain === 'clara') s.stability.economy = clamp(s.stability.economy + 2, 0, 100);
    log(s, `${D.goods[id].name} ${amount}개 ${side === 'buy' ? '매입' : '판매'} · $${price * amount}.`, 'trade'); return ok('거래를 마쳤습니다.');
  }
  function service(s, id) {
    if (!atStation(s)) return no('정류장에서 이용할 수 있습니다.');
    if (id === 'coal') { if (s.cash < 12) return no('석탄 보급에 $12가 필요합니다.'); spend(s, 12); s.coal += 8; log(s, '석탄 8 보급 · $12.', 'service'); }
    else if (id === 'repair') { if (s.hull >= metrics(s).maxHull) return no('이미 온전한 열차입니다.'); if (s.cash < 18) return no('정비에 $18가 필요합니다.'); spend(s, 18); s.hull = Math.min(metrics(s).maxHull, s.hull + 35); s.status.wound = 0; log(s, '내구도 +35, 손상 상태 해제 · $18.', 'service'); }
    else if (id === 'rest') { if (s.cash < 15) return no('휴식에 $15가 필요합니다.'); spend(s, 15); moraleGain(s, 20); s.status.backlash = Math.max(0, s.status.backlash - 1); s.tension = Math.max(0, s.tension - 20); log(s, '사기 +20, 반발 1 제거, 긴장 -20 · $15.', 'service'); }
    else if (id === 'rescue') { if (s.rescueUsed >= 2) return no('긴급 지원은 여정마다 두 번 받을 수 있습니다.'); if (s.coal >= 4 && s.cash >= 18) return no('긴급 지원은 현금 또는 석탄이 부족할 때 받을 수 있습니다.'); s.rescueUsed++; s.coal += 6; s.cash += 20; moraleGain(s, -10); s.reputation = Math.max(0, s.reputation - 1); log(s, '개척자 지원: 현금 +20, 석탄 +6. 사기 -10, 평판 -1.', 'warning'); }
    else return no('알 수 없는 서비스입니다.'); return ok('정류장 서비스를 이용했습니다.');
  }
  function contractOffers(s) {
    const outgoing = routes(s), destinations = [...new Set(outgoing.map(e => e.to))];
    s.contractOffers = destinations.map((to, i) => { const good = i === 0 ? 'grain' : 'medicine', count = good === 'grain' ? 4 : 2; return { id: uid(s, 'k'), type: 'delivery', good, count, to, due: day(s) + 4, reward: good === 'grain' ? 58 : 88, name: `${station(to).name} ${D.goods[good].name} 납품` }; });
    if (s.node !== 'dawn') s.contractOffers.push({ id: uid(s, 'k'), type: 'escort', to: destinations[0], due: day(s) + 4, reward: 42, name: '수상한 여행자의 동행' });
    if (['redrock', 'silver'].includes(s.node)) s.contractOffers.push({ id: uid(s, 'k'), type: 'bounty', to: 'dawn', due: day(s) + 10, reward: 75, name: '협곡 도적 현상금', goal: s.stats.defended + 1 });
  }
  function acceptContract(s, id) {
    if (!atStation(s)) return no('계약은 정류장에서 받을 수 있습니다.'); const c = s.contractOffers.find(x => x.id === id); if (!c) return no('이 계약은 더 이상 제공되지 않습니다.');
    if (s.contracts.filter(x => x.state === 'active').length >= metrics(s).contractLimit) return no('진행 중인 계약이 너무 많습니다.');
    if (c.type === 'escort' && metrics(s).used >= metrics(s).capacity) return no('동행 여행자는 적재 공간 1칸이 필요합니다.');
    s.contracts.push({ ...clone(c), state: 'active' }); s.contractOffers = s.contractOffers.filter(x => x.id !== id);
    if (c.type === 'escort') s.guests.push({ contract: id, name: '로언', to: c.to });
    log(s, `${c.name} 수락 · ${c.due}일차까지 · 보상 $${c.reward}.`, 'contract'); return ok('계약을 수락했습니다.');
  }
  function deliver(s, id) {
    if (!atStation(s)) return no('납품은 정류장에서 합니다.'); const c = s.contracts.find(x => x.id === id && x.state === 'active');
    if (!c || c.to !== s.node) return no('계약의 목적지에서 납품하세요.'); if (day(s) > c.due) return no('납품 기한을 넘겼습니다.');
    if (c.type === 'delivery' && s.cargo[c.good] < c.count) return no(`납품할 ${D.goods[c.good].name} ${c.count}개가 필요합니다.`);
    if (c.type === 'bounty' && s.stats.defended < c.goal) return no('도적을 호위 선택으로 한 번 물리쳐야 합니다.');
    if (c.type === 'delivery') s.cargo[c.good] -= c.count;
    s.guests = s.guests.filter(g => g.contract !== c.id); c.state = 'delivered'; s.stats.delivered++; s.reputation += 2; const money = Math.round(c.reward * metrics(s).contract); credit(s, money); moraleGain(s, 5); gainXP(s, 2);
    if (c.type === 'escort') { addArtifact(s, 'compass'); log(s, '여행자는 오래된 나침반을 건넸습니다. 뜻밖의 인연이 다음 길을 밝혀 줍니다.', 'story'); }
    if (s.captain === 'clara') s.stability.trust = clamp(s.stability.trust + 12, 0, 100);
    log(s, `${c.name} 완료 · $${money}, 평판 +2.`, 'contract'); return ok('계약을 완료했습니다.');
  }
  function hire(s, kind) {
    if (!atStation(s)) return no('호위자는 정류장에서 고용합니다.'); if (s.guards.length >= 2) return no('호위자는 두 명까지 동행합니다.');
    const guard = kind === 'hunter' ? { name: '루크 · 현상금 사냥꾼', defense: 18, price: 32 } : { name: '메이 · 카우보이', defense: 12, price: 22 };
    const price = Math.ceil(guard.price * metrics(s).hire); if (s.cash < price) return no('호위자 고용 비용이 부족합니다.');
    if (!s.cars.some(c => c.type === 'guard')) return no('호위자를 위한 보안관칸을 배치하세요.'); spend(s, price); s.guards.push({ ...guard, uid: uid(s, 'g') }); log(s, `${guard.name} 고용 · 방어력 +${guard.defense}, $${price}.`, 'crew'); return ok('새 호위자가 열차에 올랐습니다.');
  }
  function deploy(s, id) {
    if (!atStation(s)) return no('객차 편성은 정류장에서 바꿉니다.'); if (s.cars.length >= metrics(s).slots) return no('배치 공간이 부족합니다.');
    const c = s.reserve.find(x => x.uid === id); if (!c) return no('보관 중인 객차를 고르세요.'); s.reserve = s.reserve.filter(x => x.uid !== id); s.cars.push(c); log(s, `${D.cars[c.type].name}을 연결했습니다.`, 'train'); return ok('객차를 연결했습니다.');
  }
  function store(s, id) {
    if (!atStation(s)) return no('객차 편성은 정류장에서 바꿉니다.'); const c = s.cars.find(x => x.uid === id); if (!c || s.cars.length <= 1) return no('최소 한 칸은 연결해야 합니다.');
    if (s.reserve.length >= 12) return no('보관 공간이 가득 찼습니다.'); const others = s.cars.filter(x => x.uid !== id); const test = { ...s, cars: others };
    if (metrics(test).capacity < metrics(s).used) return no('실린 화물이 새 적재 한도를 넘습니다. 먼저 화물을 내리세요.');
    if (c.type === 'guard' && s.guards.length && !others.some(x => x.type === 'guard')) return no('동행 중인 호위자를 위한 보안관칸을 하나 남겨 두세요.');
    s.cars = others; s.reserve.push(c); return ok('누적 성장과 함께 보관했습니다.');
  }
  function reorder(s, id, offset) {
    if (!atStation(s)) return no('객차 순서는 정류장에서 바꿉니다.'); const i = s.cars.findIndex(x => x.uid === id), j = clamp(i + offset, 0, s.cars.length - 1); if (i < 0) return no('객차를 찾을 수 없습니다.'); [s.cars[i], s.cars[j]] = [s.cars[j], s.cars[i]]; return ok('객차 순서를 바꿨습니다.');
  }
  function upgrade(s, id) {
    if (!atStation(s)) return no('정류장에서 객차를 강화합니다.'); const c = [...s.cars, ...s.reserve].find(x => x.uid === id); if (!c || c.level >= D.MAX_CAR_LEVEL) return no('최대 3층까지 강화할 수 있습니다.');
    const price = 24 * c.level; if (s.cash < price || s.coal < 2) return no(`강화에 $${price}와 석탄 2가 필요합니다.`); spend(s, price); s.coal -= 2; c.level++; log(s, `${D.cars[c.type].name} ${c.level}층 강화.`, 'train'); return ok('객차를 강화했습니다.');
  }
  function merge(s, id) {
    if (!atStation(s)) return no('정류장에서 객차를 합칩니다.'); const c = [...s.cars, ...s.reserve].find(x => x.uid === id); if (!c || c.level >= 3) return no('합칠 수 있는 객차를 고르세요.');
    const mate = s.reserve.find(x => x.uid !== id && x.type === c.type && x.level === c.level); if (!mate) return no('보관함에 같은 종류·같은 층의 객차가 필요합니다.');
    c.training = Math.max(c.training, mate.training); c.charge = Math.max(c.charge, mate.charge); c.level++; s.reserve = s.reserve.filter(x => x.uid !== mate.uid); log(s, `${D.cars[c.type].name} 두 칸을 합쳐 ${c.level}층으로 만들었습니다.`, 'train'); return ok('성장을 보존하며 합쳤습니다.');
  }
  function recycle(s, id) { if (!atStation(s)) return no('정류장에서 재활용합니다.'); const c = s.reserve.find(x => x.uid === id); if (!c) return no('보관 중인 객차만 재활용할 수 있습니다.'); s.reserve = s.reserve.filter(x => x.uid !== id); s.coal += c.level * 2; s.stats.recycled++; return ok(`석탄 ${c.level * 2}를 얻었습니다.`); }
  function addArtifact(s, id) {
    if (s.artifacts.some(x => x.id === id)) { s.coal += 3; return; }
    s.artifacts.push({ id, age: 0 }); if (id === 'band') s.hull += 15; log(s, `${D.artifacts[id].name} 획득.`, 'artifact');
  }
  function makeOffer(s, meta, kind = 'mixed') {
    const choices = [], candidates = (s.artifactPool || meta.unlocked.filter(id => !meta.locked.includes(id))).filter(id => !s.artifacts.some(a => a.id === id));
    for (let i = 0; i < metrics(s).choices; i++) {
      if ((kind === 'artifact' || (i > 0 && random(s) < .45)) && candidates.length) { const id = pick(s, candidates); candidates.splice(candidates.indexOf(id), 1); choices.push({ kind: 'artifact', id }); }
      else if (kind !== 'artifact') { const type = pick(s, Object.keys(D.cars)); choices.push({ kind: 'car', type, level: s.level >= 4 && random(s) < .28 ? 2 : 1 }); }
    }
    if (!choices.length) choices.push({ kind: 'supplies', amount: 5 });
    s.offer = { choices, rerolls: 0, kind };
  }
  function selectOffer(s, index) {
    if (!atStation(s) || !s.offer) return no('정류장의 보급을 확인하세요.'); const choice = s.offer.choices[index]; if (!choice) return no('보급 후보를 고르세요.');
    if (choice.kind === 'car') { if (s.reserve.length >= 12) return no('보관함이 가득 찼습니다. 먼저 객차를 재활용하세요.'); s.reserve.push(car(s, choice.type, choice.level)); }
    if (choice.kind === 'artifact') addArtifact(s, choice.id);
    if (choice.kind === 'supplies') s.coal += choice.amount;
    s.offer = null; return ok('보급품을 받았습니다.');
  }
  function reroll(s, meta) {
    if (!atStation(s) || !s.offer) return no('다시 뽑을 보급이 없습니다.'); const count = s.offer.rerolls, cost = 2 + count, kind = s.offer.kind; if (s.coal < cost) return no(`석탄 ${cost}가 필요합니다.`);
    s.coal -= cost; makeOffer(s, meta, kind); s.offer.rerolls = count + 1; return ok('보급 후보를 다시 골랐습니다.');
  }
  function skipOffer(s) { if (!s.offer || !atStation(s)) return no('받을 보급이 없습니다.'); s.offer = null; s.coal += 2; return ok('보급 대신 석탄 2를 얻었습니다.'); }
  function beginDecision(s, id) {
    if (!active(s)) return no('진행 중인 여정이 없습니다.'); if (s.decision) return no('현재 결단이 끝난 뒤 고르세요.'); const d = D.decisions.find(x => x.id === id); if (!d) return no('결단을 찾을 수 없습니다.');
    if (s.decisions.includes(id)) return no('이미 완료한 결단입니다.'); if (d.prerequisite && !s.decisions.includes(d.prerequisite)) return no('선행 결단이 필요합니다.'); if (d.excludes && s.decisions.includes(d.excludes)) return no('양립할 수 없는 결단을 완료했습니다.');
    if (s.captain === 'clara' && s.stability.trust <= 0) return no('신뢰를 회복해야 결단을 내릴 수 있습니다.'); if (s.cash < d.cost) return no('결단 비용이 부족합니다.');
    spend(s, d.cost); s.decision = { id, elapsed: 0 }; log(s, `${d.name} 준비 시작 · ${d.duration}초 주행, $${d.cost}.`, 'decision'); return ok('주행 중에 결단이 진행됩니다.');
  }
  function cancelDecision(s) { if (!s.decision) return no('진행 중인 결단이 없습니다.'); const d = D.decisions.find(x => x.id === s.decision.id); const refund = Math.floor(d.cost * .5); s.cash += refund; s.decision = null; return ok(`결단을 취소하고 $${refund}를 돌려받았습니다.`); }
  function landmark(s, choice) {
    if (!atStation(s) || !s.landmarkAvailable) return no('이 정류장의 랜드마크를 이미 방문했습니다.');
    const place = D.landmarks[station(s.node).landmark];
    if (choice === 'supplies') { s.coal += place.coal; gainXP(s, 1); log(s, `${place.name}: 석탄 +${place.coal}, 경험치 +1.`, 'landmark'); }
    else if (choice === 'people') { moraleGain(s, 12); s.reputation++; s.basePassengers += place.people; log(s, `정류장의 사람들과 식탁을 나눴습니다. 사기 +12, 승객 +${place.people}, 평판 +1.`, 'landmark'); }
    else if (choice === 'research') { gainXP(s, place.xp); s.tension = Math.max(0, s.tension - 10); if (s.captain === 'clara') { s.stability.trust = clamp(s.stability.trust + 12, 0, 100); s.stability.economy = clamp(s.stability.economy + 8, 0, 100); } log(s, `철도 기록을 살펴봤습니다. 경험치 +${place.xp}. 긴장 -10, 신뢰·경제 회복.`, 'landmark'); }
    else return no('랜드마크의 선택을 고르세요.');
    s.landmarkAvailable = false; s.stats.landmarks++; if (s.artifacts.some(a => a.id === 'map')) s.reputation++; return ok('랜드마크를 방문했습니다.');
  }
  function governance(s, meta, id) {
    if (!atStation(s) || s.captain !== 'clara') return no('클라라는 정류장에서 통치 행위를 사용합니다.');
    if (id === 'artifacts') { if (!s.decisions.includes('market')) return no('역 상인 협약 결단이 필요합니다.'); if (s.offer) return no('기존 보급을 먼저 받으세요.'); if (s.cash < 32) return no('$32가 필요합니다.'); spend(s, 32); s.stability.economy = clamp(s.stability.economy - 8, 0, 100); makeOffer(s, meta, 'artifact'); }
    else if (['economy', 'trust', 'order'].includes(id)) { const cost = s.stability.economy <= 0 ? 20 : 12; if (s.cash >= cost) spend(s, cost); else { if (s.morale <= 12) return no('회복에 현금이나 사기 12가 필요합니다.'); moraleGain(s, -12); } s.stability[id] = clamp(s.stability[id] + 25, 0, 100); log(s, `${({ economy: '경제', trust: '신뢰', order: '치안' })[id]} +25.`, 'governance'); }
    else return no('통치 행위를 고르세요.'); return ok('통치 행위를 실행했습니다.');
  }
  function createEvent(s, type) { s.event = { type, id: uid(s, 'e'), previousPause: s.paused }; s.phase = 'event'; s.paused = true; }
  function eventInfo(s) {
    if (!s.event) return null;
    const m = metrics(s), type = s.event.type;
    const info = {
      bandits: { title: '협곡의 카우보이들', category: '길 위의 사건', description: '붉은 먼지 사이로 말 세 필이 나타납니다. 선두의 남자가 모자 끝을 올리고, 열차에 멈추라는 신호를 보냅니다.', icon: 'cowboy', choices: [
        { id: 'pay', label: '통행료를 내고 지나간다', detail: '현금 -$24. 열차와 화물을 보호합니다.', enabled: s.cash >= 24 },
        { id: 'defend', label: '호위대가 앞으로 나선다', detail: `승리 확률 ${clamp(35 + m.defense, 35, 96)}%. 성공: 평판 +2. 실패: 내구도 -18, 사기 -8, 손상 +1 (매일 내구도 손실).`, enabled: true },
        { id: 'cargo', label: '화물 일부를 넘긴다', detail: '가진 화물 2개 또는 석탄 4를 잃습니다. 전투를 피합니다.', enabled: true } ] },
      tracks: { title: '끊어진 철로', category: '철도의 풍경', description: '모래에 묻힌 침목이 기울어져 있습니다. 선로를 고쳐 갈 수도, 오래된 우회선을 택할 수도 있습니다.', icon: 'gear', choices: [
        { id: 'parts', label: '부품으로 선로를 고친다', detail: '기계 부품 -1, 경험치 +2.', enabled: s.cargo.parts > 0 },
        { id: 'coal', label: '증기 장비를 가동한다', detail: '석탄 -4, 내구도 -3.', enabled: s.coal >= 4 },
        { id: 'detour', label: '천천히 우회한다', detail: '주행 진행도 -20%. 계약 기한은 계속 흐릅니다.', enabled: true } ] },
      rider: { title: '마지막 말 한 필', category: '개척자의 인연', description: '길가의 카우보이가 다친 동료를 부축하고 있습니다. 마지막 남은 말은 더 걷지 못합니다. 빈 칸 하나와 작은 도움이 필요해 보입니다.', icon: 'people', choices: [
        { id: 'heal', label: '약품을 나누고 동행한다', detail: '의약품 -1. 호위자 +1 (최대 2명), 사기 +10, 평판 +2.', enabled: s.cargo.medicine > 0 && s.guards.length < 2 && s.cars.some(c => c.type === 'guard') },
        { id: 'help', label: '식사와 물을 건넨다', detail: '현금 -$8, 사기 +6, 평판 +1.', enabled: s.cash >= 8 },
        { id: 'pass', label: '다음 역에 구조를 요청한다', detail: '별도의 비용 없이 여정을 계속합니다.', enabled: true } ] },
      strike: { title: '떠나고 싶은 승객들', category: '열차 안의 이야기', description: '객차 안의 피로가 쌓였습니다. 열차를 움직이는 사람들에게도, 이 여정을 계속할 이유가 필요합니다.', icon: 'heart', choices: [
        { id: 'pay', label: '임금과 식사를 보장한다', detail: '현금 -$18. 사기 +18, 반발 1 제거, 긴장 -15.', enabled: s.cash >= 18 },
        { id: 'force', label: '질서를 우선한다', detail: '승객 -1, 반발 +1, 긴장 +12. 평판 -1.', enabled: true },
        { id: 'listen', label: '이야기를 듣는다', detail: '주행 진행도 -10%, 사기 +8.', enabled: true } ] }
    };
    return info[type];
  }
  function resolveEvent(s, choiceId) {
    if (!s.event) return no('해결할 사건이 없습니다.'); const option = eventInfo(s).choices.find(x => x.id === choiceId); if (!option || !option.enabled) return no('이 선택의 조건을 충족하지 못했습니다.');
    const type = s.event.type; let text = '';
    if (type === 'bandits') {
      if (choiceId === 'pay') { spend(s, 24); text = '통행료 $24를 내고 무사히 지나갔습니다.'; }
      if (choiceId === 'defend') { if (random(s) < clamp(35 + metrics(s).defense, 35, 96) / 100) { s.stats.defended++; s.reputation += 2; s.tension = Math.max(0, s.tension - 8); text = '호위대가 도적을 물리쳤습니다. 평판 +2, 긴장 -8.'; } else { s.hull -= 18; s.status.wound = Math.min(3,s.status.wound+1); moraleGain(s, -8); text = `격렬한 저항 끝에 도적은 물러났습니다. 내구도 -18, 사기 -8. 손상 ${s.status.wound}: 매일 내구도가 줄어듭니다. 다음 역에서 정비하세요.`; } }
      if (choiceId === 'cargo') { let lost = 0; for (const id of Object.keys(D.goods)) { const count = Math.min(2 - lost, s.cargo[id]); s.cargo[id] -= count; lost += count; if (lost === 2) break; } if (!lost) s.coal = Math.max(0, s.coal - 4); text = lost ? `화물 ${lost}개를 넘기고 길을 열었습니다.` : '석탄 4를 넘기고 길을 열었습니다.'; }
    }
    if (type === 'tracks') { if (choiceId === 'parts') { s.cargo.parts--; gainXP(s, 2); text = '부품 1개로 철로를 고쳤습니다. 경험치 +2.'; } if (choiceId === 'coal') { s.coal -= 4; s.hull -= 3; text = '석탄 4와 내구도 3으로 철로를 복구했습니다.'; } if (choiceId === 'detour') { s.segment.progress = Math.max(0, s.segment.progress - .2); text = '우회선을 택했습니다. 도착이 늦어집니다.'; } }
    if (type === 'rider') { if (choiceId === 'heal') { s.cargo.medicine--; s.guards.push({ uid: uid(s, 'g'), name: '잭 · 떠돌이 카우보이', defense: 14 }); moraleGain(s, 10); s.reputation += 2; text = '잭이 새 동료가 되었습니다. 방어력 +14, 사기 +10, 평판 +2.'; } if (choiceId === 'help') { spend(s, 8); moraleGain(s, 6); s.reputation++; text = '식사와 물을 나눴습니다. 사기 +6, 평판 +1.'; } if (choiceId === 'pass') text = '다음 역으로 구조 신호를 보냈습니다.'; }
    if (type === 'strike') { if (choiceId === 'pay') { spend(s, 18); moraleGain(s, 18); s.status.backlash = Math.max(0, s.status.backlash - 1); s.tension = Math.max(0, s.tension - 15); text = '승객들의 표정이 풀렸습니다. 사기 +18, 반발 1 제거.'; } if (choiceId === 'force') { s.basePassengers = Math.max(1, s.basePassengers - 1); s.status.backlash++; s.tension += 12; s.reputation = Math.max(0, s.reputation - 1); text = '한 승객이 열차를 떠났습니다. 반발이 매일 사기를 2 더 소모합니다.'; } if (choiceId === 'listen') { s.segment.progress = Math.max(0, s.segment.progress - .1); moraleGain(s, 8); text = '말을 나누는 동안 조금 늦어졌지만 사기 8을 얻었습니다.'; } }
    const previousPause = !!s.event.previousPause;
    s.event = null; s.phase = 'travel'; s.paused = previousPause; log(s, text, 'event'); return ok(text);
  }
  function arrive(s, meta, settings) {
    const e = D.edges.find(x => x.id === s.segment.edgeId); s.node = e.to; s.segment = null; s.phase = 'station'; s.paused = true;
    s.visitCounts[s.node] = (s.visitCounts[s.node] || 0) + 1; if (!s.visited.includes(s.node)) s.visited.push(s.node);
    if (s.node === 'sunset') s.laps++;
    const expiredGuards = s.guards.length; if (s.node === 'dawn' && s.mode !== 'journey') { s.guards = []; if (expiredGuards) log(s, '호위 계약이 끝났습니다. 다음 순환에서는 새 호위자를 고용할 수 있습니다.', 'crew'); }
    gainXP(s, metrics(s).xp); if (s.artifacts.some(a => a.id === 'bell')) moraleGain(s, 5);
    initMarket(s); contractOffers(s); s.landmarkAvailable = true; makeOffer(s, meta); log(s, `${station(s.node).name}에 도착했습니다. 시장·납품·보급을 확인하세요.`, 'arrival');
    if (!settings.autoArrival && s.queue && s.queue.length && !canFinish(s)) {
      const next = s.queue[0], result = depart(s, next);
      if (result.ok) s.queue.shift(); else log(s, `예약 운행 중단: ${result.message}`, 'warning');
    }
  }
  function tick(s, seconds, meta, settings = meta.settings) {
    if (!active(s) || s.paused || s.phase !== 'travel') return;
    let left = clamp(seconds, 0, 30), safe = 0;
    while (left > .00001 && active(s) && !s.paused && s.phase === 'travel' && safe++ < 200) {
      const dt = Math.min(.2, left); left -= dt; const previousDay = day(s); s.time += dt;
      s.artifacts.forEach(a => { const previous = a.age; a.age += dt; if (a.id === 'rusty' && previous < 140 && a.age >= 140) log(s, '녹슨 조속기가 정밀 조속기로 변했습니다. 속도 효과 -8% → +10%.', 'artifact'); });
      const m = metrics(s), e = D.edges.find(x => x.id === s.segment.edgeId); s.segment.progress += dt * (m.speed / 100) / e.seconds; s.stats.totalDistance += dt * m.speed / 100;
      s.cycleProgress += dt / m.cycle; while (s.cycleProgress >= 1) { s.cycleProgress -= 1; production(s); }
      if (s.decision) { const d = D.decisions.find(x => x.id === s.decision.id); s.decision.elapsed += dt; if (s.decision.elapsed >= d.duration) { s.decisions.push(d.id); s.decision = null; log(s, `${d.name} 완료. ${d.description}`, 'decision'); if (settings.autoDecision) s.paused = true; } }
      if (day(s) > previousDay) daily(s);
      if (s.morale <= 0 || s.hull <= 0) { finish(s, meta, false, s.morale <= 0 ? '승객들의 사기가 바닥났습니다.' : '열차의 내구도가 한계에 도달했습니다.'); break; }
      if (!s.segment.eventDone && s.segment.progress >= .48) {
        s.segment.eventDone = true;
        const type = s.morale < 30 ? 'strike' : e.risk >= 3 ? 'bandits' : e.risk === 2 ? pick(s, ['tracks', 'bandits']) : pick(s, ['rider', 'tracks']);
        createEvent(s, type); break;
      }
      if (s.segment.progress >= 1) arrive(s, meta, settings);
    }
  }
  function canFinish(s) { return atStation(s) && (s.mode === 'journey' ? s.node === 'dawn' : s.mode === 'loop' ? s.laps >= 1 : s.stats.delivered >= 4 && s.cash >= 500); }
  function finish(s, meta, victory, reason = '') {
    if (s.result) return no('이미 정산한 여정입니다.');
    s.hull = Math.max(0,s.hull);
    const rewards = { survival: Math.floor(s.time / D.DAY_SECONDS) * 2, arrival: victory ? 45 : 6, contracts: s.stats.delivered * 6, exploration: s.stats.landmarks * 2, train: s.cars.length >= 5 ? 8 : 0 };
    const mult = 1 + s.difficulty * .2, coins = Math.round(Object.values(rewards).reduce((a, b) => a + b, 0) * mult);
    const r = { id: Date.now() + '-' + s.rng, captain: s.captain, mode: s.mode, difficulty: s.difficulty, victory, reason, day: day(s), cash: Math.round(s.cash), morale: Math.round(s.morale), hull: Math.round(s.hull), passengers: metrics(s).passengers, speed: Math.round(metrics(s).speed),
      cars: clone(s.cars), artifacts: clone(s.artifacts), path: clone(s.path), stats: clone(s.stats), contributions: clone(s.contribution), rewards, coins, date: new Date().toISOString(), hiddenStory: victory && s.contracts.some(c => c.type === 'escort' && c.state === 'delivered') ? '작은 친절이 이어져, 지도에 없던 길이 열렸습니다.' : null };
    s.result = r; s.phase = 'result'; s.paused = true; meta.coins += coins; meta.stats.runs++; if (victory) { meta.stats.victories++; meta.stats.frost = Math.max(meta.stats.frost, s.difficulty); }
    meta.stats.delivered += s.stats.delivered; meta.history.unshift(r); meta.history = meta.history.slice(0, 20);
    Object.entries(s.artifactUsage).forEach(([id, n]) => meta.collection[id] = (meta.collection[id] || 0) + Math.round(n * mult));
    if (victory && s.captain === 'clara') { meta.heritage.available = true; if (!meta.heritage.traits.length) rollHeritage(meta, true); }
    return ok(`여정을 정산했습니다. 보라색 동전 ${coins}개.`);
  }
  function endRun(s, meta) { if (canFinish(s)) return finish(s, meta, true, '승객과 함께 서부의 길을 완주했습니다.'); return finish(s, meta, false, '여정을 마치고 다음 출발을 준비합니다.'); }
  function unlock(meta, kind, id) {
    const list = kind === 'captain' ? meta.captains : meta.unlocked, d = kind === 'captain' ? D.captains[id] : D.artifacts[id]; if (!d) return no('해금할 대상을 고르세요.'); if (list.includes(id)) return no('이미 해금했습니다.'); const price = kind === 'captain' ? d.unlock : d.price;
    if (meta.coins < price) return no('보라색 동전이 부족합니다.'); meta.coins -= price; list.push(id); return ok('다음 여정의 선택이 넓어졌습니다.');
  }
  function lockArtifact(meta, id) { if (!meta.unlocked.includes(id)) return no('해금한 유물만 관리할 수 있습니다.'); if (meta.locked.includes(id)) { meta.locked = meta.locked.filter(x => x !== id); return ok('후보군에 다시 포함됩니다.'); }
    if (meta.unlocked.length - meta.locked.length <= 2) return no('최소 두 유물은 후보군에 남겨 두세요.'); const price = 5 + meta.locked.length * 3; if (meta.coins < price) return no(`잠금에 동전 ${price}개가 필요합니다.`); meta.coins -= price; meta.locked.push(id); return ok('다음 여정부터 이 유물은 보급 후보에서 제외됩니다.'); }
  function rollHeritage(meta, free = false) {
    if (!meta.heritage.available) return no('클라라의 여정을 완주하면 유산이 열립니다.'); const cost = 30 + meta.heritage.locks.length * 10; if (!free && meta.coins < cost) return no(`재설정에 동전 ${cost}개가 필요합니다.`); if (!free) meta.coins -= cost;
    const previous = meta.heritage.traits, locks = meta.heritage.locks;
    const draw = (pool, excluded) => { const choices = pool.map(x => x.id).filter(id => !excluded.includes(id)); return choices[Math.floor(Math.random() * choices.length)]; };
    const next = previous.filter(id => locks.includes(id));
    while (next.filter(id => D.heritage.positives.some(t => t.id === id)).length < 3) next.push(draw(D.heritage.positives, next));
    if (!next.some(id => D.heritage.negatives.some(t => t.id === id))) next.push(draw(D.heritage.negatives, next));
    meta.heritage.traits = next; return ok('유산 효과를 새로 골랐습니다.');
  }
  function lockHeritage(meta, id) { if (!meta.heritage.traits.includes(id)) return no('유산 효과를 고르세요.'); if (meta.heritage.locks.includes(id)) meta.heritage.locks = meta.heritage.locks.filter(x => x !== id); else { if (meta.heritage.locks.length >= 2) return no('효과는 두 개까지 고정합니다.'); meta.heritage.locks.push(id); } return ok('유산 고정을 변경했습니다.'); }
  function validateSave(payload) {
    try {
    if (!payload || payload.version !== 1 || !payload.meta || payload.meta.version !== 1) return no('지원하지 않는 저장 파일입니다.');
    const meta = payload.meta;
    const validId = (table, id) => typeof id === 'string' && Object.hasOwn(table, id);
    const finiteRecord = obj => obj && typeof obj === 'object' && !Array.isArray(obj) && Object.values(obj).every(n => Number.isFinite(n) && n >= 0 && n <= 1e8);
    const validCar = c => c && validId(D.cars, c.type) && typeof c.uid === 'string' && c.uid.length < 40 && [1,2,3].includes(c.level) && ['training','charge','occupied'].every(k => Number.isFinite(c[k]) && c[k] >= 0 && c[k] < 1e5);
    if (!Number.isFinite(meta.coins) || meta.coins < 0 || !Array.isArray(meta.unlocked) || !Array.isArray(meta.captains) || !meta.settings || !meta.heritage || !Array.isArray(meta.history)) return no('저장 데이터 형식을 확인하세요.');
    if (meta.unlocked.some(id => !validId(D.artifacts,id)) || meta.captains.some(id => !validId(D.captains,id)) || !meta.captains.includes('ada') || !Array.isArray(meta.locked) || meta.locked.some(id => !meta.unlocked.includes(id)) || new Set(meta.unlocked).size !== meta.unlocked.length || new Set(meta.locked).size !== meta.locked.length) return no('저장에 알 수 없는 해금 정보가 있습니다.');
    if (!finiteRecord(meta.stats) || !['runs','victories','delivered','frost'].every(k=>Number.isInteger(meta.stats[k])) || meta.stats.frost > 3 || !finiteRecord(meta.collection) || Object.keys(meta.collection).some(id=>!validId(D.artifacts,id))) return no('누적 기록이 올바르지 않습니다.');
    if (typeof meta.perksEnabled !== 'boolean' || !Number.isFinite(meta.settings.volume) || meta.settings.volume < 0 || meta.settings.volume > 100 || ['sound','particles','reducedMotion','autoDecision','autoArrival','offline'].some(k=>typeof meta.settings[k] !== 'boolean') || !meta.settings.keys || Object.values(meta.settings.keys).some(k=>!['Space','KeyM','KeyC','KeyT','KeyD','KeyP','KeyR','KeyB','KeyG'].includes(k))) return no('설정 정보가 올바르지 않습니다.');
    if (!Array.isArray(meta.heritage.traits) || !Array.isArray(meta.heritage.locks) || meta.heritage.locks.length > 2 || typeof meta.heritage.available !== 'boolean' || typeof meta.heritage.enabled !== 'boolean' || meta.heritage.locks.some(id=>!meta.heritage.traits.includes(id)) || meta.heritage.traits.some(id=>![...D.heritage.positives,...D.heritage.negatives].some(t=>t.id===id))) return no('유산 기록이 올바르지 않습니다.');
    const validResult = r => r && validId(D.captains,r.captain) && ['journey','loop','career'].includes(r.mode) && [0,1,2,3].includes(r.difficulty) && typeof r.victory === 'boolean' && ['day','cash','morale','hull','coins'].every(k=>Number.isFinite(r[k])&&r[k]>=0) && finiteRecord(r.stats) && finiteRecord(r.rewards) && Array.isArray(r.path) && r.path.every(id=>D.edges.some(e=>e.id===id)) && Array.isArray(r.cars) && r.cars.every(validCar) && r.contributions && Object.values(r.contributions).every(c=>validId(D.cars,c.type)&&['cash','morale','cycles','parts'].every(k=>Number.isFinite(c[k]))) && !Number.isNaN(Date.parse(r.date));
    if (meta.history.length > 20 || !meta.history.every(validResult)) return no('지난 여정의 기록이 올바르지 않습니다.');
    if (payload.run) {
      const s = payload.run;
      if (!meta.captains.includes(s.captain) || !['journey','loop','career'].includes(s.mode) || ![0,1,2,3].includes(s.difficulty) || typeof s.paused !== 'boolean' || ![1,2,5,10].includes(s.speed) || !Array.isArray(s.contractOffers) || !Array.isArray(s.queue) || s.queue.length > 8 || s.queue.some(id=>!D.edges.some(e=>e.id===id)) || !Array.isArray(s.artifactPool) || s.artifactPool.some(id=>!validId(D.artifacts,id))) return no('운행 설정이 올바르지 않습니다.');
      if (s.version !== 1 || !D.captains[s.captain] || !station(s.node) || !['station', 'travel', 'event', 'result'].includes(s.phase) || !s.cargo || !s.stability || !s.status || !s.market) return no('여정 상태가 올바르지 않습니다.');
      const nums = ['cash', 'coal', 'morale', 'hull', 'time', 'level', 'exp', 'baseSlots', 'basePassengers', 'serial', 'rng', 'cycleProgress', 'tension'];
      if (nums.some(key => !Number.isFinite(s[key]) || s[key] < 0 || s[key] > (key === 'rng' ? 4294967295 : 1e8))) return no('자원·시간 수치가 올바르지 않습니다.');
      if (!finiteRecord(s.stats) || !finiteRecord(s.stability) || !finiteRecord(s.status) || !s.heritageEffects || Object.values(s.heritageEffects).some(n=>!Number.isFinite(n)) || !finiteRecord(s.artifactUsage) || !s.market.stock || !s.market.changes || !finiteRecord(s.market.stock) || Object.values(s.market.changes).some(n=>!Number.isFinite(n)) || !Number.isFinite(s.reputation) || !Number.isFinite(s.transportEntries) || !Number.isFinite(s.laps) || !Number.isInteger(s.rescueUsed) || s.rescueUsed > 2) return no('누적 수치가 올바르지 않습니다.');
      if (!Array.isArray(s.cars) || !s.cars.length || s.cars.length > 9 || !Array.isArray(s.reserve) || s.reserve.length > 12 || [...s.cars, ...s.reserve].some(c => !D.cars[c.type] || ![1, 2, 3].includes(c.level) || !Number.isFinite(c.training) || !Number.isFinite(c.charge))) return no('객차 데이터가 올바르지 않습니다.');
      if (![...s.cars,...s.reserve].every(validCar) || new Set([...s.cars,...s.reserve].map(c=>c.uid)).size !== s.cars.length+s.reserve.length) return no('객차 식별 정보가 올바르지 않습니다.');
      if (!Array.isArray(s.artifacts) || s.artifacts.some(a => !validId(D.artifacts,a.id) || !Number.isFinite(a.age) || a.age < 0) || !Array.isArray(s.decisions) || s.decisions.some(id => !D.decisions.some(d => d.id === id))) return no('유물·결단 데이터가 올바르지 않습니다.');
      if (s.decision && (!D.decisions.some(d => d.id === s.decision.id) || !Number.isFinite(s.decision.elapsed))) return no('진행 중인 결단이 올바르지 않습니다.');
      if ((s.phase === 'travel' || s.phase === 'event') && (!s.segment || !D.edges.some(e => e.id === s.segment.edgeId) || !Number.isFinite(s.segment.progress) || s.segment.progress < 0)) return no('노선 데이터가 올바르지 않습니다.');
      if (s.phase === 'event' && (!s.event || !['bandits', 'tracks', 'rider', 'strike'].includes(s.event.type))) return no('사건 데이터가 올바르지 않습니다.');
      if (Object.keys(D.goods).some(id => !Number.isInteger(s.cargo[id]) || s.cargo[id] < 0) || !Array.isArray(s.guards) || s.guards.length > 2 || !Array.isArray(s.guests) || !Array.isArray(s.contracts) || s.contracts.some(c => !['delivery', 'escort', 'bounty'].includes(c.type) || !station(c.to))) return no('화물·승객·계약 정보가 올바르지 않습니다.');
      if (s.guards.some(g=>!Number.isFinite(g.defense)||g.defense<0||typeof g.name!=='string') || s.guests.some(g=>!station(g.to)||typeof g.name!=='string') || [...s.contracts,...s.contractOffers].some(c=>!station(c.to)||typeof c.id!=='string'||!Number.isFinite(c.due)||!Number.isFinite(c.reward)||c.reward<0||!['delivery','escort','bounty'].includes(c.type)||(c.type==='delivery'&&(!validId(D.goods,c.good)||!Number.isInteger(c.count)||c.count<1))) || (s.offer && (!Array.isArray(s.offer.choices) || s.offer.choices.length>5 || !Number.isInteger(s.offer.rerolls) || s.offer.choices.some(c=>c.kind==='car'?!validId(D.cars,c.type)||![1,2,3].includes(c.level):c.kind==='artifact'?!validId(D.artifacts,c.id):c.kind!=='supplies'||!Number.isFinite(c.amount))))) return no('선택지의 기록이 올바르지 않습니다.');
      if (!Array.isArray(s.log) || !Array.isArray(s.path) || !s.stats || !s.contribution || !s.artifactUsage || !s.heritageEffects || !s.visitCounts || !Array.isArray(s.visited)) return no('여정 기록이 올바르지 않습니다.');
      if (s.level < 1 || s.level > 8 || !Number.isInteger(s.level) || s.cycleProgress > 1 || s.morale > 100 || s.phase === 'result' && !s.result || s.log.length > 60 || s.log.some(l=>!l||typeof l.text!=='string'||!Number.isFinite(l.time)||!Number.isFinite(l.day)) || s.path.some(id=>!D.edges.some(e=>e.id===id)) || s.visited.some(id=>!station(id)) || !finiteRecord(s.visitCounts) || Object.values(s.contribution).some(c=>!c||!validId(D.cars,c.type)||['cash','morale','parts','cycles'].some(k=>!Number.isFinite(c[k]))) || ['cycles','gross','spent','delivered','failed','defended','produced','moraleProduced','goodsMade','recycled','landmarks','tensionEvents','totalDistance'].some(k=>!Number.isFinite(s.stats[k])) || ['economy','trust','order'].some(k=>!Number.isFinite(s.stability[k])||s.stability[k]>100) || ['backlash','wound'].some(k=>!Number.isFinite(s.status[k])) || Object.keys(D.goods).some(id=>!Number.isFinite(s.market.stock[id])||!Number.isFinite(s.market.changes[id]))) return no('진행 기록에 올바르지 않은 값이 있습니다.');
      if (new Set(s.artifacts.map(a=>a.id)).size !== s.artifacts.length || new Set(s.decisions).size !== s.decisions.length || s.decision && (s.decision.elapsed < 0 || s.decision.elapsed > D.decisions.find(d=>d.id===s.decision.id).duration) || s.segment && (!Number.isFinite(s.segment.progress)||s.segment.progress>1.01||typeof s.segment.eventDone!=='boolean')) return no('진행도가 올바르지 않습니다.');
      if (metrics(s).used > metrics(s).capacity) return no('화물이 적재 한도를 넘습니다.');
      if (s.result && !validResult(s.result)) return no('정산 기록이 올바르지 않습니다.');
    }
    return ok('저장 파일을 확인했습니다.');
    } catch (_) { return no('저장 파일에 필요한 정보가 빠졌습니다.'); }
  }
  const engine = { clone, clamp, random, day, station, sumCargo, defaultMeta, newRun, metrics, gainXP, routes, depart, queueRoute, quote, trade, service, acceptContract, deliver, hire,
    deploy, store, reorder, upgrade, merge, recycle, addArtifact, makeOffer, selectOffer, reroll, skipOffer, beginDecision, cancelDecision, landmark, governance,
    eventInfo, resolveEvent, tick, canFinish, finish, endRun, unlock, lockArtifact, rollHeritage, lockHeritage, validateSave, perks };
  if (typeof module !== 'undefined' && module.exports) module.exports = engine;
  root.DustlineEngine = engine;
})(typeof globalThis !== 'undefined' ? globalThis : this);
