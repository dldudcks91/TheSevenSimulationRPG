# 리그 오브 레전드 — 전 챔피언 스킬

> ⚠ 참고작의 데이터다 — 본작 CSV 로 옮기지 않는다. 스킬 설계 때 모양을 찾아보는 용도
> 출처: Riot **Data Dragon** `championFull.json` (ko_KR · en_US) · 패치 **16.18.1** · 받은 날 2026-09-22

| 파일 | 내용 |
|---|---|
| [champion_skills.csv](champion_skills.csv) | 챔피언 173 × (패시브 + Q · W · E · R) = 865 행 |

**컬럼** — `champion_id` · `champion_kr` · `champion_en` · `title_kr` · `tags`(Riot 역할 태그 — Tank · Fighter · Support …) · `slot`(P · Q · W · E · R) · `skill_kr` · `skill_en` · `cooldown`(레벨별 `/`) · `desc_kr`

- `desc_kr` 는 Data Dragon 의 **요약 설명**이다 — 수치가 들어간 툴팁(`tooltip`)이 아니다. 계수 · 수치는 게임 안 툴팁이나 LoL 위키에서 본다
- 탱커만 보려면 `tags` 에 `Tank` 가 든 행을 거른다

---

*마지막 업데이트: 2026-09-22*
