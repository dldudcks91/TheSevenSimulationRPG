play_until2(40)
print(runs_summary(), flush=True); print(brief(), flush=True); print(save().get('buildings'), flush=True)
context.storage_state(path=str(OUT / 'B2_state_40min.json'))
