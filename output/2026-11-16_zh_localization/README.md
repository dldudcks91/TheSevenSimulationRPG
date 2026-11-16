# 간체 중국어(zh) — 이어서 할 일 (2026-11-16 중단 지점)

방향 · 결정: [docs/client/LOCALIZATION_ZH.md](../../docs/client/LOCALIZATION_ZH.md)(D1 ~ D10 확정) · 용어집: [LOCALIZATION_ZH_GLOSSARY.md](../../docs/client/LOCALIZATION_ZH_GLOSSARY.md) · DEV_PLAN **R520**(작업 중).
⚠ **아무것도 커밋하지 않았다.** 다른 컴퓨터에서 이으려면 먼저 커밋 · 푸시가 필요하다(이 폴더 포함).

## 끝난 것

| 갈래 | 상태 |
|---|---|
| 문서 | LOCALIZATION_ZH · 용어집 · INTERFACE(§8-19 · §2-10 · §2-4 `fillZh` · §2-5 `fillZh` · §4) · SCREEN_DESIGN §2 + ADR-1220 + CHANGELOG · `src/ui/README.md` · `src/data/README.md` · CLAUDE.md 규칙 6 · DEV_PLAN R520 · 근거 노트 `docs/reference/zh_localization/` |
| 코드 배관 | `i18n.js`(LANGS 셋 · `zh` 빠지면 영어 · `zh-CN` · `?lang=` 정규화 · `nextLang` · `dictEntries`) · 언어 버튼 순환(`app.js`) · `{ko,en}` 를 만드는 74곳에 `zh` · `naming.js` 간체 규칙 · `mock.js` 옵션 줄 어순 · 고블린 이름 · `hero.fillZh` · `item.fillZh` · `deserialize` 이름 채우기 · `data.js` 이야기 · 스테이지 이름 |
| 화면 | `style.css` `:root:lang(zh)` — 번들 글꼴 · 한국어 글꼴 빼기 · `keep-all` 끄기 · 작은 글씨 두 단 |
| 글꼴 | `scripts/build_zh_font.py` → `src/assets/fonts/NotoSansSC-zh.woff2`(약 1MB) + `OFL.txt` · 배포(`scripts/build_deploy.py`)에 글꼴 폴더 추가 · 원본 글꼴은 `_scratch/fonts_src/`(저장소 밖) |
| 도구 | `scripts/zh_missing.py`(빠진 목록 · D5) |
| 테스트 | `dev/test.js` — 간체 단정 하나 · 스킬 문장 렌더 3곳에 zh · 영웅 이름 저장 모양에 zh 허용. **번역 전 상태로 FAIL 2**(골든 두 건 — 다른 세션의 CSV 변경 「입력 변화」 · 이번 작업과 무관으로 판단) |
| 번역 | 여덟 덩어리 중 **일곱 끝** · 검사기 ERR 0 — `chunks/*.out.json`. **저장소에는 아직 안 붙였다** |

| 덩어리 | 건수 | 상태 |
|---|---|---|
| g1a_names_gear (장비 · 전투 이름 + mock 쌍) | 684 | 끝 |
| g1b_names_world (몬스터 · 장소 · 영웅 · 스킬 · 전직 이름) | 661 | 끝 |
| t1_ui_a · t2_ui_b (화면 문구) | 894 · 894 | 끝 |
| t3_help_a · t4_help_b (도움말) | 131 · 120 | 끝 |
| t5_story (이야기) | 372 | 끝 |
| **t6_skilldesc (스킬 · 전직 설명 등)** | 408 | **안 함** — 중간에 멈춤(쓴 것 0) |

## 이어서 할 일 — 순서대로

작업 폴더 = 이 폴더. 명령은 이 폴더에서 · Windows 는 `PYTHONIOENCODING=utf-8` 을 앞에.

1. **t6 번역** — 서브에이전트에게 `BRIEF.md` 를 읽히고 덩어리 `t6_skilldesc` 를 맡긴다. 추가 지시(이전 프롬프트 요지): `chunks/g1b_names_world.notes.md`(스킬 이름 101 · 상태 낱말) · `g1a_names_gear.notes.md` 를 읽고 같은 이름을 쓴다 · 스킬 설명의 `{n}{d}{h}{k}{s}{v}{v2}{m}{f}{t}{i}{c}{x}{p}{r}` 자리는 그대로 — 무엇으로 바뀌는지는 `src/ui/tip.js` 의 `descSlots` · `amountPhrase` · `UNIT` 과 i18n `sk.*` · `time.*` 를 읽는다(「{n}초마다 … {d}를 입힙니다」 → 「每{n}秒……造成{d}」) · 조건어 정확히 · `sk.amt.heal` = `{v}点` 이라 설명 쪽에 「点」을 또 붙이지 않는다 · 피해 종류 「고정」은 **真实伤害**. 끝나면 `python merge_parts.py t6_skilldesc` → `python check_out.py chunks/t6_skilldesc.in.json chunks/t6_skilldesc.out.json` ERR 0.
   - ⚠ `BRIEF.md` 의 저장소 경로가 이 컴퓨터 경로로 박혀 있다 — 다른 컴퓨터면 고쳐서 넘긴다.
