# -*- coding: utf-8 -*-
"""전직 스킬 45종 이펙트 발주 명세 — 시트(2x2) 칸 문안 + GIF 미리보기 값.

칸 키 = (시트 id, 칸 번호 1~4 — 왼쪽 위부터 1 · 2 / 3 · 4).
FX 값은 skill_art.js 와 같은 모양(motion · size · ay · duration · then) — A안이 2026-10-08 게임에 들어갔다(ADR-0550 · 설치 = scripts/build_advance_fx.py).
게임 값을 바꾸면 skill_art.js 가 원본이다 — 여기는 미리보기 GIF 용 사본이다.
"""

COMMON = """Use your built-in image generation tool to create exactly ONE image from the prompt below. Do not write code, do not run commands, do not edit any files. When the image is saved, reply with only its absolute file path.

Three reference images are attached: two character portraits from our game (a hero of the class and a goblin), and one sheet of this class's BASIC skill effects from our game (on magenta). Together they define the art style.

PROMPT:
ADVANCED-CLASS skill effects for a grim dark-fantasy party RPG. Each effect flashes for half a second over a small head-and-shoulders portrait like the attached ones.

These are the big moments of a battle, so each one must look a clear step GRANDER than the attached basic effects, but drawn by the SAME artist in the SAME crude way:
- BIGGER: the effect spreads out to the edges of its cell, well past where the portrait sits (the portrait would fill only the middle 60% of the cell)
- MORE: one main shape plus one secondary layer (debris, a ring, a trail, broken chunks), still a FEW large pieces you can count, never a spray of tiny bits
- TWO COLORS: one main color plus one accent color, both muted
- a strong, dramatic, heavy silhouette
Grand and heavy, NOT shiny: the drama comes from size, weight and shape, never from glow.

CRUDE AND CHUNKY, like a woodcut or a heavy hand-painted old game sprite, as rough as the basic effects: very thick uneven outlines, large blunt shapes, flat fills with one shadow tone, NO fine details, NO thin lines, NO polish. Heavy, old, worn.

STYLE: it must look drawn by the same artist as the attached portraits and effects:
- the same thick, dark charcoal ink outline, slightly uneven and hand-drawn, never a clean vector line
- muted, desaturated colors at middle value, one flat shadow tone, very small highlights, a grim, dusty, weathered mood
- chipped, ragged, torn edges
- every shape fully opaque with an outline: no semi-transparent haze, mist, smoke or glow

DO NOT (these make it look like generic AI clip art):
- no sparkles, no twinkle stars, no floating diamond confetti, no scattered glitter dots
- no jewel-like faceted shading, no glossy shine, no glow, no bloom, no gradient, no lens flare
- no perfectly symmetrical starburst explosion, no comic "POW" star shape
- no saturated or neon colors, nothing purple or pink
- no mobile-game or sticker look
- no human, hero or goblin faces in the cells: effects only

SHEET: square image, 2x2 grid of four separate pictures, straight 16px pure black gridlines running fully from edge to edge, solid flat pure magenta #FF00FF background in every cell, no text anywhere. Nothing in the pictures may be pink, magenta or purple.
Each picture stays inside its own cell, leaving a thin strip of magenta before the gridlines.
Each of the FOUR CELLS is a DIFFERENT picture. Buff, shield and heal effects keep the MIDDLE 45% of the cell EMPTY magenta (the face shows there) and frame it closely and boldly; strikes may cross the middle.
Cells marked FALL show something dropping onto the target from far above: draw it LOW in the cell (its point or face in the bottom quarter) with its trail reaching up to the top edge. Cells marked IMPACT are centered on the middle of the cell.

"""

