"""마법사 라이트닝 · 아이스 블라스트 — Codex 2x2 자홍 시트에서 고른 칸을 잘라 설치한다 (ADR-0541).

python scripts/build_mage_drop_fx.py

- 격자는 가로 · 세로로 끝까지 이어진 검정 줄로만 찾는다(그림의 외곽선도 검정이다)
- 키잉: d = min(r, b) - g 를 경사로(40 이하 불투명 · 120 이상 투명) · 가장자리는 자홍을 역합성해 보라 테를 뺀다
- 칸을 통째로 384x384 로 줄인다 — 알파 bbox 로 다시 가운데 맞추지 않는다(칸 안의 자리가 곧 초상 위의 자리다)
- 바꾸기 전 설치본은 처음 한 번만 previous/ 에 복사한다
Requires Pillow + numpy.
"""

from __future__ import annotations

import shutil
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "src/assets/art/fx_source/mage_drop_20261008"
OUT = ROOT / "src/assets/art/fx/skills"
SIZE = 384
LO, HI = 40, 120
INSET = 6
# 설치 파일 → (시트, 칸 번호 — 왼쪽 위부터 1 · 2 / 3 · 4)
PICKS = {
    "mag_lightning": ("sheet_lightning.png", 3),
    "mag_iceblast": ("sheet_ice_b.png", 1),
    "mag_iceblast_shatter": ("sheet_ice_b.png", 2),
}
REPLACED = ("mag_lightning", "mag_iceblast")


def runs(mask: np.ndarray) -> list[tuple[int, int]]:
    out, start = [], None
    for i, v in enumerate(mask):
        if v and start is None:
            start = i
        elif not v and start is not None:
            out.append((start, i))
            start = None
    if start is not None:
        out.append((start, len(mask)))
    return out


def cells(arr: np.ndarray) -> list[tuple[int, int, int, int]]:
    dark = arr[..., :3].max(axis=2) < 60
    h, w = dark.shape

    def spans(lines, n):
        cuts = [0] + [x for a, b in lines for x in (a, b)] + [n]
        segs = [(cuts[i], cuts[i + 1]) for i in range(0, len(cuts), 2)]
        return [s for s in segs if s[1] - s[0] > n * 0.2]

    rows = spans(runs(dark.mean(axis=1) > 0.9), h)
    cols = spans(runs(dark.mean(axis=0) > 0.9), w)
    if len(rows) != 2 or len(cols) != 2:
        raise ValueError(f"2x2 grid not found: rows {rows} cols {cols}")
    return [(y0, y1, x0, x1) for y0, y1 in rows for x0, x1 in cols]


def key(rgb: np.ndarray) -> np.ndarray:
    rgb = rgb.astype(np.float32)
    d = np.minimum(rgb[..., 0], rgb[..., 2]) - rgb[..., 1]
    a = np.clip((HI - d) / (HI - LO), 0, 1)
    c = (rgb - (1 - a)[..., None] * np.array([255, 0, 255], np.float32)) / np.maximum(a, 1e-3)[..., None]
    return np.dstack([np.clip(c, 0, 255), a * 255]).astype(np.uint8)


def cut(sheet: str, index: int) -> Image.Image:
    arr = np.asarray(Image.open(SOURCE / sheet).convert("RGB"))
    y0, y1, x0, x1 = cells(arr)[index - 1]
    sub = arr[y0 + INSET:y1 - INSET, x0 + INSET:x1 - INSET]
    side = min(sub.shape[:2])
    rgba = Image.fromarray(key(sub[:side, :side]))
    # 알파를 곱한 채로 줄여야 테가 안 생긴다
    return rgba.convert("RGBa").resize((SIZE, SIZE), Image.Resampling.LANCZOS).convert("RGBA")


def main() -> None:
    backup = SOURCE / "previous"
    backup.mkdir(exist_ok=True)
    for file in REPLACED:
        if not (backup / f"{file}.webp").exists():
            shutil.copy2(OUT / f"{file}.webp", backup / f"{file}.webp")
    for file, (sheet, index) in PICKS.items():
        sprite = cut(sheet, index)
        path = OUT / f"{file}.webp"
        sprite.save(path, "WEBP", quality=90, alpha_quality=100, method=6)
        alpha = np.asarray(sprite)[..., 3] > 16
        ys = np.nonzero(alpha.any(axis=1))[0]
        xs = np.nonzero(alpha.any(axis=0))[0]
        print(f"{file}: {path.stat().st_size} bytes · rows {ys.min() / SIZE:.3f}-{(ys.max() + 1) / SIZE:.3f} · cols {xs.min() / SIZE:.3f}-{(xs.max() + 1) / SIZE:.3f}")


if __name__ == "__main__":
    main()
