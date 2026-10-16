# ADR-0644 — 워드마크 글꼴은 Cinzel 이다 · 픽셀 글꼴을 걷는다

| | |
|---|---|
| **상태** | 확정 · 2026-10-16 |
| **화면** | [SCREEN_DESIGN §2 「브랜드」 · §3 「메뉴」](../SCREEN_DESIGN.md) |
| **정한 사람** | 사용자 지시 (「처음에 나오는 TheSeven 이 글씨체 이제 쓰지마 · 왼쪽 위에 나오는 것도 바꿔 다시 다른 글씨체로」 2026-10-16) · 글꼴은 제안 — 후보 여섯을 보인 뒤 사용자가 다른 번호를 고르지 않았다 |
| **대체** | — |
| **대체됨** | — |

## 결정

브랜드 칸 · 메뉴 워드마크의 글꼴(`--font-display`)을 **Cinzel**(Google Fonts · 로마 대문자 세리프)로 바꾼다 — 브랜드 700 · 메뉴 900, 둘 다 자간을 벌린다. 픽셀 글꼴 Galmuri 의 CDN 링크를 걷고, 픽셀 글꼴용이던 안티에일리어싱 끔도 걷는다. 브랜드 칸에서 「THE」 「SEVEN」 이 붙어 보이던 것(flex 칸이 끝 공백을 접었다)을 낱말 사이 간격으로 띄운다.

## 맥락

2026-08-27 하이브리드 폰트 도입 이래 본문은 Pretendard, 브랜드 워드마크만 픽셀 글꼴 Galmuri 였다. 같은 날 메뉴([ADR-0641](0641-켜면-메뉴가-선다-새-게임-위-불러오기-아래-저장-칸은-하나다.md))가 그 워드마크를 크게 들자 사용자가 그 글꼴을 쓰지 말라고 지시했다.

## 근거

- 후보 여섯(Cinzel · Cinzel Decorative · Pirata One · UnifrakturMaguntia · IM Fell English SC · Metamorphous)을 메뉴 크기와 브랜드 크기로 나란히 찍어 보였다. Cinzel 은 브랜드 칸 크기에서도 읽히고 위엄이 선다 — 흑체(UnifrakturMaguntia · Pirata One)는 작게 쓰면 안 읽힌다
- **그림 로고 안**(Gemini 발주)은 사용자가 꺼냈고 이번엔 글꼴로 갔다 — 그림이 서면 이 결정을 대체한다

## 파급

- `index.html` 글꼴 링크 · `style.css` `--font-display` · `.brand` · `.mn-logo`
- [ARCHITECTURE.md](../ARCHITECTURE.md) 외부 의존 표 · [DEV_PLAN.md](../DEV_PLAN.md) 부채 #11 · ui 스킬 `ui_conventions.md` 의 토큰 줄
- 외부 의존 수는 그대로 둘이다(Google Fonts · Pretendard CDN)

---
*이 파일은 고치지 않는다. 결정이 뒤집히면 새 ADR 이 이것을 대체하고, 여기엔 「대체됨」 한 줄만 붙는다.*
