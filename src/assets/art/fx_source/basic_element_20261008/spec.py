# -*- coding: utf-8 -*-
"""기본 스킬 원소 10장 — 깔끔판(ADR-0551)의 윤곽에 원소 재질 묘사를 더한다 (2026-10-08 사용자 지시 「불 같은 건 기존 스킬 방식으로 처리하면 안 돼 · 원소 같은 건 좀 묘사가 되어야」).

칸 키 = (시트 id, 칸 번호 1~4). 기준 그림 = anchor/clean_set.png(깔끔판 넷 — 깔끔함의 정도) + 고블린 초상.
구도 · 크기 · 움직임은 skill_art.js 그대로다. 대상은 불 · 냉기 · 번개 · 독 피해 · 강화의 기본 스킬.
"""

ANCHORS = ['anchor/clean_set.png', 'anchor/face_goblin.png']

COMMON = """Use your built-in image generation tool to create exactly ONE image from the prompt below. Do not write code, do not run commands, do not edit any files. When the image is saved, reply with only its absolute file path.

Two reference images are attached: (1) four of our game's skill effects on magenta: they show how CLEAN our effects are; (2) a character portrait from our game, to show what the effects flash over.

PROMPT:
ELEMENTAL skill effects (fire, ice, lightning, poison) for a dark-fantasy party RPG with a clean, minimal battle screen. Each effect flashes for half a second over a small head-and-shoulders portrait.

The attached effects are clean slim strokes. Keep that CLEAN outline and simplicity, but these are ELEMENTS, so the material must be DEPICTED and instantly readable: fire must look like real flickering fire, ice like hard cold crystal, lightning like crackling electricity, poison like dripping venom.

HOW TO DEPICT (clean cel-shaded style):
- each element painted in exactly THREE flat tones: a bright inner core, the main color, and a darker edge tone, in clean flat bands (cel shading, no soft gradients)
- clean smooth outer edges, a thin even darker edge line at most
- a few readable shapes with real form: flame tongues that lick and curl with flickering tips and a few small embers; ice crystals with two or three flat facet planes (light side / shadow side) and a thin white edge line; lightning as a jagged branching bolt with a white-hot core and short crackle forks; poison as thick drips and round drops with one flat highlight stripe
- moderate detail only: enough to read the material, nothing more

DO NOT:
- no rough woodcut, no thick charcoal ink, no brush grain, no painterly texture, no noise
- no sparkles or twinkle stars, no glitter, no glossy shine, no jewel-like sparkle, no lens flare, no neon
- no semi-transparent glow, haze, smoke or soft gradients: every shape is fully opaque with a crisp edge (it will be cut out of the magenta)
- no faces, characters or portraits in the cells: effects only

SHEET: square image, 2x2 grid of four separate pictures, straight 16px pure black gridlines running fully from edge to edge, solid flat pure magenta #FF00FF background in every cell, no text anywhere. Nothing in the pictures may be pink, magenta or purple.
Each picture stays inside its own cell with a clear strip of magenta before the gridlines.
Each of the FOUR CELLS is a DIFFERENT picture. Buff effects keep the MIDDLE HALF of the cell EMPTY magenta (the face shows there); strikes may cross the middle.
Cells marked FALL show something dropping from above: its point is LOW in the cell at the stated height, with thin speed lines above it. Cells marked IMPACT LOW are centered low in the cell at the stated height.

TONES (core / main / edge): fire = pale yellow / warm orange / deep red · ice = white / pale ice blue / steel blue · lightning = white / pale yellow / amber · poison = pale yellow-green / olive green / dark green

"""

SHEETS = {
    'e1': [
        "FIREBALL (a strike): a ball of fire bursting at the middle: a bright round core with SEVEN irregular flame tongues licking and curling outward, uneven lengths, NOT a symmetrical sun symbol, plus THREE small embers flying off. fire.",
        "INFERNO (a strike on every enemy): a wall of fire rising from the bottom edge: FIVE overlapping flame tongues of different heights, the back ones deeper red and the front ones brighter, flickering tips, FOUR small embers rising. fire.",
        "ENCHANT (a buff: fire runs along the blade; face clear): ONE sword blade outline standing diagonally along the left side, wreathed in flames running up along its edge, a few small embers. fire, with a pale steel blade.",
        "POISON ARROW (a buff: poison on the arrows; face clear): thick venom dripping down BOTH side edges in heavy drips, FOUR round falling drops each with one flat highlight stripe, TWO small bubbles. poison.",
    ],
    'e2': [
        "ICE BLAST, FALL (a strike from above): THREE ice crystal shards, each with flat facet planes (light side / shadow side) and a thin white edge line, dropping point-down side by side, their points at 87% of the cell height, thin speed lines above them reaching the top edge. ice.",
        "ICE BLAST, IMPACT LOW (the shards break): centered at 89% of the cell height, the shards shattering into SIX faceted ice pieces flying outward and upward, plus ONE low flat frost crust on the ground. ice.",
        "FROST NOVA (a strike on every enemy): ONE ring of frost around the middle with EIGHT faceted ice crystal spikes bursting outward from it, uneven lengths; the middle stays open. ice.",
        "FROZEN WALL (a summoned wall; face clear): clusters of tall faceted ice crystal columns standing along the bottom edge and rising up both sides (FIVE big columns plus a few small ones), the middle open. ice.",
    ],
    'e3': [
        "LIGHTNING, FALL (a bolt from above): ONE jagged branching lightning bolt from the top edge down to 90% of the cell height, a white-hot core inside a pale yellow body with an amber edge, THREE short crackle forks, ONE small crackle burst at the bottom tip. lightning.",
        "CHAIN LIGHTNING (a strike): ONE jagged lightning bolt running horizontally across the EXACT VERTICAL MIDDLE of the cell from the left edge to the right edge, white-hot core, FOUR short crackle forks and TWO small crackle bursts along it. lightning.",
        "FIREBALL, ALTERNATE TAKE (a strike): a swirling ball of fire: flames spiraling around a bright core at the middle, curling flame tips, THREE small embers. fire.",
        "INFERNO, ALTERNATE TAKE (a strike on every enemy): THREE tall fire columns rising from the bottom edge on the left, middle and right, each with layered flame tongues and flickering tips, small embers between them. fire.",
    ],
}

# 깔끔판 파일 → (시트, 칸) — 미리보기에서 `<file>_clean.webp` 자리에 선다. B안은 *_alt
PICKS = {
    'mag_fireball': ('e1', 1), 'mag_inferno': ('e1', 2), 'kni_enchant': ('e1', 3), 'arc_poison': ('e1', 4),
    'mag_iceblast': ('e2', 1), 'mag_iceblast_shatter': ('e2', 2), 'mag_frostnova': ('e2', 3), 'mag_frozenwall': ('e2', 4),
    'mag_lightning': ('e3', 1), 'mag_chain': ('e3', 2), 'mag_fireball_alt': ('e3', 3), 'mag_inferno_alt': ('e3', 4),
}
