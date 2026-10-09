# 챕터 1-2 인간 몬스터 — Gem 시트 (생김새 9종)

목표는 **생김새가 다양한 인간을 하나의 스타일로** 뽑는 것이다. Gem 「TheSevenSimulationART-몬스터(정예)」(`https://gemini.google.com/gem/70623b5f18b5`)를 `scripts/gemini_web.py run` 으로 돌렸고, 참조 그림은 Gem 에 들어 있는 것을 썼다(첨부 없음).

| 시트 | 프롬프트 | 결과 |
|---|---|---|
| `sheets/source_sheet_ch1_st2_human_gem_1.png` | 아래에서 `Eyes are solid black shapes.` 줄을 뺀 것 | 9명 생김새 그대로 · 1 · 2 · 5번 눈에 흰자와 홍채 · 8번 귀가 뾰족하다 |
| `sheets/source_sheet_ch1_st2_human_gem_eyes_1.png` | 아래 전문 | 9칸 모두 검은 덩어리 눈 · 8번 귀는 그대로 뾰족하다 |
| `sheets/source_sheet_ch1_st2_human_gem_plain_1.png` | `인간 보병, 인간 궁수, 인간 기사` 한 줄만 | 행마다 한 병종(보병 · 궁수 · 기사) · 녹 · 때 · 리벳 결이 짙다 · 손과 무기가 들어온다 · 얼굴이 모두 비슷한 중년 남자 |
| `sheets/source_sheet_ch1_st2_human_gem_plain_2.png` · `_3.png` | 같은 한 줄 | `plain_1` 과 같은 세트처럼 나온다(잔결 3.4) · `_3` 은 다섯 칸에 흰자 · 홍채가 있다 |
| `sheets/source_sheet_ch1_st2_human_portraitgem_plain_1.png` | 같은 한 줄 · **초상화 Gem**(`5f85cdf1b764` · 2×2 · 지식 = 영웅 warrior_1~3) | 무기 · 손은 빠졌지만 녹 · 때 · 수염 잔결은 그대로(잔결 2.7) |
| `sheets/source_sheet_ch1_st2_human_gem_plain_attach_1.png` | 같은 한 줄 · 몬스터(정예) Gem + **영웅 4장 첨부**(archer_1 · knight_4 · priest_1 · warrior_3) | 얼굴 · 피부 · 팔레트(채도 17) · 검은 눈 · 무기 없는 흉상이 영웅 쪽으로 왔다 · 갑옷의 녹 얼룩 · 사슬은 남는다(잔결 3.2) · 2번 궁수가 `archer_1` 과 거의 같다 |

| `sheets/source_sheet_ch1_st2_human_gem_attach_style_1.png` | 아래 전문에서 「Nine human …」 이하를 `인간 보병, 인간 궁수, 인간 기사` 한 줄로 바꾼 것 · 영웅 4장 첨부 | 얼굴 · 피부 · 검은 눈 · 큰 머리가 영웅과 같다 · 9명이 비슷한 투구 쓴 중년 남자 · 2번이 `archer_1` 복제 · `knight_4` 의 금테 · 녹 얼룩이 샌다 |

| `sheets/source_sheet_ch1_st2_human_gem_numbered_1.png` | `1. 인간 궁수` `2. 인간 보병` `3. 인간 기사` … 9줄만 · 영웅 4장 첨부 | 첫 시도에 19초 · 열마다 궁수 · 보병 · 기사로 번호를 지켰다 · 얼굴은 영웅 그림체 · 1번이 `archer_1`, 2번이 `knight_4` 복제 · `knight_4` 의 금테 · 녹 얼룩이 기사 칸에 샌다 |

**첨부 + 인물 묘사는 그림이 안 나온다** — 위 전문(9줄 묘사)에 영웅 4장을 붙이면 8번 모두 그림 없이 끝났다: 거절(「I'm having a hard time fulfilling your request」) · 글로 쓴 시트 사양 · 「something went wrong」. `dark-skinned` · `young` · `woman` 을 하나씩 빼도, 첨부를 2장으로 줄여도, 9줄 대신 「all nine differ in age, hair, beard and build」 한 줄로 바꿔도 같았다. 같은 9줄은 첨부 없이 두 번 다 됐고, 첨부는 한국어 한 줄 대상(`인간 보병, 인간 궁수, 인간 기사`)과는 두 번 다 됐다.

**Gem 지식 그림은 생성기에 안 가는 것으로 보인다** — 몬스터(정예) Gem 지식은 정예 `1103_elite` · `1301_elite` · 영웅 `warrior_3` 이고, 초상화 Gem 지식은 영웅 `warrior_1~3` 인데 한 줄 프롬프트로는 둘 다 녹 · 때 결이 나왔다. 영웅 초상을 **요청마다 첨부**하자 얼굴 · 팔레트가 영웅 쪽으로 왔다(Gem 메인 프롬프트도 「The user attaches our hero portraits with each request」다). 남는 질감은 「중세 병사」 소재가 끌고 오며, 기본형의 짧은 공통 지시가 그것을 누른다(`gem_eyes_1` 잔결 1.9).

```text
Match the attached portraits exactly — same proportions, same outline weight,
same flat shading, same dark palette, same bust framing and gaze.
Play every character straight and grim like the heroes, even monsters.

2048x2048 sheet, 3x3 grid, nine bust portraits, straight 16px pure black gridlines, solid pure
green #00FF00 background, no text anywhere. Nothing on the characters may be
bright or saturated green. Leave background margin above and beside each head;
the small body may be cropped by the bottom edge.
Eyes are solid black shapes.

Nine human enemy soldiers of the same grim medieval army. Every row is foot soldier, archer, knight;
every face, age and head shape is different.

1. Human foot soldier, a young recruit with messy red hair, bareheaded, in a quilted tunic
2. Human archer, a lean woman with a tight dark braid, a quiver over one shoulder
3. Human knight in a closed flat-topped great helm with a cross-shaped eye slit
4. Human foot soldier, an old bald veteran with a thick white walrus mustache
5. Human archer, a dark-skinned man in a leather skullcap, a quiver over one shoulder
6. Human knight in an open-faced helmet with a nose guard, long blond hair and a braided beard
7. Human foot soldier, a heavyset brute with a shaved head and a thick square black beard
8. Human archer, a gaunt hook-nosed man in a low wide-brimmed hat, a quiver over one shoulder
9. Human knight, a bareheaded grey-haired captain with a scar across the chin
```

**게임 초상은 교체하지 않았다.**

---
*마지막 업데이트: 2026-10-09*
