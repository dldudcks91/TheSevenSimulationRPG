# -*- coding: utf-8 -*-
"""기본 직업 스킬 41장 다시 뽑기 — 코드 모양처럼 깔끔하게 (2026-10-08 사용자 지시 「그림 자체가 너무 섬세해서 깔끔함이 사라진다 · 이미지를 다 다시 뽑아봐」).

칸 키 = (시트 id, 칸 번호 1~4 — 왼쪽 위부터 1 · 2 / 3 · 4). 기준 그림 = anchor/code_effects.png(게임에서 찍은 코드 모양) + 고블린 초상.
구도 · 색 정체성은 지금 그림(ADR-0549 · 함성 셋 ADR-0546 · 오오라 셋 ADR-0548)을 따르고 결만 바꾼다. 크기 · 움직임은 skill_art.js 그대로다.
"""

COMMON = """Use your built-in image generation tool to create exactly ONE image from the prompt below. Do not write code, do not run commands, do not edit any files. When the image is saved, reply with only its absolute file path.

Two reference images are attached: (1) a sheet of our game's CODE-DRAWN battle effects over a goblin portrait: THIS IS THE LOOK WE WANT, clean and simple; (2) a character portrait from our game, to show what the effects flash over.

PROMPT:
Skill effects for a dark-fantasy party RPG whose battle screen is CLEAN and minimal. Each effect flashes for half a second over a small head-and-shoulders portrait.

LOOK: match the attached code-drawn effects. CLEAN AND SIMPLE.
- only 1 to 3 main shapes per effect (a few strokes, a ring, a pillar, chevrons), plus at most a few small plain dots
- each stroke is a smooth, even, slim shape: a bright near-white core stripe with a soft colored band around it, like a lit stroke of light
- flat colors, crisp smooth edges, NO texture, NO brush grain, NO hatching, NO cracks or chips inside shapes, NO painted shading
- lots of empty space; the shapes are slim and light, never heavy masses
- soft, slightly muted colors that read clearly on a dark background

DO NOT:
- no detailed illustration, no rendered rock / ice / fire texture, no debris piles, no fragments scattered everywhere
- no rough woodcut look, no thick charcoal outlines, no painterly strokes
- no sparkles or twinkle stars, no diamond confetti, no gem facets, no glossy shine, no lens flare, no neon
- no semi-transparent glow, haze or smoke: every shape is fully opaque with a crisp edge (it will be cut out of the magenta)
- no faces, characters or portraits in the cells: effects only

SHEET: square image, 2x2 grid of four separate pictures, straight 16px pure black gridlines running fully from edge to edge, solid flat pure magenta #FF00FF background in every cell, no text anywhere. Nothing in the pictures may be pink, magenta or purple.
Each picture stays inside its own cell with a clear strip of magenta before the gridlines.
Each of the FOUR CELLS is a DIFFERENT picture. Buff, shield and heal effects keep the MIDDLE HALF of the cell EMPTY magenta (the face shows there) and frame it; strikes may cross the middle.
Cells marked FALL show something dropping from above: its point is LOW in the cell (at the stated height) with thin speed lines above it. Cells marked IMPACT LOW are centered low in the cell at the stated height.

COLORS (core / band): sky = near-white / pale sky blue · earth = light tan / ochre brown · blood = warm white / deep red · gold = pale cream / muted gold · verdigris = pale mint / muted teal green · steel = white / cool gray · holy = white / pale gold · fire = pale yellow / soft orange · ice = white / pale ice blue · lightning = white / pale yellow · wind = white / pale sage green · poison = pale yellow-green / olive green · heal = pale mint / soft green · shadow = light gray / dark slate · arcane = white / muted steel blue

"""

