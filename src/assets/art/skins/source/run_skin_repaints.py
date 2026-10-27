# -*- coding: utf-8 -*-
"""겉모양 비교의 스킨 키트 — D2 Min 그림을 Codex 가 재질만 바꿔 다시 그린다 (SCREEN_DESIGN §10-5 · ADR-0901).

python src/assets/art/skins/source/run_skin_repaints.py [번호 ...]   (없으면 그림이 없는 키트 전부 · 4장씩 병렬 · 묶음은 차례로)
결과 = source/repaint_<번호>_<id>.png + 지시문 source/repaint_<번호>_<id>_prompt.txt — 자르기는 cut_skin_repaints.py.

부품만 따로 그린 시트(ADR-0853 ~ 0890 의 길)는 화면 맥락 없이 그려져 에셋 상점 부품처럼 보였다. 이 길은 D2 Min 의 원본 그림
(`concept_17_minimal.png` — 캐릭터 탭 전체를 다시 그린 페인트오버)을 Image 1 로 주고 **배치 · 크기 · 글자는 그대로 · 재질만** 키트의 변주로
다시 그리게 한다 — 테두리 · 칸 · 버튼이 화면 안에서 서로 맞춰 그려지고, 자리가 D2 Min 과 같아 D2 Min 의 자르는 좌표를 그대로 쓴다.
지시문 = D2 Min 컨셉 지시문(`concept_17_minimal_prompt.txt`)의 틀 + 「깔끔한 중세」 + 키트마다 변주 한 줄.
절차는 src/assets/art/grave/source/run_codex_edit.py 와 같다 (docs/reference/image_generation_tools.md) · 작업 폴더는 환경 변수 `SKIN_KIT_WORK`.
"""
import concurrent.futures as cf
import json
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
WORK = Path(os.environ.get('SKIN_KIT_WORK') or (HERE / '_run'))
BASE = HERE / 'concept_17_minimal.png'
EXT = sorted((Path.home() / '.vscode/extensions').glob('openai.chatgpt-*-win32-x64'))[-1]
EXE = EXT / 'bin/windows-x86_64/codex.exe'

# 번호 → (id, 화면 이름, 변주 한 줄). 번호는 지운 키트(21 ~ 190)와 안 겹치게 191 부터 (ADR-0829 「번호를 새로 매긴 이유」)
KITS = {
    191: ('oakiron', 'Oak & Iron', 'dark oak panel fills edged with slim black iron; a few small rivets only at the corners'),
    192: ('castlestone', 'Castle Stone', 'cut grey castle ashlar; fine mortar lines only along the frames'),
    193: ('cathedral', 'Cathedral', 'dark limestone with a small pointed-arch notch on each title bar'),
    194: ('forgediron', 'Forged Iron', 'slim blackened hammered-iron frames with small round rivets at the corners'),
    195: ('leathertome', 'Leather Tome', 'dark brown book-leather panels with fine blind-tooled border lines and small metal corner caps'),
    196: ('bronzetrim', 'Bronze Trim', 'dark stone with a slim tarnished-bronze edge trim on frames and title bars'),
    197: ('slate', 'Slate', 'dark blue-grey slate panels with crisp chiselled bevels'),
    198: ('knightsteel', "Knight's Steel", 'dull steel plate edges with one clean bevel and dark fills'),
    199: ('monastery', 'Monastery', 'dark weathered sandstone frames with one simple carved band'),
    200: ('keeptimber', 'Keep Timber', 'dark timber frames held by small iron corner brackets'),
    201: ('heraldicred', 'Heraldic Red', 'dark stone with a thin deep heraldic-red band inside each title bar'),
    202: ('heraldicblue', 'Heraldic Blue', 'dark stone with a thin dark heraldic-blue band inside each title bar'),
    203: ('gildedgothic', 'Gilded Gothic', 'dark stone with thin dull-gold lines on title bars and the selected navigation item'),
    204: ('cryptmarble', 'Crypt Marble', 'dark grey marble with thin carved edges and faint veins'),
    205: ('granitekeep', 'Granite Keep', 'speckled dark granite with chiselled bevels'),
    206: ('ironchest', 'Ironbound Chest', 'dark wood fills with slim iron strap edges'),
    207: ('parchment', 'Parchment', 'dark stone frames with title bars as dark aged parchment strips'),
    208: ('chainmail', 'Chainmail', 'dark steel frames with a fine chainmail texture on the edges only'),
    209: ('emberforge', 'Ember Forge', 'black iron frames with a very faint ember warmth in the bevels'),
    210: ('moonsilver', 'Moon Silver', 'dark stone with thin cold silver edge highlights'),
}

