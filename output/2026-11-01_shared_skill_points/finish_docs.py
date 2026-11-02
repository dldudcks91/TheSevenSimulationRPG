from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[2]

def update(name,fn):
    path=ROOT/name
    path.write_text(fn(path.read_text(encoding='utf-8')),encoding='utf-8',newline='')

update('docs/game_design/hero_design.md',lambda s:s.replace(
    '마스터리 포인트(지급 곡선은 미정 — skill_design §7) · **전직 포인트**(전직 레벨부터 `[balance.csv:advance_point_interval]` 레벨마다 — skill_design §4)',
    '공용 스킬 포인트(레벨마다 지급 · 죄종·직업 마스터리와 전직 메인·꼬리가 공유 — skill_design §4)'))
update('docs/game_design/construction_draft.md',lambda s:s.replace(
    '공용 스킬 포인트는 마스터리와 따로(전직 레벨부터 일정 레벨마다 · 첫 포인트로 배운다)',
    '공용 스킬 포인트는 레벨마다 받고 마스터리·전직이 공유하며 메인 단계만 5레벨 간격으로 해금한다(2026-11-01 정정)'))
update('docs/game_design/skill_design.md',lambda s:s.replace(
    '별도 공용 스킬 포인트는 없다','별도 전직 포인트는 없다').replace(
    '만렙에 공용 스킬 포인트가 총 5개라는 예산은 폐기한다','만렙에 전직 전용 포인트가 총 5개라는 예산은 폐기한다').replace(
    '전직은 포인트 몇 개','전직 메인 단계는 영웅 레벨에 따라 해금된다'))
update('docs/game_design/arena_design.md',lambda s:s.replace(
    '마스터리 포인트 합 · 전직 포인트 합 ≤ 레벨이 주는 예산(둘은 따로 — 2026-10-06)',
    '마스터리 투자 + 전직 메인 투자 합 ≤ 레벨마다 받은 공용 스킬 포인트 예산(2026-11-01 정정). 메인 단계는 별도로 5레벨 간격 해금 조건 검사').replace(
    '그 레벨이 주는 마스터리 · 전직 포인트를 다 쓰고',
    '그 레벨이 주는 공용 스킬 포인트로 열린 전직 메인 단계에 먼저 투자한 뒤 남은 것을 마스터리에 쓰고'))
update('docs/client/INTERFACE.md',lambda s:s.replace(
    '남는 공용 스킬 포인트는 전부 전직 스킬 레벨(`advanceUp` — 포인트 식은 `state` 와 같다: 전직 레벨에 1 · 그 뒤 `[balance.csv:advance_point_interval]` 레벨마다 1)',
    '메인 단계는 `advance_unlock_level`부터 `advance_skill_level_interval` 간격으로 해금되며 해당 비용을 공용 지갑에서 먼저 낸 뒤 남는 포인트로 마스터리를 배분한다(`advanceUp` = 추가 메인 단계 수)').replace(
    '**마스터리 포인트를 다 쓴다**',
    '**공용 포인트 중 전직 메인 비용을 뺀 나머지를 마스터리에 쓴다**').replace(
    '세이브 형식 **v44**','세이브 형식 **v45**').replace(
    'v38 ~ v44','v38 ~ v45'))
update('src/ui/app.js',lambda s:s.replace('쓴 전직 포인트 전부 환급','투자한 공용 스킬 포인트 전부 환급').replace(
    '전직했으면 줄 오른쪽에 전직 포인트 `남은 / 받은`',
    '전직했으면 줄 오른쪽에 공용 스킬 포인트 `남은 / 전체`'))

# Keep implementation history, but retire the now-fixed live-upgrade debt explicitly.
def plan(s):
    lines=s.splitlines(keepends=True)
    for i,line in enumerate(lines):
        if line.startswith('| 85 |'):
            lines[i]='| 85 | ✅ 해소 2026-11-01 | 같은 스킬의 레벨 변경도 원정 갈아입기에 반영한다 | `battle.createRun.refit` 서명에 슬롯별 `up` 포함 · 쿨 잇기 키는 출처·ID 유지 | 메인 강화 다음 반영과 동일 단계 재적용 무변경 검증 | 공용 스킬 포인트 정정과 함께 수정 |\n'
    s=''.join(lines)
    at=s.index('\n')
    return s[:at+1]+'\n**2026-11-01 구현:** 레벨마다 받는 `masteryPoints`를 마스터리·전직이 공유. `advance_skill_level_interval`은 메인 해금 전용. 전직 학습·강화 차감/환급, AI 공용 예산, 세이브 v45 이관, 한영 안내·다음 단계 레벨 표시를 반영했다. 꼬리 효과는 기존대로 준비 중이다. 검증: `output/2026-11-01_shared_skill_points/`.\n'+s[at+1:]
update('docs/client/DEV_PLAN.md',plan)

# Current contract for AI RNG order follows the actual generation pipeline.
update('docs/client/INTERFACE.md',lambda s:s.replace(
    'rng 순서는 §5-2 |',
    '2026-11-01부터 장비 뒤 책·전직 선택 및 공용 포인트 차감 → 남은 포인트의 마스터리 가중 추첨 순서다. 이 공용 예산 수정으로 AI 생성 RNG 순서도 갱신된다. |'))

for path in [ROOT/'docs/client/adr/README.md']:
    s=path.read_text(encoding='utf-8').replace('전직 포인트','공용 스킬 포인트')
    path.write_text(s,encoding='utf-8',newline='')

print('Finished current-rule, PvP-budget and implementation-history corrections.')