# 시트 id → [칸 1 · 2 · 3 · 4]
SHEETS = {
    'c1': [
        "BASH (a strike): THREE long slim parallel slash strokes running diagonally from the upper right to the lower left across the whole cell. sky.",
        "DOUBLE SWING (a strike): TWO long slim slash strokes crossing in one big X through the middle, with ONE small round flash dot at the crossing. sky.",
        "EARTHSPLIT (a strike on every enemy): ONE slim jagged crack line running across the lower half, with FIVE slim pointed spikes rising from it. earth.",
        "LEAP ATTACK (a strike on every enemy): ONE slim vertical strike stroke coming straight down into the lower middle, landing in TWO thin flat ground rings (ellipses) at the bottom. steel stroke, earth rings.",
    ],
    'c2': [
        "TAUNT (a buff; face clear): EIGHT short slim focus strokes pointing INWARD from the cell edges toward the middle, all stopping well before the middle. blood.",
        "WAR CRY (a buff; face clear): EIGHT short slim focus strokes pointing INWARD from the cell edges toward the middle, all stopping well before the middle (exactly the same drawing as a red one, only the color differs). gold.",
        "BATTLE ORDERS (a buff; face clear): EIGHT short slim focus strokes pointing INWARD from the cell edges toward the middle, all stopping well before the middle (exactly the same drawing, only the color differs). verdigris.",
        "IRON SKIN (a buff; face clear): TWO slim curved steel plates arcing around the left and right sides of the cell like a shell around the face. steel.",
    ],
    'c3': [
        "SMITE (a strike): ONE slim crescent stroke (a shield edge) slamming in from the upper left, with ONE round flash ring where it hits the middle. steel crescent, holy flash.",
        "HOLY SHIELD (a buff; face clear): ONE slim rounded shield-shaped frame around the middle, with ONE small plain cross at its top. holy.",
        "CHARGE (a strike): ONE slim lance-tip stroke flying in from the left with its point at the middle, ONE thin ring around the point. steel.",
        "RUSH (a strike): TWO short slim parallel thrust strokes flying in from the left toward the middle. steel.",
    ],
    'c4': [
        "DUEL MARK (a curse on one enemy): ONE slim X mark in the middle inside ONE thin ring. blood.",
        "DUEL GUARD (a buff; face clear): ONE slim rounded frame around the middle with small corner ticks. blood.",
        "ENCHANT (a buff: fire on the blade; face clear): ONE slim diagonal blade-shaped stroke along the left side with THREE small clean flame tongues rising along it. fire.",
        "MIGHT (an aura; face clear): a thin clean magic circle made of TWO concentric rings around the middle, with a thin FIVE-POINTED STAR drawn inside it in thin lines. arcane.",
    ],
    'c5': [
        "FANATICISM (an aura; face clear): the SAME thin magic circle of TWO concentric rings, with FOUR thin curved PINWHEEL blades drawn inside it in thin lines. arcane.",
        "DEFIANCE (an aura; face clear): the SAME thin magic circle of TWO concentric rings, with a thin SQUARE INSIDE A SQUARE (the inner one turned 45 degrees) drawn inside it in thin lines. arcane.",
        "FIREBALL (a strike): ONE round fire burst at the middle: a clean round core with SIX short slim flame tongues around it. fire.",
        "INFERNO (a strike on every enemy): FIVE tall slim flame tongues rising from the bottom edge, like a clean row of candle flames. fire.",
    ],
    'c6': [
        "ICE BLAST, FALL (a strike from above): THREE slim pointed ice shards dropping point-down side by side, their points at 87% of the cell height, with thin speed lines above them reaching the top edge. ice.",
        "ICE BLAST, IMPACT LOW (the shards break): centered at 89% of the cell height, SIX slim ice slivers flying outward and upward from that point, plus one thin flat ring on the ground. ice.",
        "FROST NOVA (a strike on every enemy): ONE thin ring around the middle with EIGHT slim pointed ice shards on it pointing outward. ice.",
        "LIGHTNING, FALL (a bolt from above): ONE slim zigzag lightning bolt from the top edge down to 90% of the cell height, with TWO short thin side forks. lightning.",
    ],
    'c7': [
        "CHAIN LIGHTNING (a strike): ONE slim zigzag lightning bolt running horizontally across the middle from the left edge to the right edge, with TWO short thin forks. lightning.",
        "FOCUS (a buff; face clear): ONE thin dotted magic circle around the middle with FOUR small slim ice crystals at the diagonals. ice.",
        "FROZEN WALL (a summoned wall; face clear): FIVE tall slim pointed ice spikes standing along the bottom edge and up both sides. ice.",
        "SNIPE (a strike): ONE long very slim arrow stroke flying in from the left with its head at the middle, ONE small round flash at the head. wind.",
    ],
    'c8': [
        "RAPID SHOT (a strike): THREE short slim arrow strokes flying in from the left toward the middle, stacked one above another. wind.",
        "MULTISHOT (a strike on every enemy): FIVE slim arrow strokes raining steeply down from the upper left. wind.",
        "GUIDED ARROW (a strike): ONE slim arrow stroke curving in a big hook from the upper right into the middle, ending in ONE thin target ring. wind.",
        "PIERCING SHOT (a buff; face clear): ONE long slim horizontal arrow stroke across the LOWER THIRD, piercing through THREE thin rings. wind.",
    ],
    'c9': [
        "POISON ARROW (a buff; face clear): TWO slim wavy drip streams running down both side edges, with FOUR small round drops falling. poison.",
        "JUDGMENT (a strike): ONE slim pillar of light coming straight down from the top edge into the middle, ending in ONE thin flat ring. holy.",
        "HEALING LIGHT (a heal; face clear): TWO slim ribbons rising up the left and right sides, with FOUR small round motes rising. heal.",
        "GRACE (a buff; face clear): ONE slim arc sweeping over the top of the middle, with THREE small slim leaf shapes rising. holy.",
    ],
    'c10': [
        "HASTE (a buff; face clear): FOUR slim upward chevrons (^) stacked on the left side and FOUR on the right side. wind.",
        "HEAL (a heal; face clear): ONE thin ring around the middle with FOUR short slim rays pointing outward and FOUR small round motes. heal.",
        "PRAYER OF REGENERATION (a buff; face clear): ONE thin magic circle around the middle with FOUR small slim leaf shapes at the diagonals. heal.",
        "PENITENCE (a curse; face clear): TWO slim wavy shadow streams sinking down from the top corners, and THREE slim downward-pointing shards along the bottom edge. shadow.",
    ],
    'c11': [
        "BIND (a curse): TWO slim horizontal binding bands crossing the cell (one in the upper third, one in the lower third), with ONE thin sigil ring behind them. shadow.",
        "FIREBALL, ALTERNATE TAKE (a strike): ONE slim spiral of fire curling around the middle, leaving the very center open, with THREE small round embers. fire.",
        "INFERNO, ALTERNATE TAKE (a strike on every enemy): THREE tall slim flame tongues rising from the bottom edge on the left, middle and right, with open space between them. fire.",
        "FROST NOVA, ALTERNATE TAKE (a strike on every enemy): TWO thin concentric rings around the middle with SIX tiny slim ice shards on the outer ring. ice.",
    ],
}

