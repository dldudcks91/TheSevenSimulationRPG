from pathlib import Path
root=Path(__file__).resolve().parents[1]
def update(name,fn):
    p=root/name
    old=p.read_text(encoding='utf-8')
    new=fn(old)
    if old!=new:p.write_text(new,encoding='utf-8',newline='')

def help_text(s):
    start=s.index("    'help.library.advance.body': {")
    end=s.index("    'help.library.points.title':",start)
    return s[:start]+'''    'help.library.advance.body': {
        ko: "도서관에서 영웅을 고르고 <b>[전직의 방]</b>을 엽니다. 왼쪽의 세 갈래와 역할 설명을 비교하고, 오른쪽의 <b>실제 마스터리 미리보기</b>에서 스킬을 선택하면 그 스킬의 강화 선택지도 확인할 수 있습니다. 미리보기는 재화나 포인트를 쓰지 않습니다.<br><br>전직 기능을 열고 레벨 <b>{level}</b> 이상이 되면 갈래를 선택하고 <b>[전직]</b>합니다. 비용은 <b>{gold}G</b>이며 현재는 즉시 완료됩니다. <b>전직 갈래는 변경할 수 없습니다.</b> 원정 중에도 전직할 수 있지만 탐험 중에는 먼저 돌아와야 합니다.<br><br>완료 후 같은 방이나 도서관 입구의 <b>[마스터리 열기]</b>에서 전직 스킬을 배우고 강화합니다. 전직만으로 스킬을 자동 학습하지는 않습니다. 같은 갈래 안에서는 스킬을 바꿀 수 있습니다.",
        en: "Select a hero in the Library and open the <b>Chamber of Advancement</b>. Compare the three paths and their roles on the left. Select a skill in the <b>actual mastery preview</b> on the right to inspect its strengthening choices. Previewing spends no resources or points.<br><br>Unlock advancement and reach level <b>{level}</b>, then select a path and press <b>Advance</b>. The cost is <b>{gold}G</b> and advancement currently completes instantly. <b>The path cannot be changed.</b> Heroes can advance during Expeditions; those exploring must return first.<br><br>After completion, use <b>Open Mastery</b> in the chamber or Library to learn and improve an advancement skill. Advancement does not automatically teach a skill. Skills can be swapped within the chosen path.",
    },
'''+s[end:]
update('src/ui/i18n.js',help_text)

def spec(s):
    lines=s.splitlines()
    for i,line in enumerate(lines):
        if line.startswith('- **두 탭은 띠에서'):
            lines[i]='- **기본 화면과 전직의 방은 띠에서 고른 같은 영웅을 다룬다.** 방 머리에 영웅 이름·직업·레벨을 표시하고, 다른 영웅의 미리보기 선택을 전직에 적용하지 않는다.'
        elif line.startswith('- **카드 · 패널은 건물 줄을 안 든다**'):
            lines[i]='- **전직 해금 전에도 갈래와 마스터리를 미리 볼 수 있다.** 입구와 방의 실행 영역에 `game.needOf(advance)`의 건물 조건을 표시하고 전직 버튼만 비활성화한다. 책 배우기·제작 구역은 기존 `lockVeil(skillbook)`·`lockVeil(book_craft)`를 유지한다.'
        elif line.startswith('- **전직은 도서관 작업이다**'):
            lines[i]='- **전직은 도서관 작업이다.** 갈래 선택은 되돌릴 수 없다. 비용·시간은 `balance.csv:advance_gold/advance_hours`를 따른다. 원정 중에도 전직할 수 있고 탐험 중에는 거절한다. 전직 후 [마스터리 열기]에서 전직 포인트로 스킬 하나를 배우며, 스킬 강화·공통 줄은 공용 스킬 포인트를 쓴다. 미리보기는 학습과 포인트 배분을 실행하지 않는다.'
        elif line.startswith('- **카드 · 패널에는 규칙 문장이 없다**'):
            lines[i]='- **일반 규칙은 도움말에 둔다.** 전직의 방에는 선택에 필요한 역할·해금 조건·비용·시간과 「전직 갈래는 변경할 수 없습니다」만 표시한다. 책 덮어쓰기 경고는 기존 확인 창을 유지한다.'
        elif line.startswith('| 도서관 전직 갈래 셋 |'):
            lines[i]='| 전직의 방 갈래 선택 | 세 갈래 버튼 · 선택 갈래의 색 테두리 · 역할 설명 | 같은 배치와 선택 의미를 유지하고 기본 배경·글꼴은 D2 Min을 따른다 |'
        lines[i]=lines[i].replace('도서관 전직 탭의 스킬 줄 · 공통 머리의 지금 가진 스킬','전직의 방의 스킬 미리보기 · 도서관의 지금 가진 스킬').replace('도서관 전직 탭의 잠김 베일','도서관 전직의 방의 실행 조건')
        lines[i]=lines[i].replace('**`&lib=book\\|adv`** 는 **도서관의 폴더 탭**(스킬북 · 전직)을 고른 채 연다(§17 · ADR-1165)', '**`&lib=adv`** 는 **전직의 방**을 연다(§17 · ADR-1174). `book`은 기본 책 관리 화면이다')
    return '\n'.join(lines)+'\n'
update('docs/client/SCREEN_DESIGN.md',spec)
update('src/dev/README.md',lambda s:s.replace('**`&lib=book\\|adv`** 는 **도서관의 폴더 탭**(스킬북 · 전직)을 고른 채 연다(§17 · ADR-1165)','**`&lib=adv`** 는 **전직의 방**을 연다(§17 · ADR-1174). `book`은 기본 책 관리 화면이다')+'\n전직의 방 검증: `python serve.py 8873` 후 `python scripts/verify_advance_room.py`. 격리 브라우저에서 다섯 직업의 실제 미리보기·재화 불변·전직 비용·스킬 학습 연결·건물/레벨/골드 조건과 PC/모바일 한영 배치를 검사한다.\n')
update('src/ui/README.md',lambda s:s.replace('# src/ui — DOM 렌더러\n','# src/ui — DOM 렌더러\n\n도서관은 책 관리 기본 화면과 `advanceRoomBody` 전직의 방으로 나뉜다(ADR-1174). 실제 전직 미리보기는 도감의 `codexAdvanceBoard`를 재사용하고 `advPreview`에 조회 선택만 둔다. 전직 후 `modalBack`으로 마스터리 창에서 방으로 돌아온다. 검증은 `scripts/verify_advance_room.py`.\n',1))
