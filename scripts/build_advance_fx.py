"""전직 스킬 45종 이펙트 — Codex 2x2 자홍 시트에서 A안 54장을 잘라 설치한다 (ADR-0550).

python scripts/build_advance_fx.py

시트 · 지시문 · B안은 fx_source/advance_20261008/ (칸 문안 = spec.py · 미리보기 GIF = gif/).
자르기 · 키잉 · 줄이기는 build_mage_drop_fx.py 와 같고, 칸 끝까지 뻗은 그림(히드라 목 · 메테오 꼬리)이
네모로 잘려 보이지 않게 바깥 5% 를 알파로 흐린다. 두 단계 스킬의 둘째 그림은 `<skill_id>_impact`.
새 파일만 쓴다 — 바꾸기 전 설치본이 없어 previous/ 를 두지 않는다. Requires Pillow + numpy.
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_mage_drop_fx as base  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "src/assets/art/fx_source/advance_20261008"
OUT = ROOT / "src/assets/art/fx/skills"
FEATHER = 0.05
# 설치 파일 → (시트, 칸 — 왼쪽 위부터 1 · 2 / 3 · 4)
PICKS = {
    # 전사 — 광전사 · 바바리안 · 선봉장
    "war_ragnarok": ("w1", 1),
    "war_berserk": ("w1", 2),
    "war_mutualruin": ("w1", 3),
    "war_mutualruin_impact": ("w1", 4),
    "war_whirlwind": ("w2", 1),
    "war_thorswrath": ("w2", 2),
    "war_thorswrath_impact": ("w2", 3),
    "war_shockwave": ("w2", 4),
    "war_lionsroar": ("w3", 1),
    "war_command": ("w3", 2),
    "war_intimidate": ("w3", 3),
    # 기사 — 가디언 · 팔라딘 · 크루세이더
    "kni_lastbastion": ("k1", 1),
    "kni_unbreakablewill": ("k1", 2),
    "kni_divinejudgment": ("k1", 3),
    "kni_unyieldingoath": ("k1", 4),
    "kni_holywar": ("k2", 1),
    "kni_vow": ("k2", 2),
    "kni_retribution": ("k2", 3),
    "kni_showdown": ("k2", 4),
    "kni_condemnation": ("k3", 1),
    "kni_condemnation_impact": ("k3", 2),
    # 마법사 — 파이어 · 프로스트 · 썬더
    "mag_meteor": ("m1", 1),
    "mag_meteor_impact": ("m1", 2),
    "mag_firewall": ("m1", 3),
    "mag_hydra": ("m1", 4),
    "mag_frozenorb": ("m2", 1),
    "mag_frozenorb_impact": ("m2", 2),
    "mag_blizzard": ("m2", 3),
    "mag_frostburst": ("m2", 4),
    "mag_frostburst_impact": ("m3", 1),
    "mag_thunderstrike": ("m3", 2),
    "mag_thunderstrike_impact": ("m3", 3),
    "mag_nova": ("m3", 4),
    "mag_staticfield": ("m4", 1),
    # 궁수 — 스나이퍼 · 보우마스터 · 레인저
    "arc_trueaim": ("a1", 1),
    "arc_singlestrike": ("a1", 2),
    "arc_singlestrike_impact": ("a1", 3),
    "arc_reload": ("a1", 4),
    "arc_quickdraw": ("a2", 1),
    "arc_fulldraw": ("a2", 2),
    "arc_chaindraw": ("a2", 3),
    "arc_huntersmark": ("a2", 4),
    "arc_supportingfire": ("a3", 1),
    "arc_trap": ("a3", 2),
    # 사제 — 비숍 · 검은사제 · 몽크
    "pri_aegis": ("p1", 1),
    "pri_benediction": ("p1", 2),
    "pri_resurrection": ("p1", 3),
    "pri_punishment": ("p1", 4),
    "pri_punishment_impact": ("p2", 1),
    "pri_atonement": ("p2", 2),
    "pri_excommunication": ("p2", 3),
    "pri_diamondbody": ("p2", 4),
    "pri_sweep": ("p3", 1),
    "pri_counter": ("p3", 2),
}


def cut(sheet: str, index: int) -> Image.Image:
    arr = np.asarray(Image.open(SOURCE / f"sheet_{sheet}.png").convert("RGB"))
    y0, y1, x0, x1 = base.cells(arr)[index - 1]
    sub = arr[y0 + base.INSET:y1 - base.INSET, x0 + base.INSET:x1 - base.INSET]
    side = min(sub.shape[:2])
    rgba = Image.fromarray(base.key(sub[:side, :side]))
    sprite = np.asarray(rgba.convert("RGBa").resize((base.SIZE, base.SIZE), Image.Resampling.LANCZOS).convert("RGBA")).copy()
    edge = np.arange(base.SIZE)
    ramp = np.clip(np.minimum(edge, edge[::-1]) / (base.SIZE * FEATHER), 0, 1)
    sprite[..., 3] = (sprite[..., 3] * np.minimum.outer(ramp, ramp)).astype(np.uint8)
    return Image.fromarray(sprite)


def main() -> None:
    for file, (sheet, index) in PICKS.items():
        sprite = cut(sheet, index)
        alpha = np.asarray(sprite)[..., 3]
        if (alpha > 16).mean() < 0.02:
            raise ValueError(f"{file}: the cell is empty (sheet_{sheet} #{index})")
        path = OUT / f"{file}.webp"
        sprite.save(path, "WEBP", quality=90, alpha_quality=100, method=6)
        print(f"{file}: {path.stat().st_size} bytes")
    print(f"{len(PICKS)} files")


if __name__ == "__main__":
    main()