COMMON = """Use the built-in image generation tool to EDIT Image 1. Do not create or edit any other file. When done, reply with only the absolute path of the generated PNG.

Image 1 is our dark-fantasy party RPG's CHARACTER screen, already painted in a clean dark-stone Diablo II style, with black letterbox bars at the top and bottom. Repaint it in a new MEDIEVAL variation (below) at the same high quality: the same calm, clean, uncluttered look, the same structure, only the materials change.

KEEP (do not change):
- The exact layout: every panel, frame, title bar, slot, button and card stays at EXACTLY the same pixel position and size as in Image 1 - the left navigation column, the top bar, the hero strip with four hero portrait cards and one empty "+" card, the equipment panel with its paper-doll slots, the base-stats panel with the yellow stat bars, the two detail-option columns, the storage grid (bottom left) and the inventory grid (bottom right).
- The exact counts: 8 paper-doll slots (2 + 3 + 3), the storage grid is 10 columns x 3 rows, the inventory grid is 14 columns x 3 rows, 3 skill slots, 7 stat bars.
- The left navigation column keeps every item, in the same order, with the same lock icons and nothing added next to them.
- The hero portraits and the item / skill icons, exactly as they are.
- All text and numbers in the same places and the same size, white on dark. The Korean labels stay as they appear - do not translate them and do not invent new words.
- Frames stay as slim as in Image 1. The black letterbox bars at the top and bottom. Landscape output, 1536x1024.

CLEAN AND MEDIEVAL - this matters most:
- Calm, large, plain surfaces. Panel interiors behind text are smooth and dark with at most a barely visible texture.
- The medieval feel comes from the MATERIAL and a few small, crafted details (a carved bevel, a small rivet, a slim metal edge), never from heavy, thick or busy ornament.
- Ornament only on panel corners and title bars, small and restrained. No repeated motifs, no busy patterns.
- Do NOT add anything that is not in Image 1: no illustrations, no creatures, no banners, no extra icons, no extra decorations filling empty areas.

CHANGE (this is the job): the materials of the panel backgrounds, panel frames, title bars, buttons, item / equipment / skill slots, the selected navigation item, the hero cards and the stat-bar tracks - following the variation.

VARIATION FOR THIS IMAGE: {theme}. Dark overall, like Image 1.
"""


def out_path(n):
    return HERE / f'repaint_{n}_{KITS[n][0]}.png'


def log(msg):
    line = time.strftime('%H:%M:%S ') + msg
    print(line, flush=True)
    with open(WORK / 'run.log', 'a', encoding='utf-8') as f:
        f.write(line + '\n')


def run(n):
    body = COMMON.format(theme=KITS[n][2])
    (HERE / f'repaint_{n}_{KITS[n][0]}_prompt.txt').write_text(body, encoding='utf-8')
    wd = WORK / str(n)
    wd.mkdir(parents=True, exist_ok=True)
    last = wd / 'last.txt'
    if last.exists():
        last.unlink()
    cmd = [str(EXE), 'exec', '-s', 'read-only', '-C', str(wd), '--skip-git-repo-check',
           '-c', 'model_reasoning_effort="low"', '--json', '-o', str(last), '-i', str(BASE), '-']
    t0 = time.time()
    log(f'{n} start')
    with open(wd / 'events.jsonl', 'w', encoding='utf-8') as ev:
        p = subprocess.run(cmd, input=body.encode('utf-8'), stdout=ev, stderr=subprocess.STDOUT, timeout=900)
    txt = last.read_text(encoding='utf-8', errors='replace').strip() if last.exists() else ''
    # 제 스레드 폴더의 그림이 먼저다 — 병렬로 돌면 Codex 가 옆 작업의 최신 그림 경로를 답할 때가 있다 (2026-10-25)
    path = None
    for line in (wd / 'events.jsonl').read_text(encoding='utf-8', errors='replace').splitlines():
        try:
            tid = json.loads(line).get('thread_id')
        except Exception:
            tid = None
        if tid:
            pngs = sorted((Path.home() / '.codex/generated_images' / tid).glob('*.png'), key=lambda q: q.stat().st_mtime)
            path = pngs[-1] if pngs else None
            break
    if not path or not path.exists():
        path = next((Path(s.strip().strip('`"')) for s in txt.splitlines() if s.strip().lower().strip('`"').endswith('.png')), None)
    if not path or not path.exists():
        log(f'{n} FAIL rc={p.returncode} last={txt[:200]!r} ({time.time() - t0:.0f}s)')
        return n, False
    shutil.copy2(path, out_path(n))
    log(f'{n} ok {path.parent.name} ({time.time() - t0:.0f}s)')
    return n, True


def main():
    WORK.mkdir(parents=True, exist_ok=True)
    ns = [int(a) for a in sys.argv[1:]] or list(KITS)
    ns = [n for n in ns if not out_path(n).exists()]
    log(f'start {ns} exe={EXT.name}')
    for i in range(0, len(ns), 4):
        batch = ns[i:i + 4]
        with cf.ThreadPoolExecutor(len(batch)) as ex:
            res = list(ex.map(run, batch))
        log('batch ' + ' '.join(f'{n}={"ok" if ok else "FAIL"}' for n, ok in res))
    log('done')


if __name__ == '__main__':
    main()
