"""수묵 붓 그림체 이펙트 — Codex 2x2 자홍 시트에서 잘라 `<앞 판 이름>_ink.webp` 로 설치한다 (ADR-0559).

python scripts/build_ink_fx.py

도감 이펙트 세그먼트의 「수묵」 그림체 탭이 읽는다 — **관전은 안 읽는다**(실전은 `skill_art.js:ART_LIVE`).
시트 · 지시문 · 기준 그림 · 칸 표(`picks.py`)는 fx_source/ink_20261009/. 기존 그림은 지우지도 덮어쓰지도 않는다.
자르기 · 키잉 · 줄이기 · 칸 끝 흐림은 build_advance_fx.py 와 같다. Requires Pillow + numpy.
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_advance_fx as adv  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "src/assets/art/fx_source/ink_20261009"
OUT = ROOT / "src/assets/art/fx/skills"
sys.path.insert(0, str(SOURCE))
from picks import PICKS  # noqa: E402  — 설치 파일 → (시트, 칸)


def main() -> None:
    adv.SOURCE = SOURCE
    for file, (sheet, index) in PICKS.items():
        sprite = adv.cut(sheet, index)
        if (np.asarray(sprite)[..., 3] > 16).mean() < 0.01:
            raise ValueError(f"{file}: the cell is empty (sheet_{sheet} #{index})")
        path = OUT / f"{file}.webp"
        sprite.save(path, "WEBP", quality=90, alpha_quality=100, method=6)
        print(f"{file}: {path.stat().st_size} bytes")
    print(f"{len(PICKS)} files")


if __name__ == "__main__":
    main()
