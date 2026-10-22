import json, re, shutil
EV = []
def ev(kind, extra=None):
    EV.append({"min": round(user_s()/60, 2), "event": kind, "extra": extra})
    (OUT / "events.json").write_text(json.dumps(EV, ensure_ascii=False, indent=0), encoding="utf-8")
for f in ["person.py", "obs.py", "loop.py", "shop.py", "metrics.py", "my_person.py"]:
    exec(open(f, encoding="utf-8").read(), globals())
WG = {'warrior': ['도끼', '둔기'], 'knight': ['양손검', '창'], 'archer': ['활', '석궁'], 'mage': ['스태프', '오브'], 'priest': ['홀', '십자가']}
PARTY = []


def split_tip(t):
    """ADR-0690 (10-21): compare tooltip = [equipped] VS [this item]. Return (bag_part, cur_part or None)."""
    parts = t.split('VS')
    if len(parts) >= 2:
        a, b = parts[0], parts[1]
        if '이 아이템' in b:
            return b, (None if '착용 중 없음' in a else a)
        if '이 아이템' in a:
            return a, (None if '착용 중 없음' in b else b)
        return a, b
    return parts[0], None


def set_groups():
    for h in save()['heroes']:
        GROUPS[h['uid']] = WG.get(h['cls'], [])


def person_equip():
    changed = 0
    for _round in range(8):
        lv = LVL(); acted = False
        for hero in PARTY:
            click_xy(f'.hs-card[data-uid={hero}]', wait=0.3); tick(0.5)
            tips = bag_tips()
            for i, t in enumerate(tips):
                bagp, curp = split_tip(t)
                me, cur = parse(bagp), (parse(curp) if curp else None)
                if not me or me['lv'] > lv[hero]:
                    continue
                good = False
                if 'dps' in me:
                    if me['typ'] not in GROUPS.get(hero, []):
                        continue
                    if cur is None or cur.get('typ') not in GROUPS.get(hero, []):
                        good = True
                    else:
                        good = 'dps' in cur and me['dps'] > cur['dps'] * 1.05 and me.get('dmgkind') == cur.get('dmgkind')
                elif me['typ'] in ARMOR:
                    if cur is None:
                        good = True
                    elif 'def' in me and 'def' in cur:
                        good = me['def'] > cur['def']
                if good:
                    before = dict({h['uid']: h['equipped'] for h in save()['heroes']}[hero])
                    click_xy('.store-bag .inv-cell.filled', i, wait=0.3)
                    after = dict({h['uid']: h['equipped'] for h in save()['heroes']}[hero])
                    if before != after:
                        ev('equip', f"{hero} {me['typ']} Lv{me['lv']} " + (f"dps {me.get('dps', 0):.1f} vs {cur.get('dps', 0) if cur else 0:.1f}" if 'dps' in me else f"def {me.get('def')} vs {cur.get('def') if cur else '-'}"))
                        changed += 1; acted = True
                    tick(3); break
            if acted:
                break
        if not acted:
            break
    return changed


def person_mastery2(heroes):
    spent = 0
    for hero in heroes:
        h = [x for x in save()['heroes'] if x['uid'] == hero][0]
        if not h.get('masteryPoints'):
            continue
        click_xy(f'.hs-card[data-uid={hero}]', wait=0.3); tick(0.5)
        click_xy('.go-tree', wait=0.4); tick(4)
        for nd in mastery_plan(hero):
            for _ in range(6):
                h = [x for x in save()['heroes'] if x['uid'] == hero][0]
                if not h.get('masteryPoints'):
                    break
                if (h['mastery'].get(nd, 0)) >= 5:
                    break
                b = h['masteryPoints']
                press(f'#modal [data-node={nd}]'); tick(1)
                if [x for x in save()['heroes'] if x['uid'] == hero][0].get('masteryPoints') == b:
                    break
                spent += 1
        page.keyboard.press('Escape'); tick(1)
    if spent:
        ev('mastery', f'spent {spent}')
    return spent


def person_check():
    click_xy('[data-tab=character]', wait=0.4); tick(3)
    e = person_equip(); m = person_mastery2(PARTY); b = person_build()
    back_to_watch()
    return e, m, b


