from pathlib import Path


def replace(path, pairs):
    p = Path(path)
    body = p.read_bytes().decode('utf-8')
    for old, new in pairs:
        if old not in body:
            raise ValueError(f'{path}: missing {old}')
        body = body.replace(old, new)
    p.write_bytes(body.encode('utf-8'))
    print(path)


replace('src/data/balance.csv', [
    ('탐험 r4(노말 클리어) · r5(나이트메어 클리어)에 +1', '탐험 r1(노말 2장 클리어) · r5(나이트메어 클리어)에 +1'),
    ('2026-10-27 사용자 「노말을 깨야 party가 하나 더 열리게」 · R362', '2026-10-30 사용자 「탐험 랭크1이고 조건은 노말 챕터2 클리어」'),
    ('탐험 r4 · r5 로 열리므로', '탐험 r1 · r5 로 열리므로'),
    ('r4 · r5 로 2026-10-27 · R362', 'r1 · r5 로 2026-10-30'),
])
replace('src/game_logic/state.js', [
    ('탐험 r4 · r5 가 연다 · R362', '탐험 r1 · r5 가 연다 · 2026-10-30'),
    ('동굴은 탐험 r1 · 마차(상단) · 폐허는 그 켜기를 든 랭크(지금 r2 · r3)', '동굴은 탐험 r2 · 마차(상단) · 폐허는 그 켜기를 든 랭크(지금 r3 · r4)'),
    ('// 탐험 r1 (2026-10-08)', '// 탐험 r2 (2026-10-30)'),
    ('// 그 지점을 연 랭크 전 — 마차 r2 · 폐허 r3 (R362)', '// 그 지점을 연 랭크 전 — 마차 r3 · 폐허 r4 (2026-10-30)'),
])
replace('src/ui/app.js', [
    ('탐험 r4 · r5 가 연다 · R362', '탐험 r1 · r5 가 연다 · 2026-10-30'),
    ('마차 r2 · 폐허 r3', '마차 r3 · 폐허 r4'),
])
