"""몬스터 초상 정렬 — 얼굴 기준 (postprocess.md §3-0).

`.face` 는 원형 마스크 + object-fit: cover 라 가장자리는 잘린다.
그래서 어깨폭이 아니라 **얼굴 크기 · 눈높이 · 얼굴 중심**을 맞춘다.

SPEC 한 줄 = 시트 · 타일 crop · 512 정규화 타일에서 읽은 눈 중심(ex, ey) · 배율 k · monster_idx · 미세 이동(dx, dy).
monster_idx 자리에 `'3201_elite'` 처럼 문자열을 넣으면 그 이름으로 저장된다 — 정예 전용 초상(`monster.csv:face_elite`).
좌표는 자동 검출이 아니라 **격자를 씌워 눈으로 읽는다** — 머리카락 · 뼈색 투구 · 화살통이 자동 검출을 전부 깨뜨린다.

    python - <<'X'
    import sys; sys.path.insert(0, '.claude/skills/art-prompt')
    from align_faces import build, SPEC
    for n in (*SPEC, *READY):
        img, idx = build(n); img.save('src/assets/art/faces/cartoon/monster/%s.png' % idx)
    X
"""
import numpy as np
from PIL import Image, ImageDraw

SHEETS = {'human': 'source_sheet_human_wraith.png', 'skel': 'source_sheet_skeleton_2.png', 'satan': 'source_sheet_satan.png',
          'leviathan': 'source_sheet_leviathan.png', 'goblin_shaman': 'source_sheet_goblin_shaman.png',
          'orc_troop': 'source_sheet_orc_troop.png', 'orc_boss': 'source_sheet_orc_boss.png', 'orc_troop_2': 'source_sheet_orc_troop_2.png',
          'orc_troop_3': 'source_sheet_orc_troop_3.png', 'orc_troop_3_el': 'source_sheet_orc_troop_3_elite.png',
          'skel3': 'source_sheet_skeleton_3.png',
          'skel_el': 'source_sheet_skeleton_elite.png', 'dullahan': 'source_sheet_dullahan.png',
          'goblin_troop_2': 'source_sheet_goblin_troop_2.png', 'goblin_elite': 'source_sheet_goblin_elite.png',
          'skel_soldier': 'source_sheet_skeleton_soldier.png',
          'skel_soldier_2': 'source_sheet_skeleton_soldier_2.png',
          'skel_soldier_3': 'source_sheet_skeleton_soldier_3.png',
          'legion': 'source_sheet_legion.png',
          'trio': 'source_sheet_skeleton_trio.png',
          'trio_el': 'source_sheet_skeleton_trio_elite.png'}

# 흰 배경으로 구워져 온 원본 — 초록 키잉이 안 먹는다(d=0 이라 전면이 불투명). 절차는 src/assets/art/README.md 「누끼」
WHITE_BG = {'skel_soldier_3'}

