# 코드베이스 텍스트 흐름 지도 — 간체 중국어(zh) 세 번째 언어 추가용

조사 범위: `c:\Users\user\Desktop\python_text\git\TheSevenSimulationRPG` (읽기 전용 조사, 파일 수정 없음).
경로는 모두 저장소 루트 기준이고, 줄 번호는 조사 시점(2026-11-16 작업 폴더) 기준이다. 병렬 세션이 파일을 고치므로 줄 번호는 ±수 줄 흔들릴 수 있다.

---

## 0. 한눈에 보는 구조

```
CSV (_kr/_en 쌍)  ──fetch+parseCsv──▶  ui/data.js (D.*, 헬퍼)  ──▶ {ko,en} 객체  ──┐
game_logic 로더(arena/commission/…/state/skill/hero)  ─▶ {ko,en} 객체              ├─▶ 렌더러  L(obj) → 문자열
ui/mock.js (SINS · RARITY · AFFIX_LABELS · MASTERY_LABELS …) ─▶ {ko,en} 객체      ──┘
ui/i18n.js STRINGS['key'] = {ko,en}  ──▶ t('key',{x})  → 문자열
세이브(JSON)에는 hero.name · hero.trait · item.name 이 {ko,en} 객체로 저장된다(INTERFACE §2 · 191 · 286행)
```

- 언어는 **`i18n.js` 모듈 변수 `current` 하나**. 렌더러는 두 가지 길로만 글을 얻는다: `t(key)` (UI 문구) / `L(pair)` (데이터 문구).
- 전환은 상단바 버튼 하나(`app.js:654-656`)가 `render()` 전체를 다시 그린다.

---

## 1. 언어 배관 (lang / 선택 헬퍼 / 2개 언어 가정)

### 1-1. 현재 언어를 읽는 곳 — `src/ui/i18n.js`
| 항목 | 위치 | 내용 |
|---|---|---|
| 상수 | `i18n.js:19` | `export const LANGS = ['ko', 'en'];` |
| 초기값 | `i18n.js:21-29` | URL `?lang=` → `localStorage['thesevensim.lang']` → 기본 `'ko'`. 둘 다 `LANGS.includes()` 로만 검사 |
| 읽기 | `i18n.js:31` | `export const lang = () => current;` |
| 쓰기 | `i18n.js:33-38` | `setLang(l)` — `LANGS.includes(l)` 아니면 **조용히 무시** |
| 문서 동기화 | `i18n.js:41-44` | `applyDocumentLang()` — `document.documentElement.lang = current` (그대로 'zh' 가 들어간다) + `document.title = t('app.title')` |
| 소비자 | `lang()` 호출은 `app.js` 3곳(`1533`, `3339`, `655`) · `tip.js:882` 1곳 뿐 |

### 1-2. ko/en 을 고르는 헬퍼 (이름 · 정의 · 호출 수)
| 헬퍼 | 정의 | 동작 | 호출 수(대략) |
|---|---|---|---|
| **`t(key, params)`** | `i18n.js:62-70` | `e[current] ?? e.ko` (**폴백은 ko, en 이 아니다**) → 값이 `{one,other}` 객체면 수(`n`/`v`)가 1 일 때 `one` → `{x}` 를 `replaceAll` 로 치환. 미등록 키는 키 문자열 그대로(HTML 이스케이프) | `t(` 약 **1,006** (app.js 675 · battle.js 80 · tip.js 61 · raid.js 38 · notifications 14 · mobile*.js 24 · …). 이 중 **동적 키 `t(\`prefix.${x}\`)` 약 102곳**(app 70 · battle 19 · tip 10 · raid 3) |
| **`L(v)`** | `i18n.js:50-51` | `v == null ? '' : typeof v === 'string' ? v : (v[current] ?? v.ko ?? '')` — 평문 문자열은 그대로(언어 공통 표기) | `L(` 약 **280** (app 180 · battle 51 · tip 32 · raid 9 · i18n 4 · mock 2 · data 1) |
| `has(key)` / `isLock(key)` | `i18n.js:54-56` | 키 존재 · `lock:true` 여부 | 소수 |
| `fillStory(text, lang, {leader, fallback})` | `data.js:497-510` | 이야기 글의 `{m:<idx>}` · `{leader}` 치환. `leader[lang] ?? leader.ko` · `n[lang] ?? n.ko` 로 **lang 문자열을 직접 인덱싱** | `app.js:3339` · `tip.js:882` |
| `stageStory` / `monsterStory` / `placeName` / `stageName` | `data.js:461-476` | 'story_en 이 비면 story_kr' 폴백을 **로더 쪽에서** 한다(`story_en \|\| story_kr`, `stage_name_en ?? stage_name_kr`) | |

