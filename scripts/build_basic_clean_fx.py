"""기본 직업 이펙트 41장 깔끔판 — Codex 2x2 자홍 시트에서 잘라 `<file>_clean.webp` 로 설치한다 (ADR-0551).

python scripts/build_basic_clean_fx.py

시트 · 지시문 · 기준 그림(게임에서 찍은 코드 모양) · B안은 fx_source/basic_clean_20261008/ (칸 = spec.PICKS).
**기존 그림은 지우지도 덮어쓰지도 않는다** — 새 이름으로 나란히 두고 skill_art.js 가 가리킨다(되돌리기 = 파일 이름만 되돌린다).
자르기 · 키잉 · 줄이기는 build_mage_drop_fx.py, 칸 끝 흐림은 build_advance_fx.py 와 같다. Requires Pillow + numpy.
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_advance_fx as adv  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "src/assets/art/fx_source/basic_clean_20261008"
OUT = ROOT / "src/assets/art/fx/skills"
sys.path.insert(0, str(SOURCE))
from spec import PICKS  # noqa: E402  — 설치 파일 → (시트, 칸)


def main() -> None:
    n = 0
    for file, (sheet, index) in PICKS.items():
        if file.endswith("_alt"):   # B안은 원본 폴더에만 둔다
            continue
        adv.SOURCE = SOURCE
        sprite = adv.cut(sheet, index)
        if (np.asarray(sprite)[..., 3] > 16).mean() < 0.01:
            raise ValueError(f"{file}: the cell is empty (sheet_{sheet} #{index})")
        path = OUT / f"{file}_clean.webp"
        sprite.save(path, "WEBP", quality=90, alpha_quality=100, method=6)
        n += 1
        print(f"{file}_clean: {path.stat().st_size} bytes")
    print(f"{n} files")


if __name__ == "__main__":
    main()
