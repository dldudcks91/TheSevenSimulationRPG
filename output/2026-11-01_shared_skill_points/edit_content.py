"""Targeted text corrections for the shared skill-point rule. Run once."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def read(name):
    return (ROOT / name).read_text(encoding="utf-8")


def write(name, text):
    (ROOT / name).write_text(text, encoding="utf-8", newline="")


def row(text, prefix, replacement):
    lines = text.splitlines(keepends=True)
    found = [i for i, line in enumerate(lines) if line.startswith(prefix)]
    assert len(found) == 1, (prefix, found)
    lines[found[0]] = replacement + "\n"
    return "".join(lines)


def entry(text, key, ko, en):
    marker = f"    '{key}': {{"
    start = text.index(marker)
    end = text.find("\n", start)
    if "}" not in text[start:end]:
        end = text.index("\n    },", start) + len("\n    },")
    else:
        end -= 0
    body = marker + " ko: " + json.dumps(ko, ensure_ascii=False) + ", en: " + json.dumps(en, ensure_ascii=False) + " },"
    return text[:start] + body + text[end:]


name = "src/data/balance.csv"
s = read(name)
s = row(s, "advance_unlock_level,", "advance_unlock_level,30,fixed,0,전직 해금 및 메인 Lv1 학습 가능 레벨 — 학습은 기존 공용 스킬 포인트 1 소비 · 전직 자체는 포인트를 지급하지 않는다 (2026-11-01 사용자 정정 · skill_design §4)")
s = row(s, "mastery_point_per_level,", "mastery_point_per_level,1,fixed,0,레벨업 1회당 공용 스킬 포인트 — 저장 필드 masteryPoints · 죄종·직업 마스터리와 전직 메인·꼬리가 같은 지갑을 쓴다 · 전직 전용 지급 없음 (2026-11-01 사용자 정정 · skill_design §4)")
s = row(s, "advance_skill_level_interval,", "advance_skill_level_interval,5,fixed,0,전직 메인 스킬 단계의 영웅 레벨 해금 간격 — Lv30·35·40·45·50에 메인 Lv1·2·3·4·5 학습 가능 · 포인트 지급 간격이 아니다 · 메인·꼬리는 레벨마다 받는 공용 스킬 포인트 사용 (2026-11-01 사용자 정정 · skill_design §4)")
write(name, s)

name = "src/ui/i18n.js"
s = read(name)
s = entry(s, "help.library.points.title", "공용 스킬 포인트와 메인 해금", "Shared skill points and main-skill levels")
s = entry(s, "help.library.points.body",
    "영웅은 <b>레벨이 오를 때마다 스킬 포인트</b>를 받습니다. 죄종·직업 마스터리와 전직 메인·꼬리는 같은 포인트를 나누어 씁니다. 전직할 때 별도 포인트를 받지는 않습니다.<br><br>전직 후 세 메인 스킬 중 <b>하나</b>를 스킬 포인트 1로 배웁니다. 메인의 다음 단계는 전직 가능 레벨부터 <b>{interval}레벨 간격</b>으로 열립니다. 포인트가 있어도 다음 단계의 영웅 레벨 조건을 만족해야 하며, 조건을 만족하면 늦게 배운 단계도 차례로 올릴 수 있습니다. 이 간격은 꼬리의 포인트 지급 조건이 아닙니다.<br><br>배운 전직 스킬을 우클릭해 되돌리면 학습·강화에 투자한 포인트가 <b>공용 스킬 포인트로 환급</b>됩니다. 같은 갈래의 다른 스킬이나 마스터리에 다시 쓸 수 있습니다. 갈래와 전직 비용은 그대로이며, 특수·변형·필살기 꼬리는 현재 준비 중입니다.",
    "Heroes earn <b>skill points on every level-up</b>. Sin mastery, Class mastery and advancement main skills and branches share this pool. Advancing grants no extra points.<br><br>After advancing, learn <b>one</b> of the three main skills for one skill point. Further main-skill ranks unlock every <b>{interval} hero levels</b> from the advancement unlock level. Having points does not bypass the level requirement. Eligible ranks may be learned later in sequence. This interval does not govern branch-point income.<br><br>Right-click the learned Advance skill to refund its learning and upgrade costs to the <b>shared skill-point pool</b>. Reinvest them in another skill of the same path or in mastery. The chosen path and gold cost remain in place. Special, Variant and Ultimate branches are currently coming later.")
s = entry(s, "sk.advTree.missing",
    "전직 후 갈래의 메인 셋 중 하나를 <b>공용 스킬 포인트 1</b>로 배웁니다. 스킬 포인트는 레벨마다 받고 죄종·직업 마스터리와 나누어 씁니다.<br>메인 단계만 영웅 Lv30·35·40·45·50에 Lv1·2·3·4·5가 열립니다. 특수·변형·필살기 꼬리는 현재 준비 중입니다.",
    "Learn one of the path's three main skills for <b>one shared skill point</b>. Points come from every level-up and are shared with Sin and Class mastery.<br>Main ranks Lv1–5 unlock at hero Lv30/35/40/45/50. Special, Variant and Ultimate branches are currently coming later.")
s = entry(s, "tr.adv.points", "스킬 포인트 {free} / {have}", "Skill points {free} / {have}")
s = entry(s, "tr.err.points", "스킬 포인트 없음", "No skill points left")
s = entry(s, "tr.adv.todo",
    "<b>{b} {n}랭크</b>부터 전직할 수 있습니다. 세 갈래 중 하나를 고르며 갈래는 되돌릴 수 없습니다. 전직 후 <b>마스터리 → 전직 트리</b>에서 공용 스킬 포인트로 메인을 배웁니다. 메인 강화는 영웅 레벨 조건을 만족해야 하며, 되돌리면 투자 포인트를 공용 지갑에 돌려받습니다.",
    "Advancement opens at <b>{b} rank {n}</b>. Choose one of three paths; the path cannot be undone. Then learn a main skill in <b>Mastery → Advancement Tree</b> using shared skill points. Further main ranks require the corresponding hero level. Refunding returns invested points to the shared pool.")
s = entry(s, "sk.points.note",
    "레벨마다 받는 <b>스킬 포인트</b>를 죄종·직업 마스터리와 전직 메인·꼬리에 나누어 씁니다. 전직해도 별도 포인트를 지급하지 않습니다. 메인 단계만 5레벨 간격으로 열립니다.",
    "<b>Skill points</b> earned on each level-up are shared by Sin mastery, Class mastery and advancement main skills and branches. Advancing grants no separate points. Only main-skill ranks unlock at five-level intervals.")
for key in ["sk.advPoints", "sk.err.advPoints"]:
    s = re.sub(r"^    '" + re.escape(key) + r"':.*\n", "", s, flags=re.M)
anchor = "    'sk.adv.leveled':"
idx = s.index(anchor)
s = s[:idx] + "    'sk.adv.nextLevel': { ko: '메인 Lv{n}: 영웅 Lv{lv}부터 강화 가능', en: 'Main Lv{n}: requires hero Lv{lv}' },\n    'sk.adv.maxLevel': { ko: '메인 최대 레벨', en: 'Maximum main-skill level' },\n    'tr.err.maxLevel': { ko: '메인 최대 레벨입니다', en: 'Main skill is at its maximum level' },\n" + s[idx:]
s = s.replace("도서관에서 전직하면 별도 전직 포인트로 전직 스킬 하나를 배우고 레벨을 올립니다.", "도서관에서 전직하면 마스터리와 같은 스킬 포인트로 메인 하나를 배우고 강화합니다. 메인 단계는 전직 가능 레벨부터 5레벨 간격으로 열립니다.")
s = s.replace("After advancing at the Library, use separate Advance Points to learn and level one advancement skill.", "After advancing at the Library, use the same skill points as mastery to learn and upgrade one main skill. Main ranks unlock at five-level intervals from the advancement unlock level.")
s = s.replace("전직 스킬은 책이 아니라 전직 포인트로 올립니다.", "전직 메인은 공용 스킬 포인트로 올리며 각 단계의 영웅 레벨 조건도 만족해야 합니다.")
s = s.replace("Advance skills use Advance Points rather than books.", "Advance main skills use shared skill points and require the corresponding hero level.")
s = s.replace("마스터리 포인트를 받습니다.", "공용 스킬 포인트를 받습니다.").replace("grant mastery points.", "grant shared skill points.")
s = s.replace("마스터리 포인트를 레벨보다 많이 씀", "마스터리·전직에 레벨이 준 스킬 포인트보다 많이 씀").replace("Spent more mastery points than the level gives", "Mastery and advancement exceed the skill-point budget")
write(name, s)

name = "src/game_logic/state.js"
s = read(name).replace("**v38 ~ v44를 연다**", "**v38 ~ v45를 연다**")
s = s.replace("하나를 첫 전직 포인트로 배운다", "하나를 공용 스킬 포인트 1로 배운다")
s = s.replace("[2026-10-06 · R216 · skill_design §4 — ~~무료로 되돌린다~~] 전직 포인트는 마스터리와 따로다 — 남은 것을 스킬 레벨(`advanceLevelUp`)에 쓴다", "[2026-11-01 정정 · skill_design §4] 마스터리와 같은 공용 스킬 포인트를 쓴다 — 메인 단계만 5레벨 간격으로 열린다(`advanceLevelUp`)")
write(name, s)
name = "src/game_logic/skill.js"
s = read(name).replace("배운 뒤 더 넣은 전직 포인트", "배운 뒤 메인에 더 넣은 공용 스킬 포인트")
write(name, s)
name = "src/game_logic/hero.js"
s = read(name).replace("// 마스터리 포인트 — 레벨업 1회당 정액. 지급 곡선 자체가 기획 미확정이라 형태도 임시다 (skill_design §7)", "// 공용 스킬 포인트 — 매 레벨업 지급. 죄종·직업 마스터리와 전직 메인·꼬리가 masteryPoints 지갑을 공유한다 (2026-11-01).")
write(name, s)

name = "docs/game_design/skill_design.md"
s = read(name)
start = s.index("- **전직 포인트 — 마스터리와 따로**")
end = s.index("- **전직 트리의 노드 수", start)
s = s[:start] + """- **공용 스킬 포인트 — 레벨마다 지급** [2026-11-01 사용자 정정] — 죄종·직업 마스터리와 전직 메인·꼬리는 기존 스킬 포인트(`hero.masteryPoints`)를 공유한다. 레벨업마다 `[balance.csv:mastery_point_per_level]`만큼 받으며, 전직하거나 5레벨 구간을 지났다고 별도 포인트를 지급하지 않는다.
  - **학습·강화는 단계마다 1포인트** — 메인 학습이 Lv1이고 이후 강화도 1포인트씩 쓴다. 꼬리 세 칸도 같은 지갑에서 각각 한 번씩 투자한다. 꼬리 효과는 아직 미구현이다.
  - **5레벨 간격은 메인 단계의 해금 조건** — `[balance.csv:advance_unlock_level]`부터 `[balance.csv:advance_skill_level_interval]` 간격으로 열린다. 현재 영웅 Lv30·35·40·45·50에 메인 Lv1·2·3·4·5를 찍을 수 있다. 포인트가 많아도 다음 단계의 레벨 조건을 넘을 수 없고, 조건을 만족한 뒤 늦게 여러 단계를 찍는 것은 가능하다. 꼬리에 이 5레벨 간격을 적용하지 않는다.
  - **포인트 배분은 마스터리·메인·꼬리 사이의 선택** — 메인 Lv5와 꼬리 셋이 합쳐 총 8포인트이며, 만렙에 전직 포인트가 총 5개라는 예산은 폐기한다. 각 트리에서 돌려받은 포인트는 공용 지갑으로 돌아온다. 전직 스킬을 바꾸면 그 스킬에 쓴 학습·강화 포인트를 전부 환급한다.
