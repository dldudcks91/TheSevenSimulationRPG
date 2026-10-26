# -*- coding: utf-8 -*-
"""겉모양 비교 `D2 Min` 의 부품 다섯 장을 컨셉 17번 그림에서 잘라 낸다 (SCREEN_DESIGN §10-5 · ADR-0791).

python src/assets/art/skins/source/cut_d2min_parts.py   → src/assets/art/skins/d2min_*.webp

원본 = `concept_17_minimal.png` — 캐릭터 탭 캡처를 Codex 가 「어둡고 깔끔한 디아블로 2 · 최소화」로 다시 그린 페인트오버(1536×1024 ·
위아래 검은 띠 · 지시문 `concept_17_minimal_prompt.txt`). 자리는 그 그림의 픽셀 좌표다 — 원본을 바꾸면 자리도 다시 잰다.

| 부품 | 자리(원본) | 쓰임 |
|---|---|---|
| frame  | 「세부 옵션 2」 패널 전체 → 바깥 11px 고리만 남기고 속은 투명 | 패널 · 상단바 · 탭 열 · 창 · 툴팁의 9-slice 틀(`border-image` slice 11) |
| btn    | 「마스터리 열기」 버튼 → 바깥 5px 고리만 남기고 속은 투명 | 버튼의 9-slice 턱(slice 4) |
| slot   | 창고 첫 칸 | 아이템 · 장비 · 스킬 · 물약 칸 바탕(칸 크기로 늘린다) |
| chrome | 브랜드 자리(로고가 지워진 빈 돌판) → 위아래 · 좌우로 뒤집어 붙인 이음매 없는 결 | 상단바 · 브랜드 · 패널 제목 띠 · 버튼 · 고른 탭의 바탕 |
| fill   | 영웅 띠 패널의 빈 자리 → 뒤집어 붙인 결 | 패널 · 탭 열 · 카드의 바탕 |
"""
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent
OUT = HERE.parent
SRC = Image.open(HERE / 'concept_17_minimal.png').convert('RGB')

FRAME_BOX, FRAME_RING = (1231, 318, 1525, 714), 11
BTN_BOX, BTN_RING = (645, 662, 911, 697), 5
SLOT_BOX = (345, 761, 392, 808)
CHROME_BOX = (14, 122, 296, 156)
FILL_BOX = (930, 196, 1442, 284)


def ring(box, w):
    """잘라 낸 판에서 바깥 w px 고리만 남긴다 — 속(글자 · 칸)은 투명"""
    im = SRC.crop(box).convert('RGBA')
    a = Image.new('L', im.size, 255)
    a.paste(0, (w, w, im.width - w, im.height - w))
    im.putalpha(a)
    return im


def mirror_tile(box):
    """잘라 낸 결을 좌우 · 위아래로 뒤집어 2×2 로 붙인다 — 네 변이 이어져 이음매 없이 깔린다"""
    c = SRC.crop(box)
    w, h = c.size
    t = Image.new('RGB', (w * 2, h * 2))
    t.paste(c, (0, 0))
    t.paste(c.transpose(Image.FLIP_LEFT_RIGHT), (w, 0))
    t.paste(c.transpose(Image.FLIP_TOP_BOTTOM), (0, h))
    t.paste(c.transpose(Image.ROTATE_180), (w, h))
    return t


def save(im, name, lossless):
    p = OUT / f'd2min_{name}.webp'
    im.save(p, 'WEBP', lossless=lossless, quality=90, method=6)
    print(p.name, im.size, p.stat().st_size // 1024, 'KB')


def main():
    save(ring(FRAME_BOX, FRAME_RING), 'frame', True)
    save(ring(BTN_BOX, BTN_RING), 'btn', True)
    save(SRC.crop(SLOT_BOX), 'slot', True)
    save(mirror_tile(CHROME_BOX), 'chrome', False)
    save(mirror_tile(FILL_BOX), 'fill', False)


if __name__ == '__main__':
    main()
