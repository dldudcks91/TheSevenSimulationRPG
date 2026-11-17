# 간체 중국어(zh) — 작업 폴더

방향 · 결정: [docs/client/LOCALIZATION_ZH.md](../../docs/client/LOCALIZATION_ZH.md)(D1 ~ D10 확정) · 용어집: [LOCALIZATION_ZH_GLOSSARY.md](../../docs/client/LOCALIZATION_ZH_GLOSSARY.md) · DEV_PLAN **R520**(✅ 1차 완료 2026-11-17).

## 지금 상태

| 갈래 | 상태 |
|---|---|
| 번역 | 여덟 덩어리(이름 둘 · 화면 문구 둘 · 도움말 둘 · 이야기 · 스킬 설명) 끝 · 통일(`chunks/UNIFY_LOG.md`) · 저장소에 붙임 — `scripts/zh_missing.py` 빠짐 **0** |
| 검토 | 역번역 표본 166 → 22칸 고침(`REVIEW.md` · `review_fixes.json`) · 화면 18장(`shots/` — 한글은 언어 버튼 「한국어」뿐 · 잘림은 한국어와 같은 자리 = 영웅 띠 상태 글자 말줄임) |
| 테스트 | 간체 단정 통과 · 골든 런 지문이 붙이기 전(`golden_before.json`)과 같다(`golden_after.json`) — 골든 FAIL 2 는 다른 세션의 CSV 「입력 변화」로 붙이기 전부터 있었다 |
| 글꼴 | `scripts/build_zh_font.py` 로 다시 지음(3,955자 · 약 1MB) — 원본은 `_scratch/fonts_src/`(저장소 밖 · 없으면 아래 curl) |
| 남은 것 | 출시 전 원어민 검수(LOCALIZATION_ZH §6) |

## 새 문구가 생겼을 때 (D5 — 몰아서 옮긴다)

1. `python scripts/zh_missing.py --list` — 빠진 사전 키 · CSV 칸 · mock 쌍.
2. 몇 개면 손으로 옮긴다(용어집 글자만 · BRIEF.md 형식). 많으면 `extract_*` → `make_chunks.py` 로 덩어리를 새로 만들어 서브에이전트에게 `BRIEF.md` 와 함께 맡기고 `check_out.py` ERR 0 → `apply_zh.py`.
3. **한국어가 바뀐 칸** — 사전은 키로만 붙어 zh 가 옛 문장으로 남는다. 고칠 땐 `{chunk key: 새 zh}` JSON 을 만들어 `python fix_zh.py <json>`(이미 있는 zh 를 바꾼다 · `--dry`).
4. 쓰는 한자가 늘었으면 `python scripts/build_zh_font.py`(GB2312 1급은 늘 들어 있어 대개 필요 없다). 원본이 없으면:
   `curl -sSL -o "_scratch/fonts_src/NotoSansSC[wght].ttf" "https://github.com/google/fonts/raw/main/ofl/notosanssc/NotoSansSC%5Bwght%5D.ttf"` · 같은 폴더의 `OFL.txt` 도.

명령은 이 폴더에서 · Windows 는 `PYTHONIOENCODING=utf-8` 을 앞에. 테스트 · 스크린샷은 세션 서버(`python serve.py <포트>` — 8777 금지)에 `python run_tests.py <포트> 25 [golden.json]` · `python shots.py <포트> shots [ko|zh]`.

## 사용자에게 알릴 것

| 것 | 내용 |
|---|---|
| 제목 명조 글꼴 | D6 「본문 고딕 + 제목 명조」 중 명조는 안 넣었다 — 제목 글꼴(Cinzel) 자리가 로고 대체 글 · 숫자 칩 · 특가 태그 정도라 약 0.7MB 값이 안 났다 |
| 한국어 원문 문제 | 도움말이 「공격력」을 쓴다(번역은 원문대로 攻击力) · `log.say.rise` ko 의 `{d}{d\|을/를}` · `cx.note` 가 「앞 단계는 그 몬스터에게만」이라 `cx.sub` · 도움말(「Lv1 · Lv2 는 같은 종족 전체」)과 어긋난다 · `war_shout` 「전열에 명령」(대상은 파티 전원) · `mag_frozenorb` 「{h} 동안」 · `tv.visit.dropped` · `ignored` 의 「을(를)」 |
| 렌더러 문제(세 언어) | 전직 노드 `unit=sec` 18행이 「1초초 · 1ss」(`app.js:advVal` 이 단위를 붙이는데 틀도 「{v}초」) · `{a}` 가 pct 행에서 arg ≤ 1 이면 %로 찍혀 「50%초 스턴」 · `arc_reload` 「라운드마다 {v}번」이 「100%번」 |
| 번역 판단 | `Reinforced Mace` 공식명 加固锤 가 대장간 「덧대기」 加固 와 겹친다 · 「만들기」 버튼과 「제작」 탭이 둘 다 制作 · 「Party」 · `Tier {n}` 은 라틴 그대로(ADR-0910 · 1082) · 6 · 7장 이야기도 데이터에 있어 옮겼다 · 종족 「자연」 = 自然 |

## 이 폴더

| 파일 | 하는 일 |
|---|---|
| `BRIEF.md` · `UNIFY.md` | 번역 · 통일 서브에이전트 지침 |
| `chunks/<덩어리>.in.json` · `.out.json` · `.notes.md` · `UNIFY_LOG.md` | 원문 · 번역(`{key: 간체}`) · 이름 결정 노트 · 통일 기록 |
| `check_out.py` · `merge_parts.py` · `consistency.py` | 덩어리 검사기 · 파트 합치기 · 덩어리 사이 일관성(⚠ 용어집 §2-1 의 「버린 것」 칸을 정답으로 읽어 거짓 경보가 난다) |
| `apply_zh.py` · `fix_zh.py` | 번역을 저장소에 붙인다(있는 zh 는 안 덮는다) · 이미 붙은 zh 를 고친다 |
| `extract_*.{py,mjs}` · `make_chunks.py` · `src/*.json` | 원문 뽑기 · 덩어리 나누기(다시 뽑을 때만 · `extract_ui.mjs` 는 node 필요) |
| `run_tests.py` · `shots.py` | test.html(Playwright · 골든 지문 저장) · 화면 스크린샷 |
| `REVIEW.md` · `review_fixes.json` | 역번역 검토 보고 · 고친 칸 |

---

*마지막 업데이트: 2026-11-17*
