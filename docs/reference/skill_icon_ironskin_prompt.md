# 스킬 아이콘 프롬프트 — 아이언 스킨 (`war_ironskin`)

> 대상: `src/data/skill.csv` 의 `war_ironskin` (전사 · 아이언 스킨 — 한동안 자신의 방어력과 모든 저항을 크게 올린다)
> 짝 문서: [.claude/skills/icon-prompt/skill_tiles.md](../../.claude/skills/icon-prompt/skill_tiles.md) §3 (전사 타일) · [prompt_template.md](../../.claude/skills/icon-prompt/prompt_template.md) (금지어)
> 상태: **설치 완료** — 생성 시트 `src/assets/art/icons_source/skills/source/sheet_06_ironskin.png`의 오른쪽 아래 안을 채택해 `war_ironskin.png`와 게임용 WebP로 설치했다(2026-09-30).

## 1. 무엇을 그리나

사용자가 정한 방향 (2026-09-30, 말한 그대로):

- 「그냥 상반신만 그리던가」
- 「갑옷느낌으로」
- 「그냥 몸만 그리는데 디아블로2의 아이언스킨을 참조해」

풀어 쓰면 — **전사의 상반신 하나.** 몸 자체가 갑옷처럼 단단해 보여야 한다. 무기 · 방패 · 화살 · 충격 표시 같은 곁가지는 넣지 않는다.

**디아블로2 원본 아이콘** — `http://classic.battle.net/images/battle/diablo2exp/images/barbarian/ironskin.jpg` (48px).
왼쪽에 팔을 내리고 선 남자의 검은 실루엣이 있고, 오른쪽 위에서 날아온 화살이 가슴에 맞고 아래로 튕겨 나간다.
여기서 가져오는 것은 **서 있는 몸의 실루엣**뿐이다 — 화살은 뺀다.

## 2. 스타일 — 기존 전사 세트와 같은 단색 실루엣

첨부할 그림 (스타일 참조 — 소재와 구도는 베끼지 않는다):

| 첨부 | 왜 |
|---|---|
| `src/assets/art/icons/skills/source/sheet_03_warrior.png` | 같은 직업의 전사 7장이 나온 시트 — 굵기 · 덩어리 · 흰 틈의 기준 |
| `src/assets/art/icons/skills/source/sheet_02_mono_anchor.png` | 스킬 세트 전체의 앵커 |

규칙은 넷이다.

- **검정 단색 실루엣** — 외곽선 · 음영 · 그라디언트 · 색 없음
- **안쪽 디테일은 흰 틈으로** 판다 — 선을 그리는 것이 아니라 덩어리를 가른다
- **굵게** — 실제 칸이 28 ~ 44px 이라 가는 선과 잔 디테일은 사라진다
- **흰 배경** — 「투명 배경」이라고 쓰면 체커보드가 픽셀로 구워진다

## 3. 프롬프트 (그대로 복사)

네 가지를 한 장에 받아 고른다.

```text
Use the attached sheets for RENDERING STYLE ONLY — solid black silhouette, no
outline, no shading, no gradient, no color, flat chunky masses, never thin
lines. Do NOT copy their subjects or their compositions; every icon below is a
new drawing.

2048x2048 sheet, 2x2 grid, 4 fantasy skill icons on a PLAIN SOLID WHITE
background. Each icon is centered in its cell and fills about 70% of it, with
white margin all around — no icon may touch a grid line, the sheet edge, or
another icon. No text anywhere, no letters, no runes. No drop shadows, no
background scene, no frames.

All four icons show the same subject: the UPPER BODY of a barbarian warrior —
head, thick neck, broad shoulders, chest and waist, cropped at the waist. The
head is a plain silhouette with no face. BODY ONLY: no weapon, no shield, no
arrow, no impact burst, no effect shape of any kind.

The body itself must read as armour — skin forged into iron. Show it with
clean white gaps cut through the black silhouette: layered shoulder plates, a
breastplate-shaped chest, banded plates across the belly, a few big round
rivets. Every gap is at least as thick as a finger. Keep the plates few and
large so the icon still reads at 32 pixels.

Heavy, still, immovable. All four share the same visual weight and the same
amount of detail.

1. Seen straight from the front, arms hanging at the sides and cropped near
   the elbows, a clear gap between each arm and the waist.
2. Turned three-quarters, one shoulder pushed toward the viewer, the far arm
   mostly hidden behind the chest.
3. A closer crop from the chest up — the shoulders fill the width, the shoulder
   plates are the biggest shapes in the icon.
4. Seen from the front like number 1, but with only three or four very large
   plates and no small rivets.
```

