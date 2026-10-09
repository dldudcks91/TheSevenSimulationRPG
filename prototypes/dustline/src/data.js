(function (root) {
  'use strict';
  const goods = {
    grain: { name: '곡물', short: '곡물', icon: 'grain', color: '#c8a24d', base: 10, description: '농장에서는 싸고 도시에서는 비쌉니다. 식당의 특별 식사에도 쓰입니다.' },
    medicine: { name: '의약품', short: '약품', icon: 'medicine', color: '#72a9a0', base: 24, description: '납품과 부상자 치료에 사용합니다. 긴 여정에서는 냉장칸이 변질을 막습니다.' },
    parts: { name: '기계 부품', short: '부품', icon: 'parts', color: '#a2aab8', base: 18, description: '공방에서 생산합니다. 철로 복구와 특별 납품에 사용합니다.' }
  };
  const tags = {
    trade: { name: '상단', icon: 'crate', thresholds: [2, 3], effects: ['2칸: 화물 판매 가격 +12%', '3칸: 납품 보상 +20%'] },
    community: { name: '공동체', icon: 'heart', thresholds: [2, 3], effects: ['2칸: 생산 주기마다 사기 +2', '3칸: 승객 +2'] },
    industry: { name: '공업', icon: 'gear', thresholds: [2, 3], effects: ['2칸: 생산 주기 -2초', '3칸: 주행 속도 +15%'] },
    security: { name: '보안', icon: 'star', thresholds: [2, 3], effects: ['2칸: 방어력 +15', '3칸: 일일 긴장 증가 -4'] },
    explorer: { name: '개척자', icon: 'compass', thresholds: [2, 3], effects: ['2칸: 보급 선택지 +1', '3칸: 도착 경험치 +2'] },
    express: { name: '운송', icon: 'rail', thresholds: [2, 3], effects: ['2칸: 승객 탑승 누적 40회마다 석탄 +2', '3칸: 대신 28회마다 석탄 +2'] }
  };
  const cars = {
    freight: { name: '화물칸', icon: 'crate', color: '#b67d50', tags: ['trade', 'express'], capacity: 6, seats: 2, cash: 1, morale: 0, description: '넉넉한 적재 공간. 승객 2명이 드나들며 작은 운송 수입을 만듭니다.' },
    cold: { name: '냉장칸', icon: 'medicine', color: '#5c9994', tags: ['trade', 'industry'], capacity: 4, seats: 2, cash: 2, morale: 0, description: '의약품의 변질을 막습니다. 업그레이드하면 적재량과 운송 수입이 늘어납니다.' },
    guard: { name: '보안관칸', icon: 'star', color: '#778c91', tags: ['security', 'explorer'], capacity: 1, seats: 2, defense: 12, cash: 0, morale: 1, description: '방어력 +12. 사용한 주기마다 훈련이 쌓여 최대 12의 방어력을 더 얻습니다.' },
    diner: { name: '식당칸', icon: 'coffee', color: '#cd9a52', tags: ['community', 'express'], capacity: 0, seats: 4, cash: 1, morale: 3, description: '사기를 안정적으로 생산합니다. 4주기마다 곡물 1개로 사기 +5의 특별 식사를 만듭니다.' },
    workshop: { name: '공방칸', icon: 'gear', color: '#628484', tags: ['industry', 'trade'], capacity: 2, seats: 3, cash: 1, morale: 0, description: '3주기마다 부품 1개를 만듭니다. 빈 적재 공간이 필요합니다. 생산 준비 시간은 계속 보존됩니다.' },
    saloon: { name: '살롱칸', icon: 'cards', color: '#a16f80', tags: ['community', 'trade'], capacity: 0, seats: 4, cash: 5, morale: 1, description: '높은 현금 수입. 20%의 확률로 카드 놀이에서 사기 2를 잃고, 그 외에는 사기 1을 얻습니다.' },
    mail: { name: '우편칸', icon: 'letter', color: '#6a859b', tags: ['express', 'explorer'], capacity: 3, seats: 2, cash: 4, morale: 0, description: '주기적인 우편 수입과 작은 적재 공간. 운송·개척자 조합의 연결점입니다.' },
    power: { name: '보조기관칸', icon: 'bolt', color: '#a67958', tags: ['industry', 'express'], capacity: 0, seats: 2, cash: 0, morale: 0, speed: 12, description: '속도 +12%. 대신 일일 석탄 소비가 0.35 증가합니다. 긴 구간을 빨리 통과할 때 유용합니다.' },
    observation: { name: '전망칸', icon: 'binoculars', color: '#829276', tags: ['explorer', 'community'], capacity: 0, seats: 3, cash: 1, morale: 2, description: '도착 경험치 +1. 주행 중 주변을 살피는 승객들이 사기를 얻습니다.' }
  };
  const artifacts = {
    clock: { name: '황동 회중시계', icon: 'clock', description: '생산 주기 -1초.', rarity: 'silver', page: 0, price: 0 },
    compass: { name: '길잡이 나침반', icon: 'compass', description: '보급 선택지 +1. 도착 경험치 +1.', rarity: 'silver', page: 0, price: 0 },
    coin: { name: '행운의 동전', icon: 'coin', description: '생산 초과 성과 확률 +18%. 발동한 객차의 현금·사기 산출이 2배가 됩니다.', rarity: 'silver', page: 0, price: 0 },
    band: { name: '무쇠 보강판', icon: 'shield', description: '방어력 +12. 최대 내구도 +15.', rarity: 'bronze', page: 0, price: 0 },
    crate: { name: '접이식 선반', icon: 'crate', description: '화물 적재 공간 +3.', rarity: 'bronze', page: 0, price: 0 },
    ledger: { name: '상인의 장부', icon: 'book', description: '화물 판매 가격 +10%.', rarity: 'silver', page: 0, price: 0 },
    rusty: { name: '녹슨 조속기', icon: 'gear', description: '지금은 속도 -8%. 140초의 주행 뒤 정밀 조속기로 변해 속도 +10%가 됩니다.', rarity: 'bronze', page: 0, price: 0 },
    flower: { name: '야생 해바라기', icon: 'flower', description: '생산 주기마다 사기 +1.', rarity: 'bronze', page: 0, price: 0 },
    bell: { name: '역장의 종', icon: 'bell', description: '정류장에 도착할 때 사기 +5, 경험치 +1.', rarity: 'silver', page: 1, price: 25 },
    medal: { name: '개척자 훈장', icon: 'star', description: '배치 가능 객차 +1. 대신 보급 선택지 -1.', rarity: 'gold', page: 1, price: 30 },
    amp: { name: '복동 피스톤', icon: 'bolt', description: '각 생산마다 25% 확률로 현금·사기 산출을 한 번 더 반복합니다.', rarity: 'gold', page: 1, price: 35 },
    basket: { name: '곡물 바구니', icon: 'grain', description: '8주기마다 곡물 1개와 석탄 2를 얻습니다. 곡물은 빈 공간이 필요합니다.', rarity: 'silver', page: 2, price: 25 },
    lens: { name: '지질학자의 렌즈', icon: 'binoculars', description: '도착 경험치 +2. 속도 -5%.', rarity: 'silver', page: 2, price: 30 },
    scarf: { name: '붉은 스카프', icon: 'flag', description: '호위자 한 명당 방어력 +8, 생산 사기 +1.', rarity: 'gold', page: 2, price: 35 },
    bank: { name: '여행 금고', icon: 'coin', description: '보유 현금 100마다 생산 수입 +5% (최대 +30%).', rarity: 'gold', page: 3, price: 30 },
    map: { name: '오래된 노선도', icon: 'map', description: '주행 속도 +8%. 랜드마크를 방문할 때 평판 +1.', rarity: 'gold', page: 3, price: 35 },
    teapot: { name: '법랑 주전자', icon: 'coffee', description: '일일 사기 손실 -2. 승객 +2.', rarity: 'gold', page: 3, price: 40 }
  };
  const captains = {
    ada: { name: '에이다 워커', role: '기관사', icon: 'engineer', color: '#b99570', quote: '좋은 열차는, 누구도 뒤에 남겨 두지 않지.', description: '안정적인 생산과 빠른 성장. 초기 배치 공간 +1, 시작 사기 78.', unlock: 0, cash: 150, morale: 78 },
    silas: { name: '실라스 콜', role: '보안관', icon: 'cowboy', color: '#798f9a', quote: '저 협곡에도 길은 있어. 내가 앞에 서겠네.', description: '방어력 +12. 레벨 상승 때 석탄 +3. 긴장 100에서 동요가 발생합니다.', unlock: 35, cash: 150, morale: 70 },
    clara: { name: '클라라 벨', role: '상단 대표', icon: 'merchant', color: '#a38695', quote: '서로 필요한 것을 나누면, 서부 끝까지 갈 수 있어.', description: '판매 가격 +12%. 경제·신뢰·치안을 관리하며 통치 행위를 사용합니다.', unlock: 45, cash: 185, morale: 70 }
  };
  const stations = [
    { id: 'sunset', name: '노을역', en: 'SUNSET DEPOT', biome: 'plains', x: 7, y: 55, note: '서부 횡단선의 시작. 곡물과 석탄이 저렴합니다.', prices: { grain: 9, medicine: 24, parts: 20 }, stock: { grain: 18, medicine: 7, parts: 6 }, landmark: 'water' },
    { id: 'harvest', name: '보리평원', en: 'HARVEST CROSSING', biome: 'plains', x: 25, y: 25, note: '황금빛 농장과 작은 시장. 공동체가 여정을 지원합니다.', prices: { grain: 7, medicine: 29, parts: 22 }, stock: { grain: 24, medicine: 5, parts: 8 }, landmark: 'farm' },
    { id: 'redrock', name: '붉은협곡', en: 'RED ROCK', biome: 'canyon', x: 27, y: 79, note: '짧은 노선과 좋은 가격. 협곡에서는 도적을 조심하세요.', prices: { grain: 18, medicine: 26, parts: 15 }, stock: { grain: 8, medicine: 8, parts: 15 }, landmark: 'tower' },
    { id: 'pine', name: '소나무 분기점', en: 'PINE JUNCTION', biome: 'forest', x: 46, y: 36, note: '안전한 숲길. 여행자를 태우고 다음 노선을 고릅니다.', prices: { grain: 13, medicine: 32, parts: 23 }, stock: { grain: 12, medicine: 5, parts: 7 }, landmark: 'grove' },
    { id: 'silver', name: '은광역', en: 'SILVER CREEK', biome: 'canyon', x: 58, y: 77, note: '광부들은 곡물과 약품을 기다립니다. 부품은 풍부합니다.', prices: { grain: 22, medicine: 38, parts: 11 }, stock: { grain: 5, medicine: 4, parts: 20 }, landmark: 'mine' },
    { id: 'river', name: '큰강나루', en: 'RIVER BEND', biome: 'river', x: 75, y: 32, note: '먼 도시로 가는 마지막 나루. 통행료와 물자가 필요합니다.', prices: { grain: 17, medicine: 30, parts: 25 }, stock: { grain: 9, medicine: 7, parts: 5 }, landmark: 'bridge' },
    { id: 'dawn', name: '새벽항', en: 'DAWN HARBOR', biome: 'town', x: 92, y: 53, note: '횡단선의 끝. 납품을 마치고, 새로운 여정을 준비하세요.', prices: { grain: 24, medicine: 42, parts: 30 }, stock: { grain: 6, medicine: 5, parts: 4 }, landmark: 'harbor' }
  ];
  const edges = [
    { id: 's-h', from: 'sunset', to: 'harvest', seconds: 34, risk: 1, toll: 0, name: '황금빛 평원', biome: 'plains' },
    { id: 's-r', from: 'sunset', to: 'redrock', seconds: 42, risk: 3, toll: 0, name: '협곡 지름길', biome: 'canyon' },
    { id: 'h-p', from: 'harvest', to: 'pine', seconds: 36, risk: 1, toll: 0, name: '소나무 숲길', biome: 'forest' },
    { id: 'h-r', from: 'harvest', to: 'redrock', seconds: 26, risk: 2, toll: 0, name: '붉은 언덕', biome: 'canyon' },
    { id: 'r-p', from: 'redrock', to: 'pine', seconds: 32, risk: 2, toll: 0, name: '개척자 고갯길', biome: 'forest' },
    { id: 'r-s', from: 'redrock', to: 'silver', seconds: 38, risk: 3, toll: 0, name: '광산 철로', biome: 'canyon' },
    { id: 'p-s', from: 'pine', to: 'silver', seconds: 30, risk: 2, toll: 0, name: '은빛 능선', biome: 'canyon' },
    { id: 'p-v', from: 'pine', to: 'river', seconds: 43, risk: 1, toll: 12, name: '옛 철교', biome: 'river' },
    { id: 's-v', from: 'silver', to: 'river', seconds: 35, risk: 2, toll: 0, name: '강을 따라', biome: 'river' },
    { id: 's-d', from: 'silver', to: 'dawn', seconds: 66, risk: 3, toll: 0, name: '마지막 황야', biome: 'plains' },
    { id: 'v-d', from: 'river', to: 'dawn', seconds: 36, risk: 1, toll: 0, name: '새벽행 급행선', biome: 'town' },
    { id: 'd-s', from: 'dawn', to: 'sunset', seconds: 48, risk: 2, toll: 0, name: '서부 순환선', biome: 'plains' }
  ];
  const decisions = [
    { id: 'timetable', name: '정밀 운행표', icon: 'clock', duration: 22, cost: 16, description: '주행 속도 +8%.', branch: 'gear', effects: { speed: 8 } },
    { id: 'market', name: '역 상인 협약', icon: 'book', duration: 24, cost: 18, description: '판매 가격 +10%.', branch: 'trade', effects: { sale: .1 } },
    { id: 'meal', name: '공동 식탁', icon: 'coffee', duration: 20, cost: 14, description: '생산 주기마다 사기 +2.', branch: 'people', effects: { morale: 2 } },
    { id: 'watch', name: '야간 순찰', icon: 'star', duration: 23, cost: 15, description: '방어력 +10. 긴장 증가 -2.', branch: 'security', effects: { defense: 10, tension: -2 } },
    { id: 'fast', name: '과감한 급행 운행', icon: 'bolt', duration: 34, cost: 24, prerequisite: 'timetable', excludes: 'rhythm', description: '속도 +18%. 일일 석탄 소비 +0.5. 정비형 개조와 양립할 수 없습니다.', branch: 'gear', effects: { speed: 18, fuel: .5 } },
    { id: 'rhythm', name: '정비형 개조', icon: 'gear', duration: 34, cost: 24, prerequisite: 'timetable', excludes: 'fast', description: '생산 주기 -1.5초. 속도 -4%. 급행 운행과 양립할 수 없습니다.', branch: 'gear', effects: { cycle: -1.5, speed: -4 } },
    { id: 'storage', name: '화물 적재 표준화', icon: 'crate', duration: 30, cost: 22, prerequisite: 'market', description: '적재 공간 +4.', branch: 'trade', effects: { capacity: 4 } },
    { id: 'export', name: '장거리 납품망', icon: 'letter', duration: 38, cost: 26, prerequisite: 'storage', description: '계약 보상 +25%. 계약 보유 한도 +1.', branch: 'trade', effects: { contract: .25, contracts: 1 } },
    { id: 'welcome', name: '여행자 환영', icon: 'people', duration: 30, cost: 20, prerequisite: 'meal', description: '승객 +3. 매일 승객 한 명당 사기 손실이 0.1 늘어납니다.', branch: 'people', effects: { passengers: 3 } },
    { id: 'fair', name: '공정한 임금', icon: 'coin', duration: 36, cost: 25, prerequisite: 'welcome', description: '일일 사기 손실 -3. 생산 현금 수입 -10%.', branch: 'people', effects: { dailyMorale: -3, income: -.1 } },
    { id: 'escort', name: '서부 호위대', icon: 'shield', duration: 32, cost: 24, prerequisite: 'watch', description: '호위자 비용 -30%. 방어력 +8.', branch: 'security', effects: { hire: -.3, defense: 8 } },
    { id: 'charter', name: '자치 협정', icon: 'flag', duration: 40, cost: 30, prerequisite: 'escort', description: '일일 긴장 증가 -4. 클라라의 신뢰·치안 일일 손실 -1.', branch: 'security', effects: { tension: -4, stability: -1 } }
  ];
  const heritage = {
    positives: [
      { id: 'cash', name: '개척자의 자본', description: '시작 현금 +30.', effects: { cash: 30 } },
      { id: 'fuel', name: '여분의 석탄', description: '시작 석탄 +6.', effects: { coal: 6 } },
      { id: 'room', name: '넓은 연결부', description: '배치 공간 +1.', effects: { slots: 1 } },
      { id: 'trust', name: '오래된 신뢰', description: '시작 사기 +10.', effects: { morale: 10 } },
      { id: 'shelf', name: '가족의 선반', description: '적재 공간 +2.', effects: { capacity: 2 } },
      { id: 'tune', name: '기관사의 손길', description: '속도 +5%.', effects: { speed: 5 } }
    ],
    negatives: [
      { id: 'heavy', name: '무거운 차축', description: '속도 -5%.', effects: { speed: -5 } },
      { id: 'poor', name: '작은 빚', description: '시작 현금 -20.', effects: { cash: -20 } },
      { id: 'cold', name: '차가운 아침', description: '시작 사기 -8.', effects: { morale: -8 } }
    ]
  };
  const landmarks = {
    water: {name:'노을역의 급수탑',story:'물통을 채우는 역무원이 창고 열쇠를 건넵니다.',coal:6,people:1,xp:4},
    farm: {name:'황금빛 곡물 농장',story:'수확을 마친 농부들이 철도 식탁에 둘러앉습니다.',coal:4,people:2,xp:5},
    tower: {name:'협곡의 감시탑',story:'보안관의 옛 기록에는 협곡의 지름길이 남아 있습니다.',coal:3,people:1,xp:7},
    grove: {name:'개척자의 숲',story:'작은 야영지에서, 낯선 사람들이 같은 길을 이야기합니다.',coal:4,people:1,xp:6},
    mine: {name:'은광의 기계실',story:'광부들이 남긴 연료와 작업 일지가 쌓여 있습니다.',coal:7,people:1,xp:6},
    bridge: {name:'옛 철교의 쉼터',story:'강을 건너는 여행자들이 열차의 빈자리를 바라봅니다.',coal:4,people:2,xp:5},
    harbor: {name:'새벽항의 철도 박물관',story:'수많은 여정의 기적이 항구의 기록에 남아 있습니다.',coal:3,people:2,xp:7}
  };
  const data = { goods, tags, cars, artifacts, captains, stations, edges, decisions, heritage, landmarks, VERSION: 1, DAY_SECONDS: 32, MAX_CAR_LEVEL: 3 };
  if (typeof module !== 'undefined' && module.exports) module.exports = data;
  root.DustlineData = data;
})(typeof globalThis !== 'undefined' ? globalThis : this);
