(function () {
  'use strict';
  const D = window.DustlineData, E = window.DustlineEngine, A = window.DustlineArt;
  const $ = id => document.getElementById(id), esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const num = (x, digits = 0) => Number(x).toLocaleString('ko-KR', { maximumFractionDigits: digits });
  const icon = (x, size = 18) => A.icon(x, size), stationName = id => E.station(id)?.name || '';
  const keyLabel = key => {const code=meta.settings.keys[key];return code==='Space'?'Space':code.replace('Key','');};
  const button = (action, label, attrs = '', cls = '') => `<button type="button" data-action="${action}" class="${cls}" ${attrs}>${label}</button>`;
  const pill = (text, active = false) => `<span class="pill ${active ? 'active' : ''}">${text}</span>`;
  const modes = { journey: ['서부 횡단', '새벽항까지 가는 한 번의 여정. 약 5~10분.'], loop: ['순환 철도', '새벽항을 지나 노을역으로 돌아옵니다. 시장과 계약이 갱신됩니다.'], career: ['철도 상단', '순환하며 계약 4건·현금 $500을 달성합니다. 달성 뒤에도 계속 운영할 수 있습니다.'] };
  const KEY = 'dustline.save.v1';
  let meta = E.defaultMeta(), run = null, selectedCaptain = 'ada', selectedMode = 'journey', selectedDifficulty = 0;
  let home = true, tab = 'station', metaTab = 'shop', modal = null, scene = null, selectedEdge = null, dirty = false, toastTimer, dragId = null;
  let last = performance.now(), hudTimer = 0, saveTimer = 0, panelTimer = 0, soundTimer = 0, seenLog = null, offlineReport = '';
  let controlSignature = '';
  class Sound {
    constructor() { this.ctx = null; }
    wake() { if (!meta.settings.sound) return; try { this.ctx ||= new (window.AudioContext || window.webkitAudioContext)(); this.ctx.resume(); } catch (_) {} }
    tone(freq, length = .09, type = 'sine', volume = .08) {
      if (!meta.settings.sound || !this.ctx || this.ctx.state !== 'running') return;
      const ctx = this.ctx, osc = ctx.createOscillator(), gain = ctx.createGain(), now = ctx.currentTime;
      osc.type = type; osc.frequency.setValueAtTime(freq, now); gain.gain.setValueAtTime(volume * meta.settings.volume / 100, now); gain.gain.exponentialRampToValueAtTime(.0001, now + length); osc.connect(gain); gain.connect(ctx.destination); osc.start(now); osc.stop(now + length);
    }
    click() { this.tone(560, .08, 'sine'); }
    horn() { this.tone(220, .45, 'triangle', .16); setTimeout(() => this.tone(277, .4, 'triangle', .12), 120); }
  }
  const sound = new Sound();
  function toast(text, error = false) { clearTimeout(toastTimer); $('toast-root').innerHTML = `<div class="toast ${error ? 'error' : ''}" role="status">${esc(text)}</div>`; toastTimer = setTimeout(() => $('toast-root').replaceChildren(), 4200); }
  function payload() { return { version: 1, meta, run, savedAt: Date.now(), wasMoving: !home && !modal && run?.phase === 'travel' && !run.paused }; }
  function save(notify = false) {
    try { localStorage.setItem(KEY, JSON.stringify(payload())); dirty = false; if (notify) toast('현재 여정과 해금 정보를 저장했습니다.'); return true; }
    catch (_) { if (notify) toast('브라우저 저장소를 사용할 수 없습니다. 설정에서 저장 파일을 내보내세요.', true); return false; }
  }
  function load() {
    try {
      const raw = localStorage.getItem(KEY); if (!raw) return; const p = JSON.parse(raw), valid = E.validateSave(p);
      if (!valid.ok) { offlineReport = '저장 파일을 읽지 못했습니다. 새 여정을 시작하거나 유효한 저장 파일을 가져오세요.'; return; }
      meta = Object.assign(E.defaultMeta(), p.meta); meta.settings = Object.assign(E.defaultMeta().settings, p.meta.settings); meta.settings.keys = Object.assign(E.defaultMeta().settings.keys, p.meta.settings.keys);
      run = p.run; if (run && !run.result) {
        run.queue ||= []; run.artifactPool ||= meta.unlocked.filter(id => !meta.locked.includes(id));
        if (meta.settings.offline && p.wasMoving && run.phase === 'travel') {
          let remaining = Math.min(900, Math.max(0, (Date.now() - p.savedAt) / 1000)), before = run.time; run.paused = false;
          while (remaining > 0 && run.phase === 'travel' && !run.paused) { const step = Math.min(20, remaining); E.tick(run, step, meta); remaining -= step; }
          offlineReport = `자리를 비운 동안 ${num(run.time - before)}초를 운행했습니다. 정류장·사건·결단에서는 멈춥니다.`;
        }
        run.paused = true;
      }
    } catch (_) { offlineReport = '저장 파일을 읽지 못했습니다. 새 여정을 시작하거나 저장 파일을 가져오세요.'; }
  }
  function topbar() {
    return `<header class="topbar"><div class="brand"><img src="assets/emblem.svg" alt=""><div><b>DUSTLINE</b><small>서부 횡단 철도 · 더스트라인</small></div></div><div class="header-actions"><span class="meta-coins">${icon('coin')} ${num(meta.coins)}</span>${button('meta', `${icon('book')}<span class="label">철도 기록실</span>`, 'aria-label="철도 기록실"', 'ghost')}${button('sound', icon(meta.settings.sound ? 'sound' : 'mute'), `aria-label="${meta.settings.sound ? '소리 끄기' : '소리 켜기'}"`, 'ghost')}${button('settings', icon('settings'), 'aria-label="설정"', 'ghost')}${button('help', icon('info'), 'aria-label="게임 도움말"', 'ghost')}${!home ? button('home', icon('map'), 'aria-label="출발 화면"', 'ghost') : ''}</div></header>`;
  }
  function build() {
    scene?.destroy(); controlSignature = '';
    $('app').innerHTML = `<main class="shell">${topbar()}${!home && run ? '<div id="hud" class="hud"></div>' : ''}<section class="scene" aria-label="달리는 서부 열차와 풍경"><canvas id="scene" aria-label="2D 열차 풍경"></canvas><div id="scene-caption" class="scene-caption"></div><div id="scene-ticket" class="scene-ticket"></div></section>${home ? '<div id="home-panel"></div>' : '<div id="controls" class="scene-controls"></div><div id="artifacts" class="artifact-strip"></div><div class="workspace"><aside id="side" class="side"></aside><section class="panel"><nav id="tabs" class="tabs" aria-label="열차 운영 메뉴"></nav><div id="tab-body" class="tab-body"></div></section></div>'}<p class="bottom-note">먼지 너머, 다음 정류장으로. ${home ? '로컬 저장 · 인터넷 연결 없이 플레이' : `${keyLabel('pause')} 일시정지 · ${keyLabel('map')} 노선 · ${keyLabel('train')} 객차 · ${keyLabel('market')} 화물 · ${keyLabel('decisions')} 결단`}</p></main>`;
    scene = new window.DustlineScene($('scene'), () => home ? null : modal ? {...run,paused:true} : run, () => meta.settings);
    if (home) renderHome(); else renderGame();
    renderCaption();
  }
  function renderHome() {
    const canContinue = run && !run.result;
    $('home-panel').innerHTML = `<section class="panel home"><div class="home-intro"><div><span class="eyebrow">A SMALL JOURNEY, A LONG STORY</span><h1>당신의 열차로, 서부 끝까지.</h1><p>정류장에서 물건을 싣고, 사람을 만나고, 다음 길을 고릅니다.<br>기적이 울리면 당신이 만든 객차들이 여정을 움직입니다.</p></div><div class="row">${canContinue ? button('continue', `${icon('play')} 이어서 운행`, '', 'primary') : ''}${button('meta', `${icon('book')} 해금·유산·기록`)}</div></div><div class="grid-3">${Object.entries(D.captains).map(([id, c]) => `<button class="captain-card ${selectedCaptain === id ? 'selected' : ''} ${meta.captains.includes(id) ? '' : 'locked'}" data-action="captain" data-id="${id}"><div class="figure">${A.figure(c.icon, c.color)}</div><div><span class="eyebrow">${esc(c.role)}</span><strong>${esc(c.name)}</strong><p>${esc(c.description)}</p><div class="spaced">${meta.captains.includes(id) ? pill(selectedCaptain === id ? '선택한 기관사' : '선택 가능', selectedCaptain === id) : pill(`${icon('lock', 12)} 동전 ${c.unlock}개로 해금`)}</div></div></button>`).join('')}</div><div class="grid-3 spaced">${Object.entries(modes).map(([id, m]) => button('mode', `<strong>${m[0]}</strong><small>${m[1]}</small>`, `data-id="${id}"`, `mode-card ${selectedMode === id ? 'selected' : ''}`)).join('')}</div><div class="home-bottom"><div class="difficulty"><label for="difficulty">황야의 혹독함</label><select id="difficulty" data-setting="difficulty">${[0,1,2,3].map(n => `<option value="${n}" ${n === selectedDifficulty ? 'selected' : ''} ${n > meta.stats.frost + 1 ? 'disabled' : ''}>${['평온한 서부','거친 황야','메마른 대지','마지막 개척자'][n]}${n ? ` · 보상 +${n*20}%` : ''}</option>`).join('')}</select></div><div class="row">${button('start', `${icon('rail', 20)} ${canContinue ? '새 여정 준비' : '첫 기적을 울리다'}`, '', 'primary')}</div></div><div class="grid-3 spaced intro-steps"><div class="intro-step"><span>1</span>화물과 계약을 준비합니다.</div><div class="intro-step"><span>2</span>객차와 호위자를 연결합니다.</div><div class="intro-step"><span>3</span>갈림길을 골라 출발합니다.</div></div></section>`;
  }
  function renderCaption() {
    if (home || !run) { $('scene-caption').innerHTML = '<span class="eyebrow">SUNSET DEPOT — EST. 1887</span><h2>노을역에서 출발합니다</h2><p>황금빛 평원과 오래된 철로, 그리고 작은 열차 한 대.</p>'; $('scene-ticket').innerHTML = 'WESTERN RAILWAY<br>PASSENGER & FREIGHT'; return; }
    const edge = run.segment && D.edges.find(e => e.id === run.segment.edgeId);
    $('scene-caption').innerHTML = `<span class="eyebrow">${edge ? esc(edge.name) : E.station(run.node).en}</span><h2>${edge ? `${stationName(edge.from)} → ${stationName(edge.to)}` : `${stationName(run.node)}에 정차 중`}</h2><p>${edge ? `${run.phase === 'event' ? '길 위의 사건 · 선택을 기다립니다' : run.paused ? '잠시 멈춘 여정 · 운행을 재개하세요' : '바퀴가 구르고, 객차가 일합니다'} · 생산 ${num(run.cycleProgress * 100)}%` : E.station(run.node).note}</p>`;
    $('scene-ticket').innerHTML = `DAY ${String(E.day(run)).padStart(2,'0')} / ${esc(modes[run.mode][0])}<br>${esc(D.captains[run.captain].name)} · Lv.${run.level}`;
  }
  function renderHUD() {
    if (home || !run) return; const m = E.metrics(run);
    const resources = [
      ['coin','운영 자금',`$${num(run.cash)}`,`생산 누적 $${num(run.stats.produced)}`,run.cash<18],
      ['coal','석탄',num(run.coal,1),`일일 소비 ${num(m.fuel,2)}`,run.coal<4],
      ['crate','적재 공간',`${m.used} / ${m.capacity}`,`계약 ${run.contracts.filter(c=>c.state==='active').length}/${m.contractLimit}`,m.used>=m.capacity],
      ['heart','승객 사기',`${num(run.morale)}%`,`다음 일일 손실 −${num(m.dailyLoss,1)}`,run.morale<30],
      ['shield','열차 내구도',`${num(run.hull)} / ${m.maxHull}`,`방어력 ${m.defense}${run.status.wound?` · 손상 −${run.status.wound}/일`:''}`,run.hull<30||run.status.wound>0],
      ['people','승객',`${m.passengers}명`,`속도 ${num(m.speed)}% · ${num(m.cycle,1)}초 주기`,false]
    ];
    $('hud').innerHTML = resources.map(([i,n,v,t,w])=>`<div class="resource ${w?'warn':''}"><span class="name">${icon(i,14)}${n}</span><span class="value">${v}</span><small>${t}</small></div>`).join('');
    const e = run.segment && D.edges.find(x=>x.id===run.segment.edgeId), pct = run.segment ? run.segment.progress*100 : 0;
    const signature=[run.phase,run.paused,run.speed,run.cars.length,m.slots,run.reputation,e?.id].join('|');
    if(signature!==controlSignature){controlSignature=signature;$('controls').innerHTML = `${button('pause',icon(run.paused?'play':'pause'), `aria-label="${run.paused?'운행 재개':'일시정지'}" ${run.phase!=='travel'?'disabled':''}`, 'ghost small')}<div class="control-caption"></div><div class="progress" role="progressbar" aria-label="주행 진행도" aria-valuenow="${Math.round(pct)}" aria-valuemin="0" aria-valuemax="100"><i style="width:${Math.min(100,pct)}%"></i></div><div class="speed-group" aria-label="배속">${[1,2,5,10].map(n=>button('speed',`${n}×`,`data-n="${n}"`,`${run.speed===n?'active':''}`)).join('')}</div>${button('save',icon('check'), 'aria-label="지금 저장"', 'ghost small')}`;}
    $('controls').querySelector('.control-caption').innerHTML=`${e?`도착까지 ${num(Math.max(0,e.seconds*(1-run.segment.progress)/(m.speed/100)))}초`:`편성 ${run.cars.length}/${m.slots}칸 · 평판 ${run.reputation}`} <span class="key">${keyLabel('pause')}</span>`;
    const progress=$('controls').querySelector('.progress');progress.setAttribute('aria-valuenow',Math.round(pct));progress.firstElementChild.style.width=`${Math.min(100,pct)}%`;
    renderCaption();
  }
  function mapHTML(state = run, result = null) {
    const path = result?.path || state?.path || [], visited = result ? [...new Set(path.flatMap(id=>{const e=D.edges.find(e=>e.id===id);return[e.from,e.to];}))] : state?.visited || ['sunset'], current = result && path.length ? D.edges.find(e=>e.id===path.at(-1)).to : state?.node || 'sunset';
    return `<svg class="map" viewBox="0 0 100 100" role="img" aria-label="서부 철도 노선도"><rect x="1" y="8" width="98" height="84" rx="8" fill="#ebe2ca"/><path d="M0 69Q23 49 45 71T100 67M0 18Q29 38 55 18T100 30" fill="none" stroke="#d5d1b5" stroke-width="5"/>${D.edges.filter(e=>e.id!=='d-s'||state?.mode!=='journey').map(e=>{const a=E.station(e.from),b=E.station(e.to);return `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${path.includes(e.id)?'#527e74':e.id===selectedEdge?'#b58444':'#bdb7a4'}" stroke-width="${path.includes(e.id)?1.2:.65}" ${path.includes(e.id)?'':'stroke-dasharray="1.5 1"'}/>`;}).join('')}${D.stations.map(s=>`<g class="node" data-action="map-node" data-id="${s.id}" tabindex="0" role="button" aria-label="${s.name}"><circle cx="${s.x}" cy="${s.y}" r="${s.id===current?3:2}" fill="${s.id===current?'#507f77':visited.includes(s.id)?'#d5b076':'#f9f2e4'}" stroke="#5c766a" stroke-width=".6"/><text x="${s.x}" y="${s.y+6.5}" text-anchor="middle">${s.name.replace(' 분기점','')}</text></g>`).join('')}</svg>`;
  }
  function renderSide() {
    const s = run, m = E.metrics(s), choices = E.routes(s);
    selectedEdge = choices.some(e=>e.id===selectedEdge)?selectedEdge:choices[0]?.id;
    const end = s.queue?.length ? D.edges.find(e=>e.id===s.queue.at(-1)).to : s.segment ? D.edges.find(e=>e.id===s.segment.edgeId).to : s.node;
    const queueChoices = D.edges.filter(e=>e.from===end&&(e.id!=='d-s'||s.mode!=='journey'));
    $('side').innerHTML = `<section class="panel panel-pad"><div class="panel-title"><div><span class="eyebrow">WESTERN RAILWAY</span><h3 style="margin-top:5px">다음 정류장</h3></div>${icon('map',21)}</div>${mapHTML()}<div class="route-list">${choices.map(e=>button('route',`<div><strong>${stationName(e.to)}</strong><small>${num(e.seconds/(m.speed/100))}초 · 석탄 약 ${num(e.seconds/(m.speed/100)/32*m.fuel,1)}${e.toll?` · $${e.toll}`:''}</small></div><span class="risk">${['','낮은 위험','주의','도적 구간'][e.risk]}</span>`,`data-id="${e.id}" ${s.phase!=='station'?'disabled':''}`,`route-option ${selectedEdge===e.id?'selected':''}`)).join('')}</div>${s.phase==='station'&&selectedEdge?button('depart',`${icon('rail')} ${stationName(D.edges.find(e=>e.id===selectedEdge).to)}행 출발`,`data-id="${selectedEdge}" style="width:100%;margin-top:12px"`,'primary'):''}${E.canFinish(s)?button('finish',`${icon('flag')} 여정 완주·정산`,'style="width:100%;margin-top:10px"','gold'):''}<details class="divider"><summary style="font-size:11px;cursor:pointer">다음 구간 예약 ${s.queue?.length?`(${s.queue.length})`:''}</summary><p class="muted" style="font-size:10px;margin:10px 0">도착 시 정지 설정을 끄면 예약한 구간을 계속 운행합니다. 사건과 완주 지점에서는 멈춥니다.</p><div class="row">${queueChoices.map(e=>button('queue',`+ ${stationName(e.to)}`,`data-id="${e.id}"`,'small')).join('')}</div>${s.queue?.length?`<p class="spaced">${s.queue.map(id=>stationName(D.edges.find(e=>e.id===id).to)).join(' → ')}</p>${button('clear-queue','예약 비우기','','small spaced')}`:''}</details><div class="divider"><div class="between"><h4>객차 시너지</h4><small class="muted">2 / 3칸</small></div><div class="synergies spaced">${Object.entries(D.tags).map(([id,t])=>`<details class="${m.counts[id]>=2?'lit':''}"><summary><span>${icon(t.icon,13)} ${t.name}</span><b>${m.counts[id]}</b></summary><p>${t.effects.map(esc).join('<br>')}</p></details>`).join('')}</div></div><div class="divider"><span class="eyebrow">이번 여정의 목표</span><p class="spaced">${modes[s.mode][1]}</p>${s.mode==='career'?`<p>완료 계약 ${s.stats.delivered}/4 · 현금 $${num(s.cash)}/500</p>`:''}${s.mode==='loop'?`<p>순환 완료 ${s.laps}/1</p>`:''}<p class="muted spaced">${s.level>=8?'최고 운행 레벨':`Lv.${s.level} · 경험치 ${s.exp}/${s.level*4}`}<br>일일 정산까지 ${num(32-s.time%32)}초 · 반발 ${s.status.backlash}</p></div></section>`;
  }
  function renderArtifacts() { $('artifacts').innerHTML = run.artifacts.length ? run.artifacts.map(a=>button('artifact',`${icon(D.artifacts[a.id].icon,16)}<small>${D.artifacts[a.id].name}</small>`,`data-id="${a.id}"`)).join('') : '<small class="muted" style="color:#9db1a3">유물은 다음 정류장의 보급과 동행 계약에서 얻습니다.</small>'; }
  function renderGame() { renderHUD(); renderSide(); renderArtifacts(); renderTabs(); }
  function renderTabs() {
    const tabs = [['station','정류장'],['market','화물·계약'],['train','객차 편성'],['decisions','결단'],['log','운행 기록']];
    $('tabs').innerHTML = tabs.map(([id,n])=>button('tab',n,`data-id="${id}" aria-current="${tab===id?'page':'false'}"`,tab===id?'active':'')).join('');
    $('tab-body').innerHTML = ({station:stationPanel,market:marketPanel,train:trainPanel,decisions:decisionsPanel,log:logPanel}[tab])();
  }
  function riskPanel() {
    if (run.captain === 'silas') return `<div class="banner warning"><div class="between"><strong>보안관의 긴장</strong><b>${num(run.tension)}/100</b></div><div class="progress spaced"><i style="width:${Math.min(100,run.tension)}%;background:var(--red)"></i></div><p class="spaced">매일 +${E.metrics(run).tension}. 100이 되면 승객 −1, 사기 −10, 내구도 −8. 휴식·호위·자치 협정으로 낮춥니다.</p></div>`;
    if (run.captain !== 'clara') return '';
    return `<div class="banner"><strong>상단의 경제·신뢰·치안</strong><div class="grid-3 spaced">${[['economy','경제','0: 생산 수입 −40%'],['trust','신뢰','0: 결단 시작 불가'],['order','치안','0: 출발 불가']].map(([id,n,t])=>`<div><div class="between"><small>${n}</small><b>${num(run.stability[id])}</b></div><div class="progress" style="margin:7px 0"><i style="width:${run.stability[id]}%"></i></div><small>${t}</small>${button('governance',`${n} +25`, `data-id="${id}" ${run.phase!=='station'?'disabled':''} style="width:100%;margin-top:8px"`,'small')}</div>`).join('')}</div><p class="spaced">통치 비용 $${run.stability.economy<=0?20:12}. 현금이 부족하면 사기 12로 회복합니다. 매입·판매는 경제 +2, 납품은 신뢰 +12.</p>${button('governance','유물 상인 · $32','data-id="artifacts" '+(run.phase!=='station'?'disabled':''),'small spaced')}</div>`;
  }
  function stationPanel() {
    const stopped = run.phase==='station', m=E.metrics(run), place=D.landmarks[E.station(run.node).landmark];
    return `<div class="section-heading"><div class="between"><div><span class="eyebrow">${stopped?'AT THE STATION':'ON THE ROAD'}</span><h2 style="margin-top:6px">${stopped?stationName(run.node):'길 위에서 일하는 열차'}</h2></div>${run.offer?button('offer',`${icon('crate')} 도착 보급 받기`,'','gold'):''}</div><p>${stopped?'화물과 계약을 준비하고, 다음 노선을 골라 출발하세요. 정차 중에는 기한과 석탄이 흐르지 않습니다.':'생산은 자동으로 진행됩니다. 결단을 준비하거나 객차의 성과를 살펴보세요. 거래와 편성은 다음 역에서 합니다.'}</p></div>${riskPanel()}${run.time===0?'<div class="banner"><strong>첫 납품을 해보세요.</strong> 화물·계약에서 보리평원 곡물 계약을 받고 곡물을 총 4개 준비하세요. 식당이 곡물을 사용하므로 여유분을 싣는 것도 좋습니다.</div>':''}<div class="grid-3">${[['coal','coal','석탄 보급','석탄 +8','$12'],['repair','gear','열차 정비','내구도 +35 · 손상 해제','$18'],['rest','coffee','식사와 휴식','사기 +20 · 긴장 −20','$15']].map(([id,i,n,t,p])=>`<div class="card"><div class="goods-icon">${icon(i,25)}</div><h3>${n}</h3><p>${t}</p>${button('service',`${p} · 이용하기`,`data-id="${id}" ${stopped?'':'disabled'} style="width:100%;margin-top:12px"`,'small')}</div>`).join('')}</div><div class="between spaced"><small class="muted">자원이 바닥났다면 개척자 지원을 받을 수 있습니다. 여정당 2회.</small>${button('service','긴급 지원','data-id="rescue" '+(stopped?'':'disabled'),'small')}</div><div class="divider"><div class="section-heading"><h3>${place.name}</h3><p>${place.story} 도착마다 한 번 방문합니다.</p></div><div class="grid-3">${[['supplies','coal','급수탑과 창고',`석탄 +${place.coal} · 경험치 +1`],['people','people','역 앞의 작은 식탁',`사기 +12 · 승객 +${place.people} · 평판 +1`],['research','book','오래된 철도 기록',`경험치 +${place.xp} · 긴장 −10 · 상단 회복`]].map(([id,i,n,t])=>button('landmark',`${icon(i,24)}<strong>${n}</strong><small>${t}</small>`,`data-id="${id}" ${stopped&&run.landmarkAvailable?'':'disabled'}`,'offer-card')).join('')}</div></div><div class="divider"><div class="section-heading"><h3>서부의 동행자</h3><p>보안관칸이 있어야 호위자를 태울 수 있습니다. 최대 2명, 새벽항까지 동행합니다.</p></div><div class="grid-2">${[['cowboy','메이 · 카우보이',12,22,'#b98767'],['hunter','루크 · 현상금 사냥꾼',18,32,'#748d8e']].map(([id,n,d,c,color])=>`<div class="card crew-card"><div class="crew-figure">${A.figure('cowboy',color)}</div><div><h3>${n}</h3><p>방어력 +${d}</p>${button('hire',`$${Math.ceil(c*m.hire)} · 고용`,`data-id="${id}" ${stopped?'':'disabled'}`,'small spaced')}</div></div>`).join('')}</div><div class="row spaced">${run.guards.map(g=>pill(`${esc(g.name)} · 방어 +${g.defense}`,true)).join('')}${run.guests.map(g=>pill(`${esc(g.name)} · ${stationName(g.to)}까지 동행`)).join('')}${!run.guards.length&&!run.guests.length?'<small class="muted">아직 동행하는 인물이 없습니다. 동행 계약에서도 인연을 만날 수 있습니다.</small>':''}</div></div>`;
  }
  function contractCard(c, offer=false) {
    const s=run, active=c.state==='active', good=c.type==='delivery'?`${D.goods[c.good].name} ${c.count}개 (보유 ${s.cargo[c.good]})`:c.type==='escort'?'여행자 1명 · 적재 공간 1칸':'도적을 호위 선택으로 물리치기';
    const enough=c.type==='delivery'?s.cargo[c.good]>=c.count:c.type==='bounty'?s.stats.defended>=c.goal:true;
    return `<div class="card contract"><div><h3>${esc(c.name)}</h3><p>${good}<br>${stationName(c.to)} · ${c.due}일차까지 (${Math.max(0,c.due-E.day(s))}일 남음)<br>보상 $${Math.round(c.reward*E.metrics(s).contract)} · 평판 +2 · 경험치 +2</p></div><div>${offer?button('accept','계약 수락',`data-id="${c.id}" ${s.phase==='station'?'':'disabled'}`,'small'):active?button('deliver',c.to===s.node?'납품·완료':'운송 중',`data-id="${c.id}" ${s.phase==='station'&&c.to===s.node&&enough?'':'disabled'}`,'primary small'):pill(c.state==='delivered'?'완료':'기한 초과',c.state==='delivered')}</div></div>`;
  }
  function marketPanel() {
    const s=run, stopped=s.phase==='station';
    return `<div class="section-heading"><span class="eyebrow">FREIGHT & CONTRACTS</span><h2 style="margin-top:6px">싣고, 달리고, 내립니다</h2><p>가격과 재고는 정류장마다 다릅니다. 거래량과 재방문에 따라 시세가 변합니다. 식당은 곡물을 사용하고, 냉장칸은 약품 변질을 막습니다.</p></div>${!stopped?'<div class="banner">주행 중에는 화물을 안전하게 고정합니다. 다음 정류장에서 거래할 수 있습니다.</div>':''}<div class="grid-3">${Object.entries(D.goods).map(([id,g])=>`<div class="card"><div class="between"><div class="goods-icon" style="background:${g.color}33">${icon(g.icon,25)}</div><span class="pill">시장 ${s.market.stock[id]}개</span></div><h3>${g.name}</h3><p>${g.description}</p><div class="number">${s.cargo[id]} <small>개 적재</small></div><div class="prices"><span>매입 $${E.quote(s,id)}</span><span>매각 $${E.quote(s,id,'sell')}</span></div><div class="goods-actions">${[1,3].map(n=>button('buy',`매입 ${n}개`,`data-id="${id}" data-n="${n}" ${stopped&&s.cash>=E.quote(s,id)*n&&s.market.stock[id]>=n&&E.metrics(s).used+n<=E.metrics(s).capacity?'':'disabled'}`)).join('')}${[1,3].map(n=>button('sell',`매각 ${n}개`,`data-id="${id}" data-n="${n}" ${stopped&&s.cargo[id]>=n?'':'disabled'}`)).join('')}</div></div>`).join('')}</div><div class="divider"><div class="section-heading"><h3>진행 중인 계약</h3><p>계약을 받아도 화물을 따로 보관해 주지는 않습니다. 판매·식사·사건에서 쓰인 수량에 주의하세요.</p></div><div class="stack">${s.contracts.length?s.contracts.map(c=>contractCard(c)).join(''):'<div class="empty">아래 게시판에서 첫 계약을 받아 보세요.</div>'}</div></div><div class="divider"><div class="section-heading"><h3>역 게시판</h3><p>현재 정류장에서 받을 수 있는 계약입니다. 갈림길의 목적지와 함께 비교하세요.</p></div><div class="stack">${stopped?s.contractOffers.map(c=>contractCard(c,true)).join(''):'<div class="empty">다음 역에서 새로운 의뢰를 만납니다.</div>'}</div></div>`;
  }
  function carCard(c, reserve=false) {
    const d=D.cars[c.type], stopped=run.phase==='station', record=run.contribution[c.uid];
    const mate=run.reserve.some(x=>x.uid!==c.uid&&x.type===c.type&&x.level===c.level);
    return `<div class="card car-card" data-car="${c.uid}" draggable="${stopped&&!reserve}"><div class="art">${A.wagon(c.type,c.level)}</div><div class="between"><h3>${d.name}</h3>${pill(`${c.level}층`)}</div><div class="row">${d.tags.map(t=>pill(D.tags[t].name)).join('')}</div><div class="car-stats"><span>탑승 ${d.seats}</span><span>적재 ${d.capacity?d.capacity+(c.level-1)*2:0}</span><span>수입 $${d.cash*c.level}</span><span>사기 ${d.morale*c.level}</span></div><p class="car-detail">${d.description}</p>${c.type==='guard'?`<p class="spaced">누적 훈련 +${num(c.training,1)} / ${12*c.level}</p>`:''}${c.type==='workshop'?`<p class="spaced">생산 준비 ${c.charge}/3주기 · 부품 누적 ${record?.parts||0}</p>`:''}${record?`<small class="muted">기여: $${record.cash} · 사기 ${num(record.morale,1)} · 가동 ${record.cycles}회</small>`:''}<div class="actions">${button(reserve?'deploy':'store',reserve?'열차에 연결':'보관하기',`data-id="${c.uid}" ${stopped?'':'disabled'}`)}${button('upgrade',`강화 $${24*c.level} + 석탄 2`,`data-id="${c.uid}" ${stopped&&c.level<3?'':'disabled'}`)}${button('merge','합치기',`data-id="${c.uid}" ${stopped&&mate&&c.level<3?'':'disabled'}`)}${reserve?button('recycle',`재활용 +석탄 ${c.level*2}`,`data-id="${c.uid}" ${stopped?'':'disabled'}`):`${button('reorder','←',`data-id="${c.uid}" data-n="-1" aria-label="${d.name} 왼쪽으로" ${stopped?'':'disabled'}`)}${button('reorder','→',`data-id="${c.uid}" data-n="1" aria-label="${d.name} 오른쪽으로" ${stopped?'':'disabled'}`)}`}</div></div>`;
  }
  function trainPanel() {
    const m=E.metrics(run);
    return `<div class="section-heading"><div class="between"><div><span class="eyebrow">YOUR TRAIN, YOUR BUILD</span><h2 style="margin-top:6px">열차 편성 ${run.cars.length}/${m.slots}</h2></div>${run.offer?button('offer','도착 보급','','gold'):''}</div><p>정류장에서 끌어 놓거나 화살표로 순서를 바꿉니다. 매 주기 첫 탑승 객차가 돌아가며 바뀌고, 승객이 탄 객차만 생산합니다. 같은 종류·같은 층의 보관 객차를 합칠 수 있습니다.</p></div><div class="grid-3">${run.cars.map(c=>carCard(c)).join('')}</div><div class="divider"><div class="section-heading"><h3>객차 보관함 ${run.reserve.length}/12</h3><p>훈련과 공방의 준비 시간은 보관·재배치·합성 뒤에도 이어집니다.</p></div>${run.reserve.length?`<div class="grid-3">${run.reserve.map(c=>carCard(c,true)).join('')}</div>`:'<div class="empty">보급으로 받은 객차를 여기에서 연결할 수 있습니다.</div>'}</div>`;
  }
  function decisionsPanel() {
    const s=run, current=s.decision&&D.decisions.find(d=>d.id===s.decision.id);
    return `<div class="section-heading"><span class="eyebrow">DECISIONS SHAPE THE JOURNEY</span><h2 style="margin-top:6px">기관사의 결단</h2><p>하나씩 준비하며 주행 시간에 따라 완성됩니다. 완료한 효과는 이번 여정 끝까지 이어지고, 일부 개조는 서로 양립할 수 없습니다.</p></div>${current?`<div class="banner"><div class="between"><strong>${current.name} 준비 중 · ${num(s.decision.elapsed)}/${current.duration}초</strong>${button('cancel-decision','취소 · 비용 50% 반환','','small')}</div><div class="progress spaced"><i style="width:${s.decision.elapsed/current.duration*100}%"></i></div></div>`:''}<div class="decision-tree">${[['gear','운행과 기관'],['trade','시장과 화물'],['people','열차 공동체'],['security','질서와 호위']].map(([branch,n])=>`<div><div class="branch-label">${n}</div>${D.decisions.filter(d=>d.branch===branch).map(d=>{const done=s.decisions.includes(d.id), pre=!d.prerequisite||s.decisions.includes(d.prerequisite), excluded=d.excludes&&s.decisions.includes(d.excludes);return button('decision',`${icon(done?'check':d.icon,21)}<b>${d.name}</b><small>${d.description}</small><span class="cost">${done?'완료':excluded?'다른 개조 선택됨':!pre?`선행: ${D.decisions.find(x=>x.id===d.prerequisite).name}`:`$${d.cost} · ${d.duration}초 주행`}</span>`,`data-id="${d.id}" ${!done&&pre&&!excluded&&!s.decision&&s.cash>=d.cost?'':'disabled'}`,`decision-node ${done?'done':''} ${!pre||excluded?'locked':''}`);}).join('')}</div>`).join('')}</div>`;
  }
  function logPanel() {
    return `<div class="section-heading"><div class="between"><div><span class="eyebrow">A JOURNAL ON RAILS</span><h2 style="margin-top:6px">이번 여정의 기록</h2></div>${button('end','운행 종료·정산','','small danger')}</div><p>생산 ${run.stats.cycles}주기 · 수입 $${num(run.stats.gross)} · 지출 $${num(run.stats.spent)} · 납품 ${run.stats.delivered}건 · 호위 승리 ${run.stats.defended}회</p></div><div class="grid-3"><div class="card"><h4>이번 편성의 생산</h4><div class="number">$${num(run.stats.produced)}</div><p>객차에서 만든 현금</p></div><div class="card"><h4>공동체의 회복</h4><div class="number">${num(run.stats.moraleProduced)}</div><p>생산에서 얻은 사기 누적</p></div><div class="card"><h4>준비와 탐험</h4><div class="number">${run.stats.landmarks}</div><p>방문한 랜드마크 · 부품 ${run.stats.goodsMade}개 제작</p></div></div><div class="spaced">${run.log.map(l=>`<div class="log-item ${l.kind}"><time>${l.day}일차 · ${num(l.time)}초</time><span>${esc(l.text)}</span></div>`).join('')}</div>`;
  }
  function settingsPanel() {
    const settings=meta.settings;
    return `<div class="stack">${[['sound','열차와 선택의 소리','증기 리듬·기적·선택 소리'],['particles','증기와 작은 효과','기관차의 증기 입자'],['reducedMotion','움직임 줄이기','배경과 장식 움직임을 줄입니다.'],['autoDecision','결단 완료 시 일시정지','새 효과를 읽고 다음 준비를 고를 수 있습니다.'],['autoArrival','정류장 도착 시 일시정지','끄면 예약 노선을 자동 출발합니다. 예약이 없으면 멈춥니다.'],['offline','창을 닫은 동안 운행','최대 15분. 사건·완주 지점·예약이 없는 정류장에서 멈춥니다.']].map(([id,n,t])=>`<label class="setting-row"><span>${n}<small>${t}</small></span><input type="checkbox" data-setting="${id}" ${settings[id]?'checked':''}></label>`).join('')}<label class="setting-row"><span>음량</span><input type="range" min="0" max="100" data-setting="volume" value="${settings.volume}" aria-label="음량"></label><div class="divider"><h3>단축키</h3>${[['pause','일시정지'],['map','노선 보기'],['train','객차 편성'],['market','화물·계약'],['decisions','결단']].map(([id,n])=>`<label class="setting-row"><span>${n}</span><select data-key="${id}">${['Space','KeyM','KeyC','KeyT','KeyD','KeyP','KeyR','KeyB','KeyG'].map(k=>`<option value="${k}" ${settings.keys[id]===k?'selected':''}>${k==='Space'?'Space':k.replace('Key','')}</option>`).join('')}</select></label>`).join('')}</div><div class="divider"><h3>여정 보관</h3><p class="muted spaced">자동 저장됩니다. 다른 브라우저로 옮기려면 파일로 내보내세요.</p><div class="row spaced">${button('save','지금 저장','','primary')}${button('export','저장 파일 내보내기')}${button('import','저장 파일 가져오기')}</div><p class="muted spaced">새 파일을 가져오면 현재 여정과 해금이 교체됩니다. 가져오기 전에 현재 상태를 내보낼 수 있습니다.</p></div></div>`;
  }
  function metaPanel() {
    const tabs=[['shop','유물과 기관사'],['collection','유물 도감'],['heritage','개척자 유산'],['history','지난 여정']];
    let body='';
    if(metaTab==='shop') body=`<div class="banner"><strong>보라색 동전 ${num(meta.coins)}개</strong><p>완주·생존·납품·탐험으로 얻습니다. 해금과 후보 잠금은 다음 여정부터 적용됩니다. 유물은 해금 뒤 정류장 보급에 등장합니다.</p></div><div class="grid-3">${Object.entries(D.captains).map(([id,c])=>`<div class="card crew-card"><div class="crew-figure">${A.figure(c.icon,c.color)}</div><div><h3>${c.name}</h3><p>${c.description}</p>${button('unlock',meta.captains.includes(id)?'해금 완료':`동전 ${c.unlock}개`,`data-kind="captain" data-id="${id}" ${meta.captains.includes(id)?'disabled':''}`,'small spaced')}</div></div>`).join('')}</div>${[0,1,2,3].map(page=>`<div class="divider"><div class="section-heading"><h3>${page?'유물 기록 '+page:'첫 여정의 유물'}</h3>${page?`<p>이 페이지의 유물을 모두 해금하면 다음 여정의 초기 자금 +15. ${Object.entries(D.artifacts).filter(([,a])=>a.page===page).every(([id])=>meta.unlocked.includes(id))?'특전 활성화 가능':'아직 완성되지 않았습니다.'}</p>`:''}</div><div class="grid-3">${Object.entries(D.artifacts).filter(([,a])=>a.page===page).map(([id,a])=>`<div class="card collection-card"><div class="emblem">${icon(a.icon,22)}</div><div class="content"><h3>${a.name}</h3><p>${a.description}</p><div class="row">${meta.unlocked.includes(id)?button('lock-artifact',meta.locked.includes(id)?'후보에 포함':`후보에서 제외 · ${5+meta.locked.length*3}개`,`data-id="${id}"`,'small'):button('unlock',`해금 · 동전 ${a.price}개`,`data-kind="artifact" data-id="${id}"`,'small')}</div></div></div>`).join('')}</div></div>`).join('')}<label class="setting-row"><span>페이지 완성 특전 사용<small>현재 ${E.perks(meta)}페이지 적용 · 다음 여정부터</small></span><input type="checkbox" data-meta-setting="perksEnabled" ${meta.perksEnabled?'checked':''}></label>`;
    if(metaTab==='collection') body=`<div class="section-heading"><h3>열차에서 함께 보낸 시간</h3><p>유물을 얻는 것만으로는 경험치가 늘지 않습니다. 실제 생산 주기를 함께 보낼 때 기록됩니다. 도감 레벨은 수집 기록입니다.</p></div><div class="grid-3">${Object.entries(D.artifacts).map(([id,a])=>{const xp=meta.collection[id]||0,lv=Math.floor(Math.sqrt(xp/12))+1;return `<div class="card collection-card"><div class="emblem">${icon(a.icon,22)}</div><div><h3>${a.name}</h3><p>${a.description}</p><div class="row spaced">${pill(`도감 Lv.${lv}`)}${pill(`사용 ${xp}주기`)}${pill(meta.unlocked.includes(id)?'해금됨':'미해금',meta.unlocked.includes(id))}</div></div></div>`;}).join('')}</div>`;
    if(metaTab==='heritage') body=meta.heritage.available?`<div class="banner"><strong>세 가지 장점, 하나의 흔적</strong><p>클라라가 완주하며 남긴 유산입니다. 다음 여정의 모든 기관사에게 이어집니다. 두 효과까지 고정하고 나머지를 다시 고를 수 있습니다.</p></div><div class="grid-2">${meta.heritage.traits.map(id=>{const t=[...D.heritage.positives,...D.heritage.negatives].find(x=>x.id===id);return `<div class="card"><h3>${t.name}</h3><p>${t.description}</p>${button('lock-heritage',meta.heritage.locks.includes(id)?'고정 해제':'이 효과 고정',`data-id="${id}"`,'small spaced')}</div>`;}).join('')}</div><div class="row spaced">${button('roll-heritage',`유산 재설정 · 동전 ${30+meta.heritage.locks.length*10}개`,'','primary')}</div><label class="setting-row"><span>유산 효과 사용</span><input type="checkbox" data-heritage-setting="enabled" ${meta.heritage.enabled?'checked':''}></label>`:'<div class="empty">클라라의 여정을 완주하면 개척자 유산이 열립니다.</div>';
    if(metaTab==='history') body=`<div class="banner">운행 ${meta.stats.runs}회 · 완주 ${meta.stats.victories}회 · 납품 ${meta.stats.delivered}건 · 최고 혹독함 ${meta.stats.frost}</div>${meta.history.length?meta.history.map((r,i)=>button('history',`<div><strong>${D.captains[r.captain]?.name||'기관사'} · ${modes[r.mode]?.[0]||'여정'}</strong><small style="display:block;margin-top:5px">${new Date(r.date).toLocaleDateString('ko-KR')} · ${r.day}일차 · 계약 ${r.stats.delivered}건</small></div><span>${r.victory?'완주':'운행 종료'} · +${r.coins}개</span>`,`data-n="${i}"`,'history-row')).join(''):'<div class="empty">첫 여정이 끝나면 노선과 객차의 기여가 여기에 남습니다.</div>'}`;
    return `<nav class="tabs" style="border-radius:7px;margin-bottom:20px">${tabs.map(([id,n])=>button('meta-tab',n,`data-id="${id}"`,metaTab===id?'active':'')).join('')}</nav>${body}`;
  }
  function resultPanel(r) {
    const contributions=Object.entries(r.contributions).sort((a,b)=>(b[1].cash+b[1].morale)-(a[1].cash+a[1].morale));
    return `<div class="result-heading"><span class="eyebrow">${r.victory?'A JOURNEY COMPLETED':'THE NEXT JOURNEY AWAITS'}</span><h2>${r.victory?'먼지 너머, 목적지에 닿았습니다':'오늘의 운행을 마칩니다'}</h2><p>${esc(r.reason)}</p><div class="number spaced">+${r.coins} <small style="font-size:14px">보라색 동전</small></div>${r.hiddenStory?`<p class="spaced">${esc(r.hiddenStory)}</p>`:''}</div><div class="grid-2"><div class="card">${mapHTML(null,r)}</div><div class="card"><h3>여정 정산</h3>${[['arrival','완주·운행'],['survival','생존 일수'],['contracts','완료 계약'],['exploration','랜드마크'],['train','열차 확장']].map(([id,n])=>`<div class="between" style="padding:8px 0;font-size:12px"><span>${n}</span><b>${r.rewards[id]}</b></div>`).join('')}<p class="divider">혹독함 ${r.difficulty} · 보상 배율 ×${num(1+r.difficulty*.2,1)}</p></div></div><div class="result-stats">${[['운행 일수',r.day],['현금',`$${r.cash}`],['납품',r.stats.delivered],['호위 승리',r.stats.defended]].map(([n,v])=>`<div class="card"><small>${n}</small><b>${v}</b></div>`).join('')}</div><div class="divider"><h3>객차의 기여</h3>${contributions.length?contributions.map(([,c])=>`<div class="log-item"><span>${D.cars[c.type].name}</span><span>현금 $${c.cash} · 사기 ${num(c.morale,1)} · 부품 ${c.parts} · 가동 ${c.cycles}회</span></div>`).join(''):'<p class="spaced muted">아직 생산 주기를 운행하지 않았습니다.</p>'}</div>`;
  }
  function openModal(type, data=null) { modal={type,data}; renderModal(); }
  function renderModal() {
    const root=$('dialog-root'); if(!modal){root.replaceChildren();return;}
    let title='', body='', footer='', closable=true, wide=false;
    const {type,data}=modal;
    if(type==='settings'){title='운행 설정';body=settingsPanel();}
    if(type==='meta'){title='철도 기록실';body=metaPanel();wide=true;}
    if(type==='help'){title='더스트라인 운행 안내';body=`<div class="help"><div class="banner"><strong>목적지는 하나, 만드는 열차는 당신의 선택입니다.</strong></div><ol><li><b>정류장에서 준비합니다.</b> 화물·계약에서 매입·판매와 계약을 고릅니다. 상품은 공간을 차지하고 동행 승객도 1칸을 사용합니다.</li><li><b>객차를 편성합니다.</b> 식당은 사기, 우편·살롱은 돈, 보안관칸과 카우보이는 안전을 만듭니다. 같은 태그 2·3칸으로 시너지가 켜집니다.</li><li><b>왼쪽 노선을 골라 출발합니다.</b> 주행할 때만 생산·기한·석탄 소비·결단 준비가 진행됩니다. 32초가 게임 속 하루입니다.</li><li><b>사건에서 선택합니다.</b> 결과와 비용을 미리 읽을 수 있습니다. 선택 창이 열리면 시간이 멈춥니다.</li><li><b>도착해 납품합니다.</b> 계약은 목적지에서 직접 완료하세요. 도착 보급과 랜드마크를 챙기고 다음 구간을 준비합니다.</li><li><b>목표를 달성하면 정산합니다.</b> 횡단은 새벽항, 순환은 노을역 복귀, 상단은 계약 4건과 $500입니다. 받은 동전으로 다음 여정의 기관사·유물을 해금합니다.</li></ol><p>사기 또는 내구도가 0이 되면 운행이 끝납니다. 석탄이 0이면 감속하고 매일 내구도를 잃습니다. 정류장의 정비·휴식·긴급 지원으로 복구할 수 있습니다.</p><p>${keyLabel('pause')} 일시정지 · ${keyLabel('map')} 노선 · ${keyLabel('train')} 객차 · ${keyLabel('market')} 화물·계약 · ${keyLabel('decisions')} 결단. 설정에서 배속·소리·도착 정지·키를 조절하고 저장 파일을 옮길 수 있습니다.</p></div>`;}
    if(type==='event'){const e=E.eventInfo(run);if(!e){modal=null;renderModal();return;}title=e.title;closable=false;body=`<span class="eyebrow">${e.category}</span><div class="event-layout"><div class="figure">${A.figure(e.icon==='cowboy'?'cowboy':e.icon==='gear'?'engineer':'merchant','#9a7b63')}</div><p>${e.description}</p></div>${e.choices.map(c=>button('event',`<span><strong>${c.label}</strong><small>${c.detail}</small></span>${icon('arrow')}`,`data-id="${c.id}" ${c.enabled?'':'disabled'}`,'event-choice')).join('')}`;}
    if(type==='offer'){title='역장이 준비한 보급';const o=run.offer;if(!o){modal=null;renderModal();return;}body=`<p class="muted">하나를 골라 여정에 추가합니다. 객차는 보관함으로, 유물은 열차에 바로 적용됩니다.</p><div class="grid-3 spaced">${o.choices.map((c,i)=>{const d=c.kind==='car'?D.cars[c.type]:c.kind==='artifact'?D.artifacts[c.id]:null;return button('select-offer',`${c.kind==='car'?`<div class="wagon">${A.wagon(c.type,c.level)}</div>`:icon(d?.icon||'coal',34)}<strong>${d?.name||'석탄 보급'}${c.kind==='car'?` · ${c.level}층`:''}</strong><small>${d?.description||`석탄 ${c.amount}를 얻습니다.`}</small>`,`data-n="${i}"`,'offer-card');}).join('')}</div>`;footer=button('reroll',`다시 고르기 · 석탄 ${2+o.rerolls}`)+button('skip-offer','대신 석탄 2 받기');}
    if(type==='artifact'){const a=D.artifacts[data], held=run?.artifacts.find(x=>x.id===data);title=a.name;body=`<div class="flex"><div class="goods-icon">${icon(a.icon,29)}</div><p>${a.description}</p></div>${held?`<p class="spaced">함께 달린 시간 ${num(held.age)}초 · 이번 여정 사용 ${run.artifactUsage[data]||0}주기</p>${data==='rusty'?`<div class="progress spaced"><i style="width:${Math.min(100,held.age/140*100)}%"></i></div><p class="spaced">${held.age>=140?'정밀 조속기로 변했습니다. 속도 +10%.':`변화까지 ${num(140-held.age)}초. 지금은 속도 −8%.`}</p>`:''}`:''}`;}
    if(type==='result'||type==='history'){title='여정 기록';wide=true;body=resultPanel(data||run.result);footer=type==='result'?button('result-home','다음 여정 준비','','primary'):button('meta-back','기록실로');closable=type!=='result';}
    if(type==='new-confirm'){title='새 여정을 시작할까요?';body='<p>진행 중인 열차의 운행이 종료되고, 현재까지의 보상으로 정산됩니다. 해금과 기록은 이어집니다.</p>';footer=button('close-modal','계속 운행')+button('new-confirmed','정산하고 새 여정','','primary');}
    if(type==='end-confirm'){title='오늘의 운행을 마칠까요?';body='<p>지금까지의 생존·계약·탐험을 정산합니다. 다음 여정에서는 새로운 열차로 출발합니다.</p>';footer=button('close-modal','돌아가기')+button('end-confirmed','운행 종료·정산','','danger');}
    if(type==='import-confirm'){title='보관한 여정을 가져올까요?';body=`<p>가져올 기록: 운행 ${data.meta.stats.runs}회 · 동전 ${data.meta.coins}개${data.run?` · ${stationName(data.run.node)}의 열차`:''}. 현재 상태를 교체합니다.</p>`;footer=button('export','현재 저장 내보내기')+button('import-confirmed','이 기록 가져오기','','primary');}
    root.innerHTML=`<div class="modal-shade"><section class="modal ${wide?'wide':''}" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div class="modal-header"><h2 id="modal-title">${title}</h2>${closable?button('close-modal',icon('close',22),'aria-label="창 닫기"'):''}</div>${body}${footer?`<div class="modal-footer">${footer}</div>`:''}</section></div>`;
    root.querySelector('button:not(:disabled),input,select')?.focus({preventScroll:true});
  }
  function refresh() { if(home)renderHome();else renderGame(); const coin=document.querySelector('.meta-coins');if(coin)coin.innerHTML=`${icon('coin')} ${num(meta.coins)}`; }
  function after(result, quiet=false) {
    if(result){if(!quiet||!result.ok)toast(result.message,!result.ok);if(result.ok)sound.click();}
    if(run&&!run.result&&(run.hull<=0||run.morale<=0))E.finish(run,meta,false,run.hull<=0?'열차가 더 달릴 수 없게 되었습니다.':'승객들이 여정을 떠났습니다.');
    dirty=true;refresh();save();
    if(run?.result&&!home)openModal('result',run.result);
  }
  function start() {
    run=E.newRun(meta,selectedCaptain,selectedMode,selectedDifficulty);home=false;tab='station';selectedEdge=null;modal=null;seenLog=null;build();renderModal();dirty=true;save();sound.horn();
    toast('화물을 준비하고 다음 정류장을 골라 출발하세요. 도움말에서 운행 흐름을 볼 수 있습니다.');
  }
  function exportSave() {
    const blob=new Blob([JSON.stringify(payload(),null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`dustline-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);toast('여정을 저장 파일로 내보냈습니다.');
  }
  function closeModal() { if(modal?.type==='event'||modal?.type==='result')return;modal=null;renderModal();document.querySelector(`[data-action="${home?'start':'pause'}"]`)?.focus({preventScroll:true}); }
  function action(target) {
    const a=target.dataset.action,id=target.dataset.id,n=Number(target.dataset.n||0);sound.wake();
    if(a==='captain'){if(meta.captains.includes(id)){selectedCaptain=id;renderHome();}else{metaTab='shop';openModal('meta');}return;}
    if(a==='mode'){selectedMode=id;renderHome();return;}
    if(a==='start'){if(run&&!run.result)openModal('new-confirm');else start();return;}
    if(a==='new-confirmed'){if(run&&!run.result)E.endRun(run,meta);start();return;}
    if(a==='continue'){home=false;selectedEdge=null;build();if(run.phase==='event')openModal('event');if(offlineReport){toast(offlineReport);offlineReport='';}return;}
    if(a==='home'||a==='result-home'){if(run)run.paused=true;home=true;modal=null;build();renderModal();save();return;}
    if(a==='meta'){openModal('meta');return;}
    if(a==='settings'||a==='help'){openModal(a);return;}
    if(a==='sound'){meta.settings.sound=!meta.settings.sound;sound.wake();sound.click();dirty=true;build();save();return;}
    if(a==='save'){save(true);return;}
    if(a==='export'){exportSave();return;}
    if(a==='import'){$('save-import').click();return;}
    if(a==='import-confirmed'){meta=E.clone(modal.data.meta);run=E.clone(modal.data.run||null);meta.settings=Object.assign(E.defaultMeta().settings,meta.settings);meta.settings.keys=Object.assign(E.defaultMeta().settings.keys,meta.settings.keys);if(run){run.paused=true;run.queue||=[];run.artifactPool||=meta.unlocked.filter(x=>!meta.locked.includes(x));}modal=null;home=true;selectedCaptain='ada';build();renderModal();save();toast('보관한 여정을 가져왔습니다.');return;}
    if(a==='close-modal'){closeModal();return;}
    if(a==='meta-tab'){metaTab=id;renderModal();return;}
    if(a==='history'){openModal('history',meta.history[n]);return;}
    if(a==='meta-back'){openModal('meta');return;}
    if(a==='unlock'){const r=E.unlock(meta,target.dataset.kind,id);toast(r.message,!r.ok);save();renderModal();refresh();return;}
    if(a==='lock-artifact'||a==='lock-heritage'||a==='roll-heritage'){const r=a==='lock-artifact'?E.lockArtifact(meta,id):a==='lock-heritage'?E.lockHeritage(meta,id):E.rollHeritage(meta);toast(r.message,!r.ok);save();renderModal();refresh();return;}
    if(!run||run.result)return;
    if(a==='tab'){tab=id;renderTabs();return;}
    if(a==='route'){selectedEdge=id;renderSide();return;}
    if(a==='map-node'){const e=E.routes(run).find(e=>e.to===id);if(e){selectedEdge=e.id;renderSide();}else toast(`${stationName(id)} · ${E.station(id).note}`);return;}
    if(a==='pause'){if(run.phase==='travel'){run.paused=!run.paused;dirty=true;renderHUD();}return;}
    if(a==='speed'){run.speed=n;dirty=true;renderHUD();return;}
    if(a==='artifact'){openModal('artifact',id);return;}
    if(a==='offer'){openModal('offer');return;}
    if(a==='end'){openModal('end-confirm');return;}
    if(a==='end-confirmed'){modal=null;after(E.endRun(run,meta));return;}
    if(a==='finish'){modal=null;after(E.endRun(run,meta));return;}
    if(a==='event'){modal=null;const r=E.resolveEvent(run,id);renderModal();after(r);return;}
    if(a==='depart'){if(run.queue?.[0]===id)run.queue.shift();else run.queue=[];const r=E.depart(run,id);after(r);if(r.ok)sound.horn();return;}
    if(a==='queue'){after(E.queueRoute(run,id));return;}
    if(a==='clear-queue'){run.queue=[];after({ok:true,message:'노선 예약을 비웠습니다.'});return;}
    if(a==='buy'||a==='sell'){after(E.trade(run,id,a==='buy'?'buy':'sell',n));return;}
    const methods={service:()=>E.service(run,id),accept:()=>E.acceptContract(run,id),deliver:()=>E.deliver(run,id),hire:()=>E.hire(run,id),deploy:()=>E.deploy(run,id),store:()=>E.store(run,id),reorder:()=>E.reorder(run,id,n),upgrade:()=>E.upgrade(run,id),merge:()=>E.merge(run,id),recycle:()=>E.recycle(run,id),decision:()=>E.beginDecision(run,id),'cancel-decision':()=>E.cancelDecision(run),landmark:()=>E.landmark(run,id),governance:()=>E.governance(run,meta,id)};
    if(methods[a]){after(methods[a]());if(a==='governance'&&id==='artifacts'&&run.offer)openModal('offer');return;}
    if(a==='select-offer'||a==='reroll'||a==='skip-offer'){
      const r=a==='select-offer'?E.selectOffer(run,n):a==='reroll'?E.reroll(run,meta):E.skipOffer(run);after(r);if(!run.offer)modal=null;renderModal();return;
    }
  }
  document.addEventListener('click',e=>{const t=e.target.closest('[data-action]');if(t&&!t.disabled)action(t);});
  document.addEventListener('change',e=>{
    const t=e.target;
    if(t.dataset.setting==='difficulty'){selectedDifficulty=Number(t.value);return;}
    if(t.dataset.setting){meta.settings[t.dataset.setting]=t.type==='checkbox'?t.checked:Number(t.value);if(t.dataset.setting==='sound')sound.wake();save();return;}
    if(t.dataset.key){const old=meta.settings.keys[t.dataset.key],other=Object.keys(meta.settings.keys).find(k=>k!==t.dataset.key&&meta.settings.keys[k]===t.value);if(other)meta.settings.keys[other]=old;meta.settings.keys[t.dataset.key]=t.value;save();renderModal();return;}
    if(t.dataset.metaSetting){meta[t.dataset.metaSetting]=t.checked;save();renderModal();return;}
    if(t.dataset.heritageSetting){meta.heritage[t.dataset.heritageSetting]=t.checked;save();return;}
  });
  $('save-import').addEventListener('change',async e=>{
    const file=e.target.files[0];if(!file)return;
    try{if(file.size>2e6)throw new Error('저장 파일은 2MB 이내여야 합니다.');const p=JSON.parse(await file.text()),r=E.validateSave(p);if(!r.ok)throw new Error(r.message);openModal('import-confirm',p);}catch(error){toast(error.message||'저장 파일을 읽을 수 없습니다.',true);}finally{e.target.value='';}
  });
  document.addEventListener('keydown',e=>{
    if(modal){if(e.code==='Escape'){e.preventDefault();closeModal();}if(e.code==='Tab'){const items=[...$('dialog-root').querySelectorAll('button:not(:disabled),input,select,[tabindex="0"]')];if(!items.length)return;const first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}return;}
    if(e.target.closest('input,select,textarea')||e.repeat)return;
    if(e.code==='Enter'&&e.target.dataset.action==='map-node'){action(e.target);return;}
    if(home)return;
    const key=Object.keys(meta.settings.keys).find(k=>meta.settings.keys[k]===e.code);if(!key)return;e.preventDefault();sound.wake();
    if(key==='pause'){if(run.phase==='travel'){run.paused=!run.paused;dirty=true;renderHUD();}return;}
    tab={train:'train',market:'market',decisions:'decisions',map:tab}[key];renderTabs();if(key==='map')$('side').scrollIntoView({behavior:meta.settings.reducedMotion?'instant':'smooth',block:'nearest'});
  });
  document.addEventListener('dragstart',e=>{const t=e.target.closest('[data-car]');if(t&&t.draggable){dragId=t.dataset.car;e.dataTransfer.setData('text/plain',dragId);e.dataTransfer.effectAllowed='move';}});
  document.addEventListener('dragover',e=>{const t=e.target.closest('[data-car][draggable="true"]');if(t&&dragId){e.preventDefault();t.classList.add('drag-over');}});
  document.addEventListener('dragleave',e=>e.target.closest('[data-car]')?.classList.remove('drag-over'));
  document.addEventListener('drop',e=>{const t=e.target.closest('[data-car][draggable="true"]');if(t&&dragId){e.preventDefault();const from=run.cars.findIndex(c=>c.uid===dragId),to=run.cars.findIndex(c=>c.uid===t.dataset.car);after(E.reorder(run,dragId,to-from));}dragId=null;});
  document.addEventListener('dragend',()=>{dragId=null;document.querySelectorAll('.drag-over').forEach(t=>t.classList.remove('drag-over'));});
  window.addEventListener('beforeunload',()=>save());
  document.addEventListener('visibilitychange',()=>{if(document.hidden)save();last=performance.now();});
  function frame(now) {
    const dt=Math.min(.5,Math.max(0,(now-last)/1000));last=now;
    if(!home&&run&&!modal&&!run.result){const before=run.phase,decision=run.decision?.id,level=run.level;E.tick(run,dt*run.speed,meta);if(run.phase==='travel'&&!run.paused)dirty=true;
      if(run.result)openModal('result',run.result);else if(run.phase==='event')openModal('event');
      if(run.phase!==before||run.level!==level||(decision&&!run.decision)){renderGame();dirty=true;if(run.phase==='station'){sound.horn();toast(`${stationName(run.node)}에 도착했습니다. 납품과 도착 보급을 확인하세요.`);}else if(decision&&!run.decision)toast('결단이 완성됐습니다. 다음 결단을 준비할 수 있습니다.');}
    }
    scene?.draw(dt);hudTimer+=dt;saveTimer+=dt;panelTimer+=dt;soundTimer+=dt;
    if(!home&&run&&hudTimer>.35){hudTimer=0;renderHUD();if(run.log[0]?.id!==seenLog){seenLog=run.log[0]?.id;if(run.log[0]?.kind==='warning')toast(run.log[0].text,true);}}
    if(!home&&run&&panelTimer>2&&!modal){panelTimer=0;if(['train','decisions','log'].includes(tab)&&run.phase==='travel'&&!document.querySelector('#tab-body button:hover'))renderTabs();}
    if(soundTimer>.7){soundTimer=0;if(!home&&!modal&&run?.phase==='travel'&&!run.paused)sound.tone(85,.13,'triangle',.07);}
    if(saveTimer>2){saveTimer=0;if(dirty)save();}
    requestAnimationFrame(frame);
  }
  load();build();requestAnimationFrame(frame);if(offlineReport)toast(offlineReport);
  window.DustlineApp = { get run(){return run;}, get meta(){return meta;}, save, render:()=>{if(!home)renderGame();}, get home(){return home;} };
})();
