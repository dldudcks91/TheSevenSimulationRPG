def streak():
    s = 0
    for r in reversed(RUNS):
        if r['won']: break
        s += 1
    return s
def play_until(minute, chunk=180, shop_every=10):
    global LAST_SHOP
    while user_s()/60 < minute - 0.01:
        watch(min(chunk, minute*60 - user_s()), 10)
        if user_s()/60 >= minute - 0.01: break
        e, m, b = person_check()
        print(f"{user_s()/60:.1f}m Lv{list(PREV['levels'].values())[:3]} cleared {PREV['cleared'][-1] if PREV['cleared'] else None} gold {PREV['gold']} runs {len(RUNS)} streak {streak()} eq{e} m{m} b{b} todo {TODO_LOG[-1][1]}")