### 1-3. "정확히 두 언어" 를 가정하는 곳 (zh 추가 시 반드시 손볼 것)
| # | 위치 | 가정 | 비고 |
|---|---|---|---|
| 1 | `i18n.js:19` `LANGS = ['ko','en']` | 허용 언어 목록. `?lang=zh` / 저장값 'zh' 가 **조용히 'ko' 로 떨어진다** | 한 곳 |
| 2 | **`app.js:655`** `setLang(lang() === 'ko' ? 'en' : 'ko')` | 토글 버튼이 두 값만 뒤집는다 | **유일한 토글**. 버튼 글자 `'ui.langBtn': {ko:'EN', en:'한국어'}` (`i18n.js:869`) 도 "다른 쪽 언어 하나"만 적는다 → 3개 언어면 드롭다운/순환 필요 |
| 3 | `data.js:500` `let bracket = lang === 'ko'` | 한국어일 때만 이름을 「」로 감싼다 | 이야기 글의 `{leader}`/`{m:}` (zh 에서 「」 쓸지 결정 필요) |
| 4 | `data.js:502, 506` `leader[lang] ?? leader.ko` | zh 키가 없으면 ko 로 폴백 | 저장된 영웅 이름이 zh 를 안 들고 있다(아래 2-4) |
| 5 | `i18n.js:35` / `i18n.js:67` | `en` 키 없으면 `ko` 폴백(영어 폴백 없음) | zh 누락 시 **한국어가 그대로 노출**. 영어 폴백 체인으로 바꿀지 결정 필요 |
| 6 | **객체 리터럴 `{ ko: …, en: … }` 로 재포장하는 곳** | 컬럼을 하나씩 꺼내 `{ko,en}` 만 만든다 → zh 컬럼을 읽어도 **여기서 버려진다** | 아래 1-4 표 |
| 7 | `mock.js:292, 346, 352` | 접사 이름+값 조합이 `{ko:`${이름} ${값}`, en:`${값} ${이름}`}` — 어순이 언어별 템플릿으로 박힘 | 3-1 참고 |
| 8 | `naming.js:53-76` | `{ko:[…], en:[…]}` 두 배열 · 두 문자열 합성 | 3-1 |
| 9 | `data.js:467` | `stageName` — `{ko:`${p.ko} ${n}`, en:`${p.en} ${n}`}` | |
| 10 | `state.js:288-292, 605-606` | 고블린 5종 이름이 코드에 `{ko,en}` 으로 하드코딩 + 옛 세이브 이름 `'집사 고블린'` 마이그레이션 | CSV 아님 |
| 11 | `app.js:1533` `trackSummary` → `lang: lang()` | 플레이 기록(Firestore)에 언어 문자열을 그대로 올린다 | 서버 규칙이 값 검사하는지 미확인(저장소에 rules 파일 없음) |
| 12 | CSS `:lang(en)` / `html[lang="en"]` | en 전용 규칙 6곳 (5-3) | |
| 13 | 정적 HTML `lang="ko"` | `src/index.html:2`, 루트 `index.html:2`, `dev/test.html:2` — 시작 시점만, JS 가 곧 덮어씀 | |
| 14 | 테스트 `for (const lang of ['ko','en'])` | `test.js:1747, 13391, 13501, 13558, 14325` 다섯 곳 | 7번 항목 |

### 1-4. 컬럼을 하나씩 꺼내 `{ko,en}` 으로 재포장하는 곳 (zh 를 실어 나르려면 전부 고쳐야 함)
- **`ui/data.js`** — 약 **39 곳**: `194, 196, 200, 218, 226, 231, 244, 271, 286, 314, 318, 330, 332, 346, 350, 359, 362, 365, 367, 382, 384, 385, 395, 397, 425, 437, 461, 472, 542, 545, 555, 561, 570`
  (`ko: r.name_kr, en: r.name_en` 꼴 — 컬럼명이 `name_kr` / `attr_kr` / `stat_kr` / `group_kr` / `grade_kr` / `monster_name_kr` / `stage_name_kr` / `story_kr` 로 제각각)
- **`game_logic/`** — `arena.js:60`, `commission.js:113, 136`, `construction.js:132`, `gamble.js:53, 77`, `hero.js:104(namePool)·216(masteryNodes)`, `raid.js:150`, `skill.js:193-196(name/desc), 644-645(advance_node name/desc/bonus), 664(advance_common)`, `state.js:2715-2716(advance), 3062-3082(재료 사다리), 5470(explore_story)`, `state.js:1849-1850`, `item.js:322, 755-756`
- **`ui/app.js`** 안에서 다시 포장: `118, 265, 6652, 7075, 7363, 9345, 10085, 10139, 10183` · `battle.js:672, 1393` (모두 `L({ ko: x.ko, en: x.en })` 또는 `L({ko: r.name_kr, en: r.name_en})`) — **zh 필드를 빼먹기 쉬운 지점**
- **`ui/mock.js`** — `{ko,en}` 쌍 약 **219 쌍**(`ko:` 발생 수). 구성: `SINS` 14 · `RARITY` 7 · `AFFIX_LABELS` 103 · `MASTERY_LABELS` 41 · `HERO_FACE_NAMES` 24 · `ELITE_TRAIT_STAT` 7 · `ELITE_TRAIT_DEF` 5 · `ELITE_TRAIT_SIN` 7 · `TRADE` 4 · `CODEX_FIGHT_LABELS` 2 + 접사 조합 함수 5

`.ko` 직접 접근(i18n.js 제외) 40 곳: game_logic/state 12 · naming 5 · hero 4 · item 3 · skill 2 · arena 1 / ui/data 5 · app 5 · mock 3.

---

## 2. CSV 텍스트

