"""그림체 시안 셋(고딕 펜화 · 목탄 · 유화) 이펙트 — Codex 2x2 자홍 시트에서 잘라 `<표의 이름>_<그림체>.webp` 로 설치한다 (ADR-0584).

python scripts/build_style_fx.py [그림체 ...]

도감 이펙트 세그먼트의 그림체 탭이 읽는다 · 설정 탭에서 고르면 관전도 읽는다(ADR-0561). 그림이 없는 스킬은 코드 조합으로 선다.
시트 · 지시문 · 발주 스크립트(style.py)는 fx_source/styles_20261010/. 칸 표는 수묵 판(ink_20261009/picks.py) 그대로 — 같은 칸 문안이라
B안 셋(배시 w5_4 · 파이어볼 i3_3 · 라이트닝 i3_4)도 같은 칸을 고른다. 시트가 아직 없는 칸은 건너뛴다.
자르기 · 키잉은 build_advance_fx.py 와 같다. Requires Pillow + numpy.
(1차 시안 픽셀 · 목판화 · 스테인드글라스는 ADR-0584 으로 걷었다 — 시트는 같은 폴더 · 그림은 fx_source/removed_20261010/trial/)
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_advance_fx as adv  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "src/assets/art/fx_source/styles_20261010"
OUT = ROOT / "src/assets/art/fx/skills"
STYLES = ("pen", "charcoal", "oil")
sys.path.insert(0, str(ROOT / "src/assets/art/fx_source/ink_20261009"))
from picks import PICKS as INK_PICKS  # noqa: E402  — `<표의 이름>_ink` → (시트, 칸)

PICKS = {f.removesuffix("_ink"): at for f, at in INK_PICKS.items()}


def main(styles: list[str]) -> None:
    adv.SOURCE = SOURCE
    for style in styles or STYLES:
        n = 0
        for base, (sheet, index) in PICKS.items():
            if not (SOURCE / f"sheet_{style}_{sheet}.png").exists():
                continue
            sprite = adv.cut(f"{style}_{sheet}", index)
            if (np.asarray(sprite)[..., 3] > 16).mean() < 0.01:
                raise ValueError(f"{base}_{style}: the cell is empty (sheet_{style}_{sheet} #{index})")
            sprite.save(OUT / f"{base}_{style}.webp", "WEBP", quality=90, alpha_quality=100, method=6)
            n += 1
        print(f"{style}: {n} / {len(PICKS)} files", flush=True)


if __name__ == "__main__":
    main(sys.argv[1:])
