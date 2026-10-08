"""기사 오오라 셋 — 같은 마법진 원 · 안쪽 문양만 다르다 (ADR-0548).

python scripts/build_knight_aura_fx.py

그림은 fx_source/knight_style_20261008/aura/set/ 의 합성본이다 — 마이트는 고른 오각별 그림 그대로,
파나티시즘 · 디파이언스는 그 그림의 원을 픽셀째 떼어 Codex 가 따로 그린 안쪽 문양을 끼운 것(compose_aura.py).
여기서는 384x384 로 줄여(알파를 곱한 채로) 설치만 한다. 바꾸기 전 설치본은 처음 한 번만 previous/ 에 복사한다.
"""

from __future__ import annotations

import shutil
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "src/assets/art/fx_source/knight_style_20261008"
OUT = ROOT / "src/assets/art/fx/skills"
SIZE = 384
PICKS = {
    "kni_might": "aura/set/aura_might.png",
    "kni_fanaticism": "aura/set/aura_fan_1.png",
    "kni_defiance": "aura/set/aura_def_2.png",
}


def main() -> None:
    backup = SOURCE / "previous"
    backup.mkdir(exist_ok=True)
    for file in PICKS:
        if not (backup / f"{file}.webp").exists():
            shutil.copy2(OUT / f"{file}.webp", backup / f"{file}.webp")
    for file, src in PICKS.items():
        with Image.open(SOURCE / src) as im:
            sprite = im.convert("RGBA").convert("RGBa").resize((SIZE, SIZE), Image.Resampling.LANCZOS).convert("RGBA")
        path = OUT / f"{file}.webp"
        sprite.save(path, "WEBP", quality=90, alpha_quality=100, method=6)
        print(f"{file}: {path.stat().st_size} bytes")


if __name__ == "__main__":
    main()