# 시트 id → (직업, [칸 1 · 2 · 3 · 4 문안])
SHEETS = {
    'w1': ('warrior', [
        "RAGNAROK (a buff: the berserker transforms into a war-god form; face clear): a tall crown of FIVE jagged dark-crimson flame-blades rising from behind the shoulders up to the top edge, TWO huge curved horns of cracked old bone curling up on the left and right, and a ragged band of dark-red blood splatter along the lower edge. Dark crimson and bone-white, charcoal outline.",
        "BERSERK (a buff: the berserker burns his own blood for fury; face clear): a ring of SIX thick blood-red jagged slashes bursting OUTWARD from around the middle toward the cell edges, FOUR big blood drops flung out, and dark cracked vein lines between them. Dark crimson and dried brown.",
        "MUTUAL DESTRUCTION (a strike: a do-or-die cleave that costs the warrior his own blood): ONE massive diagonal cleave from the upper right corner to the lower left corner, wider than a face, a chipped dark-steel edge with a thick dark-crimson blood trail behind it and a few big blood drops. Steel gray and dark crimson.",
        "MUTUAL DESTRUCTION, IMPACT (the moment after the cleave): a big ragged burst of dark-crimson blood splashing out from the middle in FIVE heavy uneven tongues, with TWO broken chunks of armor flying off. Dark crimson and steel gray.",
    ]),
    'w2': ('warrior', [
        "WHIRLWIND (a strike: the barbarian spins and cuts everyone again and again): THREE heavy curved steel blade arcs chasing each other around the middle in one big circle, like a spinning wheel of blades, with FOUR chunks of torn dirt flung outward. Steel bone-white with a muted ochre dust accent.",
        "THOR'S WRATH, FALL (a giant hammer blow from above, NOT lightning): ONE enormous crude stone-and-iron war hammer head dropping straight down, its flat striking face in the bottom quarter of the cell, with THREE thick vertical speed streaks above it reaching the top edge. Dark iron gray and weathered ochre-brown stone.",
        "THOR'S WRATH, IMPACT: a heavy crater blast centered: a cracked ring of broken ground, FIVE big rock chunks and TWO broken armor plates flying outward, thick ochre dust lumps (opaque, outlined). Ochre brown and iron gray.",
        "SHOCKWAVE (a strike on every enemy: the barbarian smashes the ground): a WIDE ground shockwave across the LOWER HALF of the cell: TWO jagged rings of split earth bursting outward, FIVE stone slabs tilting up, opaque dust lumps. Earth ochre-brown and stone gray.",
    ]),
    'w3': ('warrior', [
        "LION'S ROAR (a strike on every enemy: a roar so loud it hits): THREE thick curved sound-wave arcs slamming in from the left side toward the middle, the arcs together shaped like the open jaws of a roaring lion with crude fangs at the top and bottom. Muted ochre gold and dark brown.",
        "COMMAND (a party buff: a war shout that raises everyone's damage; face clear): TWO tattered war banners on poles rising behind the left and right shoulders up to the top edge, dark-red cloth with dull gold trim, and a fan of SIX thick dull-gold shout streaks bursting outward around the middle. Dark red and dull gold.",
        "INTIMIDATE (a curse on every enemy: a battle cry that breaks their nerve; face clear): EIGHT heavy jagged dark-crimson and charcoal shout streaks CRUSHING INWARD from all the cell edges toward the middle, with TWO big cracks splitting through them. Dark crimson and charcoal gray.",
        "RAGNAROK, ALTERNATE TAKE (a buff: the berserker becomes a war-god; face clear): a huge ragged ring of dark-red fury shaped like fire (opaque, outlined) roaring up all around the portrait, taller at the top, with TWO big black-iron horn shapes rising out of it. Dark crimson and charcoal.",
    ]),
    'k1': ('knight', [
        "LAST BASTION (a party buff: the guardian becomes the party's fortress; face clear): a wall of FIVE tall dented steel tower shields standing side by side in a U-shaped arc around the bottom and both sides of the cell, rivets and scratches, with a crenellated stone battlement rim along their tops. Steel gray and muted stone blue.",
        "UNBREAKABLE WILL (a buff: the guardian's body turns hard as iron; face clear): THREE thick riveted iron bands wrapped around the portrait in a ring, one over another, dented and scraped, with TWO big stone chunks breaking off the outside while the bands hold. Dark steel-blue iron and stone gray.",
        "DIVINE JUDGMENT (a buff: a thick holy barrier that throws blows back; face clear): a heavy round barrier ring of pale-gold metal plates around the portrait, with SIX short sword blades sticking OUTWARD from it like spikes. Pale gold and steel gray.",
        "UNYIELDING OATH (a party buff: an oath that shields everyone; face clear): a thick pale-gold round shield rim around the portrait, an old parchment oath ribbon wrapping around it twice, and an upright sword hilt standing at the top. Pale gold and parchment cream.",
    ]),
    'k2': ('knight', [
        "HOLY WAR (a party buff: a holy-war barrier for everyone; face clear): a thick dull-gold ring around the portrait wreathed in FIVE tall muted red-orange flame tongues rising from its top half, with a crude cross mark at the bottom of the ring. Dull gold and muted red-orange.",
        "VOW (a party heal: a vow that raises everyone's max health and heals them; face clear): THREE thick pale-green healing ribbons spiraling up around the sides of the portrait, a big pale-gold oath ring around the top, and FOUR fat healing drops rising. Muted pale green and pale gold.",
        "RETRIBUTION (a buff: the crusader turns endured wounds into fury; face clear): TWO great wings, each made of FIVE jagged crimson sword blades, fanning up and out behind the left and right shoulders, with a few dark-red drops. Dark crimson and steel gray.",
        "SHOWDOWN (a buff: the crusader challenges one foe to a fight to the end; face clear): TWO huge swords crossing ABOVE the head (their crossing point near the top edge), blades running down along both sides of the cell, with a ring of FOUR crimson jagged challenge streaks. Steel gray and crimson.",
    ]),
    'k3': ('knight', [
        "CONDEMNATION, FALL (a strike: a judgment blow that finishes a foe): ONE huge executioner's greatsword plunging straight down point-first, its tip in the bottom quarter of the cell, with THREE thick vertical speed streaks above it to the top edge. Steel gray with a crimson-wrapped hilt.",
        "CONDEMNATION, IMPACT: a big cross-shaped crack burst centered: FOUR heavy crimson-and-steel jagged arms (up, down, left, right, of uneven lengths, NOT a perfect star) with broken stone chunks. Crimson and steel gray.",
        "UNBREAKABLE WILL, ALTERNATE TAKE (a buff; face clear): a ring of FIVE heavy anvil-like iron blocks locked around the portrait like a fortress wall, cracked but holding. Dark iron and stone gray.",
        "VOW, ALTERNATE TAKE (a party heal; face clear): a big pale-gold oath circle around the portrait with FOUR fat pale-green leaves rising from the bottom and an upright sword standing at the bottom center. Pale gold and muted pale green.",
    ]),
    'm1': ('mage', [
        "METEOR, FALL (a burning boulder from the sky): ONE huge cracked burning boulder dropping steeply from the upper right, the boulder low in the cell near the bottom center, a thick tail of FOUR big flame tongues streaming back to the upper-right corner. Muted red-orange flame and dark charcoal-brown rock.",
        "METEOR, IMPACT: a heavy fire-and-rock blast centered: FIVE big uneven flame tongues bursting out with FIVE broken rock chunks flying, a cracked crater rim at the bottom. Muted red-orange and charcoal brown.",
        "FIREWALL (a strike on every enemy: a wall of fire): a tall wall of fire spanning the FULL WIDTH of the cell, SIX thick flame tongues of uneven height rising from a broken burning ground line at the bottom. Muted red-orange and dark ember brown.",
        "HYDRA (a strike: fire serpent heads bite again and again): THREE crude fire serpent heads made of flame, fanged jaws open, lunging in from the left, the right and the top toward the middle, their necks trailing off to the cell edges. Muted red-orange and charcoal.",
    ]),
    'm2': ('mage', [
        "FROZEN ORB (a strike: a big ice orb hurled at one enemy): ONE big round ice orb with chunky white cracks sitting at the middle of the cell, flying in from the left, with a trail of THREE fat ice shards behind it reaching the left edge. Clear muted blue ice with white cracks and a bright pale core.",
        "FROZEN ORB, IMPACT: the orb shatters at the middle: EIGHT big ice shards flung outward in a slight spiral (uneven, not a symmetrical star), a cracked ice core left in the middle. Clear muted blue ice with white cracks.",
        "BLIZZARD (a strike on every enemy: a storm cloud of ice): a heavy lumpy blue-gray snow cloud across the TOP THIRD of the cell (opaque, thick outline), with SEVEN thick ice shards and big snow clumps slanting down from it to the bottom of the cell. Muted blue ice, white and slate gray.",
        "FROST BURST (a strike: frost closes in on one enemy): a thick uneven cracked ring of TEN short heavy ice spikes closing in around the middle, all pointing inward. Clear muted blue ice with white cracks.",
    ]),
    'm3': ('mage', [
        "FROST BURST, IMPACT (the frost explodes): SIX huge jagged ice spikes bursting OUTWARD from the middle in uneven lengths, with a few big ice chunks. Clear muted blue ice and white.",
        "THUNDER STRIKE, FALL (a massive bolt from the sky): ONE very thick jagged lightning bolt coming straight down from the top edge and ending in the bottom quarter of the cell, with TWO short forks. Pale yellow with a white core and a dark charcoal outline.",
        "THUNDER STRIKE, IMPACT: a jagged electric blast centered: FIVE thick zigzag lightning arms of uneven length crackling out, with scorched black cracked ground chunks. Pale yellow and charcoal.",
        "NOVA (a strike on every enemy: a ring of lightning bursts out): a big jagged ring of crackling lightning bursting outward around the middle, with SIX forked branches reaching toward the cell edges, the middle empty. Pale yellow and white with a charcoal outline.",
    ]),
    'm4': ('mage', [
        "STATIC FIELD (a strike: static electricity crawls over one enemy): a crude cage of FOUR thick zigzag lightning arcs wrapped around the middle like a net, crossing each other, with FOUR heavy knots where they cross. Pale yellow and white with a charcoal outline.",
        "HYDRA, ALTERNATE TAKE (a strike): ONE big crude three-headed fire serpent rising from the bottom of the cell, its THREE fanged flame heads striking down at the middle from above. Muted red-orange and charcoal.",
        "STATIC FIELD, ALTERNATE TAKE (a strike): a thick ring of jagged pale-yellow lightning hugging the cell edges, with SIX short bolts jumping INWARD to the middle. Pale yellow and charcoal.",
        "BLIZZARD, ALTERNATE TAKE (a strike on every enemy): a swirling storm of NINE fat ice shards and snow clumps spiraling in around the middle in one big circle. Clear muted blue ice and white.",
    ]),
    'a1': ('archer', [
        "TRUE AIM (a buff: the sniper takes perfect aim; face clear): a big crude sniper reticle around the portrait: a thick broken ring with FOUR heavy tick marks pointing in from the top, bottom, left and right, and ONE fat arrow lying across the top of the ring. Bone-white with a muted sage-green rim.",
        "SINGLE STRIKE (a strike: one gigantic arrow): ONE gigantic fat arrow, as long as the cell, flying in from the left with its iron head at the middle of the cell, THREE thick motion streaks along its shaft, feathers at the left edge. Bone-white shaft with a muted sage-green rim and a dark iron head.",
        "SINGLE STRIKE, IMPACT: a heavy piercing hit centered: a deep jagged crack burst with FIVE big splinters and TWO broken armor plates flying out to the right. Bone-white, muted sage green and iron gray.",
        "RELOAD (a buff: the sniper reloads faster; face clear): SIX fat arrows circling around the portrait head-to-tail like a revolving quiver, with a thick curved motion streak behind them. Bone-white with a muted sage-green rim.",
    ]),
    'a2': ('archer', [
        "QUICK DRAW (a buff: the bowmaster shoots very fast; face clear): THREE thick bow-string arcs repeated around the left side of the portrait like a fast motion blur, and FIVE thick speed streaks on the right side. Bone-white and muted sage green.",
        "FULL DRAW (a buff: every normal shot hits much harder; face clear): ONE huge longbow bent into a deep curve over the top of the portrait from corner to corner, and ONE fat arrow lying across the bottom of the cell with its iron head pointing right, plus FOUR thick power streaks. Bone-white wood, muted sage green and dark iron.",
        "CHAIN DRAW (a buff: every normal shot pierces through all enemies; face clear): FIVE fat arrows linked head-to-tail by thick iron chain links, curving in a big arc around the lower half and sides of the portrait. Bone-white arrows with a muted sage-green rim and a dark iron chain.",
        "HUNTER'S MARK (a curse on every enemy: the ranger marks them as prey; face clear): a big crude hunter's target painted in dull red-ochre war paint: a thick broken ring around the middle with FOUR heavy claw-like brush slashes crossing its edges, the middle left empty. Dull red ochre and dark brown.",
    ]),
    'a3': ('archer', [
        "SUPPORTING FIRE (a party buff: covering arrows for everyone; face clear): a volley of SIX fat arrows rising steeply up past both sides of the portrait from the bottom corners, fanning out toward the top edge. Bone-white with a muted sage-green rim.",
        "TRAP (a strike: a hidden trap snaps on one enemy): ONE big rusty iron bear trap snapping shut from below, its TWO jagged-toothed jaws clamping up around the lower half of the cell, a chain hanging off it, FOUR torn leaves and dirt clumps flying. Rusty brown iron and muted moss green.",
        "RELOAD, ALTERNATE TAKE (a buff; face clear): a big crude quiver on the left side spilling FIVE fat arrows that arc over the top of the portrait. Bone-white, muted sage green and brown leather.",
        "CHAIN DRAW, ALTERNATE TAKE (a buff; face clear): ONE long fat arrow streaking across the LOWER THIRD of the cell, piercing through FOUR fat rings in a row, a thick chain trailing behind it. Bone-white, muted sage green and dark iron.",
    ]),
    'p1': ('priest', [
        "AEGIS (a party buff: a thick holy shield for everyone; face clear): a great round holy shield rim around the portrait made of FOUR heavy bone-white plates joined by pale-gold rivets, with crude cross marks at the top and bottom of the rim. Bone-white and pale gold.",
        "BENEDICTION (a party heal: a great blessing that restores everyone; face clear): FIVE thick pale-gold ray wedges (solid, outlined, not glowing) falling from the top edge on both sides of the portrait, and FOUR fat muted-green healing leaves and drops rising from the bottom. Pale gold and muted green.",
        "RESURRECTION (a heal: calls an ally back from death's door; face clear): TWO large crude feathered wings spreading out behind the portrait to the left and right edges, chunky feathers in a few big rows, with a thick pale-gold halo ring floating above the head near the top edge. Bone-white feathers and pale gold.",
        "DIVINE PUNISHMENT, FALL (a judgment that falls from heaven on every enemy): ONE huge jagged bone-white stake of hard light dropping straight down, its point in the bottom quarter of the cell, with TWO thick black-and-ash streaks above it reaching the top edge. Bone-white, ash gray and charcoal black.",
    ]),
    'p2': ('priest', [
        "DIVINE PUNISHMENT, IMPACT: a heavy cracked blast centered: FIVE jagged bone-white and charcoal-black shards bursting out unevenly, with dull dried-blood-red cracks in broken ground at the bottom. Bone-white, charcoal black and dull dried-blood red.",
        "ATONEMENT (a curse on every enemy: black chains of penance; face clear): FOUR heavy black iron chains with crude barbed hooks reaching in from the four corners toward the middle, dull dried-blood-red drips hanging from the hooks, the middle left empty. Charcoal black iron and dull dried-blood red.",
        "EXCOMMUNICATION (a strike: the black priest casts one enemy out): ONE big round black iron seal stamp slamming onto the middle, its face carved with a crude broken cross, THREE bone-white cracks splitting out from it and dried-blood spatter. Charcoal black, bone-white and dull dried-blood red.",
        "DIAMOND BODY (a buff: the monk's body becomes hard as bronze; face clear): a thick rough bronze ring around the portrait like a temple bell rim, FOUR heavy bronze plates locked on it, and a crude vajra (a short double-ended prayer weapon) standing above the head near the top edge. Weathered bronze and saffron ochre.",
    ]),
    'p3': ('priest', [
        "SWEEP (a strike on every enemy: the monk sweeps them with a staff): ONE huge sweeping arc of a heavy wooden staff swinging across the FULL WIDTH of the cell from left to right, a thick curved swoosh trail, the staff's iron-capped end at the right, FOUR dust clumps kicked up. Saffron ochre, brown wood and iron gray.",
        "COUNTER (a buff: the monk guards and strikes back; face clear): FOUR big clenched fists wrapped in cloth bandages punching OUTWARD from around the portrait at the four diagonals, each with a thick impact streak behind it. Weathered bronze skin and saffron cloth.",
        "DIAMOND BODY, ALTERNATE TAKE (a buff; face clear): a thick ring of heavy weathered bronze prayer beads around the portrait, TEN big beads you can count, with a small bronze bell hanging at the bottom. Weathered bronze and saffron ochre.",
        "EXCOMMUNICATION, ALTERNATE TAKE (a strike): a big crude broken cross of charcoal-black iron slamming down onto the middle, cracked in two, with THREE dried-blood-red jagged cracks around it. Charcoal black and dull dried-blood red.",
    ]),
}

