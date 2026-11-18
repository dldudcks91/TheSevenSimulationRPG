"""모으기 기운 그림(사방에서 가운데로 곧게 빨려 드는 흰 · 검은 속도선) — Codex 원본을 게임 파일(512px 투명 webp)로 내보내고 설치한다.

원본은 다시 그리지 않는다 — 가운데에 맞춰 90% 크기로 줄이고 여백만 정리한다(함성 충격파 export.py 와 같은 규칙).
금속박 한 장만 쓴다 — 그림체 설정과 상관없이(ADR-1270 · 다크 카툰 판은 걷었다).
금속박 원본은 가운데에 옅은 회색 안개(알파 1 ~ 63)가 깔려 초상이 뿌옇게 덮여서, 알파 24 아래를 걷고 24 ~ 80 을 0 ~ 255 로 편다.
테두리 상자는 알파 16 이상으로 잰다(원본 가장자리까지 닿는 알파 몇 점짜리 티끌은 상자에 안 넣는다).
실행: python src/assets/art/fx_source/charge_gather_suction_20261118/export.py
"""
import json
from pathlib import Path

import numpy as np
from PIL import Image

BASE = Path(__file__).resolve().parent
ROOT = BASE.parents[4]
GAME = ROOT / 'src/assets/art/fx/skills'
SIZE = 512
STYLES = ['foil']
HAZE = {'foil': (24, 80)}   # 그림체 → (걷는 알파, 다 차는 알파) · 같은 값이면 그 아래만 0
BOX_ALPHA = 16


def lift_haze(im, lo, hi):
    arr = np.array(im)
    a = arr[..., 3].astype(float)
    if hi > lo:
        arr[..., 3] = (np.clip((a - lo) / (hi - lo), 0, 1) * 255).round().astype(np.uint8)
    else:
        arr[..., 3] = np.where(a < lo, 0, a).astype(np.uint8)
    return Image.fromarray(arr)


def main():
    report = []
    for st in STYLES:
        src = BASE / f'charge_gather_{st}.png'
        original = Image.open(src).convert('RGBA')
        alpha_range = original.getextrema()[3]
        assert alpha_range[0] == 0 and alpha_range[1] >= 128, src   # 진짜 투명 배경이어야 한다
        original = lift_haze(original, *HAZE[st])
        box = original.getchannel('A').point(lambda v: 255 if v >= BOX_ALPHA else 0).getbbox()
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
                       'haze_lift': HAZE[st], 'bytes': dst.stat().st_size})
    (BASE / 'export_report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(report, ensure_ascii=False))


if __name__ == '__main__':
    main()