### 2-1. 로딩
- 파서: **`src/game_logic/csv.js`** `parseCsv(text)` (`csv.js:40-52`) — **첫 줄 헤더 이름으로 키를 만든다**(위치 아님) → 컬럼을 중간에 끼워도 안전. BOM 제거, 숫자처럼 보이면 Number 변환(`!isNaN(Number(v))`) — **번역 셀이 순수 숫자열이면 Number 가 된다**(실제로는 거의 없음), 쉼표 셀은 큰따옴표 필수(`csv.js:11-33`).
- fetch: `ui/data.js:134-141` `loadData()` 가 `FILES` (`data.js:121-130`, 71개 중 `inherited/` 제외 전부)를 `fetch('./data/<f>.csv')` → `parseCsv`. 원문은 `D.csvText[f]` 에 보관(골든 해시용).
- `_kr`/`_en` 읽기: 위 1-4 표. **`_zh` 를 읽는 코드는 0**.
- 규약(`src/data/README.md:15-17`): "표시 문자열은 `_kr`/`_en` 쌍" · "이름은 영어가 원본 — 한글은 직역(의역 금지)" · "자유 서술은 `description_kr` 하나(마지막 컬럼)". 컬럼 이름은 **통일돼 있지 않다**: `name_kr`, `group_kr`, `attr_kr`, `stat_kr`, `grade_kr`, `monster_name_kr`, `stage_name_kr`, `story_kr`, `desc_kr`, `bonus_kr`, `how_kr`, `role_kr`, `role_text_kr`, `doing_kr`, `done_kr`, `text_kr` (모두 `*_kr`/`*_en` 쌍).

### 2-2. `_kr`/`_en` 비어 있음 검증 (zh 컬럼을 추가해도 이것들은 안 깨진다 — 아무도 zh 를 안 보기 때문. 반대로 **zh 가 비어도 아무도 못 잡는다**)
| 위치 | 검사 | 메시지/동작 |
|---|---|---|
| `arena.js:73` | `!t.name.ko \|\| !t.name.en` | `${id} — 이름이 비었다` (throw) |
| `commission.js:112` | `!r.name_kr \|\| !r.name_en` (종족) | 〃 |
| `commission.js:135` | 위와 같음 (등급) | 〃 |
| `construction.js:126` | `!r.name_kr \|\| !r.name_en` (건물) | 〃 |
| `gamble.js:52` | 심볼 이름 두 언어 | 〃 |
| `gamble.js:75-76` | 코인: `name_kr !== '-'` 일 때만 `name_en` 필수 | `코인 … 영어 이름이 비었다` |
| `hero.js:102-103` | hero_name `row.ko`/`row.en` trim 비면 | `hero_name.csv 의 직업 또는 이름이 잘못됐다` |
| `hero.js:178` | mastery_node `name_kr`/`name_en` | `표시 이름 ko/en 이 비었다` |
| `hero.js:198-202` | `{group}` 템플릿은 **양 언어에 모두** 있어야 하고 `class` + `*` + `weapon` 게이트 노드에만 | `무기군 이름 형식은 양 언어의…` |
| `raid.js:37` | `!p.name_kr \|\| !p.name_en` | `raid: invalid pattern` |
| `skill.js:371` | `!d.desc.ko \|\| !d.desc.en` | `desc_kr·desc_en 이 비었다` |
| **`skill.js:373-376`** | `{자리}` 집합이 desc_kr ≡ desc_en | `desc_kr 자리 {…} ≠ desc_en 자리 {…}` — **zh 도 같은 패리티를 걸어야 한다** |
| `skill.js:642-643` | advance_node `desc_kr/en`·`bonus_kr/en`·`name_kr/en` 비거나 `-`(NONE) | `칸 이름이 비었다` / `설명이 비었다` |
| `skill.js:663` | advance_common 이름 | 〃 |
| `state.js:145` | 신단 `!s.ko \|\| !s.en` | |
| `state.js:1909` | 물약 이름 | |
| `state.js:2726-2727` | 전직 이름 · 설명 | `설명이 비었다` |
| `state.js:3070, 3080` | 재료 사다리 이름 | |
| `state.js:5334` | visit_story `doing_kr/en`·`done_kr/en` 4개 | `문구가 비었다` |
| `state.js:5391` | explore_story `text_kr/en` | |
| `dev/test.js` | `686`(skill_tag 이름) · `1225`(monster_name_en) · `3384`(mastery_node) · `3988`(mastery 이름 == CSV) · `17004` · `19080, 19097` · `626-627`(monster story ko/en 한쪽만 금지) | 단정(7장) |
- 모두 **게임 로드(buildSystems) 시 throw** → 검증 실패 = 부팅 불가. 즉 `_zh` 컬럼을 새로 만들 때 "비면 로드 실패"를 원하면 이 약 20곳에 같은 줄을 복제해야 하고, 원하지 않으면 지금처럼 아무 검사 없이 ko 폴백이다.
- `ui/data.js` 에는 `bad(...)` 류가 거의 없다. 이야기 폴백 `story_en || story_kr` 같은 조용한 폴백만 있다.

### 2-3. 실제 화면에 쓰이는 열 vs 설계자 메모 열
**설계자 메모(화면에 한 번도 안 그려짐)** — `description_kr` 전부(코드에서 `description_kr` 를 읽는 JS = 0; `dev/test.js:914` 가 balance.csv 에 값이 있는지만 검사), `skill.csv:note`, `hero_unique_candidates.csv` 의 `origin_kr · look_kr · battle_kr · name_kr`(`D.heroUniqueCandidates` 는 적재만 되고 읽는 곳 없음 `data.js:88, 392`).
- 규모: 메모 열 1,545 셀 / 약 **159,651 자** (balance.csv 497행 72,556자 · mastery_node 19,631 · hero_unique_candidates 7,418 …) → **번역 대상 아님**.

**표시되는 열**(41개 CSV 파일, 53개 `_kr`/`_en` 쌍): 아래 표 (비어 있거나 `-` 인 셀 제외)