2. **통일** — 서브에이전트에게 `UNIFY.md` 를 맡긴다(용어집 §2-1 통일안 적용 · 「Party」 그대로 · 문장 속 이름 = 이름 덩어리 · 도움말의 [버튼] 인용 = 실제 버튼 번역 · 일관성 보고의 진짜 어긋남). 결과 `chunks/UNIFY_LOG.md`.
3. **붙이기 전 골든 지문** — 세션 서버 `python serve.py <포트>`(8777 금지 · 이미 물린 포트 금지) → `python run_tests.py <포트> 25 golden_before.json`.
4. **붙이기** — `python apply_zh.py` (전 덩어리 · `--dry` 로 먼저 개수 확인) → `git diff --stat` 로 `src/ui/i18n.js` · `src/ui/mock.js` · CSV 41개만 바뀌었나 본다. 병렬 세션이 같은 파일을 고치는 중이면 붙이기 직전에 mtime 확인.
5. **글꼴 다시 짓기** — `python scripts/build_zh_font.py`(쓰는 한자가 늘었다). 원본이 없으면 curl 로 `_scratch/fonts_src/` 에 받는다(파이썬 다운로드는 인증서 오류가 났다):
   `curl -sSL -o "_scratch/fonts_src/NotoSansSC[wght].ttf" "https://github.com/google/fonts/raw/main/ofl/notosanssc/NotoSansSC%5Bwght%5D.ttf"` · 같은 폴더의 `OFL.txt` 도.
6. **테스트** — `python run_tests.py <포트> 25 golden_after.json` → 간체 단정 통과 · 골든은 `golden_before` 와 런 지문이 같아야 한다(CSV 해시 설명 줄만 달라야 정상). 헤드리스 `--dump-dom` 은 이번에 0바이트로 멈췄다 — Playwright(`run_tests.py`)를 쓴다.
7. **화면 확인** — `python shots.py <포트> shots` → `shots/report_zh.json` 의 화면별 `hangul`(0 이어야 — 언어 버튼 「한국어」 2자는 정상) · `clipped`(잘린 칸) · `errors` · 스크린샷 18장을 눈으로. 넘치면 `style.css` `:root:lang(zh)` 의 글씨 크기 두 단부터 본다.
8. **검토** — 독립 서브에이전트: 규칙 · 수치 문장(스킬 설명 · 툴팁 · 도움말 규칙) 표본 150개를 한국어로 되돌려 원문과 뜻 대조 → 고친다(`apply_zh.py` 는 이미 붙은 칸을 안 덮으니 고칠 땐 저장소 파일을 직접 고치거나 그 칸을 비우고 다시 붙인다).
9. **마무리** — `python scripts/zh_missing.py` → 0 · DEV_PLAN R520 상태 · LOCALIZATION_ZH 머리 상태 줄 · 보고.

## 사용자에게 물을 것 · 알릴 것

| 것 | 내용 |
|---|---|
| 제목 명조 글꼴 | D6 안의 「본문 고딕 + 제목 명조」 중 **명조는 안 넣었다** — 제목 글꼴(Cinzel)을 쓰는 자리가 로고 대체 글 · 숫자 칩 · 특가 태그 정도라 약 0.7MB 값이 안 났다. 본문 고딕 하나(약 1MB) |
| 배포 스크립트 | 글꼴이 배포판에 실리게 `scripts/build_deploy.py` 에 글꼴 폴더 두 줄을 더했다(D6 를 위해) |
| 한국어 원문 문제 | 도움말이 「공격력」을 쓴다(「공격력은 없다 — 데미지」 규칙 위반 · 번역은 원문대로 攻击力) · `log.say.rise` 의 ko 가 `{d}{d|을/를}` — 대상 이름이 두 번 나온다 |
| 번역 판단 몇 개 | `Reinforced Mace` 공식명 加固锤 가 대장간 「덧대기」 加固 와 글자가 겹친다 · 시기 1단 단어 眼红(구어) · 「Party」를 그대로 둔다(ADR-0910) · 6 · 7장 이야기도 데이터에 있어 옮겼다 |
| CLAUDE.md 크기 | 이미 10KB 상한 위(12KB)였고 한 줄 늘었다 — 신호만 알린다 |
| 원어민 검수 | Steam 언어 표에 简体中文을 체크하기 전 권장(LOCALIZATION_ZH §6) |

## 이 폴더

| 파일 | 하는 일 |
|---|---|
| `BRIEF.md` · `UNIFY.md` | 번역 · 통일 서브에이전트 지침 |
| `chunks/<덩어리>.in.json` · `.out.json` · `.notes.md` | 원문 · 번역(`{key: 간체}`) · 이름 결정 노트 |
| `check_out.py` · `merge_parts.py` | 덩어리 검사기 · 파트 합치기 |
| `consistency.py` | 덩어리 사이 일관성(이름 · 용어집) |
| `apply_zh.py` | 번역을 저장소에 붙인다(사전 · CSV `_zh` 열 · mock) — 이미 있는 zh 는 안 덮는다 · `--dry` · `--repo=` |
| `extract_*.{py,mjs}` · `make_chunks.py` · `src/*.json` | 원문 뽑기 · 덩어리 나누기(다시 뽑을 때만) |
| `run_tests.py` · `shots.py` | test.html(Playwright · 골든 지문 저장) · 간체 화면 스크린샷 |

---

*마지막 업데이트: 2026-11-16*
