"""Build the exploration world-map region masks: one alpha PNG per chapter (SCREEN_DESIGN §8-4 · ADR-0543).

The locked-chapter veil on the exploration tab is masked by these — it covers that chapter's LAND only.
- sea          = the sea-coloured mass touching the picture edge
- water        = saturated blue joined to the sea (rivers, shore rims) + river pieces cut off by bridges
                 (they run along a border between two chapters). Never in any chapter — water stays bright.
                 The frozen lake / oasis sit in the middle of one land, so they stay land
- chapter land = watershed from the seed polygons below (shrunk inwards) out to the colour edges
                 (rivers · cliffs · outlines). Tundra's blue-grey cliff walls are seeded to tundra (the plateau above)

Run after replacing the map picture:  python scripts/build_explore_masks.py [--overlay out.png]
- input  src/assets/art/backgrounds/source/explore_world.png, cropped like the installed WebP (CROP below)
- output src/assets/art/backgrounds/explore_world_mask/<chapter>.png  (same size as the installed map)
- re-draw SEEDS (percent of the cropped picture) if the new picture moves the lands
Requires numpy · scipy · Pillow. On this machine scipy needs anaconda's DLLs on PATH:
  PATH="/c/Users/user/anaconda3/Library/bin:$PATH" python scripts/build_explore_masks.py
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage as ndi

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src/assets/art/backgrounds/source/explore_world.png"
OUT = ROOT / "src/assets/art/backgrounds/explore_world_mask"
CROP = (0, 155, 1536, 155 + 714)   # same crop as explore_world.webp (src/assets/art/README.md)

# seed polygons — percent of the cropped picture · neighbours share vertices · only a rough "which land" guess
SEEDS = {
    1: [(0, 38), (8, 37.5), (13, 41), (18, 45), (21, 47), (21.5, 55), (22.5, 65), (22, 75), (21, 85), (20, 92), (10, 92), (0, 90)],
    2: [(0, 6), (15, 3), (34, 4), (33, 12), (33, 25), (31, 37), (26, 41), (21, 47), (18, 45), (13, 41), (8, 37.5), (0, 38)],
    3: [(21, 47), (26, 41), (31, 37), (38, 40), (44, 46), (51, 51), (54, 60), (55, 72), (54, 85), (55, 94), (40, 94), (20, 92), (21, 85), (22, 75), (22.5, 65), (21.5, 55)],
    4: [(34, 4), (45, 1), (61, 4), (62, 20), (63, 35), (62, 49), (58, 50), (51, 51), (44, 46), (38, 40), (31, 37), (33, 25), (33, 12)],
    5: [(51, 51), (58, 50), (62, 49), (70, 53), (78, 53), (83, 50), (84, 70), (85, 94), (70, 95), (55, 94), (54, 85), (55, 72), (54, 60)],
    6: [(61, 4), (75, 2), (88, 4), (86, 20), (85, 35), (83, 50), (78, 53), (70, 53), (62, 49), (63, 35), (62, 20)],
    7: [(88, 4), (92, 0), (100, 0), (100, 95), (85, 94), (84, 70), (83, 50), (85, 35), (86, 20)],
}
CLIFF_OWNER = 4        # blue-grey cliff walls belong to this land (tundra plateau)
SEA = np.array([15, 34, 54], float)
SEA_T = 22             # colour distance to the sea colour
SEED_IN = 28           # px the seed polygons are shrunk inwards
BORDER_BAND = 24       # px around a land-land seed border where a cut-off blue piece counts as river
FEATHER = 1.0          # px blur on the mask edge


def poly_mask(pts, w, h, value=1):
    img = Image.new("L", (w, h), 0)
    ImageDraw.Draw(img).polygon([(x * w / 100, y * h / 100) for x, y in pts], fill=value)
    return np.asarray(img)


def build(overlay: Path | None = None):
    im = Image.open(SRC).convert("RGB").crop(CROP)
    w, h = im.size
    a = np.asarray(im).astype(float)

    mx, mn = a.max(axis=2), a.min(axis=2)
    val = mx / 255
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1), 0)
    r_, g_, b_ = a[..., 0], a[..., 1], a[..., 2]
    d = np.maximum(mx - mn, 1e-6)
    hue = np.where(mx == r_, ((g_ - b_) / d) % 6, np.where(mx == g_, (b_ - r_) / d + 2, (r_ - g_) / d + 4)) / 6

    # sea — the sea-coloured mass touching the edge
    near = np.linalg.norm(a - SEA, axis=2) < SEA_T
    lab, _ = ndi.label(near)
    edge_ids = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    sea = ndi.binary_opening(np.isin(lab, list(edge_ids)), iterations=1)

    # water joined to the sea — rivers · shore rims
    waterish = (sat > 0.62) & (val > 0.38) & (hue > 0.52) & (hue < 0.62)
    lab, _ = ndi.label(waterish | sea)
    water = np.isin(lab, list(set(np.unique(lab[sea])) - {0})) & ~sea

    # river pieces cut off by bridges — they run along a land-land seed border (a lake sits in the middle of one land)
    plab = np.zeros((h, w), np.int16)
    for ch, pts in SEEDS.items():
        pv = poly_mask(pts, w, h, ch)
        plab[(pv > 0) & (plab == 0)] = pv[(pv > 0) & (plab == 0)]
    border = np.zeros((h, w), bool)
    for dy, dx in ((0, 1), (1, 0)):
        p, q = plab[:h - dy, :w - dx], plab[dy:, dx:]
        border[:h - dy, :w - dx] |= (p != q) & (p > 0) & (q > 0)
    band = ndi.distance_transform_edt(~border) < BORDER_BAND
    wl, _ = ndi.label(waterish & ~water & ~sea)
    for i, sl in enumerate(ndi.find_objects(wl), start=1):
        comp = wl[sl] == i
        if comp.sum() >= 150 and band[sl][comp].mean() > 0.3:
            water[sl][comp] = True
    water = ndi.binary_opening(water, iterations=1)

    # land — tidy and fill holes BEFORE taking the water out (else a bridged river piece is filled as a "hole")
    land = ndi.binary_fill_holes(ndi.binary_opening(~sea, iterations=2)) & ~water
    sea = sea | water
    cliff = (sat > 0.35) & (sat < 0.64) & (val > 0.28) & (val < 0.62) & (hue > 0.54) & (hue < 0.63) & land

    # gradient of the blurred picture
    bl = np.stack([ndi.gaussian_filter(a[..., c], 1.2) for c in range(3)], axis=2)
    grad = sum(np.hypot(ndi.sobel(bl[..., c], 0), ndi.sobel(bl[..., c], 1)) for c in range(3))
    grad = np.clip(grad / np.percentile(grad, 99) * 255, 0, 255).astype(np.uint8)

    # markers — shrunk seed polygons · cliff walls near the cliff owner · sea = 8
    markers = np.zeros((h, w), np.int16)
    for ch, pts in SEEDS.items():
        inside = poly_mask(pts, w, h).astype(bool)
        markers[(ndi.distance_transform_edt(inside) > SEED_IN) & land] = ch
        if ch == CLIFF_OWNER:
            markers[cliff & (ndi.distance_transform_edt(~inside) < 70) & (markers == 0)] = ch
    markers[ndi.binary_erosion(sea, iterations=3)] = 8

    labels = ndi.watershed_ift(grad, markers)
    labels[sea] = 8

    # tidy each land — one piece, no holes · leftover land goes to the nearest land
    clean = np.full((h, w), 8, np.int16)
    for ch in SEEDS:
        m = ndi.binary_opening(ndi.binary_closing(labels == ch, iterations=2) & land, iterations=1)
        lb, k = ndi.label(m)
        if k > 1:
            m = lb == 1 + int(np.argmax(ndi.sum(m, lb, range(1, k + 1))))
        clean[ndi.binary_fill_holes(m) & (clean == 8)] = ch
    gap = land & (clean == 8)
    if gap.any():
        iy, ix = ndi.distance_transform_edt(clean == 8, return_distances=False, return_indices=True)
        clean[gap] = clean[iy, ix][gap]

    OUT.mkdir(parents=True, exist_ok=True)
    for ch in SEEDS:
        alpha = Image.fromarray(((clean == ch) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(FEATHER))
        rgba = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        rgba.putalpha(alpha)
        rgba.save(OUT / f"{ch}.png", optimize=True)
        print(f"{ch}.png  {int((clean == ch).sum())} px")

    if overlay:
        cols = {1: (255, 0, 0), 2: (0, 255, 0), 3: (255, 200, 0), 4: (0, 200, 255), 5: (255, 120, 0), 6: (255, 0, 255), 7: (255, 255, 255)}
        ov = a.copy()
        for ch, c in cols.items():
            m = clean == ch
            ov[m] = ov[m] * 0.55 + np.array(c) * 0.45
        edge = np.zeros((h, w), bool)
        edge[:-1] |= clean[:-1] != clean[1:]
        edge[:, :-1] |= clean[:, :-1] != clean[:, 1:]
        ov[edge] = (255, 255, 255)
        Image.fromarray(ov.astype(np.uint8)).save(overlay)
        print("overlay", overlay)


if __name__ == "__main__":
    args = sys.argv[1:]
    build(Path(args[args.index("--overlay") + 1]) if "--overlay" in args else None)
