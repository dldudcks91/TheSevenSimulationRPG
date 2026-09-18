"""몬스터 초상 정렬 — 얼굴 기준 (postprocess.md §3-0).

`.face` 는 원형 마스크 + object-fit: cover 라 가장자리는 잘린다.
그래서 어깨폭이 아니라 **얼굴 크기 · 눈높이 · 얼굴 중심**을 맞춘다.

SPEC 한 줄 = 시트 · 타일 crop · 512 정규화 타일에서 읽은 눈 중심(ex, ey) · 배율 k · monster_idx · 미세 이동(dx, dy).
monster_idx 자리에 `'3201_elite'` 처럼 문자열을 넣으면 그 이름으로 저장된다 — 정예 전용 초상(`monster.csv:face_elite`).
좌표는 자동 검출이 아니라 **격자를 씌워 눈으로 읽는다** — 머리카락 · 뼈색 투구 · 화살통이 자동 검출을 전부 깨뜨린다.

    python - <<'X'
    import sys; sys.path.insert(0, '.claude/skills/art-prompt')
    from align_faces import build, SPEC
    for n in SPEC:
        img, idx = build(n); img.save('src/assets/art/faces/cartoon/monster/%s.png' % idx)
    X
"""
import numpy as np
from PIL import Image, ImageDraw

SHEETS = {'human': 'source_sheet_human_wraith.png', 'skel': 'source_sheet_skeleton_2.png', 'satan': 'source_sheet_satan.png',
          'leviathan': 'source_sheet_leviathan.png', 'goblin_shaman': 'source_sheet_goblin_shaman.png',
          'orc_troop': 'source_sheet_orc_troop.png', 'orc_boss': 'source_sheet_orc_boss.png', 'orc_troop_2': 'source_sheet_orc_troop_2.png',
          'skel3': 'source_sheet_skeleton_3.png',
          'skel_el': 'source_sheet_skeleton_elite.png', 'dullahan': 'source_sheet_dullahan.png',
          'goblin_troop_2': 'source_sheet_goblin_troop_2.png', 'goblin_elite': 'source_sheet_goblin_elite.png',
          'skel_soldier': 'source_sheet_skeleton_soldier.png',
          'skel_soldier_2': 'source_sheet_skeleton_soldier_2.png',
          'legion': 'source_sheet_legion.png'}

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
 # 1-3 은 스켈레톤 병사 하나뿐이라 세 자리가 **같은 그림**이다 (2026-09-18 사용자 지시 — 시트 1번 타일)
 'skeleton_bare_chainmail_1301': ('skel_soldier_2', (0, 0, 506, 506),    329.5, 266.5, 1.122, 1301, 47, 30),
 'skeleton_bare_chainmail_1302': ('skel_soldier_2', (0, 0, 506, 506),    329.5, 266.5, 1.122, 1302, 47, 30),
 'skeleton_bare_chainmail_1303': ('skel_soldier_2', (0, 0, 506, 506),    329.5, 266.5, 1.122, 1303, 47, 30),
 'orc_helm_tusk_pauldron'  : ('orc_troop_2', (0, 0, 506, 506),   317, 217, 1.35, 2101,   0,   4),
 'orc_hood_braid_quiver'   : ('orc_troop_2', (518, 0, 1024, 506),309, 220, 1.31, 2102,   0,   4),
 'orc_coral_skull_crown'   : ('orc_troop_2', (0, 518, 506, 1024),309, 214, 1.22, 2103,   0,   4),
 'orc_scaled_spiked'       : ('orc_boss',  (0, 0, 1014, 1014),   323, 207, 1.30, 2150,   0,   0),
 'skeleton_cracked_helm_el': ('skel3',    (522, 0, 1024, 502),  310, 240, 0.95, '3201_elite', 48, 31),  # 정예 전용 — monster.csv:face_elite
 'skeleton_bloodied_quiver': ('skel_el',  (1035, 0, 2048, 1013), 312.5, 255.1, 1.024, '3202_elite', 43, 38),  # 정예 — 3202 에 맞춤
 'skeleton_bloodied_greathelm': ('skel_el', (0, 1035, 1013, 2048), 317.0, 255.1, 1.004, '3203_elite', 50, 30),  # 정예 — 3203 에 맞춤
 'dullahan_skull_in_hand'  : ('dullahan', (516, 0, 1024, 508),  169.0, 285.5, 1.25, 1350, -31,  35),  # 머리를 손에 든 구도 — 두개골을 왼쪽에 둬야 빈 목·척추가 원 안에 든다
}
# 인물 안에 갇힌 초록(발광 등)이 키잉에 뚫린 자리를 메운다 — 512 타일 좌표 상자 안에서, 바깥 배경과 이어지지 않고
# 빨강·파랑이 남아 있는(max(r,b) >= 60) 반투명만. 배경 초록(r·b ≈ 0~25)이 이빨 사이처럼 갇힌 틈은 그대로 비운다
FILL = {'goblin_feather_skull_elite': (395, 30, 480, 160)}   # 지팡이 두개골 입속 룬 빛
EYE = (256, 215)     # 눈 중심이 앉을 자리 (dx/dy 를 더하면 실효 y ≈ 240)
S = 512
ART = 'src/assets/art/faces/source/sheets/'   # 원본 시트 — 2026-09-16 정리로 sheets/ 아래로 내려갔다


def key_green(tile):
    a = np.array(tile.convert('RGBA')).astype(int)
    r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]
    d = g - np.maximum(r, b)
    a[:, :, 1] = np.where(d > 0, np.maximum(r, b), g)      # despill
    a[:, :, 3] = np.clip((120 - d) / 80 * 255, 0, 255)
    return Image.fromarray(a.astype(np.uint8))


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
    sheet_key, box, ex, ey, k, idx, dx, dy = SPEC[name]
    sheet = Image.open(ART + SHEETS[sheet_key]).convert('RGBA')
    tile = key_green(sheet.crop(box)).resize((S, S), Image.LANCZOS)   # 좌표를 읽은 공간
    if name in FILL:
        tile = fill_holes(tile, FILL[name])
    n = round(S * k)
    ca = np.array(tile).astype(float); al = ca[:, :, 3:4] / 255
    pm = Image.fromarray(np.concatenate([ca[:, :, :3] * al, ca[:, :, 3:4]], 2).astype(np.uint8))
    pm = np.array(pm.resize((n, n), Image.LANCZOS)).astype(float)     # premultiplied 로 리샘플
    a2 = np.maximum(pm[:, :, 3:4], 1)
    big = Image.fromarray(np.concatenate([np.clip(pm[:, :, :3] * 255 / a2, 0, 255), pm[:, :, 3:4]], 2).astype(np.uint8))
    canvas = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    canvas.paste(big, (int(round(eye[0] - ex * k)) + dx, int(round(eye[1] - ey * k)) + dy))
    return canvas, idx
