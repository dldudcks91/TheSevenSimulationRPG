"""Apply exact unique replacements while preserving existing bytes and parallel edits."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ADR = '0985-연속-미클리어-안내는-종의-미션에서-원정-준비-점검으로-잇는다.md'

def replace(path, old, new):
    p = ROOT / path
    body = p.read_bytes()
    before, after = old.encode('utf-8'), new.encode('utf-8')
    if body.count(before) != 1:
        raise RuntimeError(f'unique old text changed: {path}')
    p.write_bytes(body.replace(before, after, 1))

replace('docs/client/SCREEN_DESIGN.md',
    '초보 안내는 현재 상태에서 가능한 다음 행동을 고르고 첫 의뢰 보상을 받으면 끝나며 미션 폴더는 빈 상태를 보여준다.',
    '초보 안내는 현재 상태에서 가능한 다음 행동을 고르고 첫 의뢰 보상을 받으면 끝난다. 원정 중이거나 재출정을 기다리는 부대의 같은 난이도·칸에서 최근 완료 기록의 전멸·시간 초과가 `[balance.csv:expedition_retry_guide_runs]` 이상 이어지면 **원정 준비 점검**을 안내한다. 일반적인 원정 자금 마련·첫 의뢰 진행 안내와 빈 안내를 대신하며, 첫 건설·의뢰 수락 같은 구체적인 초보 행동은 우선한다. 최근 미클리어 횟수와 대상 Party·장소, 장비·마스터리·물약 점검 및 이전 구간 파밍 안내를 보여준다. [이동]은 실제 출정 영웅과 해당 부대 인벤토리를 캐릭터 탭에서 선택한다. 이동 직전 문맥을 재확인하며 출발·철수·반복 설정을 조작하지 않는다. 새 원정 준비 점검 안내는 종 말풍선으로 한 번 알리고 같은 문맥의 횟수 증가로 반복하지 않는다. 첫 로드의 과거 기록은 말풍선으로 재생하지 않는다. 안내가 모두 없으면 미션 폴더는 빈 상태를 보여준다([ADR-0985](adr/'+ADR+')).')
replace('docs/client/INTERFACE.md',
    '첫 의뢰 보상 수령(`commissions.fame > 0`) 뒤에는 안내가 끝난다.',
    '첫 의뢰 보상 수령(`commissions.fame > 0`) 뒤 초보 안내는 끝난다. 현재 원정 중이거나 재출정 대기인 부대의 같은 난이도·칸에서 최근 완료된 `wipe/timeout` 기록이 `[balance.csv:expedition_retry_guide_runs]` 이상 연속이면 `retryPreparation` 안내를 낸다: `tab:character`, `target:{preset,hero,stageId,difficulty,attempts}`. 실제 출정 인원의 첫 유효 영웅을 대상으로 하고, 진행 중 기록·다른 부대는 건너뛰며 승리·철수·꺼져 중단·다른 칸·다른 난이도에서 연속을 끊는다. 가장 긴 기록의 부대를 고르고 동률이면 부대 순서다. 일반적인 `earnGold/progressCommission` 안내와 빈 안내를 대신하며 구체적인 첫 건설·의뢰 수락은 우선한다. 기록 밖 누적 횟수는 추정하지 않고 저장 필드도 늘리지 않는다.')
replace('docs/client/SCREEN_CHANGELOG.md', '## 이력',
    '## 이력\n\n- **2026-10-30** — **§2 원정 준비 점검** — 같은 칸 미클리어가 누적되면 종의 미션에서 실제 출정 영웅·인벤토리로 이동 · 재도전 동작과 리포트는 유지 (ADR-0985)')
replace('docs/client/adr/0980-종-알림-판은-알림-미션-업적-폴더로-나뉜다.md',
    '본문 고정 높이·확인 기록 추가 · 폴더 규격은 유지 |',
    '본문 고정 높이·확인 기록 추가 · 폴더 규격은 유지 · [ADR-0985]('+ADR+') — 첫 의뢰 수령 뒤 반복 미클리어 준비 안내 추가 |')

print('updated screen contract, interface, changelog and ADR replacement metadata')
