"""소환 — 오오라(마이트)와 같은 마법진 원 · 붉게 물들이고 뒤집는다 (2026-10-23 사용자 지시 「오오라 같은 느낌으로」 · 「뒤집은 역 오각별로」).

python scripts/build_summon_fx.py

그림체마다 설치된 kni_might_<그림체>.webp 를 읽어 색상만 붉은 띠로 옮긴다 — 명도 · 채도 · 알파 · 크기는 원본 그대로.
원본의 색상 차이(밝은 쪽 하늘색 · 어두운 쪽 남색)는 붉은 띠 안의 작은 차이로 남긴다.
그다음 그림이 든 범위의 가운데를 축으로 180° 돌려 역오각별을 만든다 — 그림 가운데로 돌리면 위로 치우친 원이 아래로 내려앉는다.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
DIR = ROOT / "src/assets/art/fx/skills"
STYLES = ["darktoon", "ink", "pixel2d", "papercut", "pastel", "foil", "riso", "clay"]   # skill_art.js:ART_STYLES
SRC, DST = "kni_might", "pri_summon"
HUE = 2 / 360       # 붉은 띠 가운데 — 핏빛
SPREAD = 0.15       # 원본 색상 차이를 이만큼 줄여 남긴다
CENTER = 220 / 360  # 원본 파랑의 가운데
SAT = 0.85          # 채도를 조금 눅인다 — 같은 채도의 빨강은 파랑보다 튄다


def recolor(im: Image.Image) -> Image.Image:
    rgba = np.asarray(im.convert("RGBA"))
    hsv = np.asarray(Image.fromarray(rgba[..., :3]).convert("HSV")).astype(np.float32) / 255
    d = (hsv[..., 0] - CENTER + 0.5) % 1 - 0.5
    hsv[..., 0] = (HUE + d * SPREAD) % 1
    hsv[..., 1] *= SAT
    hsv8 = (hsv * 255).round().astype(np.uint8)
    rgb = np.asarray(Image.merge("HSV", [Image.fromarray(hsv8[..., i]) for i in range(3)]).convert("RGB"))
    return Image.fromarray(np.dstack([rgb, rgba[..., 3]]))


def invert(im: Image.Image) -> Image.Image:
    """그림이 든 범위(알파 > 0)의 가운데를 축으로 180° — 픽셀 그대로 옮긴다(보간 없음) · 범위는 제자리에 남는다"""
    x0, y0, x1, y1 = im.getchannel("A").getbbox()
    w, h = im.size
    a = np.asarray(im)[::-1, ::-1]
    a = np.roll(a, (y0 + y1 - h, x0 + x1 - w), axis=(0, 1))
    return Image.fromarray(np.ascontiguousarray(a))


def main() -> None:
    for style in STYLES:
        with Image.open(DIR / f"{SRC}_{style}.webp") as im:
            out = invert(recolor(im))
        path = DIR / f"{DST}_{style}.webp"
        out.save(path, "WEBP", quality=90, alpha_quality=100, method=6)
        print(f"{path.name}: {out.size} {path.stat().st_size} bytes")


if __name__ == "__main__":
    main()
