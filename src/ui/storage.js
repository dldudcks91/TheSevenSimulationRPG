/**
 * 세이브 어댑터 — **localStorage 를 만지는 유일한 파일** (CLAUDE.md 이식성 규칙 3).
 * 직렬화 형식은 game_logic/state.js 가 정한다(엔진 중립 JSON). 여기는 문자열을 넣고 빼기만 한다.
 * Phase 2(엔진 이식)에서는 이 파일만 파일 시스템/클라우드 어댑터로 갈아끼운다.
 *
 * 2026-10-16 — **플레이 기록 · 다른 탭 감지** (SCREEN_DESIGN §2-1 · ADR-0633).
 *   올리기 자체는 `cloud.js` 가 만진다. 여기는 이 브라우저의 플레이 기록 `{nick, sessions, reach}` 한 줄과,
 *   **다른 탭이 세이브를 썼다**는 신호(`storage` 이벤트 — 쓴 탭이 아니라 **다른** 탭에만 온다)를 든다.
 *
 * 2026-10-23 — **세이브 슬롯 셋**(개발 장치 · SCREEN_DESIGN §10-4 · ADR-0738). 자동 저장과 같은 JSON 을 따로 든다.
 *
 * 2026-11-18 — **브라우저 표식**(`loadDevice` — 아이디 계정의 주인 가르기 · SCREEN_DESIGN §2-1 · ADR-1263).
 */

const KEY = 'thesevensim.save';
const TRACK_KEY = 'thesevensim.track';
const NOTIFICATION_DISMISSED_KEY = 'thesevensim.notificationDismissed';
const SCREEN_LAYOUT_KEY = 'thesevensim.screenLayout';
export const SCREEN_LAYOUTS = ['auto', 'desktop', 'mobile'];

/** Browser display preference, independent of game saves. */
export function loadScreenLayout() {
    try {
        const value = localStorage.getItem(SCREEN_LAYOUT_KEY);
        return SCREEN_LAYOUTS.includes(value) ? value : 'auto';
    } catch { return 'auto'; }
}

export function writeScreenLayout(value) {
    if (!SCREEN_LAYOUTS.includes(value)) return;
    try { localStorage.setItem(SCREEN_LAYOUT_KEY, value); } catch {}
}

/** 우클릭 분해 — 보관 칸 장비 우클릭이 바로 분해인가(SCREEN_DESIGN §2-2 · §6 · ADR-1188) · 기본 Off · 세이브와 무관한 조작 설정 */
const QUICK_SALVAGE_KEY = 'thesevensim.quickSalvage';
export function loadQuickSalvage() {
    try { return localStorage.getItem(QUICK_SALVAGE_KEY) === 'on'; } catch { return false; }
}
export function writeQuickSalvage(on) {
    try { localStorage.setItem(QUICK_SALVAGE_KEY, on ? 'on' : 'off'); } catch {}
}

/** 바로가기 어둡게 — 첫 장 메인미션 [바로가기]의 탭 단계에서 화면을 어둡게 하나(SCREEN_DESIGN §2-2 · ADR-1378) · 기본 On · 세이브와 무관한 보기 설정 */
const MISSION_DIM_KEY = 'thesevensim.missionDim';
export function loadMissionDim() {
    try { return localStorage.getItem(MISSION_DIM_KEY) !== 'off'; } catch { return true; }
}
export function writeMissionDim(on) {
    try { localStorage.setItem(MISSION_DIM_KEY, on ? 'on' : 'off'); } catch {}
}

export function loadSave() {
    try {
        const raw = localStorage.getItem(KEY);
        return raw ? JSON.parse(raw) : null;
    } catch (e) {
        console.warn('save: load failed', e);
        return null;
    }
}

export function writeSave(obj) {
    try {
        localStorage.setItem(KEY, JSON.stringify(obj));
        return true;
    } catch (e) {
        console.warn('save: write failed', e);
        return false;
    }
}

export function clearSave() {
    try { localStorage.removeItem(KEY); } catch {}
}

export const hasSave = () => loadSave() != null;

/** 알림의 [확인] 기록 — 게임(seed:createdAt)별 UI 상태이며 게임 세이브·다른 탭 멈춤 신호와 분리한다. */
const notificationIds = ids => Array.isArray(ids) ? [...new Set(ids.filter(id => typeof id === 'string' && id.length))] : [];
const notificationDismissedRecords = () => {
    const records = Object.create(null);
    const raw = localStorage.getItem(NOTIFICATION_DISMISSED_KEY);
    if (!raw) return records;
    let parsed;
    try { parsed = JSON.parse(raw); } catch { return records; }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return records;
    for (const [gameId, ids] of Object.entries(parsed)) if (Array.isArray(ids)) records[gameId] = notificationIds(ids);
    return records;
};

export function loadNotificationDismissed(gameId) {
    if (typeof gameId !== 'string' || !gameId.length) return [];
    try { return notificationDismissedRecords()[gameId] ?? []; } catch { return []; }
}

