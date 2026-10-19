def delta(before,after,key):
    b=before.get(key,{})
    a=after.get(key,{})
    return {k:a.get(k,0)-b.get(k,0) for k in sorted(set(a)|set(b))}

ten=next(x['save'] for x in log if x['label']=='current_10min')
claimed=next(x['save'] for x in log if x['label']=='day1_b_claimed_exploration')
summary={
    'game':'TheSevenSimulationRPG',
    'date':'2026-10-18',
    'basis':'current_snapshot: frozen working-copy code/data; no gameplay dev presets or granted rewards',
    'method':{
        'party':['warrior','mage','archer'],
        'rerolls':0,
        'battle_speed':1,
        'clock':'Playwright clock installed BEFORE navigation; run_for drives all timers',
        'sample_size':1,
        'day1':'First hour online, then offline until 24h from first menu',
        'player_actions':'UI clicks; equipment comparisons, formation, mastery, construction, shopping, salvage, crafting and one upgrade',
        'discarded':'Earlier post-boot-clock measurements and committed-version trial are excluded',
    },
    'ten_minutes':{
        'party_levels':[h['level']for h in ten['heroes'][:3]],
        'cleared':ten['progress']['cleared'],
        'gold':ten['resources']['gold'],
    },
    'one_hour':{
        'party_levels':[h['level']for h in hour_save['heroes'][:3]],
        'cleared':hour_save['progress']['cleared'],
        'books':hour_save['books'],
        'book_count':sum(hour_save['books'].values()),
        'buildings':hour_save['buildings'],
        'gold':hour_save['resources']['gold'],
        'completed_losses':sum(r['reason']=='wipe' for r in hour_save['reports']),
    },
    'day1_plain':{
        'resource_delta':delta(hour_save,plain_save,'resources'),
        'material_delta':delta(hour_save,plain_save,'materials'),
        'party_levels':[h['level']for h in plain_save['heroes'][:3]],
        'first_screen_shows_material_gains':False,
    },
    'day1_prepared':{
        'preparation':'One search by spare worker, build exploration, manually withdraw, send Party I to cave',
        'resource_delta':delta(prepared_save,prepared_return,'resources'),
        'material_delta':delta(prepared_save,prepared_return,'materials'),
        'exploration_gear_claimed':len(claimed['bags'][0])-len(prepared_return['bags'][0]),
        'search_results_waiting':1,
        'first_screen':'Stage list with menu dots; no earnings or completion summary',
    },
    'validation':{
        'runtime_errors':errors,
        'http_failures':failed,
        'current_test_title':test_result['title'],
        'test_failures':['Boss attribute ratio assertion','Golden starting-party mismatch','Golden 60-run mismatch'],
        'working_app_change_after_freeze':'Only a developer URL cxlv fixture hook; diff saved separately',
    },
    'events':[{'event':x['label'],'user_seconds':x['user_seconds']}for x in log],
}
(OUT/'results.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({k:summary[k]for k in ['ten_minutes','one_hour','day1_plain','day1_prepared','validation']},ensure_ascii=False),flush=True)
