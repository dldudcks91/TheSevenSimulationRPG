"""Verify equipment triggers in the browser suite and bilingual item tooltips."""
import argparse
import json
import re
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'output/2026-10-30_equipment_procs'

UI_HARNESS = r'''
window.__procReview = {
    ready: () => !!G?.heroes?.length,
    cards: () => {
        const lines = [
            {stat:'proc_cast_attack', skill:'mag_fireball', skillLv:1},
            {stat:'proc_cast_buff', skill:'war_ironskin', skillLv:1},
            {stat:'proc_cast_debuff', skill:'pri_bind', skillLv:1},
            {stat:'proc_struck_debuff', skill:'pri_bind', skillLv:1},
            {stat:'proc_struck_buff', skill:'war_ironskin', skillLv:1},
            {stat:'proc_hit_attack', skill:'war_bash', skillLv:1},
            {stat:'proc_hit_attack', skill:'mag_fireball', skillLv:4},
            {stat:'proc_hit_attack', skill:'war_bash'},
            {legacy:true, skill:'mag_fireball'},
            {stat:'skill_plus', skill:'mag_fireball', v:2},
        ];
        const panel = document.createElement('div');
        panel.style.cssText = 'position:fixed;inset:20px;z-index:99999;display:flex;flex-wrap:wrap;align-items:flex-start;align-content:flex-start;gap:12px;background:#191919;padding:15px;overflow:auto';
        const rows = [];
        for (const [i, line] of lines.entries()) {
            const slot = i % 2 ? 'ring' : 'amulet';
            const it = SYS.item.rollGear(makeRng(77 + i), {slots:[slot],ilvl:10})[0];
            const {legacy, ...affix} = line;
            it.affixes = legacy ? [] : [{v:0.1, src:'random', ...affix}];
            if (legacy) it.proc = {trigger:'hit', skill:line.skill, v:0.1};
            const card = tipCard(it, '', [], null, {ranges:true});
            panel.append(card);
            rows.push({text:card.querySelector('ul').textContent, skill:L(SYS.skill.defs[line.skill].name),
                level:line.skillLv ?? 1, legacy:!!legacy, plus:line.stat === 'skill_plus'});
        }
        document.body.append(panel);
        return rows;
    },
};
'''


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=8823)
    parser.add_argument('--baseline', action='store_true')
    parser.add_argument('--write-golden', action='store_true')
    parser.add_argument('--compare-previous', action='store_true')
    parser.add_argument('--compare-levels', action='store_true')
    parser.add_argument('--output-dir', type=Path, default=OUT)
    args = parser.parse_args()
    out = args.output_dir
    out.mkdir(parents=True, exist_ok=True)
    saved_golden = (ROOT / 'src/dev/golden.json').read_bytes()
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(channel='msedge', headless=True)
        page = browser.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(f'http://127.0.0.1:{args.port}/dev/test.html' + ('?golden=write' if args.write_golden or args.compare_previous or args.compare_levels else ''))
        page.wait_for_function('/PASS|FAIL/.test(document.title)', timeout=240000)
        checks = page.locator('#out li').evaluate_all('ns => ns.map(n => ({ok: !n.classList.contains("fail"), text: n.textContent}))')
        failures = [check['text'] for check in checks if not check['ok']]
        result = {'title':page.title(), 'checks':checks, 'failures':failures, 'errors':errors}
        if args.compare_levels:
            current = json.loads(page.locator('#golden').text_content())
            expected = json.loads(saved_golden)
            (out / 'current_behavior.json').write_text(json.dumps(current,ensure_ascii=False,indent=1),encoding='utf-8')
            (out / 'comparison_expected.json').write_bytes(saved_golden)

            def without_proc_details(value):
                if isinstance(value, str):
                    return re.sub(r'/(proc_(?:hit|cast|struck)_(?:attack|buff|debuff))/[^/:;|]+/\d+:', r'/\1:', value)
                if isinstance(value, list):
                    return [without_proc_details(item) for item in value]
                if isinstance(value, dict):
                    return {key:without_proc_details(item) for key,item in value.items()}
                return value

            comparison = {
                'runs':len(current['runs']),
                'battle_summaries_unchanged':without_proc_details([{k:v for k,v in row.items() if k != 'tl'} for row in current['runs']]) == without_proc_details([{k:v for k,v in row.items() if k != 'tl'} for row in expected['runs']]),
                'starting_parties_unchanged':without_proc_details(current['meta']['parties']) == without_proc_details(expected['meta']['parties']),
                'timeline_hash_changes':sum(a['tl'] != b['tl'] for a,b in zip(current['runs'],expected['runs'])),
            }
            result['level_comparison'] = comparison
            (out / 'level_comparison.json').write_text(json.dumps(comparison,indent=2),encoding='utf-8')
        if args.compare_previous:
            current = json.loads(page.locator('#golden').text_content())
            context = browser.new_context()
            runtime = (ROOT / 'src/game_logic/skill_runtime.js').read_text(encoding='utf-8')
            for method, channel, trigger in [('procCast','castProcs','cast'), ('procStruck','struckProcs','struck')]:
                old = f"const {method} = (u, t) => procEquipment(u, t, '{channel}', '{trigger}');"
                if old not in runtime:
                    raise ValueError(f'Missing comparison hook {method}')
                runtime = runtime.replace(old, f'const {method} = () => {{}};')
            context.route('**/game_logic/skill_runtime.js', lambda route: route.fulfill(status=200, content_type='text/javascript', body=runtime))
            previous_page = context.new_page()
            previous_page.goto(f'http://127.0.0.1:{args.port}/dev/test.html?golden=write')
            previous_page.wait_for_function('/PASS|FAIL/.test(document.title)', timeout=240000)
            previous = json.loads(previous_page.locator('#golden').text_content())
            expected = json.loads(saved_golden)
            result['comparison'] = {
                'runs':len(current['runs']),
                'changed_runs':sum(a != b for a,b in zip(previous['runs'],current['runs'])),
                'previous_matches_saved':previous['runs'] == expected['runs'],
                'starting_parties_unchanged':previous['meta']['parties'] == current['meta']['parties'],
                'disabled_trigger_failures':previous_page.locator('#out li.fail').all_text_contents(),
            }
            (out / 'previous_behavior.json').write_text(json.dumps(previous,ensure_ascii=False,indent=1),encoding='utf-8')
            (out / 'current_behavior.json').write_text(json.dumps(current,ensure_ascii=False,indent=1),encoding='utf-8')
            (out / 'comparison.json').write_text(json.dumps(result['comparison'],ensure_ascii=False,indent=2),encoding='utf-8')
            context.close()
        if args.write_golden:
            if errors or any(not failure.startswith('golden:') for failure in failures):
                raise ValueError('Resolve non-golden failures before updating snapshot')
            if args.compare_levels and not all(result['level_comparison'][key] for key in ['battle_summaries_unchanged','starting_parties_unchanged']):
                raise ValueError('Resolve battle or generation changes before updating the level metadata snapshot')
            if (ROOT / 'src/dev/golden.json').read_bytes() != saved_golden:
                raise ValueError('Golden snapshot changed during verification; retry with the current input')
            body = page.locator('#golden').text_content()
            golden = json.loads(body)
            if len(body) < 1000 or len(golden.get('runs', [])) != 60 or len(golden.get('meta', {}).get('parties', {})) != 10:
                raise ValueError('Incomplete golden snapshot')
            backup = out / 'golden_before.json'
            if not backup.exists():
                backup.write_bytes((ROOT / 'src/dev/golden.json').read_bytes())
            with (ROOT / 'src/dev/golden.json').open('w', encoding='utf-8', newline='\n') as stream:
                stream.write(body)
        if not args.baseline:
            context = browser.new_context(viewport={'width':1600, 'height':1000})
            context.route('**/ui/app.js', lambda route: route.fulfill(status=200, content_type='text/javascript', body=(ROOT / 'src/ui/app.js').read_text(encoding='utf-8') + '\n' + UI_HARNESS))
            ui_page = context.new_page()
            ui_page.on('pageerror', lambda error: errors.append(str(error)))
            ui = []
            for lang in ['ko', 'en']:
                ui_page.goto(f'http://127.0.0.1:{args.port}/index.html?dev=book&lang={lang}')
                ui_page.wait_for_function('__procReview?.ready()', timeout=60000)
                rows = ui_page.evaluate('__procReview.cards()')
                active_rows = [row for row in rows if not row['legacy'] and not row['plus']]
                legacy = next(row for row in rows if row['legacy'])
                plus = next(row for row in rows if row['plus'])
                active_ok = all(not any(bad in row['text'] for bad in ['(미적용)', '(inactive)', 'undefined', 'NaN', 'tip.proc.']) for row in active_rows)
                levels_ok = all(f"Lv.{row['level']} {row['skill']}" in row['text'] for row in active_rows + [legacy])
                legacy_ok = ('(미적용)' if lang == 'ko' else '(inactive)') in legacy['text']
                plus_ok = ('파이어볼 +2' if lang == 'ko' else '+2 to Fireball') in plus['text'] and 'Lv.' not in plus['text']
                ui.append({'lang':lang, 'texts':[row['text'] for row in rows], 'levels_ok':levels_ok,
                    'legacy_ok':legacy_ok, 'skill_plus_ok':plus_ok, 'ok':active_ok and levels_ok and legacy_ok and plus_ok})
                ui_page.screenshot(path=str(out / f'tooltips_{lang}.png'))
            result['ui'] = ui
            context.close()
        target = out / ('baseline.json' if args.baseline else 'verification.json')
        target.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
        print(json.dumps({'title':result['title'], 'failures':failures, 'errors':errors, 'comparison':result.get('comparison'), 'level_comparison':result.get('level_comparison'), 'ui':[{k:v for k,v in row.items() if k != 'texts'} for row in result.get('ui', [])]}, ensure_ascii=True))
        browser.close()
        if failures or errors or any(not row['ok'] for row in result.get('ui', [])):
            raise SystemExit(1)


if __name__ == '__main__':
    main()