| 파일.열 | 행 | 한국어 글자 수 | 어디에 |
|---|---|---|---|
| stage.csv `story_kr/en` | 35 채워짐(칸 I 에만, 나머지 `-` → `data.js:169-170` 이 칸 I 글로 채움) | 12,638 | 출정 창 이야기 |
| monster.csv `story_kr/en` | 120 | 12,548 | 도감 몬스터 툴팁 (상한 `STORY_MAX` kr 155 · en 235 — `test.js:621`) |
| skill.csv `desc_kr/en` | 101 | 5,088 | 스킬 설명 틀 (`{n}{d}{h}{k}{s}{v}{v2}{m}{f}{t}{i}{c}{x}{p}{r}` 자리) |
| advance_node `desc` / `bonus` | 135 / 135 | 2,425 / 2,325 | 전직 트리 칸 |
| visit_story `doing/done` | 84 | 1,836 / 1,605 | 수색 방문자 이야기 |
| explore_spot `story` | 21 | 1,000 | 탐험 |
| advance `desc` | 15 | 820 | 전직 갈래 |
| explore_story `text` | 28 | 741 | 탐험 |
| mastery_node `name` | 122 | 771 | `{group}` 템플릿 포함 |
| 그 밖 **이름 열** 40여 개(monster_name, stage_name, weapon_base, advance_node/common name, skill name, hero_name, item_base, sin_word …) | 합계 약 1,000 셀 | 약 5,500 | |
- 합계: **약 1,922 셀 · 47,048 자(한글 32,468자)**, 영어 쪽 91,174 자.

### 2-4. 저장(세이브)에 박힌 `{ko,en}` — zh 도입 시 가장 까다로운 곳
- `hero.name`, `hero.trait`, `item.name` 이 **세이브 JSON 에 `{ko,en}` 객체로 저장**된다 (`INTERFACE.md:191, 286`; `hero.js:104` namePool 항목을 그대로 보관; `item.js:693, 716` `N.composeName(...)` 결과를 `item.name` 에 보관).
- 기존 세이브 / 다른 플레이어 팀(arena importTeam, Firestore 로 오가는 `team`)에는 **zh 키가 없다** → `L()` 이 `v.ko` 로 떨어져 한국어 이름이 중문 화면에 섞임.
- 아이템은 `sins · words · baseId · group` 이 같이 저장돼 있어 이름을 **재조립 가능**(`item.js:13`). 영웅 이름·특성은 풀 항목의 안정 id 없이 `{ko,en}` 만 저장돼 있어(`hero_name.csv` 의 `name_id` 는 풀에 안 실린다 `data.js:384`) **ko 문자열로 역조회**하거나 로드 시 마이그레이션해야 한다. 골든(`golden.js:67`)은 `it.name.en` 을 베이스 식별에 쓰므로 en 은 건드리면 안 된다.
- 고블린 5종(`state.js:286-292`)은 코드 상수.

---

## 3. 조립/템플릿 텍스트 (어순·조사를 코드가 아는 곳)

### 3-1. 이름 조립 (`game_logic/naming.js` — "CSV 가 아니라 코드다", 이식 대상)
| 함수 | 위치 | ko 로직 | en 로직 |
|---|---|---|---|
| `hasBatchim(word)` | `naming.js:14-17` | 한글 음절 유니코드 연산으로 받침 판정 | — |
| `sinPhrase(preSin, sufSin, words)` | `naming.js:50-62` | `[A]의 ` (매직) / `[A]` + (받침? `과 ` : `와 `) + `[B]의 ` (레어 이상) — **조사 문자열이 코드 리터럴** (`'의 '`, `'과 '`, `'와 '`) | `[A] ` / `[A] and [B] ` — 형용사형 단어 |
| `composeName(preSin, base, sufSin, words)` | `naming.js:64-71` | `${앞머리}${base.ko}` | `${앞머리}${base.en}` |
| `eliteName(sin, base)` | `naming.js:73-77` | `${죄종.ko}의 ${base.ko}` | `${죄종.adj} ${base.en}` — **영어 형용사 필드(`adj`)가 죄종 마스터 데이터에 따로 있다** (`mock.js:SINS.adj`) |
| `wordsOf/wordAt` | `naming.js:32-37` | 단어 풀 `sin_word.csv` — **ko=명사(격노) / en=형용사(Raging)**: 언어마다 품사가 달라 CSV 한 행에 두 품사 | |
- 이름 규칙: ko "격노와 찬탈의 둔기", en "Raging and Usurping Mace". zh 는 "狂怒与篡夺之钉头锤" 식으로 **세 번째 구조**가 필요(`与/和` 선택은 받침이 아니라 고정, `之/的`, 형용사/명사 선택). `sinPhrase` 반환 형태 `{ko:[seg], en:[seg]}` 가 두 언어 하드코딩이라 `{zh:[seg]}` 추가 + `item.js`/`app.js:5686` 소비처 확인 필요(현재 화면은 조각이 아니라 완성 문자열만 쓴다 — ADR-0175).
- 호출: `item.js:693, 716`, `data.js:578`(정예 이름). 주입: `data.js:633, 750`, `NAMING = createNaming({sins: M.SINS})` `data.js:121`.

### 3-2. 접사(옵션) 한 줄 — `ui/mock.js`
| 함수 | 위치 | 어순 |
|---|---|---|
| `affixText(stat, v, fallback)` | `mock.js:290-293` | ko `"${이름} ${+값%}"` ↔ en `"${+값%} ${이름}"` (예: 데미지 +10% ↔ +10% Damage) |
| `itemAffixText(slot, stat, v)` | `mock.js:344-347` | 같음. 무기 칸의 `atk_pct` 만 「무기 데미지」로 이름 교체(`SLOT_LABELS` `mock.js:339`) |
| `itemAffixRangeText` | `mock.js:349-353` | `"${이름} ${범위}"` / `"${범위} ${이름}"` |
| `statValue / baseValue / rangeValue / pctText / pctNum` | `mock.js:297-336` | 언어 무관(부호·%·`~`) |
- 단위(%)·부호를 붙이는 곳은 이 파일 한 곳이다("단위를 붙이는 곳은 이 파일 하나").

