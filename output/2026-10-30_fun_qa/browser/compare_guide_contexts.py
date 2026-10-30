"""Separate live checkpoint guide eligibility from normal Load's intentional run stop."""
import json
from fun_browser import Session,RUN,boot,write

def main():
    cases=[('basic1_60m','basic',1,3600),('adaptive2_60m','adaptive',2,3600),('basic3_day','basic',3,86400),('adaptive4_day','adaptive',4,86400),('passive1_day','passive',1,86400)]
    data=[{'label':label,'save':json.loads((RUN/f'simulation/checkpoints/state_{pol}_seed{seed}_{sec}.json').read_text(encoding='utf-8'))} for label,pol,seed,sec in cases]
    s=Session();c,page=s.context()
    try:
        boot(page,s.base)
        results=page.evaluate('''cases=>cases.map(x=>{const state=__fun.SYS.game.deserialize(x.save);return {label:x.label,runs:state.runs,liveGuide:__fun.SYS.game.notificationState(state,x.save.savedAt).guide};})''',data)
        write('guide_contexts.json',results);print(json.dumps(results,ensure_ascii=True),flush=True)
    finally:c.close();s.close()

if __name__=='__main__':main()