**한 장만 받을 때** — 위 글의 `2048x2048 sheet, 2x2 grid, 4 fantasy skill icons` 를 `1024x1024 image, ONE fantasy skill icon` 으로, 「All four …」 두 문장과 번호 목록을 지우고 1번 문장만 남긴다.

## 4. 받은 뒤 — 자르기 · 칠하기 · 설치

1. **원본 시트를 둔다** — `src/assets/art/icons_source/skills/source/sheet_06_ironskin.png` (게임이 안 읽는 자리)
2. **자른다** — 512 투명 PNG 넷이 나온다(여백 88% · 중앙 맞춤까지 한 번에)
   ```
   python .claude/skills/icon-prompt/cut.py src/assets/art/icons_source/skills/source/sheet_06_ironskin.png --grid 2x2 --out <임시 폴더>
   ```
3. **고른다** — 넷을 28 · 32 · 44px 로 줄여 기존 전사 아이콘(`icons_source/skills/war_bash.png` 등) 옆에 놓고 본다. 판이 뭉개지지 않고 몸으로 읽히는 것을 고른다
4. **칠한다** — 알파는 그대로 두고 RGB 만 회백 `#d8d9e6` 으로 채워 `src/assets/art/icons_source/skills/war_ironskin.png` 로 저장한다(기존 세트가 전부 이 색이다 — 어두운 화면에서 검정은 안 보인다)
   ```python
   from PIL import Image
   im = Image.open('<고른 타일>.png').convert('RGBA')
   out = Image.new('RGBA', im.size, (216, 217, 230, 0)); out.putalpha(im.getchannel('A'))
   out.save('src/assets/art/icons_source/skills/war_ironskin.png')
   ```
5. **게임용 그림을 짓는다** — 256 WebP 한 장. ⚠ `python scripts/build_icons.py` 를 통째로 돌리면 기존 아이콘 전부를 다시 인코딩하고 `icons/*/source/` 의 시트를 옮긴다 — **이 한 장만** 짓는다
   ```python
   import sys; sys.path.insert(0, 'scripts')
   import build_icons as b
   from PIL import Image
   src = b.SRC / 'skills' / 'war_ironskin.png'; out = b.OUT / 'skills' / 'war_ironskin.webp'
   out.write_bytes(b.encode(Image.open(src).convert('RGBA').resize((b.SIZE, b.SIZE), Image.LANCZOS)))
   ```
6. **잰다** — `python .claude/skills/icon-prompt/measure.py --type skill src/assets/art/icons_source/skills/war_ironskin.png` → `long 87~90 · cx · cy 47~53` 이면 통과(`colors` · `edge` · `dark` 의 `!` 는 단색 세트라 정상이다)
7. **화면** — 코드 수정은 없다. `src/ui/mock.js:SKILL_ICON_FILES` 에 `war_ironskin` 이 이미 있어 파일만 서면 뜬다. 확인은 `index.html?dev=battle&tab=codex&cx=skill&lang=ko` 의 전사 줄 끝
8. **문서** — `src/assets/art/README.md` 「icons/skills/」 트리에 `war_ironskin.png` 줄을 넣고 표의 전사 행을 「8종 전부」로 · `skill_tiles.md` §0 · §3 의 「발주 대기」를 걷는다

---
*마지막 업데이트: 2026-09-30*
