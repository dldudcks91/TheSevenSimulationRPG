"""Prepare prompts and install the other four jobs' generated combat effects.

python scripts/build_party_skill_fx.py --prepare  # prompt manifest only
python scripts/build_party_skill_fx.py            # alpha-preserving build

Requires Pillow. Generation uses the built-in image_gen tool, one call per
sprite. This script only frames, resizes and encodes the resulting artwork.
"""

from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "src/assets/art/fx_source/party_basic_20261006"
OUT = ROOT / "src/assets/art/fx/skills"
JOBS = ("knight", "mage", "archer", "priest")
SIZE = 384
COMMON = """Use case: stylized-concept.
Asset type: ONE square transparent combat VFX sprite for The Seven Simulation RPG. An effect appearing briefly over an existing character portrait, not a skill icon or item.
Style: bold clean hand-drawn cartoon graphic shapes, uniformly thick very dark charcoal outlines #0B060C, flat base colors with ONE flat shadow step and small pale highlights. Limited muted palette matching chunky illustrated dark fantasy portraits. No realistic textures, 3D, painterly strokes, gradients, neon, bloom or hazy backdrops.
Framing: one composition centered in a square canvas, few large shapes readable at 85-100 pixels. All artwork inside central 84%, fully transparent 8% margins. Leave large transparent gaps to show the portrait beneath. No background color or baked checkerboard.
Constraints: genuine transparent alpha, no text, letters, numbers, runes, watermark, frames, badges, characters, faces, body, equipment, weapons, landscape or solid ground. Draw magical effect marks only.
Subject: """

