def bag_tips():
    n = page.locator('.store-bag .inv-cell.filled').count()
    return [tip('.store-bag .inv-cell.filled', i) for i in range(n)]
BUILD_PRIO = ['상단', '제련소', '선술집', '도서관', '탐험']
def mastery_plan(hero):
    nodes = page.locator('#modal [data-node]').evaluate_all("ns=>ns.map(n=>n.dataset.node)")
    want = PLAN.get(hero, [])
    t1 = [n for n in nodes if '_t1_' in n]
    return [n for n in want if n in nodes] + [n for n in t1 if n not in want]
def person_mastery():
    spent = 0
    for hero in ['h1', 'h2', 'h3']:
        h = [x for x in save()['heroes'] if x['uid'] == hero][0]
        if not h.get('masteryPoints'): continue
        click_xy(f'.hs-card[data-uid={hero}]', wait=0.3); tick(0.5)
        click_xy('.go-tree', wait=0.4); tick(4)
        for nd in mastery_plan(hero):
            for _ in range(6):
                h = [x for x in save()['heroes'] if x['uid'] == hero][0]
                if not h.get('masteryPoints'): break
                if (h['mastery'].get(nd, 0)) >= 5: break
                b = h['masteryPoints']
                press(f'#modal [data-node={nd}]'); tick(1)
                if [x for x in save()['heroes'] if x['uid'] == hero][0].get('masteryPoints') == b:
                    print('mastery refused', hero, nd, page.locator('.toast').all_inner_texts()); break
                spent += 1
        page.keyboard.press('Escape'); tick(1)
    if spent: ev('mastery', f'spent {spent}')
    return spent
