# -*- coding: utf-8 -*-
"""CH1 몬스터 얼굴 크롭 — TheSevenRPG 원본 일러스트 → face_<monster_idx>.png

재동기화 레시피. 원본이 갱신되면 이 스크립트만 다시 돌린다:
    python _crop_faces.py .

출력은 256x256 정사각 투명 PNG(팔레트 128색). 원형 표시는 CSS border-radius 로 —
마스크를 파일에 굽지 않는다.
"""
from PIL import Image
from collections import deque
import os, sys

SRC = r"c:/Users/82109/Desktop/LYC/git/TheSevenRPG/fastapi"

# monster_idx: (원본 상대경로, 머리 bbox(l,t,r,b) — 원본 픽셀좌표, 참고 라벨)
FACES = {
    1101: ("resources/monster_goblin_scout.jpg",                    (238, 174, 769, 494), "고블린 척후병"),
    1102: ("resources/monster_gblin_warrior.jpg",                   (243, 137, 818, 485), "고블린 전사"),
    1301: ("public/assets/sprites/monster_1101.png",                (478, 158, 838, 588), "스켈레톤 전사"),
    1303: ("resources/Gemini_Generated_Image_l5y18fl5y18fl5y1.png", (598,  42, 782, 278), "스켈레톤 기사"),
    1350: ("resources/Gemini_Generated_Image_vikvapvikvapvikv.png", (700,  48, 848, 206), "둘라한"),
}

PAD = 0.10    # bbox 대비 여백 비율
OUT = 256     # 출력 정사각 변
COLORS = 128  # 팔레트 색 수


def key_white(im, tol=42):
    """테두리에서 flood fill 로 흰 배경만 제거. 해골 뼈 같은 내부 밝은색은 보존한다."""
    im = im.convert("RGBA")
    w, h = im.size
    px = im.load()
    seen = bytearray(w * h)
    q = deque()

    def white(x, y):
        r, g, b, a = px[x, y]
        return a > 0 and r > 255 - tol and g > 255 - tol and b > 255 - tol

    for x in range(w):
        for y in (0, h - 1):
            if not seen[y * w + x] and white(x, y):
                seen[y * w + x] = 1; q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if not seen[y * w + x] and white(x, y):
                seen[y * w + x] = 1; q.append((x, y))
    while q:
        x, y = q.popleft()
        px[x, y] = (0, 0, 0, 0)
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < w and 0 <= ny < h and not seen[ny * w + nx] and white(nx, ny):
                seen[ny * w + nx] = 1; q.append((nx, ny))
    return im


def crop_face(path, box):
    im = key_white(Image.open(os.path.join(SRC, path)))
    l, t, r, b = box
    pw, ph = int((r - l) * PAD), int((b - t) * PAD)
    face = im.crop((l - pw, t - ph, r + pw, b + ph))   # 캔버스 밖은 투명으로 채워진다
    side = max(face.size)
    sq = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    sq.paste(face, ((side - face.width) // 2, (side - face.height) // 2))
    # 확대는 픽셀 보존(NEAREST), 축소는 리샘플(LANCZOS)
    sq = sq.resize((OUT, OUT), Image.NEAREST if side <= OUT else Image.LANCZOS)
    return sq.quantize(colors=COLORS, method=Image.FASTOCTREE, dither=Image.NONE)


if __name__ == "__main__":
    outdir = sys.argv[1] if len(sys.argv) > 1 else "."
    for idx, (path, box, label) in FACES.items():
        f = os.path.join(outdir, f"face_{idx}.png")
        crop_face(path, box).save(f, optimize=True)
        print(f"{idx}  {label:<10s} -> {f}  ({os.path.getsize(f) / 1024:.1f}KB)")