### 3-3. 스킬 설명 — **스킬마다 제 틀**(skill.csv `desc_kr/desc_en`, ADR-0679)
- 틀의 `{n}{d}{h}{k}{s}{v}{v2}{m}{f}{t}{i}{c}{x}{p}{r}` 를 `tip.js:1217-1250` `descSlots` 가 채움. 조립은 `tip.js:1257-1262` `skillLines`: `L(def.desc).replace(/\{(\w+)\}/g, …)`.
- 값에 붙는 구절은 UI 사전: 단위 `UNIT`(`tip.js:1127-1132`) → `t('time.s')`, `t('sk.u.times')`; 수량 구절 `amountPhrase`(`tip.js:1197-1207`) → `sk.amt.physical/elem/heal/*Fx`; 보조 문장 `sk.line.proc`(`tip.js:1262`).
- **한국어 틀에 조사가 슬롯 뒤 고정 글자로 박혀 있다**: 예 `{d}를 입힙니다`, `{n}초마다`. 슬롯 값이 숫자·"공격력 × 120%" 식이라 조사 선택이 불필요하게 설계됨. zh 는 조사 문제 없음.
- 개수 구문: `{n}초마다 … {h} 베어 매번 {d}를 입힙니다` ↔ en "Every {n}s, cuts one enemy {h} in a row for {d} each" — **번역은 틀 단위**(슬롯은 번역이 안 되고 숫자)이므로 zh 틀을 쓰면 됨. 단 `skill.js:373-376` 이 ko↔en 자리 일치를 강제 → zh 에도 같은 검사 필요.

### 3-4. 조사(은/는/이/가) 처리 — 도우미 2개
| 도우미 | 위치 | 용도 |
|---|---|---|
| `pickJosa(word, withJong, withoutJong)` | `data.js:489-495` | 받침 있을 때/없을 때 쌍 선택, `으로/로` 는 ㄹ받침(jong 8)이면 `로` |
| `STORY_TOKEN` | `data.js:487` | 이야기 글의 `{m:<idx>}`, `{leader}`, `{m:1150\|이/가}` 문법 |
| `sayLine` + `SAY_TOKEN` | `battle.js:1763-1795` | 전투 로그 문장 틀 `log.say.*` 의 `{a\|이/가}` `{ico\|으로/로}` `{d\|을/를}` — **같은 `pickJosa` 사용** |
- 사용 규모: `i18n.js` 의 `{x|이/가}` 류 **16개**(주로 `log.say.*` 35개 중), CSV 이야기 글 안의 `{m:N\|이/가}` **55개**(monster.csv 30 · stage.csv 25).
- en 쪽 틀은 조사 쌍을 안 쓴다(조사 없는 문장). zh 틀도 조사 쌍을 안 쓰면 `pickJosa` 는 변경 불필요(단 `fillStory` 의 `bracket = lang === 'ko'` 와 `「」` 규칙은 정해야 함).

### 3-5. 복수형
- **영어만**: `t()` 가 값이 객체 `{one, other}` 면 수가 1 일 때 `one` (`i18n.js:64-66`) — 해당 `en` 항목 **38개**(`cm.goal.*`, `nt.*`, `help.search.*`, `rep.*`, `sk.u.times` …). 수 변수 `{n}` (없으면 `{v}`, 쉼표 포함 문자열도 수용).
- ko 는 단일 문자열. **zh 도 단일 문자열이면 변경 불필요** (`s && typeof s === 'object'` 만 거치므로).
- 수사/양사: 한국어의 `{n}마리/개/권/명/장/판/번` 이 키마다 박혀 있다 → zh 는 `只/个/本/名/张/场/次` 양사를 키별로 번역.

### 3-6. 그 밖의 조립
| 항목 | 위치 | 비고 |
|---|---|---|
| 마스터리 노드 이름의 `{group}` | `app.js:5990-5993` (`name.replace('{group}', groups)`), 검증 `hero.js:198-202` | 직업별 무기군 이름 이어 붙임 `L(g)` 를 `' / '` 로 결합 |
| 마스터리 효과 문장 | `i18n.js:2870-` 근방 "축마다 통째로" (조사를 문구에 포함) | 축마다 한 키 |
| 정예 특성 칩 | `mock.js:ELITE_TRAIT_*` + `i18n.js bt.trait.*` | |
| 스테이지 이름 | `data.js:462-468` `${장소} ${로마숫자}` | 로마숫자는 언어 공통(`mock.js:roman`) |
| 영웅 이니셜 | 현재 이니셜 글자 사용 안 함(주석뿐 `app.js:300`, `battle.js:976`) | |
| 로그 문장 | `battle.js:1763-1795` + `i18n.js:3490-3531` `log.say.*` 35개 | 끝말 축약형(「~습니다」 없이 명사로 끝) |
| 툴팁 | `tip.js`(1,525줄) — 모든 문장이 `t()`/`L()`; 영어 전용 문자열 조작 없음 | `toLowerCase`/`toUpperCase` 는 UI 코드에 없음(`battle.js:1388` 은 파일 경로 소문자화) |
| 영어 관사(a/an) · 소유격 `'s` 처리 | **없음** (코드가 영어 문법을 만들지 않고, 문장은 전부 사전 키) | |
| 정렬 | `localeCompare` 사용 0 | 문자열 정렬이 로케일에 의존하지 않음 |