def person_shop(refresh=True):
    bought = []
    click_xy('[data-tab=shop]', wait=0.4); tick(3)
    if refresh:
        btn = page.locator('.main button', has_text='무료')
        if btn.count():
            btn.first.evaluate('n=>n.click()'); tick(2); ev('shop_refresh_free')
    lv = LVL()
    for hero in PARTY:
        click_xy(f'.hs-card[data-uid={hero}]', wait=0.3); tick(0.5)
        n = page.locator('.td-grid .inv-cell.filled').count()
        for i in range(n):
            t = tip('.td-grid .inv-cell.filled', i)
            bagp, curp = split_tip(t); me = parse(bagp); cur = parse(curp) if curp else None
            if not me or me['lv'] > lv[hero]:
                continue
            good = False
            if 'dps' in me and me['typ'] in GROUPS.get(hero, []):
                good = cur is None or cur.get('typ') not in GROUPS.get(hero, []) or ('dps' in cur and me['dps'] > cur['dps'] * 1.15)
            elif me['typ'] in ('투구', '갑옷', '장갑', '신발'):
                good = cur is None or ('def' in cur and 'def' in me and me['def'] > cur['def'] * 1.3)
            if not good:
                continue
            g = save()['resources']['gold']
            click_xy('.td-grid .inv-cell.filled', i, wait=0.3); tick(3)
            b = page.get_by_role('button', name='구매', exact=True)
            if b.count() and not b.first.is_disabled():
                b.first.evaluate('n=>n.click()'); page.clock.run_for(300)
            g2 = save()['resources']['gold']
            if g2 < g:
                bought.append((hero, me['typ'], me['lv'], g - g2)); ev('shop_buy', f"{hero} {me['typ']} Lv{me['lv']} {g - g2}G")
            tick(2); break
    return bought


LAST_SHOP = -99


def play_until2(minute, chunk=100):
    global LAST_SHOP
    while user_s()/60 < minute - 0.01:
        watch(min(chunk, minute*60 - user_s()), 10)
        if user_s()/60 >= minute - 0.01:
            break
        e, m, b = person_check()
        sh = []
        if (save().get('buildings') or {}).get('shop') and user_s()/60 - LAST_SHOP >= 8:
            try:
                sh = person_shop(); LAST_SHOP = user_s()/60
                click_xy('[data-tab=character]', wait=0.4); tick(2); person_equip()
            except Exception as ex:
                print('shop err', str(ex)[:200])
            back_to_watch()
        print(f"{user_s()/60:.1f}m Lv{list(PREV['levels'].values())[:3]} cleared {PREV['cleared'][-1] if PREV['cleared'] else None} gold {PREV['gold']} runs {len(RUNS)} streak {streak()} eq{e} m{m} b{b} shop{sh}", flush=True)


def send_stage(idx=None):
    """idx None = the furthest unlocked place, and in its modal the furthest unlocked start slot (a returning player resumes where they were)."""
    click_xy('[data-tab=expedition]', wait=0.4); tick(2)
    if idx is None:
        zs = page.locator('.zone.has-bg').all_inner_texts()
        idx = max([i for i, z in enumerate(zs) if '이전 스테이지 클리어' not in z] or [0])
    click_xy('.zone.has-bg', idx, wait=0.5); tick(6)
    cps = page.locator('#modal .cp-btn').evaluate_all("ns=>ns.map(n=>n.className)")
    open_i = [i for i, c in enumerate(cps) if 'locked' not in c]
    if open_i:
        press('#modal .cp-btn', open_i[-1], wait=0.3); tick(1)
    press('#modal button.primary'); tick(1)


def register_lab(order=(3, 0, 1)):
    click_xy('[data-tab=resource]', wait=0.4); tick(5)
    for hero_i in order:
        click_xy('.dp-reg-face.empty:not(.lock)', 0, wait=0.4); tick(2)
        click_xy('#modal .hs-card', hero_i, wait=0.4); tick(2)
        page.keyboard.press('Escape'); tick(1)


def build(name):
    click_xy('[data-tab=research]', wait=0.4); tick(3)
    lots = [x.strip() for x in page.locator('.cn-lot').all_inner_texts()]
    click_xy('.cn-lot', lots.index(name), wait=0.4); tick(3); click_xy('.cn-go', wait=0.5); tick(2)
    ev('built', name)


def d1_return(state_file, end_ms, label):
    context.close()
    ret = end_ms + 24*3600*1000
    open_game(ret, storage=str(state_file))
    page.clock.pause_at(ret / 1000 + 3)
    tick(3)
    title = text()[:400]
    click_xy('.mn-btn', 1, wait=0.5); tick(3)
    s = save()
    out = {'title': title, 'screen': text()[:1500], 'todo': todo_tabs(), 'res': s['resources'],
           'mats': {k: v for k, v in (s.get('materials') or {}).items() if v}, 'notice': s.get('notice'),
           'visit': s.get('visit'), 'joins': s.get('joins')}
    shot(label + '_d1_return')
    return ret, out