export function writeNotificationDismissed(gameId, ids) {
    if (typeof gameId !== 'string' || !gameId.length || !Array.isArray(ids)) return false;
    try {
        const records = notificationDismissedRecords();
        records[gameId] = notificationIds(ids);
        localStorage.setItem(NOTIFICATION_DISMISSED_KEY, JSON.stringify(records));
        return true;
    } catch (e) {
        console.warn('notifications: dismissal write failed', e);
        return false;
    }
}

/** 메인미션 — 판을 열어 본 다음 미션 id · 게임(seed:createdAt)별 UI 상태 (SCREEN_DESIGN §2 「메인미션」 · ADR-1245). 없으면 null(안 봤다) */
const MISSION_SEEN_KEY = 'thesevensim.missionSeen';
const missionSeenRecords = () => {
    let records;
    try { records = JSON.parse(localStorage.getItem(MISSION_SEEN_KEY) ?? '{}'); } catch {}
    return records && typeof records === 'object' && !Array.isArray(records) ? records : {};
};
export function loadMissionSeen(gameId) {
    if (typeof gameId !== 'string' || !gameId.length) return null;
    try { const id = missionSeenRecords()[gameId]; return typeof id === 'string' && id.length ? id : null; } catch { return null; }
}
export function writeMissionSeen(gameId, id) {
    if (typeof gameId !== 'string' || !gameId.length || typeof id !== 'string' || !id.length) return false;
    try {
        const next = Object.assign(Object.create(null), missionSeenRecords());
        next[gameId] = id;
        localStorage.setItem(MISSION_SEEN_KEY, JSON.stringify(next));
        return true;
    } catch { return false; }
}

/**
 * 세이브 슬롯 — `⚙` 판 Save 탭의 개발 장치 (SCREEN_DESIGN §10-4 · ADR-0738). 자동 저장(`KEY`)과 따로 산다 —
 * 새 게임 · 메뉴의 불러오기가 안 건드리고, 다른 탭의 멈춤 신호(`onSaveWrittenElsewhere`)에도 안 걸린다. `n` 은 1 부터
 */
const slotKey = n => `thesevensim.slot.${n}`;

export function loadSlot(n) {
    try {
        const raw = localStorage.getItem(slotKey(n));
        return raw ? JSON.parse(raw) : null;
    } catch (e) {
        console.warn('save: slot load failed', e);
        return null;
    }
}

export function writeSlot(n, obj) {
    try {
        localStorage.setItem(slotKey(n), JSON.stringify(obj));
        return true;
    } catch (e) {
        console.warn('save: slot write failed', e);
        return false;
    }
}

export function clearSlot(n) {
    try { localStorage.removeItem(slotKey(n)); } catch {}
}

/**
 * 플레이 기록 — 닉네임 · 이 브라우저에서 켠 횟수 · 노말 깬 칸마다 처음 본 원정 플레이 시간 `{stageId: expMs | null}`.
 * 세이브와 따로 산다 — 새 게임을 해도 남는다. 없으면 빈 기록
 */
export function loadTrack() {
    const empty = { nick: '', sessions: 0, reach: {} };
    try {
        const raw = localStorage.getItem(TRACK_KEY);
        return raw ? { ...empty, ...JSON.parse(raw) } : empty;
    } catch {
        return empty;
    }
}

export function writeTrack(rec) {
    try { localStorage.setItem(TRACK_KEY, JSON.stringify(rec)); } catch (e) { console.warn('save: track write failed', e); }
}

/**
 * 브라우저 표식 — 아이디 계정의 「누가 열었나」(SCREEN_DESIGN §2-1 「계정」 · ADR-1263). 이 브라우저에서 처음 부를 때 하나 뽑아 둔다 —
 * 같은 브라우저의 탭은 같은 표식이다(탭끼리는 `onSaveWrittenElsewhere` 가 가른다) · 로그아웃해도 남는다(브라우저의 이름이지 계정의 것이 아니다).
 * 게임 난수가 아니라 이름표라 `game_logic` 의 시드와 무관하다. 저장소가 막혔으면 이 페이지 동안만 쓰는 표식
 */
const DEVICE_KEY = 'thesevensim.device';
let deviceMemo = null;
export function loadDevice() {
    if (deviceMemo) return deviceMemo;
    try { deviceMemo = localStorage.getItem(DEVICE_KEY); } catch {}
    if (!deviceMemo) {
        const b = crypto.getRandomValues(new Uint8Array(12));
        deviceMemo = Array.from(b, x => x.toString(16).padStart(2, '0')).join('');
        try { localStorage.setItem(DEVICE_KEY, deviceMemo); } catch {}
    }
    return deviceMemo;
}

/** 다른 탭이 세이브를 쓰거나 지웠다 — `key` 가 null 이면 저장소를 통째로 비운 것이다 */
export function onSaveWrittenElsewhere(cb) {
    window.addEventListener('storage', e => { if (e.key === KEY || e.key === null) cb(); });
}