---

## 4. 숫자·시간·날짜 포맷

| 함수 | 위치 | 언어 분기? |
|---|---|---|
| `fmtDuration(ms)` | `app.js:237-243` | 키 `time.hm / time.m / time.ms / time.s` (`i18n.js:711-714`; ko `{h}시간 {m}분`, en `{h}h {m}m`) — **사전으로 분기**(코드엔 분기 없음) |
| `fmtExpTime(ms)` | `app.js:245-249` | `H:MM:SS` — 언어 무관 |
| `agoText(at)` | `app.js:3547-3553` | `rep.ago.now/m/h/d` 키 |
| `clockText` / `clockLeftText` / `raid.js:clock` | `app.js:3724`, `battle.js:431`, `raid.js:15` | `m:ss` — 무관 |
| `pctNum / pctText` | `mock.js:303-305` | `n%` — 무관 |
| 천 단위 | `toLocaleString()` **인자 없이** ≈ 73 곳 (app.js 64 · battle 4 · tip 2 · raid 1 · devadmin/devsave 각 1) | **브라우저 로케일에 따름, `lang()` 과 무관**. K/M 약어는 **없다**(`Intl.*` 0 · `compact` 는 모바일 레이아웃 용어). `devadmin.js:38` 만 `'en-US'` 고정 |
| 날짜 | `app.js:1435` `new Date(saved.savedAt).toLocaleString()` 한 곳 | 로케일 = 브라우저 |
| 로마 숫자 | `mock.js:309` | 무관 |
| 소수점 | `toFixed` ≈ 40 곳 | 무관 |
→ 숫자 포맷에 언어 분기 코드는 사실상 없다. zh 에서 `万/亿` 단위가 필요하면 새로 만들어야 하나, 현재는 K/M 약어도 없음.

---

## 5. 폰트 · CSS

### 5-1. 폰트
- `style.css:187-188`: `--font-main: 'Pretendard', 'Malgun Gothic', sans-serif;` `--font-display: 'Cinzel', 'Times New Roman', serif;`
- 로드: `src/index.html:8-9` — Google Fonts **Cinzel**(라틴 대문자 세리프, 로고 대체글·일부 숫자 라벨 `style.css:340, 1993, 4433, 6471`) + jsDelivr **Pretendard dynamic-subset**(한글+라틴; **한자 없음**). 간체 한자는 OS 폴백에 의존 → `--font-main` 에 `'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei'` 추가 필요(스크래치패드에 Noto_Sans_SC.css 등 다운로드 흔적이 이미 있음).
- 폰트 크기 토큰: `--fs-2xs 9 / xs 12 / sm 13 / md 15 / lg 18 / xl 24` (`style.css:192-197`). **9px 한자는 거의 읽을 수 없다** → zh 에서 최소 크기 상향 필요.
- `font-weight: 700/900` 사용 115곳 — 한자 굵기 폰트 지원 확인.

### 5-2. `:lang()` · `html[lang]` 규칙 (총 6개, 전부 en 전용)
`style.css:3447`(`.sk-n` letter-spacing -.1px) · `4534-4535`(`.ng-name`, `.ng-role` line-height) · `5664-5665`(`.gb-jp-k` uppercase) · `5704`(`.gb-cname` uppercase). ko 전용 규칙은 없고, **ko 가 기본값이자 en 이 예외**인 구조다.

### 5-3. 글자 처리 속성
- `letter-spacing`: style.css 32 · raid.css 10 (로고 `letter-spacing: 3px` `style.css:341` 등).
- `text-transform`: 3곳(모두 위 `:lang(en)` 대문자).
- **`word-break: keep-all`: style.css 27 + tutorial.css 1 — 가장 큰 위험.** 한국어를 낱말 단위로만 끊기 위한 속성인데, 중국어는 공백이 없으므로 `keep-all` 이면 **문장이 한 줄로 안 끊기고 상자를 넘친다**. zh 에선 `:lang(zh) { word-break: normal; line-break: strict; }` 식 덮어쓰기가 필요(규칙 위치: `1101, 1133, 1156, 1218, 1275, 1457, 1641, 1671, 2250, 2253, 3224, 3444, 3534, 3546, 3652, 3701, 3805, 4552, 4598, 5069, 5363, 5383, 5854, 5992, 6226, 6564` 등).
- 폭 가정: `white-space: nowrap` 145 · `text-overflow: ellipsis` 44 · 고정 `width: Npx` 168 · `max-width: Npx` 17 · `overflow: hidden` 89 · `line-clamp` 3. 한자 한 글자는 한글과 비슷한 폭(전각)이라 ko 기준 레이아웃은 대체로 맞고, **영어 기준으로 줄인 곳은 없음**. 칸 폭이 정해진 곳(예 `ex .sk-n`, `gb-jp-k`) 점검 필요. `STORY_MAX`(155자 ko / 235자 en)처럼 글자 수 상한이 단정으로 걸린 곳(7장)은 zh 상한 별도 필요.
- 모바일: `mobile*.css` 에는 `:lang`/`keep-all` 없음. 모바일 고정(`MOBILE_LOCKED`) 상태.

---

## 6. 이미지/캔버스 속 글자