#                              sheet    tile crop                 ex   ey     k    idx   dx   dy
SPEC = {
 'wraith_topknot_soldier'  : ('human', (8, 8, 505, 505),         284, 197, 1.25, 1201,  13,   6),   # 09-18 — 궁수·기사에 맞춤(눈 사이 79 → 93 · 눈높이 202 → 226)
 'wraith_masked_archer'    : ('human', (519, 8, 1016, 505),      293, 190, 1.25, 1202,  30,  -2),
 'wraith_bald_captain'     : ('human', (8, 519, 505, 1016),      313, 190, 1.20, 1203,  48,   9),
 'legion_banner_longhair'  : ('legion', (0, 0, 1012, 1012),      316.2, 215.7, 1.32, 1250,  44,  11),   # 09-18 — 1-2 보스 · 병사 셋과 눈 사이 94 · 눈높이 226
 'skeleton_nasal_helm'     : ('skel',  (0, 0, 1013, 1013),       283, 265, 1.060, 3201,  14,  35),
 'skeleton_bare_quiver'    : ('skel',  (1035, 0, 2048, 1013),    316, 272, 1.060, 3202,  46,  55),
 'skeleton_greathelm_plume': ('skel',  (0, 1035, 1013, 2048),    310, 280, 1.039, 3203,  40,  56),
 'satan_horns_chain'       : ('satan', (0, 0, 504, 504),         340, 228, 1.20, 1900,  50,  38),
 'leviathan_skull_fangs'   : ('leviathan', (0, 0, 504, 504),     345, 206, 1.05, 2900,  24,  25),
 'goblin_cloak_longear_dark': ('goblin_troop_2', (0, 0, 1013, 1013),       327.4, 252.9, 1.118, 1101, 60,  5),   # 09-17 — 옛 1101 과 눈 자리·눈 사이를 맞췄다
 'goblin_helm_dark'        : ('goblin_troop_2', (1035, 0, 2048, 1013),    333.5, 245.7, 1.046, 1102, 70, 16),
 'goblin_skull_helm_dark'  : ('goblin_troop_2', (0, 1035, 1013, 2048),    296.8, 246.1, 1.037, 1103, 58, 20),
 'goblin_feather_skull_elite': ('goblin_elite', (0, 1035, 1013, 2048),   296.8, 246.1, 1.037, '1103_elite', 58, 20),   # 정예 — 기본판과 같은 구도라 같은 값 · 1-1 정예는 주술사뿐이라 1 · 2번 타일은 안 쓴다
 # 2-1 오크 셋 [09-21 교체] — 전사(좌상) · 궁수(우상) · 주술사(좌하). 눈 사이 92 · 눈 중점 (327, 246) — 1-3 스켈레톤 셋의 자리에서 오른쪽 24 [09-21 사용자 지시 — 두 번 옮김].
 # 92 는 머리 크기를 1301 투구 · 1203 민머리와 나란히 놓고 골랐다(오크는 머리가 눈 사이보다 넓어 100 이면 한 단 크다).
 # 정예 시트(2048²)는 같은 구도라 512 타일에서 눈 자리가 0.4px 안에서 겹친다 → ex/ey/k 공유
 'orc_cheekguard_helm'     : ('orc_troop_3', (0, 0, 506, 506),      329.7, 241.9, 1.057, 2101, 71, 31),
 'orc_hood_quiver_plain'   : ('orc_troop_3', (518, 0, 1024, 506),   326.4, 234.2, 1.002, 2102, 71, 31),
 'orc_bald_elder_feather'  : ('orc_troop_3', (0, 518, 506, 1024),   319.0, 186.8, 0.982, 2103, 71, 31),
 'orc_spiked_helm_skull_pauldron_elite': ('orc_troop_3_el', (0, 0, 1013, 1013),       329.7, 241.9, 1.057, '2101_elite', 71, 31),
 'orc_hood_browplate_elite'            : ('orc_troop_3_el', (1035, 0, 2048, 1013),    326.4, 234.2, 1.002, '2102_elite', 71, 31),
 'orc_bald_elder_beast_skull_elite'    : ('orc_troop_3_el', (0, 1035, 1013, 2048),    319.0, 186.8, 0.982, '2103_elite', 71, 31),
 'orc_scaled_spiked'       : ('orc_boss',  (0, 0, 1014, 1014),   323, 207, 1.30, 2150,   0,   0),
 'skeleton_cracked_helm_el': ('skel3',    (522, 0, 1024, 502),  310, 240, 0.95, '3201_elite', 48, 31),  # 정예 전용 — monster.csv:face_elite
 'skeleton_bloodied_quiver': ('skel_el',  (1035, 0, 2048, 1013), 312.5, 255.1, 1.024, '3202_elite', 43, 38),  # 정예 — 3202 에 맞춤
 'skeleton_bloodied_greathelm': ('skel_el', (0, 1035, 1013, 2048), 317.0, 255.1, 1.004, '3203_elite', 50, 30),  # 정예 — 3203 에 맞춤
 # 1-3 스켈레톤 셋 [09-21] — 전사(좌상) · 기사(좌하) · 마법사(우상). 정예는 같은 구도의 다른 시트라 ex/ey/k 를 공유한다
 'sk_warrior'              : ('trio',    (0, 0, 506, 506),      317.98, 243.3, 1.039, 1301, 47, 31),
 'sk_knight'               : ('trio',    (0, 516, 506, 1022),   330.5,  220.4, 1.116, 1302, 47, 31),
 'sk_mage'                 : ('trio',    (518, 0, 1024, 506),   326.3,  224.7, 1.102, 1303, 47, 31),   # 3/4 로 돌린 머리 — 눈 사이가 짧게 잡혀 배율은 두개골 크기로 맞췄다
 'sk_warrior_el'           : ('trio_el', (0, 0, 506, 506),      317.98, 243.3, 1.039, '1301_elite', 47, 31),
 'sk_knight_el'            : ('trio_el', (0, 516, 506, 1022),   330.5,  220.4, 1.116, '1302_elite', 47, 31),
 'sk_mage_el'              : ('trio_el', (518, 0, 1024, 506),   326.3,  224.7, 1.102, '1303_elite', 47, 31),
 'dullahan_skull_in_hand'  : ('dullahan', (516, 0, 1024, 508),  169.0, 285.5, 1.25, 1350, -31,  35),  # 머리를 손에 든 구도 — 두개골을 왼쪽에 둬야 빈 목·척추가 원 안에 든다
}
# 이미 투명 배경으로 생성된 단일 초상 — (원본 파일, 설치 크기, 설치 위치, monster idx).
# 크기·위치는 1301 의 두개골 크기와 눈높이를 기준으로 화면에서 맞췄다.
READY = {
}
# 인물 안에 갇힌 초록(발광 등)이 키잉에 뚫린 자리를 메운다 — 512 타일 좌표 상자 안에서, 바깥 배경과 이어지지 않고
# 빨강·파랑이 남아 있는(max(r,b) >= 60) 반투명만. 배경 초록(r·b ≈ 0~25)이 이빨 사이처럼 갇힌 틈은 그대로 비운다
FILL = {'goblin_feather_skull_elite': (395, 30, 480, 160)}   # 지팡이 두개골 입속 룬 빛
# 타일 변 6px 를 통째로 지운다 — 격자선 검정이 초록에 번진 1~3px 이 반투명으로 살아남아 원형 칸에 실선으로 보인다.
# 09-21 trio 시트는 오른 끝(x 1019~1023 · 위 절반)에 검정 세로 띠까지 있다. 인물은 변에서 30px 이상 떨어져 있어 깎이는 것이 없다
FRAME6 = [(0, 0, 6, 512), (0, 0, 512, 6), (506, 0, 512, 512), (0, 506, 512, 512)]
CLEAR = {k: FRAME6 for k in ('sk_warrior', 'sk_warrior_el', 'sk_knight', 'sk_knight_el', 'sk_mage', 'sk_mage_el',
                             'orc_cheekguard_helm', 'orc_hood_quiver_plain', 'orc_bald_elder_feather',
                             'orc_spiked_helm_skull_pauldron_elite', 'orc_hood_browplate_elite', 'orc_bald_elder_beast_skull_elite')}
