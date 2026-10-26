# Human-mimic helpers for the 10-24 pace rerun — exec'd into driver globals (page, tick, click_xy, press, save, text, tip, shot, user_s ...)
import json, re, time

EV = globals().get('EV', [])
RUNS = globals().get('RUNS', [])
SEEN = globals().get('SEEN', set())
PREV = globals().get('PREV', None)
TODO_LOG = globals().get('TODO_LOG', [])
TAG = globals().get('TAG', 'X')
PARTY = globals().get('PARTY', ['h1', 'h2', 'h3'])


def ev(kind, extra=None):
    EV.append({'min': round(user_s() / 60, 2), 'event': kind, 'extra': extra})
    (OUT / f'{TAG}_events.json').write_text(json.dumps(EV, ensure_ascii=False, indent=0), encoding='utf-8')


def heroes():
    return {h['uid']: h for h in save()['heroes']}


def LVL():
    return {u: h['level'] for u, h in heroes().items()}


def toasts():
    try:
        return [x.strip()[:120] for x in page.locator('.toast, .flash, #flash *').all_inner_texts() if x.strip()][-4:]
    except Exception:
        return []


def snap_state():
    s = save() or {}
    return {
        'cleared': list((s.get('progress') or {}).get('cleared', [])),
        'levels': {h['uid']: h.get('level') for h in s.get('heroes', [])},
        'gold': (s.get('resources') or {}).get('gold'),
        'buildings': dict(s.get('buildings') or {}),
        'reports': s.get('reports') or [],
        'runs': s.get('runs') or [],
    }


def todo_tabs():
    return page.locator('nav button.todo, .nav button.todo, button.todo').evaluate_all(
        "ns=>ns.filter(n=>n.offsetParent!==null).map(n=>n.textContent.trim())")


def check(st=None):
    global PREV
    st = st or snap_state()
    if PREV is not None:
        for c in st['cleared']:
            if c not in PREV['cleared']:
                ev('clear', c)
        for u, lv in st['levels'].items():
            if lv != PREV['levels'].get(u):
                ev('level', f"{u} {PREV['levels'].get(u)}->{lv}")
        for b, r in st['buildings'].items():
            if r != PREV['buildings'].get(b):
                ev('building', f"{b} {PREV['buildings'].get(b)}->{r}")
    for r in st['reports']:
        key = (r.get('at'), r.get('stageId'), r.get('preset'))
        if key in SEEN:
            continue
        if r.get('reason') is None and not r.get('won'):
            if [x for x in st['runs'] if x and x.get('active') and x.get('lastAt') == r.get('at')]:
                continue
        SEEN.add(key)
        RUNS.append({'min': round(user_s() / 60, 2), 'stage': r.get('stageId'), 'won': r.get('won'), 'reason': r.get('reason'),
                     'dur': r.get('durationSec'), 'downed': r.get('downed'), 'rounds': len(r.get('rounds') or []),
                     'drops': len(r.get('drops') or []), 'gold': r.get('gold'), 'at': r.get('at')})
    PREV = st
    (OUT / f'{TAG}_runs.json').write_text(json.dumps(RUNS, ensure_ascii=False, indent=0), encoding='utf-8')
    return st


def watch(sec, step=10):
    end = user_s() + sec
    while user_s() < end - 0.01:
        tick(min(step, end - user_s()))
        check()
        t = todo_tabs()
        if not TODO_LOG or TODO_LOG[-1][1] != t:
            TODO_LOG.append((round(user_s() / 60, 2), t))
    return PREV


def streak():
    s = 0
    for r in reversed(RUNS):
        if r['won']:
            break
        s += 1
    return s


def runs_summary():
    w = sum(1 for r in RUNS if r['won']); l = sum(1 for r in RUNS if not r['won'])
    return f'runs {len(RUNS)} won {w} lost {l}'


def go(tab, wait=2):
    for _ in range(3):
        press(f'[data-tab={tab}]', wait=0.4); tick(wait)
        if page.locator(f'[data-tab={tab}].on').count():
            return
    print('go failed', tab)


def pick_hero(uid):
    click_xy(f'.hs-card[data-uid={uid}]', wait=0.3); tick(0.5)


def equipped_sig():
    return {u: dict(h['equipped']) for u, h in heroes().items()}


