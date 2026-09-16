"""몬스터 초상 정렬 — 얼굴 기준 (postprocess.md §3-0).

`.face` 는 원형 마스크 + object-fit: cover 라 가장자리는 잘린다.
그래서 어깨폭이 아니라 **얼굴 크기 · 눈높이 · 얼굴 중심**을 맞춘다.

SPEC 한 줄 = 시트 · 타일 crop · 512 정규화 타일에서 읽은 눈 중심(ex, ey) · 배율 k · monster_idx · 미세 이동(dx, dy).
좌표는 자동 검출이 아니라 **격자를 씌워 눈으로 읽는다** — 머리카락 · 뼈색 투구 · 화살통이 자동 검출을 전부 깨뜨린다.

    python - <<'X'
    import sys; sys.path.insert(0, '.claude/skills/art-prompt')
    from align_faces import build, SPEC
    for n in SPEC:
        img, idx = build(n); img.save('src/assets/art/faces/cartoon/monster/%d.png' % idx)
    X
"""
import numpy as np
from PIL import Image

SHEETS = {'human': 'source_sheet_human_wraith.png', 'skel': 'source_sheet_skeleton_2.png', 'satan': 'source_sheet_satan.png',
          'leviathan': 'source_sheet_leviathan.png', 'goblin_shaman': 'source_sheet_goblin_shaman.png',
          'orc_troop': 'source_sheet_orc_troop.png', 'orc_boss': 'source_sheet_orc_boss.png'}

#                              sheet    tile crop                 ex   ey     k    idx   dx   dy
SPEC = {
 'wraith_topknot_soldier'  : ('human', (8, 8, 505, 505),         284, 197, 1.05, 1201,  32, -17),
 'wraith_masked_archer'    : ('human', (519, 8, 1016, 505),      293, 190, 1.25, 1202,  30,  -2),
 'wraith_bald_captain'     : ('human', (8, 519, 505, 1016),      313, 190, 1.20, 1203,  48,   9),
 'skeleton_nasal_helm'     : ('skel',  (0, 0, 1013, 1013),       283, 265, 1.060, 1301,  14,  35),
 'skeleton_bare_quiver'    : ('skel',  (1035, 0, 2048, 1013),    316, 272, 1.060, 1302,  46,  55),
 'skeleton_greathelm_plume': ('skel',  (0, 1035, 1013, 2048),    310, 280, 1.039, 1303,  40,  56),
 'satan_horns_chain'       : ('satan', (0, 0, 504, 504),         340, 228, 1.20, 1900,  50,  38),
 'leviathan_skull_fangs'   : ('leviathan', (0, 0, 504, 504),     345, 206, 1.05, 2900,  24,  25),
 'goblin_skull_helm'       : ('goblin_shaman', (0, 0, 507, 507), 295, 217, 0.95, 1103,  36,  17),
 'orc_helm_pauldron'       : ('orc_troop', (0, 0, 1014, 1014),   256, 212, 1.30, 2101,   0,   0),
 'orc_hood_quiver'         : ('orc_troop', (1034, 0, 2048, 1014),296, 212, 1.30, 2102,   0,   0),
 'orc_skull_crown'         : ('orc_troop', (0, 1034, 1014, 2048),284, 215, 1.15, 2103,   0,   0),
 'orc_scaled_spiked'       : ('orc_boss',  (0, 0, 1014, 1014),   323, 207, 1.30, 2150,   0,   0),
}
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


def build(name, eye=EYE):
    sheet_key, box, ex, ey, k, idx, dx, dy = SPEC[name]
    sheet = Image.open(ART + SHEETS[sheet_key]).convert('RGBA')
    tile = key_green(sheet.crop(box)).resize((S, S), Image.LANCZOS)   # 좌표를 읽은 공간
    n = round(S * k)
    ca = np.array(tile).astype(float); al = ca[:, :, 3:4] / 255
    pm = Image.fromarray(np.concatenate([ca[:, :, :3] * al, ca[:, :, 3:4]], 2).astype(np.uint8))
    pm = np.array(pm.resize((n, n), Image.LANCZOS)).astype(float)     # premultiplied 로 리샘플
    a2 = np.maximum(pm[:, :, 3:4], 1)
    big = Image.fromarray(np.concatenate([np.clip(pm[:, :, :3] * 255 / a2, 0, 255), pm[:, :, 3:4]], 2).astype(np.uint8))
    canvas = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    canvas.paste(big, (int(round(eye[0] - ex * k)) + dx, int(round(eye[1] - ey * k)) + dy))
    return canvas, idx
