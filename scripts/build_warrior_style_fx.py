"""전사 기본 이펙트 — 같은 구도를 초상 그림체로 다시 그린 Codex 2x2 자홍 시트에서 고른 칸을 설치한다.

python scripts/build_warrior_style_fx.py

자르기 · 키잉 · 줄이기는 build_mage_drop_fx.py 와 같다(칸을 통째로 384x384 · bbox 로 다시 가운데 맞추지 않는다).
바꾸기 전 설치본은 처음 한 번만 previous/ 에 복사한다. Requires Pillow + numpy.
"""

from __future__ import annotations

import shutil
import sys
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_mage_drop_fx as base  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "src/assets/art/fx_source/warrior_style_20261008"
OUT = ROOT / "src/assets/art/fx/skills"
# 설치 파일 → (시트, 칸 번호 — 왼쪽 위부터 1 · 2 / 3 · 4). 줄 하나가 스킬 하나 · 왼쪽 = A · 오른쪽 = B
PICKS = {
    "war_bash": ("sheet_w1.png", 2),
    "war_doubleswing": ("sheet_w1.png", 4),
    "war_quake": ("sheet_w2.png", 1),
    "war_leap": ("sheet_w2.png", 3),
    "war_ironskin": ("sheet_w4.png", 3),
    # 함성 셋 — 같은 집중선 · 색만 다르다(ADR-0546). F2 시트: 1 타운트 · 2 워 크라이 · 3 배틀오더스 · 4 흰 바탕(안 쓴다)
    "war_taunt": ("shout/sheet_f2.png", 1),
    "war_shout": ("shout/sheet_f2.png", 2),
    "war_battleorders": ("shout/sheet_f2.png", 3),
}


def cut(sheet: str, index: int) -> Image.Image:
    arr = np.asarray(Image.open(SOURCE / sheet).convert("RGB"))
    y0, y1, x0, x1 = base.cells(arr)[index - 1]
    sub = arr[y0 + base.INSET:y1 - base.INSET, x0 + base.INSET:x1 - base.INSET]
    side = min(sub.shape[:2])
    rgba = Image.fromarray(base.key(sub[:side, :side]))
    return rgba.convert("RGBa").resize((base.SIZE, base.SIZE), Image.Resampling.LANCZOS).convert("RGBA")


def main() -> None:
    backup = SOURCE / "previous"
    backup.mkdir(exist_ok=True)
    for file in PICKS:
        if not (backup / f"{file}.webp").exists():
            shutil.copy2(OUT / f"{file}.webp", backup / f"{file}.webp")
    for file, (sheet, index) in PICKS.items():
        sprite = cut(sheet, index)
        path = OUT / f"{file}.webp"
        sprite.save(path, "WEBP", quality=90, alpha_quality=100, method=6)
        print(f"{file}: {path.stat().st_size} bytes")


if __name__ == "__main__":
    main()