# 스킬 → 미리보기 (사건, 그림 체인). 그림 = (시트, 칸, motion, size, ay, duration). ay 없으면 None. quake = 맞은 카드 흔들림.
# 사건: hit · bad 는 고블린 위, buff · heal 은 그 직업 초상 위.
FX = [
    # 전사 — 광전사 · 바바리안 · 선봉장
    ('war_ragnarok', '라그나로크', 'buff', [('w1', 1, 'pillar', 136, None, 720)], False),
    ('war_berserk', '버서크', 'buff', [('w1', 2, 'burst', 128, None, 600)], False),
    ('war_mutualruin', '동귀어진', 'hit', [('w1', 3, 'slash', 132, None, 300), ('w1', 4, 'burst', 128, None, 420)], True),
    ('war_whirlwind', '휠윈드', 'hit', [('w2', 1, 'spin', 130, None, 620)], False),
    ('war_thorswrath', '토르의 분노', 'hit', [('w2', 2, 'fall', 128, .86, 260), ('w2', 3, 'shatter', 132, None, 440)], True),
    ('war_shockwave', '쇼크웨이브', 'hit', [('w2', 4, 'ground', 140, None, 520)], True),
    ('war_lionsroar', '사자후', 'hit', [('w3', 1, 'wave', 132, None, 520)], False),
    ('war_command', '호령', 'buff', [('w3', 2, 'orders', 132, None, 620)], False),
    ('war_intimidate', '일갈', 'bad', [('w3', 3, 'inward', 128, None, 580)], False),
    ('war_ragnarok', '라그나로크 B안', 'buff', [('w3', 4, 'pillar', 136, None, 720)], False),
    # 기사 — 가디언 · 팔라딘 · 크루세이더
    ('kni_lastbastion', '최후의 보루', 'buff', [('k1', 1, 'shell', 134, None, 620)], False),
    ('kni_unbreakablewill', '꺾을 수 없는 의지', 'buff', [('k1', 2, 'shell', 128, None, 600)], False),
    ('kni_divinejudgment', '신성한 심판', 'buff', [('k1', 3, 'shell', 130, None, 600)], False),
    ('kni_unyieldingoath', '불굴의 맹세', 'buff', [('k1', 4, 'orbit', 130, None, 660)], False),
    ('kni_holywar', '성전', 'buff', [('k2', 1, 'shell', 132, None, 620)], False),
    ('kni_vow', '서약', 'buff', [('k2', 2, 'heal', 130, None, 720)], False),   # 최대 체력 창 — 회복이 아니라 창 사건
    ('kni_retribution', '응징', 'buff', [('k2', 3, 'orders', 136, None, 620)], False),
    ('kni_condemnation', '단죄', 'hit', [('k3', 1, 'fall', 130, .86, 260), ('k3', 2, 'shatter', 130, None, 420)], True),
    ('kni_showdown', '결전', 'buff', [('k2', 4, 'burst', 132, None, 600)], False),
    ('kni_unbreakablewill', '꺾을 수 없는 의지 B안', 'buff', [('k3', 3, 'shell', 128, None, 600)], False),
    ('kni_vow', '서약 B안', 'buff', [('k3', 4, 'heal', 130, None, 720)], False),
    # 마법사 — 파이어 · 프로스트 · 썬더
    ('mag_meteor', '메테오', 'hit', [('m1', 1, 'fall', 140, .82, 300), ('m1', 2, 'shatter', 140, None, 460)], True),
    ('mag_firewall', '파이어월', 'hit', [('m1', 3, 'pillar', 140, None, 560)], False),
    ('mag_hydra', '히드라', 'hit', [('m1', 4, 'cross', 136, None, 520)], False),
    ('mag_frozenorb', '프로즌 오브', 'hit', [('m2', 1, 'thrust', 130, None, 280), ('m2', 2, 'shatter', 136, None, 420)], False),
    ('mag_blizzard', '블리자드', 'hit', [('m2', 3, 'rain', 140, .62, 620)], False),
    ('mag_frostburst', '프로스트 버스트', 'hit', [('m2', 4, 'inward', 128, None, 320), ('m3', 1, 'burst', 136, None, 420)], False),
    ('mag_thunderstrike', '썬더 스트라이크', 'hit', [('m3', 2, 'bolt', 140, .86, 300), ('m3', 3, 'burst', 132, None, 380)], True),
    ('mag_nova', '노바', 'hit', [('m3', 4, 'wave', 140, None, 480)], False),
    ('mag_staticfield', '정전장', 'hit', [('m4', 1, 'bolt', 124, None, 460)], False),
    ('mag_hydra', '히드라 B안', 'hit', [('m4', 2, 'strike', 136, None, 520)], False),
    ('mag_staticfield', '정전장 B안', 'hit', [('m4', 3, 'inward', 128, None, 460)], False),
    ('mag_blizzard', '블리자드 B안', 'hit', [('m4', 4, 'spin', 136, None, 620)], False),
    # 궁수 — 스나이퍼 · 보우마스터 · 레인저
    ('arc_trueaim', '정조준', 'buff', [('a1', 1, 'inward', 130, None, 600)], False),
    ('arc_singlestrike', '일격', 'hit', [('a1', 2, 'thrust', 140, None, 280), ('a1', 3, 'burst', 132, None, 400)], True),
    ('arc_reload', '재장전', 'buff', [('a1', 4, 'spin', 128, None, 620)], False),
    ('arc_quickdraw', '퀵 드로우', 'buff', [('a2', 1, 'sweep', 128, None, 520)], False),
    ('arc_fulldraw', '풀 드로우', 'buff', [('a2', 2, 'orders', 134, None, 620)], False),
    ('arc_chaindraw', '체인 드로우', 'buff', [('a2', 3, 'sweep', 132, None, 600)], False),
    ('arc_huntersmark', '사냥 표식', 'bad', [('a2', 4, 'inward', 128, None, 600)], False),
    ('arc_supportingfire', '지원 사격', 'buff', [('a3', 1, 'orders', 134, None, 620)], False),
    ('arc_trap', '덫', 'hit', [('a3', 2, 'land', 128, None, 480)], True),
    ('arc_reload', '재장전 B안', 'buff', [('a3', 3, 'orbit', 128, None, 620)], False),
    ('arc_chaindraw', '체인 드로우 B안', 'buff', [('a3', 4, 'sweep', 132, None, 600)], False),
    # 사제 — 비숍 · 검은사제 · 몽크
    ('pri_aegis', '이지스', 'buff', [('p1', 1, 'shell', 134, None, 620)], False),
    ('pri_benediction', '베네딕션', 'heal', [('p1', 2, 'heal', 136, None, 760)], False),
    ('pri_resurrection', '리저렉션', 'heal', [('p1', 3, 'heal', 140, None, 820)], False),
    ('pri_punishment', '천벌', 'hit', [('p1', 4, 'fall', 132, .86, 260), ('p2', 1, 'shatter', 134, None, 440)], True),
    ('pri_atonement', '속죄', 'bad', [('p2', 2, 'inward', 132, None, 620)], False),
    ('pri_excommunication', '파문', 'hit', [('p2', 3, 'land', 128, None, 480)], True),
    ('pri_diamondbody', '금강', 'buff', [('p2', 4, 'shell', 130, None, 600)], False),
    ('pri_sweep', '소탕', 'hit', [('p3', 1, 'sweep', 140, None, 480)], False),
    ('pri_counter', '반격', 'buff', [('p3', 2, 'burst', 132, None, 560)], False),
    ('pri_diamondbody', '금강 B안', 'buff', [('p3', 3, 'orbit', 130, None, 620)], False),
    ('pri_excommunication', '파문 B안', 'hit', [('p3', 4, 'land', 128, None, 480)], True),
]
