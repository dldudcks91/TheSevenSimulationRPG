"""기본 직업 이펙트 나머지 27장 — 같은 구도를 투박한 초상 그림체로 다시 그린 Codex 2x2 자홍 시트에서 설치한다 (ADR-0549).

python scripts/build_job_style_fx.py

기사 일곱은 fx_source/knight_style_20261008/crude/ 의 「투박 1」, 마법사 여섯 · 궁수 여섯 · 사제 여덟은
fx_source/job_style_20261008/ 의 시트(칸 하나가 스킬 하나)다. 자르기 · 키잉 · 줄이기는 build_mage_drop_fx.py 와 같다.
바꾸기 전 설치본은 처음 한 번만 fx_source/job_style_20261008/previous/ 에 복사한다. Requires Pillow + numpy.
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
ART = ROOT / "src/assets/art/fx_source"
JOB = ART / "job_style_20261008"
KNIGHT = ART / "knight_style_20261008/crude"
OUT = ROOT / "src/assets/art/fx/skills"
# 설치 파일 → (시트 폴더, 시트, 칸 — 왼쪽 위부터 1 · 2 / 3 · 4)
PICKS = {
    # 기사 — 줄 하나가 스킬 하나 · 왼쪽 「투박 1」
    "kni_smite": (KNIGHT, "sheet_t1.png", 1),
    "kni_charge": (KNIGHT, "sheet_t1.png", 3),
    "kni_rush": (KNIGHT, "sheet_t2.png", 1),
    "kni_duel": (KNIGHT, "sheet_t2.png", 3),
    "kni_holyshield": (KNIGHT, "sheet_t3.png", 1),
    "kni_duel_guard": (KNIGHT, "sheet_t3.png", 3),
    "kni_enchant": (KNIGHT, "sheet_t4.png", 1),
    # 마법사
    "mag_fireball": (JOB, "sheet_j1.png", 1),
    "mag_inferno": (JOB, "sheet_j1.png", 2),
    "mag_frostnova": (JOB, "sheet_j1.png", 3),
    "mag_chain": (JOB, "sheet_j1.png", 4),
    "mag_focus": (JOB, "sheet_j2.png", 1),
    "mag_frozenwall": (JOB, "sheet_j2.png", 2),
    # 궁수
    "arc_snipe": (JOB, "sheet_j2.png", 3),
    "arc_rapid": (JOB, "sheet_j2.png", 4),
    "arc_multishot": (JOB, "sheet_j3.png", 1),
    "arc_guided": (JOB, "sheet_j3.png", 2),
    "arc_pierce": (JOB, "sheet_j3.png", 3),
    "arc_poison": (JOB, "sheet_j3.png", 4),
    # 사제
    "pri_judgment": (JOB, "sheet_j4.png", 1),
    "pri_heal": (JOB, "sheet_j4.png", 2),
    "pri_grace": (JOB, "sheet_j4.png", 3),
    "pri_haste": (JOB, "sheet_j4.png", 4),
    "pri_cure": (JOB, "sheet_j5.png", 1),
    "pri_regen": (JOB, "sheet_j5.png", 2),
    "pri_penitence": (JOB, "sheet_j5.png", 3),
    "pri_bind": (JOB, "sheet_j5.png", 4),
}


def cut(folder: Path, sheet: str, index: int) -> Image.Image:
    arr = np.asarray(Image.open(folder / sheet).convert("RGB"))
    y0, y1, x0, x1 = base.cells(arr)[index - 1]
    sub = arr[y0 + base.INSET:y1 - base.INSET, x0 + base.INSET:x1 - base.INSET]
    side = min(sub.shape[:2])
    rgba = Image.fromarray(base.key(sub[:side, :side]))
    return rgba.convert("RGBa").resize((base.SIZE, base.SIZE), Image.Resampling.LANCZOS).convert("RGBA")


def main() -> None:
    backup = JOB / "previous"
    backup.mkdir(parents=True, exist_ok=True)
    for file in PICKS:
        if not (backup / f"{file}.webp").exists():
            shutil.copy2(OUT / f"{file}.webp", backup / f"{file}.webp")
    for file, (folder, sheet, index) in PICKS.items():
        sprite = cut(folder, sheet, index)
        alpha = np.asarray(sprite)[..., 3]
        if (alpha > 16).mean() < 0.02:
            raise ValueError(f"{file}: the cell is empty ({sheet} #{index})")
        path = OUT / f"{file}.webp"
        sprite.save(path, "WEBP", quality=90, alpha_quality=100, method=6)
        print(f"{file}: {path.stat().st_size} bytes")


if __name__ == "__main__":
    main()
