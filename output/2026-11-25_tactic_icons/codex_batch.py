# -*- coding: utf-8 -*-
"""Tactic-card icon drafts via Codex (ChatGPT login only — never the API).
  python codex_batch.py a_mono b_item ...   -> sheets/codex_<key>_<k>.png (next free k)
Each key = prompts/codex_<key>.txt (+ the shared head) + optional anchor sheets. Up to 5 in parallel."""
import glob, json, os, shutil, subprocess, sys, time
from concurrent.futures import ThreadPoolExecutor

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
WORK = os.environ.get('CODEX_WORK', os.path.join(HERE, '_codex_work'))
SRC = os.path.join(ROOT, 'src', 'assets', 'art', 'icons_source')
ANCHORS = {
    'a_mono': [os.path.join(SRC, 'skills', 'source', 'sheet_21_anchor_installed_buffs.png')],
    'b_item': [os.path.join(SRC, 'items', 'source', 'examples.png')],
    'd_scene': [os.path.join(SRC, 'items', 'source', 'examples.png')],
}


def codex_exe():
    exts = sorted(glob.glob(os.path.join(os.path.expanduser('~'), '.vscode', 'extensions', 'openai.chatgpt-*-win32-x64')),
                  key=os.path.getmtime, reverse=True)
    return os.path.join(exts[0], 'bin', 'windows-x86_64', 'codex.exe')


def log(msg):
    line = time.strftime('%H:%M:%S ') + msg
    print(line, flush=True)
    with open(os.path.join(HERE, 'sheets', 'log_codex.txt'), 'a', encoding='utf-8') as f:
        f.write(line + '\n')


def out_path(key):
    k = 1
    while os.path.exists(os.path.join(HERE, 'sheets', 'codex_%s_%d.png' % (key, k))):
        k += 1
    return os.path.join(HERE, 'sheets', 'codex_%s_%d.png' % (key, k))


def one(key):
    head = open(os.path.join(HERE, 'prompts', '_codex_head.txt'), encoding='utf-8').read().strip()
    body = open(os.path.join(HERE, 'prompts', 'codex_%s.txt' % key), encoding='utf-8').read().strip()
    prompt = head + '\n\n' + body + '\n'
    job = os.path.join(WORK, '%s_%d' % (key, int(time.time())))
    os.makedirs(job, exist_ok=True)
    cmd = [codex_exe(), 'exec', '-s', 'read-only', '-C', job, '--skip-git-repo-check',
           '-c', 'model_reasoning_effort="low"', '--json', '-o', os.path.join(job, 'last.txt')]
    for a in ANCHORS.get(key, []):
        cmd += ['-i', a]
    cmd.append('-')
    t0 = time.time()
    log('%s start' % key)
    r = subprocess.run(cmd, input=prompt.encode('utf-8'), capture_output=True, timeout=900)
    open(os.path.join(job, 'events.jsonl'), 'wb').write(r.stdout)
    open(os.path.join(job, 'stderr.txt'), 'wb').write(r.stderr)
    thread = None
    for line in r.stdout.decode('utf-8', 'replace').splitlines():
        try:
            ev = json.loads(line)
        except Exception:
            continue
        thread = ev.get('thread_id') or thread
        if thread:
            break
    cands = []
    if thread:
        cands = glob.glob(os.path.join(os.path.expanduser('~'), '.codex', 'generated_images', thread, '*.png'))
    if not cands:
        last = open(os.path.join(job, 'last.txt'), encoding='utf-8', errors='replace').read() if os.path.exists(os.path.join(job, 'last.txt')) else ''
        cands = [p for p in last.split() if p.lower().endswith('.png') and os.path.exists(p)]
    if not cands:
        log('%s FAILED rc=%s thread=%s (%.0fs) — see %s' % (key, r.returncode, thread, time.time() - t0, job))
        return None
    src = max(cands, key=os.path.getmtime)
    out = out_path(key)
    shutil.copyfile(src, out)
    log('%s image %.0fs -> %s | thread %s' % (key, time.time() - t0, os.path.basename(out), thread))
    return out


if __name__ == '__main__':
    os.makedirs(os.path.join(HERE, 'sheets'), exist_ok=True)
    keys = sys.argv[1:]
    with ThreadPoolExecutor(max_workers=5) as ex:
        for key, res in zip(keys, ex.map(one, keys)):
            pass
    log('batch done')