EYE = (256, 215)     # 눈 중심이 앉을 자리 (dx/dy 를 더하면 실효 y ≈ 240)
S = 512
ART = 'src/assets/art/faces/source/sheets/'   # 원본 시트 — 2026-09-16 정리로 sheets/ 아래로 내려갔다
READY_ART = 'src/assets/art/faces/source/monster/'


def key_green(tile):
    a = np.array(tile.convert('RGBA')).astype(int)
    r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]
    d = g - np.maximum(r, b)
    a[:, :, 1] = np.where(d > 0, np.maximum(r, b), g)      # despill
    a[:, :, 3] = np.clip((120 - d) / 80 * 255, 0, 255)
    return Image.fromarray(a.astype(np.uint8))


def key_white(tile):
    """흰 배경 원본 누끼 — near-white 판정 + 테두리 flood fill + 닫힌 흰 포켓(300px 이상) 제거.
    투명 픽셀의 흰 RGB 가 번지지 않게 여기서 premultiplied 로 S 까지 줄여 돌려준다(build 의 resize 는 그대로 통과)."""
    a = np.array(tile.convert('RGBA')).astype(int)
    rgb = a[:, :, :3]
    m = Image.fromarray((((rgb.min(2) >= 225) & (rgb.max(2) - rgb.min(2) <= 18)).astype(np.uint8)) * 255).copy()
    W, H = m.size
    for xy in [(x, 0) for x in range(W)] + [(x, H - 1) for x in range(W)] + [(0, y) for y in range(H)] + [(W - 1, y) for y in range(H)]:
        if m.getpixel(xy) == 255:
            ImageDraw.floodfill(m, xy, 128)                 # 가장자리에 닿은 흰색 = 바깥 배경
    while True:                                             # 테두리와 안 닿는 흰 포켓 — 300px 이상이면 배경, 작으면 하이라이트라 남긴다
        mm = np.array(m); ys, xs = np.where(mm == 255)
        if len(ys) == 0:
            break
        x, y = int(xs[0]), int(ys[0]); n0 = int((mm == 255).sum())
        ImageDraw.floodfill(m, (x, y), 64)
        if n0 - int((np.array(m) == 255).sum()) >= 300:
            ImageDraw.floodfill(m, (x, y), 128)
    al = np.where(np.array(m) == 128, 0., 255.)
    a[:, :, 3] = (al + np.roll(al, 1, 0) + np.roll(al, -1, 0) + np.roll(al, 1, 1) + np.roll(al, -1, 1)) / 5   # 경계 1px 페더
    ca = a.astype(float); f = ca[:, :, 3:4] / 255
    pm = Image.fromarray(np.concatenate([ca[:, :, :3] * f, ca[:, :, 3:4]], 2).astype(np.uint8)).resize((S, S), Image.LANCZOS)
    p = np.array(pm).astype(float); a2 = np.maximum(p[:, :, 3:4], 1)
    return Image.fromarray(np.concatenate([np.clip(p[:, :, :3] * 255 / a2, 0, 255), p[:, :, 3:4]], 2).astype(np.uint8))


