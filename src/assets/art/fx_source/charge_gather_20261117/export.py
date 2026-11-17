"""모으기 기운 그림 — Codex 원본을 게임 파일(512px 투명 webp)로 내보내고 설치한다.

원본은 자르거나 다시 그리지 않는다 — 가운데에 맞춰 90% 크기로 줄이고 여백만 정리한다(함성 충격파 export.py 와 같은 규칙).
실행: python src/assets/art/fx_source/charge_gather_20261117/export.py
"""
import json
from pathlib import Path

from PIL import Image

BASE = Path(__file__).resolve().parent
ROOT = BASE.parents[4]
GAME = ROOT / 'src/assets/art/fx/skills'
SIZE = 512
STYLES = ['darktoon', 'foil']


def main():
    report = []
    for st in STYLES:
        src = BASE / f'charge_gather_{st}.png'
        original = Image.open(src).convert('RGBA')
        alpha_range = original.getextrema()[3]
        assert alpha_range[0] == 0 and alpha_range[1] >= 128, src   # 진짜 투명 배경이어야 한다
        box = original.getchannel('A').getbbox()
        art = original.crop(box)
        ratio = SIZE * .90 / max(art.size)
        art = art.convert('RGBa').resize(tuple(round(v * ratio) for v in art.size), Image.Resampling.LANCZOS).convert('RGBA')
        out = Image.new('RGBA', (SIZE, SIZE))
        out.paste(art, ((SIZE - art.width) // 2, (SIZE - art.height) // 2))
        dst = GAME / f'charge_gather_{st}.webp'
        out.save(dst, 'WEBP', quality=92, alpha_quality=100, method=4)
        check = Image.open(dst).convert('RGBA').getchannel('A').getbbox()
        assert min(check[:2]) >= 20 and max(check[2:]) <= SIZE - 20, check
        report.append({'style': st, 'source': src.name, 'game_file': str(dst.relative_to(ROOT)).replace('\\', '/'),
                       'dimensions': [SIZE, SIZE], 'bbox': check, 'source_alpha_range': alpha_range,
                       'bytes': dst.stat().st_size})
    (BASE / 'export_report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(report, ensure_ascii=False, indent=1))


if __name__ == '__main__':
    main()
