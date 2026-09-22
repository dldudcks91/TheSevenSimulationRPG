# 도타 2 — 전 영웅 스킬

> ⚠ 참고작의 데이터다 — 본작 CSV 로 옮기지 않는다. 스킬 설계 때 모양을 찾아보는 용도
> 출처: Valve 공식 데이터 피드 `dota2.com/datafeed/herodata` (koreana · english) · 받은 날 2026-09-22

| 파일 | 내용 |
|---|---|
| [hero_skills.csv](hero_skills.csv) | 영웅 127 · 스킬 734 행 (일반 · 고유 능력 · 셉터/샤드가 주는 스킬) |

**컬럼** — `hero_id` · `hero_kr` · `hero_en` · `attr`(주 능력치 — str · agi · int · all) · `ability_id` · `skill_kr` · `skill_en` · `kind`(ability · innate · scepter · shard) · `cooldown`(레벨별 `/`) · `desc_kr` · `scepter_kr`(아가님 셉터 강화) · `shard_kr`(아가님 샤드 강화)

- 설명의 `%값%` 자리는 피드의 특수값으로 채웠다(레벨별 `/`). **23 행**은 특성(facet) · 탤런트에만 있는 값이라 `%이름%` 그대로 남았다
- 특성(facet) · 탤런트 트리는 담지 않았다

---

*마지막 업데이트: 2026-09-22*
