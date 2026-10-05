# 기본 스킬 이펙트 — 시트 발주 프롬프트 (39스킬 · 40장)

기본 다섯 직업 스킬 39종(결투는 표식 · 보호 두 장 → 40장)의 관전 이펙트 그림을 **Gemini 3×3 시트 다섯 장**으로 뽑는 발주문이다.
표시 규격은 [SCREEN_DESIGN §4-2](../client/SCREEN_DESIGN.md) 「연출」 · [ADR-0512](../client/adr/0512-직업-스킬-이펙트는-초상-둘레-안에-머문다.md)(초상 둘레 안)를 따르고, 문법은 2026-10-06 설치본 40장을 **91px 초상 위에서 실측**한 결과(§1)로 정했다.

## 0. 쓰는 법

1. **시트 1(전사)부터** 뽑는다. 첨부 = 영웅 초상 1장(`src/assets/art/faces/gemini/hero/warrior_1.webp`) — 그림결(굵은 검정 외곽선 · 셀 음영 한 단)과 **흉상 구도**를 이 한 장이 나른다
2. 시트 1 에서 마음에 드는 판이 나오면 **시트 2~5 는 초상 + 그 시트를 함께 첨부**한다(첫 줄이 이미 그렇게 적혀 있다)
3. 각 시트는 아래 코드블록 **전문을 그대로** 붙인다. 칸 번호는 정리용이고 그림에는 안 들어간다
4. 검수 — 칸을 초상 한 장 위에 얹어 **91px 로 줄여 본다**(실제 표시 크기). ① 무슨 스킬인지 모양으로 읽히나(색을 가려도) ② 타격이 아닌 칸이 얼굴을 비웠나 ③ 머리에 쓴 물건(투구 · 왕관 · 화관 · 헤드폰)처럼 보이지 않나 ④ 가는 선이 사라지지 않았나 ⑤ 분홍 · 자홍이 섞이지 않았나