# ---- inventory: mail, boxes, auto-equip -------------------------------------------------
def claim_mail():
    if not save().get('mail'):
        return 0
    click_xy('.mail-btn', wait=0.4); tick(1)
    n = len(save().get('mail') or [])
    b = page.locator('#modal .mail-all')
    if b.count() and not b.first.is_disabled():
        b.first.evaluate('n=>n.click()'); tick(1)
    page.keyboard.press('Escape'); tick(0.5)
    got = n - len(save().get('mail') or [])
    if got:
        ev('mail_claim', got)
    return got


def weapon_ilvl(uid):
    s = save(); h = [x for x in s['heroes'] if x['uid'] == uid][0]
    w = h['equipped'].get('weapon')
    it = (s.get('items') or {}).get(w) if isinstance(s.get('items'), dict) else None
    if it is None and isinstance(s.get('items'), list):
        it = next((x for x in s['items'] if x.get('uid') == w), None)
    return (it or {}).get('ilvl', 0)


def box_cells():
    return page.locator('.store-bag .inv-cell.box')


def open_boxes():
    """Every box: open for the party hero with the lowest weapon item level (weapon box) / in turn (armor box), then auto-equip that hero."""
    opened = []
    for _ in range(12):
        if not box_cells().count():
            break
        cell = box_cells().nth(0)
        kind = 'weapon' if 'weapon' in (cell.inner_html() or '') else 'armor'
        if kind == 'weapon':
            who = min(PARTY, key=lambda u: (weapon_ilvl(u), PARTY.index(u)))
        else:
            who = PARTY[len(opened) % len(PARTY)]
        pick_hero(who)
        box = box_cells().nth(0).bounding_box()
        page.mouse.click(box['x'] + box['width'] / 2, box['y'] + box['height'] / 2, button='right'); tick(0.5)
        menu = page.locator('.item-menu button, .ctx-menu button, [class*=menu] button', has_text='사용')
        if not menu.count():
            print('box: no [use] menu', page.locator('body').inner_text()[-300:]); break
        n_items = len(save().get('items') or {})
        menu.first.evaluate('n=>n.click()'); tick(1)
        opened.append((who, kind, toasts()[-1:] ))
        ae = auto_equip(who)
        ev('box_open', f'{who} {kind} -> autoequip {ae}')
    return opened


def auto_equip(uid):
    pick_hero(uid)
    before = equipped_sig()[uid]
    b = page.locator('.main button', has_text='자동 장착')
    if not b.count():
        return -1
    b.first.evaluate('n=>n.click()'); tick(0.5)
    after = equipped_sig()[uid]
    return sum(1 for k in set(before) | set(after) if before.get(k) != after.get(k))


SALVAGE = globals().get('SALVAGE', False)


def bag_n():
    return page.locator('.store-bag .inv-cell.filled').count()


def person_salvage(threshold=34):
    # a player clears junk when the bag nears its 42 cells or a box is stuck in the mail: normals first, magics too if still crowded
    n0 = bag_n()
    if n0 < threshold and not save().get('mail'):
        return 0
    press('.store-bag button:has-text("분해")', 0); tick(0.3)
    press('.main button.toggle:has-text("일반")', 0); tick(0.3)
    if n0 >= 38:
        press('.main button.toggle:has-text("매직")', 0); tick(0.3)
    b = page.locator('.main button.primary:has-text("분해하기")')
    if b.count() and not b.first.is_disabled():
        b.first.evaluate('n=>n.click()'); tick(0.5)
    c = page.locator('.main button:has-text("취소")')
    if c.count():
        c.first.evaluate('n=>n.click()'); tick(0.3)
    got = n0 - bag_n()
    if got:
        ev('salvage', got)
    return got


def person_equip():
    go('character', 1.5)
    if SALVAGE:
        person_salvage()
    claim_mail()
    open_boxes()
    n = 0
    for u in PARTY:
        c = auto_equip(u)
        if c > 0:
            n += c
            ev('autoequip', f'{u} {c}')
    return n


# ---- mastery ----------------------------------------------------------------------------
def person_mastery():
    spent = 0
    for u in PARTY:
        if not heroes()[u].get('masteryPoints'):
            continue
        pick_hero(u)
        click_xy('.go-tree', wait=0.4); tick(2)
        nodes = page.locator('#modal [data-node]').evaluate_all("ns=>ns.map(n=>n.dataset.node)")
        want = [n for n in nodes if '_t1_' in n and any(k in n for k in ('_hp', '_atk', 'speed'))] + [n for n in nodes if '_t1_' in n]
        seen = set()
        for nd in want:
            if nd in seen:
                continue
            seen.add(nd)
            for _ in range(6):
                h = heroes()[u]
                if not h.get('masteryPoints') or h['mastery'].get(nd, 0) >= 5:
                    break
                b = h['masteryPoints']
                press(f'#modal [data-node="{nd}"]'); tick(0.6)
                if heroes()[u].get('masteryPoints') == b:
                    break
                spent += 1
            if not heroes()[u].get('masteryPoints'):
                break
        page.keyboard.press('Escape'); tick(0.5)
    if spent:
        ev('mastery', f'spent {spent}')
    return spent


