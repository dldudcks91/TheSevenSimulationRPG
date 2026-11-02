"""버서크 자동 발동 회차 설정 — python mk_auto.py · cfg_auto1.json(결투) · cfg_auto3.json(HP×3)"""
import json

KIT = ["war_bash", "war_doubleswing"]


def berserk(name, sec, first=None, cool=20, dmg=1, burn=0.03, kit=KIT, free=False):
    add_st = [{"like": "war_berserk", "status_id": "war_berserk_burn", "stat": "hp_burn", "value": burn}]
    add_ef = [{"like": "war_berserk#1", "seq": 2, "status": "war_berserk_burn"}]
    if free:
        add_st.append({"like": "war_berserk", "status_id": "war_berserk_free", "stat": "free_turn", "value": 0})
        add_ef.append({"like": "war_berserk#1", "seq": 3, "status": "war_berserk_free"})
    v = {
        "name": name,
        "skill": "war_berserk",
        "ov": {"status": {"war_berserk": {"stat": "skill_pct", "value": dmg, "duration_sec": sec}}, "addStatus": add_st, "addEffect": add_ef},
    }
    if kit:
        v["kit"] = kit
    if first is not None:
        v["auto"] = {"id": "war_berserk", "first": first, "cool": cool}
    return v


def rag(kit=KIT):
    v = {
        "name": "라그나로크 15초",
        "skill": "war_ragnarok",
        "ov": {
            "status": {"war_ragnarok": {"value": 1.5, "duration_sec": 15}},
            "addStatus": [
                {"like": "war_ragnarok", "status_id": "war_ragnarok_spd", "stat": "period_pct", "value": 1.5},
                {"like": "war_ragnarok", "status_id": "war_ragnarok_tf", "stat": "transform", "value": 0},
            ],
            "addEffect": [
                {"like": "war_ragnarok#1", "seq": 2, "status": "war_ragnarok_spd"},
                {"like": "war_ragnarok#1", "seq": 3, "status": "war_ragnarok_tf"},
            ],
        },
        "kit": kit,
    }
    return v


VARS = [
    berserk("차례안먹음 8초 맨앞", 8, free=True),
    berserk("자동 시작 8초 쿨20", 8, first=0),
    berserk("자동 시작 12초 쿨20", 12, first=0),
    berserk("자동 시작 15초 쿨20", 15, first=0),
    berserk("자동 시작 15초 쿨25", 15, first=0, cool=25),
    berserk("자동 3초뒤 12초 쿨20", 12, first=3),
    berserk("자동 5초뒤 15초 쿨20", 15, first=5),
    berserk("자동 20초뒤 12초 쿨20", 12, first=20),
    berserk("자동 시작 12초 굴린칸", 12, first=0, kit=None),
    berserk("자동 시작 15초 굴린칸", 15, first=0, kit=None),
    rag(),
    {"name": "동귀 6배 HP30", "skill": "war_mutualruin", "kit": KIT, "ov": {"effect": {"war_mutualruin#1": {"mult_pct": 6, "level_step": 0.6}}, "skill": {"war_mutualruin": {"hp_cost_pct": 0.3}}}},
    {"name": "휠윈드 0.6", "skill": "war_whirlwind", "kit": KIT, "ov": {"effect": {"war_whirlwind#1": {"mult_pct": 0.6, "level_step": 0.06}}}},
]
for hpx, path in ((1, "cfg_auto1.json"), (3, "cfg_auto3.json")):
    cfg = {"n": 200, "hpx": hpx, "arrange": "kFront", "tierIds": ["platinum", "diamond", "champion"], "variants": VARS}
    with open(path, "w", encoding="utf-8") as f:
        json.dump(cfg, f, ensure_ascii=False)