# 설치 파일 → (시트, 칸) — B안은 *_alt
PICKS = {
    'war_bash': ('c1', 1), 'war_doubleswing': ('c1', 2), 'war_quake': ('c1', 3), 'war_leap': ('c1', 4),
    'war_taunt': ('c2', 1), 'war_shout': ('c2', 2), 'war_battleorders': ('c2', 3), 'war_ironskin': ('c2', 4),
    'kni_smite': ('c3', 1), 'kni_holyshield': ('c3', 2), 'kni_charge': ('c3', 3), 'kni_rush': ('c3', 4),
    'kni_duel': ('c4', 1), 'kni_duel_guard': ('c4', 2), 'kni_enchant': ('c4', 3), 'kni_might': ('c4', 4),
    'kni_fanaticism': ('c5', 1), 'kni_defiance': ('c5', 2), 'mag_fireball': ('c5', 3), 'mag_inferno': ('c5', 4),
    'mag_iceblast': ('c6', 1), 'mag_iceblast_shatter': ('c6', 2), 'mag_frostnova': ('c6', 3), 'mag_lightning': ('c6', 4),
    'mag_chain': ('c7', 1), 'mag_focus': ('c7', 2), 'mag_frozenwall': ('c7', 3), 'arc_snipe': ('c7', 4),
    'arc_rapid': ('c8', 1), 'arc_multishot': ('c8', 2), 'arc_guided': ('c8', 3), 'arc_pierce': ('c8', 4),
    'arc_poison': ('c9', 1), 'pri_judgment': ('c9', 2), 'pri_heal': ('c9', 3), 'pri_grace': ('c9', 4),
    'pri_haste': ('c10', 1), 'pri_cure': ('c10', 2), 'pri_regen': ('c10', 3), 'pri_penitence': ('c10', 4),
    'pri_bind': ('c11', 1), 'mag_fireball_alt': ('c11', 2), 'mag_inferno_alt': ('c11', 3), 'mag_frostnova_alt': ('c11', 4),
}