# ---- construction -----------------------------------------------------------------------
BUILD_PRIO = globals().get('BUILD_PRIO', ['상단', '제련소', '선술집', '도서관', '탐험'])


def person_build():
    built = []
    go('research', 1.5)
    for name in BUILD_PRIO:
        lots = [x.strip() for x in page.locator('.cn-lot').all_inner_texts()]
        cls = page.locator('.cn-lot').evaluate_all('ns=>ns.map(n=>n.className)')
        if name not in lots or 'ready' not in cls[lots.index(name)]:
            continue
        if (save().get('buildings') or {}).get(BKEY.get(name, '?')):
            continue
        click_xy('.cn-lot', lots.index(name), wait=0.3); tick(1)
        g = save()['resources']['gold']
        click_xy('.cn-go', wait=0.4); tick(1)
        if save()['resources']['gold'] < g:
            built.append(name); ev('built', name)
    return built


BKEY = {'상단': 'shop', '제련소': 'forge', '선술집': 'tavern', '도서관': 'library', '탐험': 'explore', '연구소': 'resource'}


# ---- expedition -------------------------------------------------------------------------
def active_run():
    # a run slot is live while a round plays (active) or while it waits out the restart gap (auto) — a player only re-sends a stopped one
    return next((r for r in save().get('runs') or [] if r and (r.get('active') or r.get('auto'))), None)


def send_stage(idx=None):
    """idx None = the furthest open place; in its modal the furthest open start slot (a returning player resumes where they were)."""
    go('expedition', 1)
    if idx is None:
        zs = page.locator('.zone.has-bg').all_inner_texts()
        idx = max([i for i, z in enumerate(zs) if '이전 스테이지 클리어' not in z] or [0])
    click_xy('.zone.has-bg', idx, wait=0.5); tick(2)
    cps = page.locator('#modal .cp-btn').evaluate_all("ns=>ns.map(n=>n.className)")
    open_i = [i for i, c in enumerate(cps) if 'locked' not in c]
    if open_i:
        press('#modal .cp-btn', open_i[-1], wait=0.3); tick(0.5)
    press('#modal button.primary'); tick(1)


def person_check():
    e = person_equip()
    m = person_mastery()
    b = person_build()
    go('expedition', 0.5)
    return e, m, b


LAST_SHOP = globals().get('LAST_SHOP', -99)


def play_until(minute, chunk=100, shop_fn=None, extra_fn=None):
    global LAST_SHOP
    while user_s() / 60 < minute - 0.01:
        watch(min(chunk, minute * 60 - user_s()), 10)
        if user_s() / 60 >= minute - 0.01:
            break
        e, m, b = person_check()
        sh = None
        if shop_fn and (save().get('buildings') or {}).get('shop') and user_s() / 60 - LAST_SHOP >= 8:
            try:
                sh = shop_fn(); LAST_SHOP = user_s() / 60
                if sh:
                    person_equip()
            except Exception as ex:
                print('shop err', str(ex)[:200])
            go('expedition', 0.5)
        if extra_fn:
            try:
                extra_fn()
            except Exception as ex:
                print('extra err', str(ex)[:200])
            go('expedition', 0.5)
        if not active_run():
            send_stage(); ev('resend')
        lv = [PREV['levels'].get(u) for u in PARTY]
        print(f"{user_s()/60:.1f}m Lv{lv} cleared {PREV['cleared'][-1] if PREV['cleared'] else None} gold {PREV['gold']} {runs_summary()} streak {streak()} eq{e} m{m} b{b} shop{sh}", flush=True)


def dump(label):
    (OUT / f'{TAG}_{label}.json').write_text(json.dumps({'RUNS': RUNS, 'EV': EV, 'TODO': TODO_LOG, 'save_brief': {
        'cleared': (save().get('progress') or {}).get('cleared'), 'res': save().get('resources'),
        'levels': LVL(), 'buildings': save().get('buildings')}}, ensure_ascii=False), encoding='utf-8')


# ---- shop -------------------------------------------------------------------------------
WG = {'warrior': ['도끼', '둔기'], 'knight': ['양손검', '창'], 'archer': ['활', '석궁'], 'mage': ['스태프', '오브'], 'priest': ['홀', '십자가']}
ARMOR4 = ('투구', '갑옷', '장갑', '신발')


