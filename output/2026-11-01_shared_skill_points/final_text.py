from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
p=ROOT/'src/ui/i18n.js';s=p.read_text(encoding='utf-8')
s=s.replace('마스터리 포인트','스킬 포인트').replace('mastery points','skill points').replace('Mastery points','Skill points')
s=s.replace("'sk.reset': { ko: '초기화', en: 'Reset' }", "'sk.reset': { ko: '마스터리 초기화', en: 'Reset Mastery' }")
s=s.replace('[초기화]도 무료로 모두 환급하므로', '[마스터리 초기화]도 마스터리에 투자한 포인트를 무료로 환급하므로')
s=s.replace('[Reset] also refunds everything for free', '[Reset Mastery] also refunds mastery investments for free')
p.write_text(s,encoding='utf-8',newline='')

# These are historical records of decisions; the current rule is explicit at the top.
p=ROOT/'docs/game_design/DECISION_LOG.md';s=p.read_text(encoding='utf-8')
s=s.replace('[현재 설계](../game_design/skill_design.md#4-전직--직업마다-3갈래)', '[현재 설계](skill_design.md#4-전직--직업마다-3갈래)')
p.write_text(s,encoding='utf-8',newline='')
print('Updated shared-point notification/help wording and reset scope.')
