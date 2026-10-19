"""Build the spectate stage banner mask: fx_source/stage_banner_20261018/stage_banner.png -> fx/ui/stage_banner.webp.

The original is black ink on white (Codex image generation, prompt beside it). The game uses the stroke only as a
SHAPE — CSS fills it with the chapter's sin color (SCREEN_DESIGN §4-2 「스테이지 띠」 · ADR-0663) — so the output is
white RGB + alpha, where alpha = ink darkness:
- levels: paper (lum >= PAPER) -> 0, solid ink (lum <= INK) -> 255, linear between (bristle grooves stay half-see-through)
- crop to the ink's bounding box + PAD, scale to WIDTH, WebP lossy with alpha

Run after replacing the original:  python scripts/build_stage_banner.py
Requires Pillow only.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src/assets/art/fx_source/stage_banner_20261018/stage_banner.png"
OUT = ROOT / "src/assets/art/fx/ui/stage_banner.webp"

PAPER = 235   # this light or lighter = paper (no ink)
INK = 40      # this dark or darker = full ink
PAD = 8       # px kept around the ink after cropping (source scale)
WIDTH = 1600  # output width — the arena is narrower than this at the 1600x800 base (src/ui/README.md)


def main() -> None:
    lum = Image.open(SRC).convert("L")
    span = PAPER - INK
    alpha = lum.point(lambda v: 0 if v >= PAPER else 255 if v <= INK else round(255 * (PAPER - v) / span))
    box = alpha.getbbox()
    if not box:
        raise SystemExit(f"no ink found in {SRC}")
    l, t, r, b = box
    box = (max(0, l - PAD), max(0, t - PAD), min(alpha.width, r + PAD), min(alpha.height, b + PAD))
    alpha = alpha.crop(box)
    h = round(alpha.height * WIDTH / alpha.width)
    alpha = alpha.resize((WIDTH, h), Image.LANCZOS)
    img = Image.new("RGBA", alpha.size, (255, 255, 255, 0))
    img.putalpha(alpha)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    img.save(OUT, "WEBP", quality=88, method=6)
    print(f"{OUT.relative_to(ROOT)}  {img.width}x{img.height}  {OUT.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
