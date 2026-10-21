import re
GROUPS = {'h1': ['도끼', '둔기'], 'h2': ['스태프', '오브'], 'h3': ['활', '석궁']}
ARMOR = ['투구', '갑옷', '장갑', '신발', '목걸이', '반지']
LVL = lambda: {h['uid']: h['level'] for h in save()['heroes']}
def parse(head):
    m = re.search(r'(\S+?)Lv\.(\d+)', head)
    if not m: return None
    typ, lv = m.group(1), int(m.group(2))
    d = {'typ': typ, 'lv': lv}
    m2 = re.search(r'(물리|마법) 데미지\s*\n?\s*(\d+)~(\d+)', head)
    m3 = re.search(r'(공격|캐스팅) 속도\s*\n?\s*([\d.]+)초', head)
    if m2 and m3:
        d['dps'] = (int(m2.group(2)) + int(m2.group(3))) / 2 / float(m3.group(2)); d['dmgkind'] = m2.group(1)
    m4 = re.search(r'물리 방어\s*\n?\s*(\d+)', head)
    if m4: d['def'] = int(m4.group(1))
    return d
def person_equip():
    """reads compare tooltips like a person: weapon = avg dmg / speed for own groups; armor = empty slot or higher def"""
    changed = 0
    for _round in range(6):
        lv = LVL()
        acted = False
        for hero in ['h1', 'h3', 'h2']:
            click_xy(f'.hs-card[data-uid={hero}]', wait=0.3); tick(0.5)
            tips = bag_tips()
            for i, t in enumerate(tips):
                parts = t.split('VS')
                me, cur = parse(parts[0]), (parse(parts[1]) if len(parts) > 1 else None)
                if not me or me['lv'] > lv[hero]: continue
                good = False
                if 'dps' in me:
                    if me['typ'] not in GROUPS[hero]: continue
                    good = cur is None or ('dps' in cur and me['dps'] > cur['dps'] * 1.05)
                elif me['typ'] in ARMOR:
                    if '착용 중 없음' in parts[0]: good = True
                    elif cur and 'def' in me and 'def' in cur: good = me['def'] > cur['def']
                    elif cur and 'def' not in me and me['typ'] in ('목걸이','반지'): good = False
                if good:
                    before = dict({h['uid']: h['equipped'] for h in save()['heroes']}[hero])
                    click_xy('.store-bag .inv-cell.filled', i, wait=0.3)
                    after = dict({h['uid']: h['equipped'] for h in save()['heroes']}[hero])
                    if before != after:
                        ev('equip', f"{hero} {me['typ']} Lv{me['lv']} " + (f"dps {me.get('dps',0):.1f} vs {cur.get('dps',0) if cur else 0:.1f}" if 'dps' in me else f"def {me.get('def')} vs {cur.get('def') if cur else '-'}"))
                        changed += 1; acted = True
                    tick(3)
                    break
            if acted: break
        if not acted: break
    return changed
PLAN = {'h1': ['cls_warrior_t1_hp', 'cls_warrior_t1_atk', 'sin_wrath_t1_atkspeed', 'cls_warrior_t1_resall'],
        'h2': ['sin_gluttony_t1_hp', 'cls_mage_t1_atk', 'cls_mage_t1_castspeed', 'sin_gluttony_t1_resall'],
        'h3': ['cls_archer_t1_atkspeed', 'cls_archer_t1_critchance', 'sin_sloth_t1_hp', 'cls_archer_t1_hitbonus']}
def person_mastery():
    spent = 0
    for hero in ['h1', 'h2', 'h3']:
        h = [x for x in save()['heroes'] if x['uid'] == hero][0]
        if not h.get('masteryPoints'): continue
        click_xy(f'.hs-card[data-uid={hero}]', wait=0.3); tick(0.5)
        click_xy('.go-tree', wait=0.4); tick(2)
        for nd in PLAN[hero]:
            for _ in range(6):
                h = [x for x in save()['heroes'] if x['uid'] == hero][0]
                if not h.get('masteryPoints'): break
                if (h['mastery'].get(nd, 0)) >= 5: break
                loc = page.locator(f'#modal [data-node={nd}]')
                if not loc.count(): break
                b = h['masteryPoints']
                press(f'#modal [data-node={nd}]'); tick(1)
                if [x for x in save()['heroes'] if x['uid'] == hero][0].get('masteryPoints') == b:
                    print('mastery refused', hero, nd, page.locator('.toast').all_inner_texts()); break
                spent += 1
        page.keyboard.press('Escape'); tick(1)
    if spent: ev('mastery', f'spent {spent}')
    return spent
BUILD_PRIO = ['제련소', '도서관', '탐험', '선술집']
def person_build(gold_reserve=0):
    built = []
    click_xy('[data-tab=research]', wait=0.4); tick(2)
    lots = [x.strip() for x in page.locator('.cn-lot').all_inner_texts()]
    cls = page.locator('.cn-lot').evaluate_all('ns=>ns.map(n=>n.className)')
    for name in BUILD_PRIO:
        if name in lots and 'ready' in cls[lots.index(name)]:
            click_xy('.cn-lot', lots.index(name), wait=0.3); tick(4)
            g = save()['resources']['gold']
            click_xy('.cn-go', wait=0.4)
            t = page.locator('.toast').all_inner_texts()
            if save()['resources']['gold'] < g:
                built.append(name); ev('built', name)
            print('build', name, t)
            cls = page.locator('.cn-lot').evaluate_all('ns=>ns.map(n=>n.className)')
    return built
def back_to_watch():
    click_xy('[data-tab=expedition]', wait=0.4)
    if page.locator('.seg-live').count() and not page.locator('.b-speed').count():
        click_xy('.seg-live', wait=0.4)
def person_check(build=True):
    click_xy('[data-tab=character]', wait=0.4); tick(3)
    e = person_equip()
    m = person_mastery()
    b = person_build() if build else []
    back_to_watch()
    return e, m, b