- **canvas/fillText/getContext/SVG `<text>` 사용: 0** (`ui/*.js` 검색; `assets` 의 svg 15개에도 `<text>` 없음). 즉 **런타임 글자 그리기 없음, 전부 DOM**.
- 이미지에 구운 글자 후보: **`src/assets/art/logo/the_seven.webp`** (워드마크 "THE SEVEN" 라틴 — `index.html:` `<img alt="THE SEVEN">`, 한국어/영어 공통 브랜드). 스테이지 배너는 마스크(`build_stage_banner.py`)로 글자 아님. 건물·배경·아이콘·초상·fx 는 글자 없음으로 보이나 **전수 육안 확인은 안 함**(webp 1,359장 · png 3,050장). 미니게임 장면(`minigames/*_scene.webp`)·건물 이미지·배경에 간판 글자가 있는지는 확인 필요.
- 로고 워드마크 대체글(`alt`)·`--font-display` 사용처(Cinzel)는 라틴 전용.

---

## 7. 테스트 · 검증기

| 검증 | 위치 | 방식 |
|---|---|---|
| **렌더러 한국어 리터럴 금지** | `src/ui/README.md:63` 규칙 "렌더러(app/battle/tip)에 한국어 리터럴 금지 — 주석 제외. 이게 누락 검증 기준이다" | **자동 단정 없음.** 저장소에 grep/린트 스크립트도 없다(scripts/ 에 i18n 관련 파일 없음). 내가 조사 중 정규식으로 확인한 결과: app.js·battle.js·tip.js·raid.js·fx.js 따옴표 안 한글(주석·에러 메시지 제외) **0건**, 예외는 `data.js:493` `'으로'`, `state.js:288-292·605-606` 고블린 이름, `naming.js:53-76` 조사 리터럴 |
| 사전 en 누락 검출 | `test.js:1744-1756` | `for lang of ['ko','en']` — `st.desc.*` 키 대상으로 **en 문구에 한글이 섞였는지**(`/[가-힣]/`)로 폴백을 잡는다. 전수 패리티 검사 아님(능력치 설명 키만) |
| 스킬 문장 ko/en | `test.js:13387-13416`(전 스킬 × 두 언어 · `{`/`undefined` 치환 잔재 · 쿨 강조) · `13496-13526`(피해 종류) · `13548-13566`(범위) · `14323-14349`(도감 툴팁) | `setLang(lang)` 로 두 언어를 돌린다 → **zh 를 돌리려면 `['ko','en']` 배열 5곳에 추가** |
| 이야기 | `test.js:600-640` | `story_kr/en` 자리표시자 · 짝(한쪽만 금지) · 상한 `STORY_MAX = {story_kr:155, story_en:235}` |
| 조사 | `test.js:5613`(`batchim`) · `~598-601`(`pickJosa`, `fillStory`) | |
| 미등록 키 | `test.js:1738-1742` | 키 그대로 노출 + HTML 이스케이프 |
| i18n 키 전수 패리티(ko 키 = en 키) | **없음** — STRINGS 가 키 하나에 `{ko,en}` 를 나란히 두는 구조 자체가 패리티 보증 수단이다(`i18n.js:3-4` "한 키에 ko/en 이 나란히") | zh 를 같은 객체에 `zh:` 로 얹으면 구조적으로 같은 보증이 유지됨 |
| 골든 | `dev/golden.js:40-48, 206` | CSV 원문 FNV 해시를 **설명용으로만**(판정 아님 · 2026-09-22). 컬럼 추가는 해시가 바뀌지만 빨간불 아님 — 단 `golden.json` 을 다시 찍을지 결정 필요 |
| 로더 파일 목록 | `test.js` "csv: 로더가 읽는 목록 = src/data/*.csv 전부" | zh 를 **새 CSV 파일**로 두면 이 단정이 빨간불 → 같은 CSV 안에 `_zh` 컬럼으로 두는 쪽이 규약에 맞음 |

---

## 8. 그 밖의 텍스트 출처

| 출처 | 위치 | 비고 |
|---|---|---|
| **도움말 탭** | `i18n.js` `help.*` **253 키 · 44,546 자(ko)** — 전체 사전 글자 수의 약 59% | `app.js:10264-10300` `helpSections()` 가 `topics` 맵으로 왼쪽 메뉴 순서 렌더; 검색은 **현재 언어의 제목·본문**을 거름 (`help.search.*`) — **한자 검색은 토큰화 없이 부분 일치**면 충분 |
| 튜토리얼 | `ui/tutorial.js`(184줄) 는 **글이 없다** — 대상 요소와 `describe()` 를 `app.js` 가 공급. 문구는 `i18n.js` `tutorial.*` 24키(968자) · `hint.*` 61키(3,085자) | |
| `document.title` | `i18n.js:260` `'app.title'`: "The Seven Simulation RPG — 화면 목업" / "… Screen Mockup", `applyDocumentLang()` 이 갱신 | 정적 `<title>` 은 `src/index.html:6`(한국어 "화면 목업") · 루트 `index.html:5`(영어) — 처음 한 프레임용 |
| 루트 `index.html` | 리다이렉트 + `<p>…로 이동</p>`(한국어) — `?lang=` 를 그대로 넘김 | |
| `src/index.html` 정적 텍스트 | 주석 외 글자 없음(`alt="THE SEVEN"`만). 모든 DOM 은 JS 가 채움 | |
| mock.js | 위 1-4 (219 쌍) | `mock.js:29` 주석: "영어는 CSV `_en` 컬럼의 초안 — 검수 후 CSV 로 이사하면 이 파일과 함께 죽는다" → 즉 CSV 이사 예정 |
| 배포/스토어 | `.github/workflows/pages.yml`(GitHub Pages) · `docs/client/ITCH_BUILD.md`(itch 업로드 zip 절차) · `scripts/build_deploy.py`(주석/공백 제거 후 토큰 스트림 동일 검증 — 언어 처리 없음, `--with-dev` 로 테스트 페이지 포함) | 스팀 매니페스트·메타 파일 없음. 스토어 설명·스크린샷 텍스트는 저장소 밖 |
| 모바일 레이어 | `mobile*.js` 의 `t()` 24호출, `i18n.js` `mobile.*` 67키 | 새 키가 많음 |
| 개발용 페이지 | `dev/test.html`·`sim.html`·`funnel.html` · `devadmin/devpalette/devcompare/devsave.js` — 한국어/영어 혼재(제품 아님) | 번역 불필요 |
| Firestore 기록 | `app.js:1533` `lang` 필드 | |
| 오디오 | 확인한 범위에서 음성/자막 없음 | |