**배경이 자홍(#FF00FF)인 이유** — 생성기는 투명을 못 낸다. 흰 배경은 상아색 심을 먹고, 초록 배경은 회복 · 독 · 바람 색과 부딪힌다. 이펙트 팔레트(`style.css --fx-*`)에 없는 유일한 색상이 자홍이다(그림자 보라 `#725f93` 도 키잉 판정 `min(r,b) − g` = 19 로 안전).

## 1. 문법 — 91px 흉상 위에서 나온 규칙

설치본 40장을 도감 이펙트 탭(초상 91px)과 실제 관전에서 재생해 본 결과다. 낱장 그림은 좋았고, 실패는 전부 **초상 위에서의 구도**였다.

| 실측된 실패 | 그래서 이 발주의 규칙 |
|---|---|
| 머리 둘레 테 · 고리가 **머리에 쓴 물건**으로 읽힌다(아이언 스킨 = 뿔 투구 · 워 크라이 = 헤드폰 · 홀리 실드 = 왕관 · 타운트 = 가시 화관) | **타격만 가운데를 친다.** 나머지는 얼굴을 비우고 **가장자리에 산다** — 아래 변에서 솟거나 · 양옆 변에 서거나 · 네 귀퉁이에서 번쩍인다. 머리를 감싸는 고리 · 테는 안 쓴다 |
| 색만 다르고 모양이 같은 짝이 91px 에서 한 가족이 된다(차지/러시 · 스나이프/래피드/피어싱 · 배틀오더스/헤이스트 · 포커스/리젠 · 금빛 머리 테 넷 · 심판/리프 어택) | **스킬마다 자리 × 모양이 다르다** — 아래 표. 색을 가려도 갈려야 한다 |
| 가는 줄은 안 보인다(스나이프 칸 점유 5.7% · 체인 8.7% · 힐 10.9%) | **모든 모양은 굵고 밝은 속을 가진다** |
| 「땅」 구도의 고리가 흉상의 가슴에 떨어져 **목걸이 · 깃**이 된다(리프 어택 · 배틀오더스 · 마이트) | 땅은 **칸의 아래 변**이다 — 솟는 것은 아래 변에서 솟고, 가슴 높이에 눕는 타원은 안 쓴다 |
| 어두운 색(흙 · 그림자 · 독)은 어두운 초상에 묻힌다(어스스플릿 = 얼굴 위 갈색 잔가지) | 어두운 계열도 **밝은 속 · 밝은 모서리**를 단다 |

**자리 표 — 타격이 아닌 22장**

| 자리 | 스킬(모양) |
|---|---|
| 아래 변에서 솟는다 | 타운트(붉은 가시 부채) · 아이언 스킨(아래 귀퉁이 강철판) · 마이트(낮은 불길 띠) · 파나티시즘(바람 소용돌이 띠) · 디파이언스(작은 방패 조각 줄) · 힐링 라이트(초록 알갱이 · +) · 힐(큰 + 하나) |
| 양옆 변에 선다 | 배틀오더스(오르는 꺾쇠 탑) · 홀리 실드(뾰족 빛 창판) · 인챈트(오른 변 불 리본) · 포이즌 애로우(흘러내리는 독) · 프레이어 오브 리제너레이션(타고 오르는 덩굴) · 프로즌 월(얼음 문) · 헤이스트(아래 귀퉁이 날개) |
| 귀퉁이 · 바깥 둘레 | 워 크라이(바깥으로 튀는 함성 짧은 줄) · 듀얼 보호(네 귀퉁이로 뻗는 붉은 X 끝) · 포커스(안을 겨누는 네 결정) · 그레이스(위 귀퉁이에서 쏟아지는 빛) |
| 약화 — 내리누르거나 묶는다 | 듀얼 지목(조준 꺾쇠 + X) · 페니턴스(위 양옆에서 내려가는 꺾쇠 — 배틀오더스의 거울) · 바인드(가로지르는 사슬) |
| 가로지른다 | 피어싱 샷(아래 3분의 1을 꿰는 줄) |

## 2. 시트 1 — 전사 8 + 아이언 스킨 다른 안

```
Match the attached portrait's rendering exactly — same thick black outlines, same flat
cel shading with one shadow tone and one small highlight, same dark-fantasy palette.
Draw only spell and impact effects that flash over a portrait like this for half a second.
The portrait is a head-and-shoulders bust: the face fills the middle, the shoulders fill the bottom.
Strikes hit the middle. Every other effect keeps the face clear and lives at the edges:
rising from the bottom edge, standing along the side edges, or flashing in the corners.
Every shape is fat and bold with a bright pale core, so it still reads at thumbnail size.

2048x2048 sheet, 3x3 grid, nine separate effects, straight 16px pure black gridlines,
solid flat pure magenta #FF00FF background, no text anywhere.
Nothing in the effects may be pink or magenta.
Each cell is the portrait's frame: effects may reach close to the cell edges, leaving a thin
strip of background before the gridlines.

1. Three fat parallel claw slashes tearing diagonally across the middle from upper left to lower right, tapered ends, bright ivory-white cores with pale sky-blue rims.
2. Two fat curved crescent slashes crossing in a big X over the middle, bright ivory-white cores with pale sky-blue rims, a white spark where they cross.
3. Chunky pale sand-colored rock shards blasting up from the bottom edge, a fat jagged crack shooting up through the middle, light ochre with bright chipped edges.
4. A big explosion of round pale dust clouds and rock chips bursting out from the lower middle, three fat white speed streaks diving down into it from above.
5. A fan of five big blood-red jagged spikes bursting up and outward from the bottom edge, bright coral cores, the face left clear.
6. Eight short fat old-gold burst dashes shooting outward toward the edges and corners all around, like a war cry shaking the air, the face left clear.
7. Two tall stacks of three fat old-gold chevrons rising along the left and right edges, pointing up, bright pale-gold cores.
8. Heavy overlapping steel-grey armor plates rising from the bottom left and bottom right corners over the shoulders, a hard white glint on each plate.
9. Four big hard steel-grey four-point glints flashing in the four corners, short bright metal sparks around each.
```

## 3. 시트 2 — 기사 7 + 오오라 둘

```
Match the attached portrait and the attached effect sheet exactly — same thick black outlines,
same flat cel shading with one shadow tone and one small highlight, same fat shape size.
Draw only spell and impact effects that flash over a portrait like this for half a second.
The portrait is a head-and-shoulders bust: the face fills the middle, the shoulders fill the bottom.
Strikes hit the middle. Every other effect keeps the face clear and lives at the edges:
rising from the bottom edge, standing along the side edges, or flashing in the corners.
Every shape is fat and bold with a bright pale core, so it still reads at thumbnail size.

2048x2048 sheet, 3x3 grid, nine separate effects, straight 16px pure black gridlines,
solid flat pure magenta #FF00FF background, no text anywhere.
Nothing in the effects may be pink or magenta.
Each cell is the portrait's frame: effects may reach close to the cell edges, leaving a thin
strip of background before the gridlines.

1. A big heater-shield-shaped flash of pale gold light slammed over the middle and cracked through its center, chunky white shards bursting off its edges.
2. Two tall pointed panels of pale gold holy light standing along the left and right edges like church window panes, small sparkles at their tips, the face left clear.
3. A huge fat wedge of steel-white force ramming in from the left edge into a big jagged crash burst in the middle, chunky dust puffs flung back.
4. Three short fat steel-white thrust jabs striking one spot in the middle from the left, the upper right and the lower right, a star spark at each tip.
5. Four fat crimson corner brackets locking onto the face like a target reticle, a bold crimson X across the middle.
6. Four fat crimson light streaks shooting out to the four corners from behind the face, like a big X whose middle is hidden.
7. A long ribbon of orange-red fire climbing the right edge from the bottom corner to the top corner, flame tongues and embers peeling off it, bright yellow core.
8. A low wall of red-gold flames burning along the whole bottom edge, licking up to the shoulders, bright yellow cores.
9. Fast yellow-gold wind swirls whipping along the whole bottom edge and curling upward at both ends.
```

## 4. 시트 3 — 궁수 6 + 디파이언스 + 다른 안 둘

⚠ 7번(디파이언스)은 시트 2 의 8 · 9번과 같은 「아래 변 띠」 오오라다 — 시트 2 를 첨부하면 맞는다.

```
Match the attached portrait and the attached effect sheet exactly — same thick black outlines,
same flat cel shading with one shadow tone and one small highlight, same fat shape size.
Draw only spell and impact effects that flash over a portrait like this for half a second.
The portrait is a head-and-shoulders bust: the face fills the middle, the shoulders fill the bottom.
Strikes hit the middle. Every other effect keeps the face clear and lives at the edges:
rising from the bottom edge, standing along the side edges, or flashing in the corners.
Every shape is fat and bold with a bright pale core, so it still reads at thumbnail size.

2048x2048 sheet, 3x3 grid, nine separate effects, straight 16px pure black gridlines,
solid flat pure magenta #FF00FF background, no text anywhere.
Nothing in the effects may be pink or magenta.
Each cell is the portrait's frame: effects may reach close to the cell edges, leaving a thin
strip of background before the gridlines.

1. One very long fat pale-mint arrow streak shooting in from the left edge into the middle, a big sharp white four-point star at the hit.
2. Three short fat pale-mint arrow streaks stacked and staggered, all slamming in from the left into the middle, a white spark at each tip.
3. Five fat pale-mint arrow streaks raining steeply down from the upper left all at once, a small white burst where each lands.
4. One fat pale-mint streak curving in a big hook from the upper right down into the middle, where a chunk of steel armor cracks and flies apart.
5. One long fat pale-mint streak shooting straight across the lower third from the left edge out the right edge, punching through three small rings, the face left clear.
6. Thick olive-green poison dripping down both side edges, fat drops falling, bright yellow-green highlights, the face left clear.
7. A row of five small steel-blue shield-shaped light shards standing along the whole bottom edge, bright pale-blue cores.
8. One fat pale-mint arrow streak diving from the upper left corner into the middle, a big white star burst and a ring of mint shards at the hit.
9. Two fat olive-green poison drops falling at the upper left and upper right corners, splashing into bursts at the bottom corners.
```

## 5. 시트 4 — 마법사 8 + 포커스 다른 안

```
Match the attached portrait and the attached effect sheet exactly — same thick black outlines,
same flat cel shading with one shadow tone and one small highlight, same fat shape size.
Draw only spell and impact effects that flash over a portrait like this for half a second.
The portrait is a head-and-shoulders bust: the face fills the middle, the shoulders fill the bottom.
Strikes hit the middle. Every other effect keeps the face clear and lives at the edges:
rising from the bottom edge, standing along the side edges, or flashing in the corners.
Every shape is fat and bold with a bright pale core, so it still reads at thumbnail size.

2048x2048 sheet, 3x3 grid, nine separate effects, straight 16px pure black gridlines,
solid flat pure magenta #FF00FF background, no text anywhere.
Nothing in the effects may be pink or magenta.
Each cell is the portrait's frame: effects may reach close to the cell edges, leaving a thin
strip of background before the gridlines.

1. One big round explosion of fat curling flame tongues around a bright yellow core in the middle, five embers flying out, orange-red.
2. A tall wall of fat flame tongues roaring up from the bottom edge over the middle, the center flame tallest, orange-red with bright yellow cores.
3. A star of five big faceted ice crystals bursting out from the middle, chunky frozen chips around them, pale ice-blue with white cores.
4. A wide burst of many fat ice spikes all pointing outward, exploding away from the middle in a ring, a frosty white flash inside, pale ice-blue.
5. One fat jagged lightning bolt striking straight down from the top edge into a big crackling star in the middle, pale yellow with a white core.
6. One fat jagged lightning arc tearing across from the left edge to the right edge through the middle, three bright crackling stars along it, pale yellow.
7. Four fat sapphire-blue crystal shards in the four corners, points aimed inward at the face, small sparkle trails, the face left clear.
8. Fat jagged ice crystals erupting from the bottom edge and climbing both side edges up to the top corners like a frozen gate, the face left clear.
9. A tight cluster of three sapphire-blue crystal shards rising from the bottom middle, sparkles drifting upward.
```

## 6. 시트 5 — 사제 8 + 힐 다른 안

```
Match the attached portrait and the attached effect sheet exactly — same thick black outlines,
same flat cel shading with one shadow tone and one small highlight, same fat shape size.
Draw only spell and impact effects that flash over a portrait like this for half a second.
The portrait is a head-and-shoulders bust: the face fills the middle, the shoulders fill the bottom.
Strikes hit the middle. Every other effect keeps the face clear and lives at the edges:
rising from the bottom edge, standing along the side edges, or flashing in the corners.
Every shape is fat and bold with a bright pale core, so it still reads at thumbnail size.

2048x2048 sheet, 3x3 grid, nine separate effects, straight 16px pure black gridlines,
solid flat pure magenta #FF00FF background, no text anywhere.
Nothing in the effects may be pink or magenta.
Each cell is the portrait's frame: effects may reach close to the cell edges, leaving a thin
strip of background before the gridlines.

1. A huge downward-pointing sword of pale gold light stabbing from the top edge into the middle, short fat light rays bursting at the point.
2. Many fat round green light motes and plus-shaped sparkles rising from the bottom edge, thickest at the bottom, bright mint cores, the face left clear.
3. Broad rays of warm pale-gold light pouring down diagonally from the two top corners toward the shoulders, the face left clear.
4. A pair of pale-mint feathered wings flaring out from the lower left and lower right corners, short speed lines streaking upward.
5. One big fat green plus-shaped flash rising from the bottom middle over the chest, small green motes popping around it.
6. Curling green vines with small leaves growing up both side edges from the bottom corners, a few light motes drifting up, the face left clear.
7. Two stacks of three fat dark-violet chevrons pointing down along the upper left and upper right edges, sinking, bright lavender cores.
8. Two thick dark-violet chains wrapping straight across the middle and the lower third, fat links with bright lavender highlights.
9. One big fat green plus-shaped flash in the lower right corner, small green motes popping around it.
```

## 7. 칸 → 파일

파일명 = `fx/skills/<파일>.webp` · 사건 · 움직임은 `ui/skill_art.js:SKILL_ART` 의 값 이름이다(움직임은 제안 — 자리에 맞춘 기존 이름). 「다른 안」 칸은 같은 파일의 후보이고 둘 중 하나만 설치한다.

| 시트-칸 | 스킬 | 파일 | 사건 | 움직임 |
|---|---|---|---|---|
| 1-1 | 배시 | `war_bash` | hit | slash |
| 1-2 | 더블스윙 | `war_doubleswing` | hit | cross |
| 1-3 | 어스스플릿 | `war_quake` | hit | ground |
| 1-4 | 리프 어택 | `war_leap` | hit | land |
| 1-5 | 타운트 | `war_taunt` | buff | burst |
| 1-6 | 워 크라이 | `war_shout` | buff | wave |
| 1-7 | 배틀오더스 | `war_battleorders` | buff | orders |
| 1-8 · 1-9 | 아이언 스킨 (강철판 · 귀퉁이 번쩍임) | `war_ironskin` | buff | shell · burst |
| 2-1 | 스마이트 | `kni_smite` | hit | burst |
| 2-2 | 홀리 실드 | `kni_holyshield` | buff | shell |
| 2-3 | 차지 | `kni_charge` | hit | thrust |
| 2-4 | 러시 | `kni_rush` | hit | burst |
| 2-5 | 듀얼 — 지목 | `kni_duel` | bad | inward |
| 2-6 | 듀얼 — 보호 | `kni_duel_guard` | buff | burst |
| 2-7 | 인챈트 | `kni_enchant` | buff | orders |
| 2-8 | 마이트 | `kni_might` | buff (도감만) | orders |
| 2-9 | 파나티시즘 | `kni_fanaticism` | buff (도감만) | sweep |
| 3-1 · 3-8 | 스나이프 (왼쪽에서 · 위 귀퉁이에서) | `arc_snipe` | hit | thrust · strike |
| 3-2 | 래피드 샷 | `arc_rapid` | hit | thrust |
| 3-3 | 멀티샷 | `arc_multishot` | hit | rain |
| 3-4 | 가이디드 애로우 | `arc_guided` | hit | strike |
| 3-5 | 피어싱 샷 | `arc_pierce` | buff | sweep |
| 3-6 · 3-9 | 포이즌 애로우 (흘러내림 · 떨어지는 방울) | `arc_poison` | buff | sink |
| 3-7 | 디파이언스 | `kni_defiance` | buff (도감만) | shell |
| 4-1 | 파이어볼 | `mag_fireball` | hit | burst |
| 4-2 | 인페르노 | `mag_inferno` | hit | pillar |
| 4-3 | 아이스 블라스트 | `mag_iceblast` | hit | burst |
| 4-4 | 프로스트 노바 | `mag_frostnova` | hit | wave |
| 4-5 | 라이트닝 | `mag_lightning` | hit | strike |
| 4-6 | 체인 라이트닝 | `mag_chain` | hit | thrust |
| 4-7 · 4-9 | 포커스 (귀퉁이 결정 · 아래 결정 다발) | `mag_focus` | buff | inward · orders |
| 4-8 | 프로즌 월 | `mag_frozenwall` | call | pillar |
| 5-1 | 심판 | `pri_judgment` | hit | strike |
| 5-2 | 힐링 라이트 | `pri_heal` | heal | heal |
| 5-3 | 그레이스 | `pri_grace` | buff | sink |
| 5-4 | 헤이스트 | `pri_haste` | buff | orders |
| 5-5 · 5-9 | 힐 (아래 가운데 + · 오른 아래 귀퉁이 +) | `pri_cure` | heal | burst |
| 5-6 | 프레이어 오브 리제너레이션 | `pri_regen` | buff | heal |
| 5-7 | 페니턴스 | `pri_penitence` | bad | sink |
| 5-8 | 바인드 | `pri_bind` | bad | inward |

## 8. 확정 사항과 부딪히는 것 — 설치 전에 정한다

- **ADR-0515 의 전사 모양 넷이 바뀐다** — 타운트 붉은 고리 → 붉은 가시 부채 · 워 크라이 금빛 음파(고리) → 바깥으로 튀는 함성 줄 · 아이언 스킨 강철 막 → 강철판 · 귀퉁이 번쩍임 · 리프 어택 착지 파문 → 먼지 폭발. 설치할 때 SCREEN_DESIGN §4-2 를 먼저 고치고 새 ADR 이 0515 의 해당 줄을 대체한다
- **「버프 그림의 중앙은 비운다」(ADR-0515)는 남는다** — 비우는 방식이 「머리를 감싸는 테」에서 「가장자리에 산다」로 바뀐다
- **코드 조합(`skill_looks.js`)과 다르게 읽은 것** — 스마이트(빛기둥 → 방패 모양 섬광 · 데이터가 「방패로 후려친다」) · 인챈트(성광 → 불 · 데이터가 화염 추가타) · 헤이스트(꺾쇠 → 날개) · 페니턴스(그림자 + 땅 고리 → 내려가는 꺾쇠) · 리젠(문양 → 덩굴) · 심판(빛기둥 → 빛의 칼) · 오오라 셋(연출 없음 → 아래 변 띠, 도감 미리보기용)

## 9. 후처리 메모

- **절단** — 16px 검정 격자를 찾아 칸을 자른다. 칸 안 그림도 검정 외곽선이라 격자는 「가로 · 세로로 끝까지 이어진 검정 줄」로만 찾는다
- **키잉** — 알파 = `min(r,b) − g` 를 경사로(40 이하 불투명 · 120 이상 투명). 외곽선과 배경 사이 자홍 섞인 가장자리는 **배경색을 역합성**(`c' = (c − (1−a)·#FF00FF) / a`)해 보라 테를 뺀다
- **칸을 통째로 줄인다 — bbox 로 다시 가운데 맞추지 않는다.** 이번 문법은 **칸 안의 자리**(아래 변 · 양옆 · 귀퉁이)가 뜻이다. 옛 설치본처럼 알파 bbox 를 잘라 86% 로 가운데 맞추면 아래 변에서 솟는 그림이 가운데로 끌려 올라온다. 칸 안쪽(격자 안 몇 px)을 정사각으로 잘라 384×384 WebP(알파) q90 으로 줄이고, 화면 쪽 `SKILL_ART.size` 를 칸 = 초상 틀이 되는 값으로 맞춘다
- ⚠ `icon-prompt/cut.py` 는 흰 · 체커보드 배경만 안다 — 자홍 시트는 키잉 한 줄을 바꾼 절단기가 따로 필요하다

---
*마지막 업데이트: 2026-10-06*
