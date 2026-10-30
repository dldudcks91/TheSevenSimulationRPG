from pathlib import Path

root = Path(__file__).resolve().parents[2]
p = root / 'docs/client/SCREEN_DESIGN.md'
before = '최근 미클리어 횟수와 대상 Party·장소, 장비·마스터리·물약 점검 및 이전 구간 파밍 안내를 보여준다.'
after = before + ' 준비 점검 설명은 말줄임 없이 줄바꿈하며 카드가 내용 높이만큼 늘어난다. 알림 판 본문은 고정 높이를 유지하고 넘치는 내용은 본문 안에서 스크롤한다.'
data = p.read_bytes()
if data.count(before.encode()) != 1:
    raise RuntimeError('screen specification changed')
p.write_bytes(data.replace(before.encode(), after.encode(), 1))
print('documented readable retry advice within the fixed notification panel')
