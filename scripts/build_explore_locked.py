"""탐험 지도의 잠긴 구간 그림 — 장마다 「빛 바랜 땅」 한 조각을 미리 굽는다 (SCREEN_DESIGN §8-4).

게임은 잠긴 장마다 이 조각 한 장을 지도 위 제자리에 얹을 뿐이다 — 실행 중에 필터도 마스크도 안 돈다.
그 전(2026-10-09 앞)에는 지도 그림 전체에 CSS `filter`(회색 · 어둡게)를 걸고 장마다 1536×714 마스크를 겹쳐 덮었는데,
화면이 모니터 크기로 커지면 탭을 열 때마다 그 큰 층을 다시 구워 늦게 켜지고 렉이 났다.

입력  `src/assets/art/backgrounds/explore_world.webp` · `explore_world_mask/<장>.png`(알파 = 그 장의 땅 · build_explore_masks.py 가 짓는다)
출력  `src/assets/art/backgrounds/explore_world_locked/<장>.webp` — 그 장의 땅만(알파) · **구간 크기로 잘라 낸다**
      표준 출력에 장마다 `tile: [x, y, w, h]`(그림 크기 대비 %) — `src/ui/mock.js:EXPLORE_REGIONS[장].tile` 에 옮겨 적는다

색 = 옛 막과 같은 겉모습 — CSS `grayscale(.85)` 행렬 뒤 `brightness(.48)`(어둡게 .68 위에 검은 베일 30% ≈ .48).
**그림이나 마스크를 바꾸면 다시 돌린다**: `python scripts/build_explore_locked.py`  (Pillow 만 쓴다)
"""

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
BG = ROOT / "src/assets/art/backgrounds"
SRC = BG / "explore_world.webp"
MASKS = BG / "explore_world_mask"
OUT = BG / "explore_world_locked"
GRAY, BRIGHT = 0.85, 0.48


def css_grayscale(a: float) -> tuple:
    """CSS `grayscale(a)` 의 색 행렬(Filter Effects 1) — Pillow `convert("RGB", m)` 의 12칸 모양"""
    k = 1 - a
    return (
        0.2126 + 0.7874 * k, 0.7152 - 0.7152 * k, 0.0722 - 0.0722 * k, 0,
        0.2126 - 0.2126 * k, 0.7152 + 0.2848 * k, 0.0722 - 0.0722 * k, 0,
        0.2126 - 0.2126 * k, 0.7152 - 0.7152 * k, 0.0722 + 0.9278 * k, 0,
    )


def main() -> None:
    matrix = tuple(v * BRIGHT for v in css_grayscale(GRAY))
    base = Image.open(SRC).convert("RGB").convert("RGB", matrix)
    w, h = base.size
    OUT.mkdir(exist_ok=True)
    for mp in sorted(MASKS.glob("*.png"), key=lambda p: int(p.stem)):
        alpha = Image.open(mp).convert("RGBA").getchannel("A")
        if alpha.size != base.size:
            raise SystemExit(f"{mp.name}: 마스크 크기 {alpha.size} ≠ 그림 {base.size}")
        box = alpha.getbbox()
        if not box:
            continue
        tile = base.crop(box).convert("RGBA")
        tile.putalpha(alpha.crop(box))
        out = OUT / f"{mp.stem}.webp"
        tile.save(out, "WEBP", quality=85, alpha_quality=90, method=6)
        x0, y0, x1, y1 = box
        print(f"{mp.stem}: tile: [{x0 / w * 100:.2f}, {y0 / h * 100:.2f}, {(x1 - x0) / w * 100:.2f}, {(y1 - y0) / h * 100:.2f}]"
              f"   # {x1 - x0}x{y1 - y0} · {out.stat().st_size // 1024}KB")


if __name__ == "__main__":
    main()