# skill_id, event, file, motion, size, duration, subject
SPECS = [
    ("kni_smite", "hit", "kni_smite", "burst", 88, 360, "Knight Smite: ONE compact shield-bash impact mark, a heavy silver-white concave crescent slamming into a small angular gold-white starburst. Four short silver shards radiate from the contact. A blunt physical crash, not a sword slash or lightning pillar. Steel blue shadows with muted warm gold at the point of impact. Open gaps between shapes. No literal shield, weapon, character or circular aura."),
    ("kni_holyshield", "buff", "kni_holyshield", "shell", 92, 540, "Holy Shield: two thick curved golden protective light panels framing a LARGE EMPTY TRANSPARENT center. A pointed arch at the top and three small gold light shards along each side; pale ivory inner edges, ochre shadows. Suggest a holy barrier around a portrait without drawing a literal shield or equipment. Open bottom and open middle, no filled disk."),
    ("kni_charge", "hit", "kni_charge", "thrust", 88, 360, "Charge: ONE thick silver-white horizontal tapered impact streak flying from left to right, a short steel-blue trail and a large angular silver crash burst at its right tip. Two small broken elliptical shock arcs surround the impact only. Heavy blunt collision, not a real lance or weapon. Open transparent space above and below."),
    ("kni_rush", "hit", "kni_rush", "thrust", 84, 340, "Rush: TWO short sharp silver-white parallel horizontal thrust streaks, offset diagonally and separated by generous transparent space. Each streak has a steel-blue flat shadow and a crisp small diamond impact at the right tip. Fast repeated physical strikes. No third streak, no weapons, no aura, no circle."),
    ("kni_duel", "bad", "kni_duel", "inward", 86, 520, "Duel enemy challenge mark: a compact thick crimson X centered inside FOUR separate curved blood-red targeting brackets. Angular ends, dark burgundy shadows, pale muted red highlights. The ring is broken into open arcs, lots of transparent empty space around the small X. A hostile challenge mark, no letters or actual runes."),
    ("kni_duel", "buff", "kni_duel_guard", "shell", 90, 540, "Duel self protection: TWO strong burgundy-red curved barrier panels bracing the left and right sides of a LARGE EMPTY TRANSPARENT center. Small inward-facing angular red teeth at the outer edges, muted coral highlights and dark wine-red shadows. Symmetric protective crescent shell, no X, no target mark, no solid disk, no literal shield."),
    ("kni_enchant", "buff", "kni_enchant", "orders", 88, 540, "Fire Enchant: a slender DIAGONAL ribbon of muted amber fire sweeping from lower left to upper right, forked red-orange flame tongues, four detached ascending ember diamonds. Warm pale yellow thin core and brick-red flat shadows. Open middle, no weapon, no sword, no hand. A fire coating effect, not golden holy light or a full fireball."),
    ("kni_might", "buff", "kni_might", "wave", 88, 560, "Might permanent aura preview: an OPEN golden elliptical light ring with THREE bold upward-pointing angular rays rising above its outer rim. Large transparent center. Muted warm gold, pale ivory edge, ochre shadow. Power radiating out from an unseen portrait, no muscle or body, no badge, no symbol in the center."),
    ("kni_fanaticism", "buff", "kni_fanaticism", "orders", 86, 420, "Fanaticism permanent aura preview: TWO angular white-gold wing-shaped energy streaks opening upward on either side, THREE small ascending chevrons between their top tips. Entire lower-middle area transparent. Fast devotion energy, muted gold and ivory with ochre shadows. No bird, no character, no circle, no badge."),
    ("kni_defiance", "buff", "kni_defiance", "shell", 92, 540, "Defiance permanent aura preview: THREE separated concentric pairs of short steel-gold protective arcs curving around a LARGE EMPTY TRANSPARENT middle. Broad outer arc, shorter middle arc, tiny inner arc, sturdy angular ends. Muted steel-gray faces and ochre gold edges, pale ivory highlights. No literal shield, no rune, no disk, no armor."),
    ("mag_fireball", "hit", "mag_fireball", "burst", 90, 420, "Fireball impact: ONE compact irregular round starburst of orange-red fire with a pale yellow angular center, six broad curling flame tongues radiating outward and six detached chunky embers. Flat brick-red shadow, muted amber base. Readable explosive radial silhouette with transparent gaps. No comet trail, no pillar, no circle, no smoky cloud."),
    ("mag_inferno", "hit", "mag_inferno", "pillar", 94, 500, "Inferno: THREE tall thick rising tongues of orange-red fire merging at a shallow base, the central tongue highest, two short side tongues lower. Four detached ascending ember shards. Pale yellow narrow hot cores, muted amber base and dark brick-red shadow. Narrow upright vertical silhouette, transparent gaps between flames, no ground or full radial fireball."),
    ("mag_iceblast", "hit", "mag_iceblast", "burst", 88, 420, "Ice Blast: ONE angular icy impact starburst with FIVE large faceted ice shards firing outward and four tiny shard chips. Pale icy cyan cores, muted sky-blue faces, deep slate-blue single shadow planes. A sharp compact shattering explosion; transparent gaps between all shards. No snowflake badge, no circular frost ring, no opaque ice ball."),
    ("mag_frostnova", "hit", "mag_frostnova", "wave", 94, 480, "Frost Nova: TWO broken icy elliptical shock rings spreading around a LARGE TRANSPARENT EMPTY center, one taller ring above a flatter lower ring. SIX short chunky ice spikes jut out from the outer perimeter. Pale cyan edges, muted blue flat faces and slate-blue shadows. Broad horizontal expanding cold wave; no snowflake emblem, no solid disk or ground."),
    ("mag_lightning", "hit", "mag_lightning", "pillar", 88, 340, "Lightning: ONE bold vertical pale-yellow zigzag bolt descending from above into a small sharp angular impact flare, with TWO short branching bolts at the sides. Muted yellow-ivory faces and dark ochre flat shadow edge, dark outlines. Powerful short upright electric strike. No horizontal chain, no blue neon glow, no cloud or ground."),
    ("mag_chain", "hit", "mag_chain", "thrust", 90, 360, "Chain Lightning: TWO connected thick HORIZONTAL zigzag lightning arcs jumping from left to right between THREE small angular contact flares. Pale yellow-ivory electric core with muted gold shadow. Broad horizontal broken rhythm and transparent spaces around each flare. No vertical main bolt, no chains made of metal, no clouds, no neon bloom."),
    ("mag_focus", "buff", "mag_focus", "orbit", 88, 620, "Focus: FOUR separated blue geometric arc segments forming an OPEN diamond-oriented focusing ring around a LARGE EMPTY TRANSPARENT center. FOUR pale blue small diamond motes hover outside at cardinal directions. Muted icy blue faces, slate-blue flat shadows. Quiet concentration, simple geometry, no letters, no magical writing or rune, no filled badge."),
    ("mag_frozenwall", "call", "mag_frozenwall", "pillar", 94, 560, "Frozen Wall summon arrival effect: TWO tall clusters of THREE chunky faceted ice spikes rising on left and right around a LARGE EMPTY TRANSPARENT center. Small low broken icy ellipse at their base joins the sides while staying hollow. Muted cyan-blue faces, slate-blue shadow planes, pale frosted edges. A protective ice gate framing the summoned portrait, not a solid ice slab. No ground or scenery."),
    ("arc_snipe", "hit", "arc_snipe", "thrust", 84, 340, "Snipe impact: ONE long slender pale mint horizontal needle of wind energy from left to right, widening only at a tiny sharp white four-point contact flare at the right tip. Two short thin mint speed traces behind it. Muted sage-green shadow edge. Precise single physical projectile effect; no actual arrow, bow, target circle or weapon."),
    ("arc_rapid", "hit", "arc_rapid", "thrust", 84, 340, "Rapid Shot: THREE short pale mint horizontal projectile streaks stacked with generous transparent gaps and progressively staggered right tips. Each has a small angular white contact spark. Muted sage-green flat shadow edges. Fast three-hit volley, no long main streak, no actual arrows, no bow, no circular aura."),
    ("arc_multishot", "hit", "arc_multishot", "rain", 90, 440, "Multishot: FIVE separated pale mint sharp tapered streaks falling diagonally from upper left toward lower right, spread in a wide fan. Five short white angular impact sparks beneath them. Muted sage shadow edges. Broad raining volley, plenty of transparent gaps, no actual arrows or bow, no landscape, no circle."),
    ("arc_guided", "hit", "arc_guided", "thrust", 88, 400, "Guided Arrow: ONE pale mint energy streak bending in a clean hooked curve toward a small central white contact flare inside FOUR short separated targeting brackets. The curved trail is wider at its start and tapers toward the impact. Muted sage-green shadow edges. Large empty spaces; no real arrow, weapon, letters, rune or complete circle."),
    ("arc_pierce", "buff", "arc_pierce", "sweep", 90, 520, "Piercing Shot activation: ONE long thin white-mint horizontal penetration streak crossing THREE separate short hollow crescent wavelets at left, middle and right. Two small mint breeze ribbons sweep upward beneath the main streak. Muted sage shadows. Transparent gaps in and around each wavelet. No arrow, no armor plates or weapon, no filled circle."),
    ("arc_poison", "buff", "arc_poison", "orders", 88, 580, "Poison Arrow activation: TWO curling green liquid energy ribbons sweeping upward around a LARGE EMPTY TRANSPARENT middle, with SIX chunky detached poison droplets rising along the sides. Muted olive and sage green, pale yellow-green highlights, deep forest-green flat shadows. Liquid droplet silhouettes, no skull, no weapon, no arrow, no smoke."),
    ("pri_judgment", "hit", "pri_judgment", "pillar", 94, 480, "Judgment: ONE broad ivory-gold vertical pillar of holy light with THREE angular ray tips at the top, landing in a broken low golden elliptical shock ring and four small golden shards. Narrow pale ivory core, muted warm gold faces and ochre shadows. Upright decisive divine strike, no sword, cross emblem, character, runes or solid ground."),
    ("pri_heal", "heal", "pri_heal", "heal", 88, 640, "Healing Light party recovery: TWO broad soft-curving but sharply outlined sage-green upward sweeps at the left and right edges, with TEN small pale mint diamond light motes rising in loosely staggered rows. LARGE EMPTY TRANSPARENT center so the healed portrait remains visible. Muted green faces, dark forest shadow, pale mint edges. Gentle broad group recovery effect; no cross, heart, leaf or character."),
    ("pri_grace", "buff", "pri_grace", "sweep", 88, 580, "Grace party damage blessing: TWO wide ivory-gold crescent light sweeps opening upward on the lower sides, SIX small golden diamond motes floating above their outer ends. Large EMPTY TRANSPARENT middle. Muted gold faces, ochre shadows, pale ivory edges. Calm holy blessing, no wings, no central emblem, no cross, no badge or filled circle."),
    ("pri_haste", "buff", "pri_haste", "orders", 84, 400, "Haste: FOUR bold pale mint upward-pointing chevrons stacked vertically with generous clear gaps, each forked into two tapering arms, and two short green speed marks outside their lower ends. Muted sage shadow edge. Compact quick upward speed effect, no wing or bird, no arrows as objects, no clock, no circle."),
    ("pri_cure", "heal", "pri_cure", "burst", 88, 520, "Single-target Heal: ONE small pale mint four-point healing flash at the center of TWO broken green curved light arcs, SIX bright mint diamond motes rising from the lower arc. Mostly open and transparent center around the small flash. Muted sage-green faces, dark forest-green shadows. Compact immediate recovery; no cross, heart, bottle, leaf or opaque disk."),
    ("pri_regen", "buff", "pri_regen", "heal", 88, 820, "Prayer of Regeneration: FOUR separated green geometric arc segments form a hollow soft diamond-oriented ring around a LARGE EMPTY TRANSPARENT middle, FIVE little mint diamond motes rising slowly along its outer sides. Muted sage green faces, forest-green flat shadows, pale mint highlights. Sustained replenishing prayer, no letters or runes, no cross, no leaves or solid disk."),
    ("pri_penitence", "bad", "pri_penitence", "sink", 90, 620, "Penitence damage weakening: TWO heavy dusky violet curled shadow ribbons descending at the left and right edges into a LOW broken purple elliptical ring. THREE short downward-pointing angular shadow rays at the lower edge. LARGE EMPTY TRANSPARENT center, muted purple-gray faces and deep aubergine single shadows. Solid crisp outlined shapes, no blurry smoke, no skull, no chains, no rune."),
    ("pri_bind", "bad", "pri_bind", "inward", 90, 580, "Bind attack-speed reduction: TWO taut thin horizontal dusky violet energy bands crossing an OPEN geometric ring of FOUR detached purple corner brackets. Small angular knots of violet light at the two outer band ends. Large transparent gaps between bands and brackets, muted purple-gray faces and deep aubergine shadows. Restraining magical lines, no metal chains, no writing, no spider web, no body or badge."),
]