def fill_holes(tile, box):
    a = np.array(tile)
    m = Image.fromarray(np.where(a[:, :, 3] < 250, 255, 0).astype(np.uint8)).copy()   # fromarray 그대로면 floodfill 이 안 먹는다(Pillow 11 · 읽기 전용 버퍼)
    W, H = m.size
    edge = [(x, 0) for x in range(W)] + [(x, H - 1) for x in range(W)] + [(0, y) for y in range(H)] + [(W - 1, y) for y in range(H)]
    for xy in edge:                                      # 가장자리에 닿은 반투명 = 바깥 배경
        if m.getpixel(xy) == 255:
            ImageDraw.floodfill(m, xy, 128)
    x0, y0, x1, y1 = box
    hole = np.zeros(a.shape[:2], bool)
    hole[y0:y1, x0:x1] = np.array(m)[y0:y1, x0:x1] == 255
    hole &= np.maximum(a[:, :, 0], a[:, :, 2]) >= 60
    a[:, :, 3] = np.where(hole, 255, a[:, :, 3])
    return Image.fromarray(a)


def build(name, eye=EYE):
    if name in READY:
        filename, n, xy, idx = READY[name]
        tile = Image.open(READY_ART + filename).convert('RGBA')
        ca = np.array(tile).astype(float); al = ca[:, :, 3:4] / 255
        pm = Image.fromarray(np.concatenate([ca[:, :, :3] * al, ca[:, :, 3:4]], 2).astype(np.uint8))
        pm = np.array(pm.resize((n, n), Image.LANCZOS)).astype(float)
        a2 = np.maximum(pm[:, :, 3:4], 1)
        fitted = Image.fromarray(np.concatenate([np.clip(pm[:, :, :3] * 255 / a2, 0, 255), pm[:, :, 3:4]], 2).astype(np.uint8))
        canvas = Image.new('RGBA', (S, S), (0, 0, 0, 0))
        canvas.alpha_composite(fitted, xy)
        return canvas, idx
    sheet_key, box, ex, ey, k, idx, dx, dy = SPEC[name]
    sheet = Image.open(ART + SHEETS[sheet_key]).convert('RGBA')
    keyer = key_white if sheet_key in WHITE_BG else key_green
    tile = keyer(sheet.crop(box)).resize((S, S), Image.LANCZOS)   # 좌표를 읽은 공간
    if name in FILL:
        tile = fill_holes(tile, FILL[name])
    for x0, y0, x1, y1 in CLEAR.get(name, ()):
        a = np.array(tile); a[y0:y1, x0:x1, 3] = 0; tile = Image.fromarray(a)
    n = round(S * k)
    ca = np.array(tile).astype(float); al = ca[:, :, 3:4] / 255
    pm = Image.fromarray(np.concatenate([ca[:, :, :3] * al, ca[:, :, 3:4]], 2).astype(np.uint8))
    pm = np.array(pm.resize((n, n), Image.LANCZOS)).astype(float)     # premultiplied 로 리샘플
    a2 = np.maximum(pm[:, :, 3:4], 1)
    big = Image.fromarray(np.concatenate([np.clip(pm[:, :, :3] * 255 / a2, 0, 255), pm[:, :, 3:4]], 2).astype(np.uint8))
    canvas = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    canvas.paste(big, (int(round(eye[0] - ex * k)) + dx, int(round(eye[1] - ey * k)) + dy))
    return canvas, idx