---

## 9. 규모 추정

### 9-1. `ui/i18n.js` (실행해서 측정 — `STRINGS` 를 임시 복사본으로 import 한 읽기 전용 스크립트)
- **고유 키 2,045 개**(중복 0) · 모두 `{ko, en}` (+`lock:true` 29개) · `en` 이 `{one,other}` 인 것 38개 · `ko` 가 객체인 것 0
- 한국어 글자 수(공백·기호·`{x}` 포함) **75,529 자**, 그 중 한글 **47,441 자** / 영어 143,521 자(복수형 JSON 포함 근사)
- 치환 자리표시자 `{x}` 약 859 개 · HTML 태그를 담은 문구 150개(`<` 포함)
- 접두 분포(키 수/ko 글자): `help` 253/44,546 · `sk` 151/3,837 · `hint` 61/3,085 · `exp` 55/2,735 · `bt` 137/1,927 · `ch` 106/1,769 · `pro` 19/1,135 · `dp` 91/1,124 · `st` 66/1,092 · `rs` 41/1,043 · `ar` 49/994 · `tutorial` 24/968 · `ng` 24/954 · `cx` 59/800 · `cn` 77/747 · `mobile` 67 · `log` 35 …
### 9-2. CSV (화면에 나오는 열만)
- 41개 파일 · 53개 `_kr/_en` 쌍 · **1,922 셀 · 약 47,000 자(한글 32,468)**. 비중: 이야기 글 3종(stage 12.6k + monster 12.5k + visit 3.4k + explore 1.7k) ≈ 30k, 스킬/전직 설명 ≈ 13k, 이름 ≈ 5.5k
### 9-3. 코드 속 사전
- `mock.js` 219 쌍(대부분 짧은 이름 · 한글 약 3천 자) · 고블린 5 · naming 조사 3 · `data.js` 등 소량
### 9-4. 합계
- **번역 단위 약 4,200 건**(UI 키 2,045 + CSV 셀 1,922 + mock 219)
- **한국어 원문 약 12.5만 자**(UI 7.6만 + CSV 4.7만 + mock 0.3만) · 한글만 세면 약 8만 자
- 도움말 + 이야기 글 두 덩이가 전체의 약 **2/3**. 메모 열(description_kr 등 약 16만 자)은 **번역 제외**.
- 참고 비율: 영어는 한국어의 약 1.9~2.0 배 길다(UI) → 중국어(간체)는 한국어와 글자 수가 비슷하거나 약간 적을 것으로 보이며, 폭은 전각이라 ko 레이아웃에 가깝다.

---

## 10. zh 추가 시 작업 지점 체크리스트(발견 사항 기반, 구현은 하지 않음)

1. `LANGS` + 토글(`app.js:655`, `ui.langBtn`) + `applyDocumentLang`(lang 코드 `zh-Hans` 로 둘지 결정; 현재 'zh' 가 그대로 `<html lang>` 에 들어감)
2. `t()`/`L()` 의 폴백 체인(`?? e.ko` → zh→en→ko?) 결정 — 현재는 누락 시 한국어가 노출
3. i18n.js 2,045 키에 `zh:` 추가(형태는 그대로: `{ko,en,zh}`), 복수형 불필요
4. CSV `*_zh` 컬럼 추가(53쌍, 설계자 메모 제외) + `data.js` ~39곳 · `game_logic` ~20곳 · `app.js/battle.js` 재포장 ~12곳에서 `zh: r.xxx_zh` 전달
5. `mock.js` 219 쌍, `state.js` 고블린 5, `naming.js` 규칙(`zh` 배열/문자열), `affixText` 어순, `eliteName`
6. 저장된 `{ko,en}`(영웅 이름·특성·아이템 이름·arena 팀) 마이그레이션/폴백
7. `data.js:500`(「」) · `pickJosa` 불필요 확인 · `fillStory` lang 인덱싱
8. 폰트(Noto Sans SC 계열) · `word-break: keep-all` 28곳 · 9px/12px 최소 크기 · `:lang(zh)` 규칙
9. 로드 검증 약 20곳(2-2 표)에 zh 비어 있음 검사 추가 여부 · `skill.js:373-376` 자리 패리티
10. 테스트 `['ko','en']` 5곳 + `STORY_MAX` + 주요 단정에 zh 추가
11. 로고 워드마크(THE SEVEN) 번역 여부 · 정적 `<title>`
12. 문서: `src/data/README.md` 공통 규약, `src/ui/README.md` 다국어 절, `docs/client/INTERFACE.md`(createNaming · 세이브 스키마 `{ko,en}`), CLAUDE.md 규칙 6("다국어 ko/en 나란히")
