from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
changes = {
    'docs/game_design/battle_design.md': [
        ('| 쿨 | **마지막 방 뒤부터** 돈다 — 쓰는 동안은 그 스킬이 다시 안 골라진다 |',
         '| 쿨 | **마지막 방 뒤부터** 돈다 — 쓰는 동안은 그 스킬이 다시 안 골라진다. **채널링 중 라운드가 끝나면 쿨타임의 절반을 돌려준다**(2026-10-30) — 쿨감소를 적용한 실제 쿨의 50%만 종료 시점부터 남긴다 · 세 갈래 모두 같다 |'),
        ('| 끝나는 다른 길 | 시전자가 쓰러진다 · 라운드가 끝난다 · 원정 중 갈아입는다 — 쿨은 그 자리부터 돈다 |',
         '| 끝나는 다른 길 | 시전자가 쓰러진다 · 라운드가 끝난다 · 원정 중 갈아입는다 — 쿨은 그 자리부터 돈다. **라운드 종료로 남은 방을 취소할 때만 절반 환급**(마지막 라운드 포함 · 정산과 경계 갈아입기 전에 적용) · 정상 완료와 갈아입기는 전체 쿨 |'),
    ],
    'docs/game_design/skill_design.md': [
        ('모으는 시간 `[skill.csv:charge_sec]` · 배율 `[skill_effect.csv:arc_snipe]`',
         '모으는 시간 **2초**(`[skill.csv:charge_sec]` · 2026-10-30 사용자 지시로 3초 → 2초) · 배율 `[skill_effect.csv:arc_snipe]`'),
        ('배율은 **본전 값**이다 — 모으는 동안 못 친 기본 공격과 쏜 뒤부터 도는 쿨을 메워 초당 화력이 종전 스나이프와 같다(활 · 석궁 둘 다 맞춘 값)',
         '배율은 **종전 3초 충전 기준의 본전 값**을 유지한다(2026-10-30 충전만 2초로 단축 · 배율 유지 · 활 · 석궁 둘 다 맞춘 값)'),
    ],
    'docs/client/INTERFACE.md': [
        ('마지막 방 뒤(같은 틱) · 라운드 경계(다음 `round` 앞) · 원정 중 갈아입기(`refit` 앞). `ready` = 그 스킬이 다시 준비되는 시각(이 시각부터 쿨)',
         '마지막 방 뒤(같은 틱) · 라운드 종료(정산 · 경계 `refit` · 다음 `round` · 마지막 `end` 앞) · 원정 중 갈아입기(`refit` 앞). `ready` = 그 스킬이 다시 준비되는 시각(이 시각부터 쿨). **라운드 종료로 남은 방을 취소하면 쿨감소 적용 뒤 실제 쿨의 50%만 남긴다**(2026-10-30 · 마지막 라운드와 양 진영 동일) · 정상 완료와 갈아입기는 전체 쿨'),
        ('라운드 경계 · 갈아입기는 열린 정신 집중을 그 자리에서 닫는다(쿨은 그 시각부터)',
         '라운드 종료는 정산 · 경계 갈아입기 전에 열린 정신 집중을 닫고 **쿨감소 적용 뒤 쿨의 절반을 환급**한다(`readyAt = t + cooldownSec × 0.5` · 2026-10-30 · 세 갈래 · 양 진영 · 마지막 라운드 포함). 갈아입기로 중단할 때는 전체 쿨을 그 시각부터 남긴다'),
    ],
    'src/data/README.md': [
        ('`[balance.csv:channel_charge_sec]` 모았다가 한 발',
         '`[skill.csv:charge_sec]` 동안 모았다가 한 발 · 스나이프 2초(2026-10-30)'),
    ],
    'docs/game_design/GAME_DESIGN.md': [
        ('| 날짜 | 결정 |\n|---|---|\n',
         '| 날짜 | 결정 |\n|---|---|\n| 10-30 | **스나이프 충전은 2초 · 채널링 중 라운드가 끝나면 쿨타임 절반 환급** [사용자 지시] — 스나이프 3초 → 2초(배율 유지). 채널링 세 갈래 모두 남은 방이 취소되면 쿨감소 적용 뒤 실제 쿨의 50%만 종료 시점부터 남긴다 · 마지막 라운드 포함 · 정상 완료와 갈아입기는 전체 쿨 (battle_design §3-2 · skill_design §12-5) |\n'),
    ],
}
for relative, edits in changes.items():
    path = ROOT / relative
    text = path.read_bytes().decode('utf-8')
    for old, new in edits:
        if '\r\n' in text:
            old, new = old.replace('\n', '\r\n'), new.replace('\n', '\r\n')
        if text.count(new) == 1:
            continue
        if text.count(old) != 1:
            raise RuntimeError(f'{relative}: expected one match, found {text.count(old)}')
        text = text.replace(old, new)
    path.write_bytes(text.encode('utf-8'))
    print(relative)
