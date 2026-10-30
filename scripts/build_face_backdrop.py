"""초상 바탕 음영 한 장 — `src/assets/art/faces/backdrop.webp` 를 짓는다.

모든 영웅 · 몬스터 초상 뒤에 깔리는 공용 바탕이다(style.css `img[src*="/art/faces/"]`).
기준은 Gemini 「막시무스」(`faces/gemini/hero/warrior_1.webp`)의 바탕 — 짙은 숯빛 위에
인물 뒤로 조금 밝은 얼룩이 마른 붓 자국처럼 번진 모양이다. 색은 그 그림에서 잰 값이다:
가장자리 (23, 24, 28) · 얼룩의 밝은 곳 (39, 41, 45).

시드가 고정이라 다시 돌려도 같은 그림이 나온다.

    python scripts/build_face_backdrop.py [--preview out.png]
"""
import argparse
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'src/assets/art/faces/backdrop.webp'

N = 320                                   # 영웅 초상과 같은 한 변 — 몬스터(256)는 CSS 가 줄인다
BASE = np.array([23, 24, 28], float)      # 막시무스 바탕 가장자리
HALO = np.array([40, 43, 48], float)      # 막시무스 얼룩의 밝은 곳
CENTER = (0.5, 0.5)                       # 얼룩 가운데
RADIUS = (0.62, 0.64)                     # 가로 · 세로 반지름 (한 변 = 1) — 네 변에 닿을락 말락
SEED = 7


def value_noise(rng, cells):
    """cells × cells 격자 난수를 N × N 으로 부드럽게 늘린 값(0~1)"""
    g = (rng.random((cells, cells)) * 255).astype(np.uint8)
    return np.asarray(Image.fromarray(g).resize((N, N), Image.BICUBIC), float) / 255


def build():
    rng = np.random.default_rng(SEED)
    # 얼룩 테두리를 흔드는 큰 결 · 안쪽의 옅은 농담 · 가장자리를 긁는 마른 붓의 잔 결
    shape = 0.5 * value_noise(rng, 4) + 0.3 * value_noise(rng, 9) + 0.2 * value_noise(rng, 22)
    tone = value_noise(rng, 6)
    grain = 0.5 * value_noise(rng, 70) + 0.5 * rng.random((N, N))

    y, x = np.mgrid[0:N, 0:N] / (N - 1)
    r = np.hypot((x - CENTER[0]) / RADIUS[0], (y - CENTER[1]) / RADIUS[1])
    d = r + (shape - 0.5) * 0.5
    halo = np.clip((1.0 - d) / 0.5, 0, 1)
    halo = halo * halo * (3 - 2 * halo)

    # 안쪽은 부드럽게 밝고 가장자리만 잔 결로 흩어진다
    spray = np.clip((grain - (1 - halo)) / 0.15, 0, 1)
    a = (0.6 * halo + 0.4 * spray) * (0.85 + 0.15 * tone)

    rgb = BASE + (HALO - BASE) * a[..., None]
    return Image.fromarray(np.round(rgb).astype(np.uint8), 'RGB')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--preview', help='밝기를 올린 확인 그림을 여기에 낸다')
    args = ap.parse_args()
    im = build()
    im.save(OUT, 'WEBP', quality=90, method=6)
    print(f'{OUT.relative_to(ROOT)}  {im.size}  {OUT.stat().st_size} bytes')
    if args.preview:
        from PIL import ImageEnhance
        ImageEnhance.Brightness(im).enhance(3).resize((N * 2, N * 2)).save(args.preview)


if __name__ == '__main__':
    main()
