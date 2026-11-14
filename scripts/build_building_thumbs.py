"""Small building pictures for the laboratory line cards — pre-shrunk with Lanczos.

The lab draws a building picture (667x495) at 40-56 px (line card) and 120x80 (line head). Shrinking that
much in one step in the browser breaks the painting into jagged dots, so we ship copies at about 2x the
drawn size and let the browser shrink only ~2x (SCREEN_DESIGN §8 · ADR-1114).

  python scripts/build_building_thumbs.py

- Reads every `src/assets/art/buildings/*.webp` (the installed pictures — `source/` · `unused/` are skipped).
- Writes `buildings/thumb/<name>_sq.webp` (88x88 · centre square — line card) and `<name>_wide.webp`
  (240x160 · centre 3:2 — line head). Same crop as the screen's `object-fit: cover` (centre).
- A thumb whose picture is gone is removed. Re-running is safe (it rewrites all).
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
DIR = ROOT / "src/assets/art/buildings"
OUT = DIR / "thumb"
SIZES = {"sq": (88, 88), "wide": (240, 160)}


def cover(im: Image.Image, size: tuple[int, int]) -> Image.Image:
    w, h = im.size
    tw, th = size
    scale = max(tw / w, th / h)
    cw, ch = round(tw / scale), round(th / scale)
    left, top = (w - cw) // 2, (h - ch) // 2
    return im.crop((left, top, left + cw, top + ch)).resize(size, Image.LANCZOS)


def main() -> None:
    OUT.mkdir(exist_ok=True)
    want = set()
    for src in sorted(DIR.glob("*.webp")):
        im = Image.open(src).convert("RGB")
        for kind, size in SIZES.items():
            dst = OUT / f"{src.stem}_{kind}.webp"
            cover(im, size).save(dst, "WEBP", quality=92, method=6)
            want.add(dst.name)
    removed = 0
    for old in OUT.glob("*.webp"):
        if old.name not in want:
            old.unlink()
            removed += 1
    print(f"thumbs {len(want)} | removed {removed}")


if __name__ == "__main__":
    main()