def parse(head):
    m = re.search(r'(\S+?)Lv\.(\d+)', head)
    if not m:
        return None
    d = {'typ': m.group(1), 'lv': int(m.group(2))}
    m2 = re.search(r'(물리|마법) 데미지\s*\n?\s*(\d+)~(\d+)', head)
    m3 = re.search(r'(공격|캐스팅) 속도\s*\n?\s*([\d.]+)초', head)
    if m2 and m3:
        d['dps'] = (int(m2.group(2)) + int(m2.group(3))) / 2 / float(m3.group(2)); d['dmgkind'] = m2.group(1)
    m4 = re.search(r'물리 방어\s*\n?\s*(\d+)', head)
    if m4:
        d['def'] = int(m4.group(1))
    return d


def split_tip(t):
    parts = t.split('VS')
    if len(parts) >= 2:
        a, b = parts[0], parts[1]
        if '이 아이템' in b:
            return b, (None if '착용 중 없음' in a else a)
        return a, (None if '착용 중 없음' in b else b)
    return parts[0], None


def shop_buy_pass():
    bought = []
    lv = LVL()
    for u in PARTY:
        pick_hero(u)
        grp = WG.get(heroes()[u]['cls'], [])
        n = page.locator('.td-grid .inv-cell.filled').count()
        for i in range(n):
            t = tip('.td-grid .inv-cell.filled', i)
            bagp, curp = split_tip(t); me = parse(bagp); cur = parse(curp) if curp else None
            if not me or me['lv'] > lv[u]:
                continue
            good = False
            if 'dps' in me and me['typ'] in grp:
                good = cur is None or cur.get('typ') not in grp or ('dps' in cur and me['dps'] > cur['dps'] * 1.15 and me.get('dmgkind') == cur.get('dmgkind'))
            elif me['typ'] in ARMOR4:
                good = cur is None or ('def' in cur and 'def' in me and me['def'] > cur['def'] * 1.3)
            if not good:
                continue
            g = save()['resources']['gold']
            click_xy('.td-grid .inv-cell.filled', i, wait=0.3); tick(0.5)
            b = page.get_by_role('button', name='구매', exact=True)
            if b.count() and not b.first.is_disabled():
                b.first.evaluate('n=>n.click()'); tick(0.5)
            g2 = save()['resources']['gold']
            if g2 < g:
                bought.append((u, me['typ'], me['lv'], g - g2)); ev('shop_buy', f"{u} {me['typ']} Lv{me['lv']} {g - g2}G")
            break
    return bought


def person_shop():
    go('shop', 1.5)
    # free refresh at the level of the hero with the lowest weapon item level (a person refreshes for the one who needs it)
    who = min(PARTY, key=lambda u: (weapon_ilvl(u), PARTY.index(u)))
    pick_hero(who)
    btn = page.locator('.main button', has_text='무료')
    if btn.count() and not btn.first.is_disabled():
        btn.first.evaluate('n=>n.click()'); tick(1); ev('shop_refresh_free', who)
    return shop_buy_pass()


# ---- forge: enhance ---------------------------------------------------------------------
WEAPON_TYPES = ('도끼', '둔기', '양손검', '창', '활', '석궁', '스태프', '오브', '홀', '십자가')


def enhance_weapons(reserve=800, per_visit=3):
    if not (save().get('buildings') or {}).get('forge'):
        return []
    done = []
    go('forge', 1)
    press('.main .fg-tabs button:has-text("강화")', 0); tick(0.5)
    for u in PARTY:
        pick_hero(u)
        n = page.locator('.main .pd-cell.filled').count()
        hit = None
        for i in range(n):
            click_xy('.main .pd-cell.filled', i, wait=0.2); tick(0.3)
            meta = page.locator('.main .fg-up-meta').first.inner_text() if page.locator('.main .fg-up-meta').count() else ''
            if '· 무기 ·' in meta:
                hit = i; break
        if hit is None:
            continue
        for _ in range(per_visit):
            g = save()['resources']['gold']
            if g < reserve:
                break
            b = page.locator('.main button.primary.lg', has_text='강화')
            if not b.count() or b.first.is_disabled():
                break
            b.first.evaluate('n=>n.click()'); tick(0.5)
            g2 = save()['resources']['gold']
            if g2 >= g:
                break
            done.append((u, g - g2))
    if done:
        ev('enhance', done)
    return done
