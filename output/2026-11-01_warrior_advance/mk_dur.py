"""라그나로크 지속 회차 설정 — python mk_dur.py · cfg_dur1.json(결투) · cfg_dur3.json(HP×3)"""
import json


def rag(sec, dmg=1.5, spd=1.5):
    return {
        "name": f"라그 {int(dmg * 100)}/{int(spd * 100)} {sec}초",
        "skill": "war_ragnarok",
        "ov": {
            "status": {"war_ragnarok": {"value": dmg, "duration_sec": sec}},
            "addStatus": [
                {"like": "war_ragnarok", "status_id": "war_ragnarok_spd", "stat": "period_pct", "value": spd},
                {"like": "war_ragnarok", "status_id": "war_ragnarok_tf", "stat": "transform", "value": 0},
            ],
            "addEffect": [
                {"like": "war_ragnarok#1", "seq": 2, "status": "war_ragnarok_spd"},
                {"like": "war_ragnarok#1", "seq": 3, "status": "war_ragnarok_tf"},
            ],
        },
    }


OTHERS = [
    {"name": "동귀 6배 HP30", "skill": "war_mutualruin", "ov": {"effect": {"war_mutualruin#1": {"mult_pct": 6, "level_step": 0.6}}, "skill": {"war_mutualruin": {"hp_cost_pct": 0.3}}}},
    {"name": "휠윈드 0.6", "skill": "war_whirlwind", "ov": {"effect": {"war_whirlwind#1": {"mult_pct": 0.6, "level_step": 0.06}}}},
    {"name": "토르 5", "skill": "war_thorswrath", "ov": {"effect": {"war_thorswrath#1": {"mult_pct": 5}}, "skill": {"war_thorswrath": {"target": "enemy_hp_max"}}}},
    {"name": "쇼크 1.3", "skill": "war_shockwave", "ov": {"effect": {"war_shockwave#1": {"mult_pct": 1.3, "level_step": 0.13}}}},
]
VARS = [rag(10), rag(15), rag(20), rag(25), rag(15, 1.0, 1.0), rag(20, 1.0, 1.0)] + OTHERS
for hpx, path in ((1, "cfg_dur1.json"), (3, "cfg_dur3.json")):
    cfg = {"n": 200, "hpx": hpx, "arrange": "kFront", "tierIds": ["platinum", "diamond", "champion"], "variants": VARS}
    with open(path, "w", encoding="utf-8") as f:
        json.dump(cfg, f, ensure_ascii=False)
