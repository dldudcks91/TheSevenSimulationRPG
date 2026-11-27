"""Extract the three independent 4×4 atlas series into portrait-sized RGBA sprites.

Run from any directory with Pillow and NumPy. The original alpha is
preserved as the drawings are aligned to the combat renderer's contact points.
"""
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageOps


SOURCE = Path(__file__).resolve().parent
OUTPUT = SOURCE.parents[1] / "fx/skills"
SHEETS = json.loads((SOURCE / "prompts.json").read_text(encoding="utf-8"))
SIZE = 256
GROUND_IMPACTS = {
    "mag_iceblast", "mag_iceblast_shatter", "mag_meteor", "mag_meteor_impact",
    "war_thorswrath", "war_thorswrath_impact", "mag_thunderstrike",
    "mag_thunderstrike_impact", "kni_condemnation", "kni_fallingstrike",
    "pri_punishment", "pri_punishment_impact", "mag_thundergod", "mag_lightning",
}
SHOUTS = {"war_shout", "war_battleorders", "war_warcry", "war_battlecry", "war_command", "war_intimidate"}
MATTE_FLOOR = {"orrery-1": 14, "orrery-6": 64, "wraith-6": 32}


def cuts(projection, count):
    """Find the least-painted gutter near each expected divider."""
    length = len(projection)
    pitch = length / count
    radius = max(1, round(pitch * .012))
    ink = np.convolve(projection, np.ones(radius) / radius, mode="same")
    edges = [0]
    for k in range(1, count):
        positions = np.arange(round((k - .26) * pitch), round((k + .26) * pitch) + 1)
        cost = ink[positions] + .16 * ((positions - k * pitch) / pitch) ** 2
        edges.append(int(positions[np.argmin(cost)]))
    return [*edges, length]


def bands(alpha):
    """Route three seams through transparent gutters, allowing irregular silhouettes."""
    h, w = alpha.shape
    pitch = w / 4
    owners = np.zeros((h, w), dtype=np.uint8)
    for center in cuts((alpha > 28).mean(axis=0), 4)[1:-1]:
        xs = np.arange(int(center - pitch * .24), int(center + pitch * .24) + 1)
        cost = alpha[:, xs].astype(float) / 255 + .06 * ((xs - center) / pitch) ** 2
        steps = np.zeros(cost.shape, dtype=np.int8)
        ix = np.arange(len(xs))
        for y in range(1, h):
            last = np.pad(cost[y - 1], 1, constant_values=np.inf)
            options = np.stack((last[:-2] + .008, last[1:-1], last[2:] + .008))
            choice = options.argmin(axis=0)
            steps[y] = choice - 1
            cost[y] += options[choice, ix]
        pos = cost[-1].argmin()
        for y in range(h - 1, -1, -1):
            owners[y, xs[pos]:] += 1
            pos += steps[y, pos]
    return owners


def tiles(sheet):
    alpha = np.asarray(sheet.getchannel("A"))
    assigned = bands(alpha.T).T * 4 + bands(alpha)
    for i in range(16):
        mask = np.where(assigned == i, alpha, 0).astype(np.uint8)
        crop = Image.fromarray(mask).point(lambda a: 255 if a > 18 else 0).getbbox()
        if crop is None:
            raise ValueError(f"Empty atlas cell {i + 1}")
        left, top, right, bottom = crop
        box = (max(0, left - 3), max(0, top - 3), min(sheet.width, right + 3), min(sheet.height, bottom + 3))
        sprite = sheet.crop(box)
        sprite.putalpha(Image.fromarray(mask).crop(box))
        yield sprite


def fit_sprite(sprite, name):
    # Each hit reveals only one horizontal band; center its artwork in that band.
    if name in {"arc_rapid", "kni_rush"}:
        count = 3 if name == "arc_rapid" else 2
        alpha = np.asarray(sprite.getchannel("A"))
        bounds = cuts((alpha > 28).mean(axis=1), count)
        canvas = Image.new("RGBA", (SIZE, SIZE))
        for index, (top, bottom) in enumerate(zip(bounds, bounds[1:])):
            piece = sprite.crop((0, top, sprite.width, bottom))
            piece = ImageOps.contain(piece, (232, SIZE // count - 16), Image.Resampling.LANCZOS)
            mid = (index + .5) * SIZE / count
            canvas.alpha_composite(piece, ((SIZE - piece.width) // 2, round(mid - piece.height / 2)))
        return canvas
    width, height = (236, 160) if name in SHOUTS else (232, 232)
    art = ImageOps.contain(sprite, (width, height), Image.Resampling.LANCZOS)
    x = (SIZE - art.width) // 2
    y = (SIZE - art.height) // 2
    if name in GROUND_IMPACTS:
        y = 239 - art.height
    if name == "arc_singlestrike":
        x = 245 - art.width
    canvas = Image.new("RGBA", (SIZE, SIZE))
    canvas.alpha_composite(art, (x, y))
    return canvas


def main():
    for style in SHEETS["direction"]:
        dest = OUTPUT / style
        dest.mkdir(parents=True, exist_ok=True)
        for index, entries in enumerate(SHEETS["sheets"], 1):
            sheet_name = f"{style}-{index}"
            with Image.open(SOURCE / f"{sheet_name}.webp") as source:
                sheet = source.convert("RGBA")
                floor = MATTE_FLOOR.get(sheet_name, 0)
                if floor:
                    sheet.putalpha(sheet.getchannel("A").point(lambda a: max(0, (a - floor) * 255 / (255 - floor))))
                if len(entries) != 16:
                    raise ValueError(f"Expected 16 drawings on {style}-{index}")
                for (name, _), sprite in zip(entries, tiles(sheet)):
                    fit_sprite(sprite, name).save(dest / f"{name}.webp", quality=92, method=5)


if __name__ == "__main__":
    main()
