from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def edit(name, changes):
    path = ROOT / name
    text = path.read_text(encoding='utf-8')
    for old, new in changes:
        assert text.count(old) == 1, (name, old, text.count(old))
        text = text.replace(old, new)
    with path.open('w', encoding='utf-8', newline='\n') as stream:
        stream.write(text)


edit('docs/client/INTERFACE.md', [
    ('`heroCombatIf(state, h, itemUid)`', '`heroCombatIf(state, h, itemUid, party?, no?)`'),
    ('`heroCombatWith(state, h, item)`', '`heroCombatWith(state, h, item, party?, no?)`'),
    ('**전술 조건도 사본으로 센다** — 무기가 바뀌면', '**`party` · `no`는 `heroCombat`과 같다. 캐릭터창은 `party: []`로 전술을 제외한다. 전술을 포함할 때는 조건도 사본으로 센다** — 무기가 바뀌면'),
    ('`item` 이 없으면 `heroCombat(state, h)`. `canEquip`', '`party` · `no`는 모든 경로에 전달하며 `[]`면 전술을 제외한다. `item` 이 없으면 `heroCombat(state, h, party, no)`. `canEquip`'),
    ('**전술은 `party`(기본 = 고른 편성의 파티 `partyOf(state)`)에 든 영웅에게만**', '**캐릭터창과 전투 밖 영웅 툴팁은 `party: []`로 전술을 제외한다** — 장비 · 마스터리 · 도감의 영구 능력치는 유지한다. **전술은 `party`(기본 = 고른 편성의 파티 `partyOf(state)`)에 든 영웅에게만**'),
])
edit('docs/client/SCREEN_DESIGN.md', [
    ('캐릭터 탭의 세부 옵션은 장비 · 마스터리처럼 영웅이 가진 값만이고 신단 같은 런의 몫은 안 든다', '캐릭터 탭의 세부 옵션은 장비 · 마스터리 · 도감 등 영구 능력치만 표시한다(`game.heroCombat`의 `party: []`). 파티 전술 · 신단 · 전투 중 일시 버프는 제외하며, 장비 교체 미리보기와 착용 델타도 같은 기준이다'),
])
edit('docs/client/SCREEN_CHANGELOG.md', [
    ('## 이력\n', '## 이력\n\n- **2026-10-30** — **§2·§6 세부 옵션 계산 분리** — 원정은 전술·신단·실시간 버프 포함 · 캐릭터창과 장비 미리보기는 영구 능력치만 표시.\n'),
])
print('Updated interface and screen documentation')