""" + s[end:]
s = row(s, "- **살아남는 것**", "- **살아남는 것** — 「포인트를 넣은 것에만 세부 트리가 열린다」. 포인트는 레벨마다 받는 기존 스킬 포인트를 죄종·직업 마스터리와 공유한다(2026-11-01 정정).")
s = row(s, "| **포인트 지급 곡선**", "| **포인트 지급 곡선** | **레벨마다 공용 스킬 포인트 지급**(2026-11-01 사용자 정정 · `[balance.csv:mastery_point_per_level]`). 죄종·직업 마스터리와 전직 메인·꼬리가 같은 지갑을 쓴다. 메인 단계만 5레벨 간격으로 해금하며 별도 전직 포인트는 없다. 포인트 총량과 전체 노드 수의 경쟁은 함께 조정한다. |")
s = s.replace("포인트는 **전직 포인트** — 마스터리와 따로", "포인트는 **공용 스킬 포인트** — 죄종·직업 마스터리와 공유")
s = s.replace("첫 전직 포인트", "공용 스킬 포인트 1").replace("전직 포인트", "공용 스킬 포인트")
s = s.replace("전직 → 공용 스킬 포인트", "전직 → 메인 단계 해금")
s = s.replace("기본 스킬은 책으로 상한까지 오르고 전직은 포인트 몇 개다", "기본 스킬은 책으로 성장하고 전직 메인은 영웅 레벨에 따라 최대 5단계까지 열린다")
s = s.replace("전직 포인트가 늘어나는 곳", "추가 스킬 포인트나 메인 단계의 해금 확장")
s = s.replace("공용 스킬 포인트가 늘어나는 곳", "추가 스킬 포인트나 메인 단계의 해금 확장")
s = s.replace("10-06 부터 마스터리 전용", "11-01 정정으로 전직과 공유")
s = s.replace("[balance.csv:advance_point_interval]", "[balance.csv:advance_skill_level_interval]")
s = s.replace("전직 — 공용 스킬 포인트 1로 배운다(§4)", "전직 후 공용 스킬 포인트 1로 학습 · 메인 단계는 5레벨 간격으로 해금(§4)")
write(name, s)

name = "docs/game_design/GAME_DESIGN.md"
s = read(name)
s = row(s, "- **전직은 직업마다 3갈래**", "- **전직은 직업마다 3갈래** — 하나를 고르면 메인 셋 중 하나를 공용 스킬 포인트 1로 배운다. 배운 메인 하나에 스킬 레벨 + 꼬리 셋이 붙는다. **포인트는 레벨마다 받으며 죄종·직업 마스터리와 같은 지갑**을 쓴다. **메인 단계만** 영웅 Lv30·35·40·45·50에 Lv1·2·3·4·5가 열린다(2026-11-01 정정). 같은 갈래의 메인을 되돌리면 투자 포인트는 공용 지갑으로 환급된다. 갈래는 되돌릴 수 없고 전직은 도서관 작업이다. 본편 5직업 × 3갈래 = 15전직 · 메인 45개 (skill_design.md §4).")
s = row(s, "- **스킬 레벨**", "- **스킬 레벨** — 스킬마다 레벨이 있다. 기본 스킬은 같은 책으로 강화하고, 전직 메인은 **마스터리와 공유하는 스킬 포인트**를 쓰며 각 단계의 영웅 레벨 조건도 만족해야 한다(2026-11-01 정정). 숫자는 스킬 레벨이, 기능은 전직 꼬리가 확장한다. 특정 스킬 +n 장비 규칙은 그대로다 (skill_design.md §2-3 · §4).")
heading = "## 10."
idx = s.index(heading)
cut = s.rfind("\n---", 0, idx)
s = s[:cut].rstrip() + "\n| 11-01 | **스킬 포인트는 레벨마다 지급하고 죄종·직업 마스터리와 전직 메인·꼬리가 공유한다** [사용자 정정] — 전직 전용 지급 폐기 · 5레벨 간격은 메인 단계 해금만 뜻함 · 영웅 Lv30/35/40/45/50에 메인 Lv1/2/3/4/5 · 각 단계 1포인트 · 환급도 공용 지갑 (skill_design.md §4 · INTERFACE §2-7) |\n\n" + s[cut:]
write(name, s)

name = "docs/game_design/hero_design.md"
s = read(name)
s = row(s, "- **레벨 + XP**", "- **레벨 + XP** (전투 원정) — 매 레벨업 공용 스킬 포인트 지급. 죄종·직업 마스터리와 전직 메인·꼬리가 공유하며 전직 시 별도 지급은 없다. 기본 능력치는 일반 영웅의 레벨로 오르지 않는다(§4-3). 전직 메인 단계만 5레벨 간격으로 해금한다(2026-11-01 정정).")
s = row(s, "- **전직 해금**", "- **전직 해금**: `[balance.csv:advance_unlock_level]`부터 직업의 세 갈래 중 하나를 고른다. 해당 갈래의 메인 셋 중 하나를 기존 공용 스킬 포인트로 배우고 그 스킬의 트리를 연다. 메인 Lv1·2·3·4·5는 영웅 Lv30·35·40·45·50에 해금된다(`[balance.csv:advance_skill_level_interval]`). 5레벨마다 별도 포인트를 받는 것이 아니다. 꼬리도 같은 지갑을 사용하며 꼬리의 개별 선행은 별도 논의한다(2026-11-01 정정 · skill_design §4).")
s = s.replace("마스터리 포인트 · 전직 포인트 · 자격", "공용 스킬 포인트 · 자격")
s = s.replace("마스터리 포인트(지급 곡선은 미정 — skill_design §7) · **전직 포인트**(전직 레벨부터 `[balance.csv:advance_point_interval]` 레벨마다 — skill_design §4)", "공용 스킬 포인트(매 레벨 지급 · 죄종·직업 마스터리와 전직이 공유 — skill_design §4)")
s = s.replace("전직 포인트 2026-10-06", "공용 포인트 정정 2026-11-01").replace("전직 → 전직 포인트", "전직 → 메인 단계 해금")
write(name, s)

for name in ["docs/game_design/battle_design.md", "docs/game_design/construction_draft.md"]:
    s = read(name).replace("전직 포인트", "공용 스킬 포인트")
    write(name, s)

name = "docs/client/SCREEN_DESIGN.md"
s = read(name)
s = row(s, "| 포인트 |", "| 포인트 | **공용 스킬 포인트 남은 / 전체** 한 줄. 전체 = 남은 + 죄종·직업 마스터리 투자 + 전직 메인 투자. 전직 전용 둘째 줄은 폐기(2026-11-01 정정). **초기화**는 제목 오른쪽 | 마스터리 초기화는 해당 투자만 공용 지갑에 환급. 전직 메인은 자기 칸 우클릭으로 환급 |")
s = s.replace("첫 전직 포인트", "공용 스킬 포인트 1").replace("전직 포인트", "공용 스킬 포인트")
s = s.replace("(마스터리와 따로", "(마스터리와 공유")
write(name, s)

name = "docs/client/INTERFACE.md"
s = read(name)
s = row(s, "| **`advanceState(state, uid, now)`**", "| **`advanceState(state, uid, now)`** | `→ {open, need, gold, hero:{advance, skill, lv, points:{have,spent,free}, levelCap, nextLevel, canLearn, canLevelUp, working}, branches, nodes, err}` | 전직 패널 상태. `points`는 **공용 스킬 포인트**: `free = hero.masteryPoints`, `spent`는 죄종·직업 마스터리 + 전직 메인 투자 합, `have = free + spent`. 전직 시 지급 없음. `levelCap`은 현재 영웅 레벨에서 찍을 수 있는 메인 단계 상한, `nextLevel`은 다음 단계의 필요 영웅 레벨(최종 단계면 null). 메인 단계만 `advance_unlock_level + (단계−1) × advance_skill_level_interval`에 해금. `canLearn/canLevelUp`은 지갑과 레벨 조건을 함께 반영. 꼬리는 설명만이며 아직 습득 불가 (2026-11-01 정정). |")
s = row(s, "| **`advanceLearn(state, uid, skillId)`**", "| **`advanceLearn(state, uid, skillId)`** / **`advanceForget(state, uid)`** | `→ {ok, err?, need?, refunded?}` | 메인 학습은 공용 `masteryPoints` 1 소비. 레벨 미달은 `level`과 `need`, 포인트 부족은 `points`. 기존 missing/none/learned/skill/empty 거절 유지. 되돌리기는 학습·강화 비용 전체를 공용 지갑에 환급하고 `advanceUp`을 지운다. 갈래와 골드는 유지. |")
s = row(s, "| **`advanceLevelUp(state, uid)`**", "| **`advanceLevelUp(state, uid)`** | `→ {ok, lv?, err?, need?}` | 공용 스킬 포인트 1로 메인 +1. 다음 단계의 영웅 레벨 조건을 먼저 검사한다. Lv30·35·40·45·50에 메인 Lv1·2·3·4·5, 중간 레벨에서는 이미 열린 단계까지 투자 가능. 거절 missing/none/empty/level/points/maxLevel. 실패 시 포인트·레벨 불변. 꼬리에 5레벨 조건을 전파하지 않는다. |")
s = s.replace("더 넣은 전직 포인트", "메인에 더 넣은 공용 스킬 포인트")
s = s.replace("죄종·직업 마스터리가 **한 풀을 공유**한다", "죄종·직업 마스터리와 전직 메인·꼬리가 **한 스킬 포인트 풀을 공유**한다")
s = s.replace("전직 포인트", "공용 스킬 포인트")
s = s.replace("`advance_point_interval`", "`advance_skill_level_interval`")
idx = s.index("## 4.")
end = s.index("\n", idx)
s = s[:end] + "\n\n**2026-11-01 · 세이브 v45:** `masteryPoints`는 전직과 공유하는 스킬 포인트 잔액이다. v44 이하의 전직 전용 투자는 공용 잔액으로 비용을 낼 수 있는 단계까지 유지하며 추가 포인트를 지급하지 않는다. 부족한 전직 단계만 내려가고 갈래·기존 마스터리·장비·진행은 유지한다. 이관은 한 번만 수행한다. 메인 레벨 제한을 넘는 v45 투자는 초과 비용을 공용 지갑에 환급한다.\n" + s[end:]
write(name, s)

notice = "> **2026-11-01 포인트 규칙 정정:** 현재는 레벨마다 받는 기존 스킬 포인트를 죄종·직업 마스터리와 전직 메인·꼬리가 공유한다. 전직 전용 지급은 없다. 5레벨 간격은 메인 단계의 해금만 뜻한다. 아래의 별도 전직 포인트 기록은 이 정정으로 대체된다. [현재 설계](../game_design/skill_design.md#4-전직--직업마다-3갈래).\n"
for name in ["docs/client/DEV_PLAN.md", "docs/game_design/DECISION_LOG.md"]:
    s = read(name); idx = s.index("\n")
    write(name, s[:idx+1] + "\n" + notice + s[idx+1:])
for path in (ROOT / "docs/client/adr").glob("*.md"):
    if path.name.startswith(("0529-", "0542-", "0544-", "0576-", "0595-", "0701-")):
        s = path.read_text(encoding="utf-8")
        if "전직 포인트" in s:
            idx = s.index("\n")
            path.write_text(s[:idx+1] + "\n> **2026-11-01 정정:** 포인트는 레벨마다 받는 공용 스킬 포인트이며 마스터리·전직이 공유한다. 전직 전용 포인트나 별도 표시 줄은 폐기했다. 메인 단계만 5레벨 간격으로 해금한다. 아래 화면 결정의 포인트 관련 부분은 이 규칙이 우선한다.\n" + s[idx+1:], encoding="utf-8")

name = "src/dev/README.md"
s = read(name).replace("전직 판(스킬 칸 + 가지 셋)과 전직 포인트 줄이 서고 포인트 하나가 남는다", "전직 판(메인 + 꼬리 셋)이 열리며 공용 스킬 포인트 한 줄과 메인 다음 단계의 영웅 레벨 조건을 확인한다")
write(name, s)

# The earlier review is an archived experiment, not the source for the corrected budget.
old = ROOT / "output/2026-10-31_advance_review/REVIEW.md"
if old.exists():
    s = old.read_text(encoding="utf-8"); idx = s.index("\n")
    old.write_text(s[:idx+1] + "\n> **2026-11-01 정정:** 이 검토의 ‘전직 전용 5포인트’ 해석은 잘못됐다. 실제 규칙은 레벨마다 받는 기존 스킬 포인트를 마스터리·전직 메인·꼬리가 공유하고, 메인 단계만 5레벨 간격으로 해금하는 것이다. 해당 예산에 의존한 배분·선행 제안은 재검토 대상이다. 공격 기능 실험 결과와 구분한다.\n" + s[idx+1:], encoding="utf-8")

print("Updated point descriptions and current design sources.")