def skill_rows() -> list[dict]:
    with (ROOT / "src/data/skill.csv").open(encoding="utf-8-sig", newline="") as handle:
        return [r for r in csv.DictReader(handle) if r["owner_kind"] == "job" and r["owner_id"] in JOBS]


def prepare() -> dict:
    rows = {r["skill_id"]: r for r in skill_rows()}
    if set(rows) != {s[0] for s in SPECS}:
        raise ValueError("Job skill list changed; review the effect specifications")
    manifest = {"generator": "built-in image_gen", "date": "2026-10-06", "common_prompt": COMMON, "skills": []}
    for sid, kind, file, motion, size, duration, subject in SPECS:
        row = rows[sid]
        if sid in ("mag_lightning", "pri_judgment"):
            motion = "strike"
        manifest["skills"].append({"id": sid, "name": row["name_kr"], "job": row["owner_id"], "cast": row["cast"], "description": row["desc_kr"], "kind": kind, "file": file, "motion": motion, "size": size, "duration": duration, "subject": subject, "prompt": COMMON + subject})
    SOURCE.mkdir(parents=True, exist_ok=True)
    (SOURCE / "prompts.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return manifest


def normalize(path: Path) -> Image.Image:
    with Image.open(path) as original:
        rgba = original.convert("RGBA")
    alpha = rgba.getchannel("A")
    if alpha.getextrema() != (0, 255):
        raise ValueError(f"Effect needs genuine transparent alpha: {path}")
    bbox = alpha.getbbox()
    if bbox is None:
        raise ValueError(f"Empty effect: {path}")
    crop = rgba.crop(bbox)
    scale = round(SIZE * .86) / max(crop.size)
    # Premultiplied filtering preserves the generated alpha without fringes.
    crop = crop.convert("RGBa").resize(tuple(max(1, round(v * scale)) for v in crop.size), Image.Resampling.LANCZOS).convert("RGBA")
    canvas = Image.new("RGBA", (SIZE, SIZE))
    canvas.paste(crop, ((SIZE - crop.width) // 2, (SIZE - crop.height) // 2))
    return canvas


def review_sheet(job: str, entries: list[dict], sprites: dict[str, Image.Image]) -> None:
    sheet = Image.new("RGB", (1280, ((len(entries) + 3) // 4) * 350), (22, 22, 36))
    draw = ImageDraw.Draw(sheet)
    font_path = Path("C:/Windows/Fonts/malgun.ttf")
    font = ImageFont.truetype(str(font_path), 16) if font_path.exists() else ImageFont.load_default()
    with Image.open(ROOT / f"src/assets/art/faces/gpt/hero/{job}_1.webp") as original:
        face = original.convert("RGBA").resize((101, 101), Image.Resampling.LANCZOS)
    for i, entry in enumerate(entries):
        x, y = i % 4 * 320, i // 4 * 350
        sprite = sprites[entry["file"]]
        art = sprite.resize((190, 190), Image.Resampling.LANCZOS)
        sheet.paste(art, (x + 65, y + 5), art)
        label = entry["name"] + (" · 보호" if entry["file"] == "kni_duel_guard" else "")
        draw.text((x + 12, y + 198), label, font=font, fill=(216, 217, 230))
        draw.text((x + 12, y + 222), entry["file"], font=font, fill=(168, 177, 194))
        for column, size in enumerate((85, entry["size"])):
            px = x + 28 + column * 154
            sheet.paste(face, (px, y + 247), face)
            overlay = sprite.resize((size, size), Image.Resampling.LANCZOS)
            sheet.paste(overlay, (px + (101 - size) // 2, y + 247 + (101 - size) // 2), overlay)
    sheet.save(SOURCE / f"preview_{job}.png")


def build(manifest: dict) -> None:
    missing = [s["file"] for s in manifest["skills"] if not (SOURCE / f"{s['file']}.png").exists()]
    if missing:
        raise ValueError("Missing generated images: " + ", ".join(missing))
    sprites = {s["file"]: normalize(SOURCE / f"{s['file']}.png") for s in manifest["skills"]}
    OUT.mkdir(parents=True, exist_ok=True)
    measurements = []
    for file, rgba in sprites.items():
        path = OUT / f"{file}.webp"
        rgba.save(path, "WEBP", quality=90, alpha_quality=100, method=6)
        with Image.open(path) as installed:
            installed.load()
            if installed.size != (SIZE, SIZE) or installed.mode != "RGBA":
                raise ValueError(f"Invalid installed format: {path}")
            alpha = installed.getchannel("A")
            if any(alpha.getpixel(p) for p in ((0, 0), (383, 0), (0, 383), (383, 383))):
                raise ValueError(f"Opaque corner: {path}")
            bbox = alpha.getbbox()
        measurements.append({"file": file, "size": [SIZE, SIZE], "alpha_bbox": list(bbox), "content_pct": round(max(bbox[2] - bbox[0], bbox[3] - bbox[1]) / SIZE * 100, 1), "webp_bytes": path.stat().st_size})
    (SOURCE / "measurements.json").write_text(json.dumps(measurements, indent=2) + "\n", encoding="utf-8")
    for job in JOBS:
        review_sheet(job, [s for s in manifest["skills"] if s["job"] == job], sprites)
    print(f"Installed {len(sprites)} effect sprites for {len(skill_rows())} skills; {sum(m['webp_bytes'] for m in measurements):,} bytes")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--prepare", action="store_true")
    args = parser.parse_args()
    manifest = prepare()
    if args.prepare:
        print(f"Prepared {len(manifest['skills'])} prompts in {SOURCE}")
    else:
        build(manifest)
