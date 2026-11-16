# zh-CN(简体中文) 현지화 — 비교작 조사 노트

조사일 2026-11-16. 표기: **[사실]** = 출처에 적힌 것 · **[추론]** = 내 해석. 리뷰 인용은 Steam 중국어(简体) 리뷰 원문 일부 + 한국어 번역. 날짜에 연도가 없는 리뷰는 2026년 작성분(Steam 표기 관행).

수집 방법: Steam 커뮤니티 리뷰 카드(`homecontent`, filterLanguage=schinese, 정렬 toprated 1쪽 + trendyear 15쪽 + mostrecent 15쪽)를 게임별 100~310건 긁어 번역 관련 키워드(翻译 · 机翻 · 汉化 · 字体 · 中文 …)로 걸렀다. 표본은 「도움됨 많은 것 + 최근 것」이라 전수가 아니다. 원자료(리뷰 카드 JSON)는 저장소에 두지 않았다 · 언어표·중국어 리뷰 호감도는 각 게임 스토어 페이지(l=schinese)에서 읽었다.

---

## 0. 한 장 요약 (한국어)

1. **중국어가 없으면 중국 유저는 「중국어 내놔」 리뷰를 쓴다 — 추천을 누르면서도.** Lootun(영어만)·Last Epoch(EA기)·Halls of Torment(EA기)의 도움됨 상위 리뷰가 「我们需要中文 We need Chinese」류. 팬이 직접 汉化 파일을 만들어 리뷰에 링크를 박는다.
2. **처벌 1순위는 「기계번역 느낌 + 게임 규칙을 틀리게 전달」.** 문장 품질보다 **수치·발동 조건 오역**(Backpack Battles 「after 15s → 每15s」), **능력치 이름 혼동**(Halls of Torment 「力量/力度/区域/范围」), **같은 개념 다른 번역**(Last Epoch · No Rest for the Wicked parry/block), **문맥 없이 낱말만 옮긴 이름**(Hero Siege 무기명 「投」「短」, 스킬명 「凰飞行」「地」)이 플레이를 망친다는 이유로 깎인다. Hero Siege(도트 ARPG)는 자원봉사 번역 + 漏翻으로 중국어 리뷰 56%.
3. **반쯤 번역(漏翻)과 영어 잔존은 바로 지적된다** — 스킬 설명 영어 잔존(Torchlight III), 업적 미번역(Torchlight II), 「中文汉化不完全有外语」(Halls of Torment).
4. **이미 굳은 용어를 나중에 바꾸면 반발이 크다** — Stardew Valley 1.6.4 용어·폰트 교체 → 1.6.6 원복(2024). Silksong 수정판은 「기존 이름 대부분 유지, 틀린 것만 교체」를 명시.
5. **문체가 게임 톤과 어긋나도 처벌** — Silksong 「반 문언·반 현대어」(중국어 리뷰 38% 호감, 2025-09), Darkest Dungeon II 「天工开物之原」.
6. **폰트·글리프** — 한자 깨짐(TextMeshPro 폰트에 중국어 글리프 없음 → 네모), 「字体丑」, 폰트 크기 조절 불가가 리뷰 감점 사유로 등장. CJK 이름 입력 불가 버그(Grim Dawn)는 10년째 원성.
7. **언어 선택지 이름 정치성** — 「中文（台湾）」 표기(Vampire Survivors, 2026) · 「Taiwanese」 언어 옵션(EGG RAIDERS, 2024)이 부정 리뷰를 불렀다. 선택지는 「简体中文 / 繁體中文」로 적는 게 안전.
8. **칭찬 패턴** — 「自带汉化」(기본 내장) 자체가 리뷰 템플릿의 체크 항목. 출시 직후 빠른 추가(Slay the Spire EA 1개월, Halls of Torment 「居然更新了中文！你过关！」), 유저 번역 제안 반영(Soulstone Survivors), 평판 좋은 팬 번역의 공식 채택(Silksong Patch 4, StS 커뮤니티 주간 번역).
9. **Steam 측** — Valve: 「Steam은 유저의 1·2차 언어를 지원하는 게임을 더 추천한다 · 매칭은 최소 Interface 기준」. 스토어 페이지 현지화는 게임 현지화와 독립. 부분 번역 금지 규정은 문서에서 찾지 못함 — 대가는 리뷰·환불로 온다. 글로벌 Steam 판매에 中 판호 불필요(蒸汽平台/Steam China만 필요).
10. **아이템·스킬 이름** — 서구 ARPG 중국어판은 **의역(意译)이 기본, 고유명사만 음역(音译)**: Chaos Orb → 混沌石(Orb를 「石」로 갈아끼움), Snecko Eye → 异蛇之眼, Stone of Jordan → 乔丹之石. 룬(El 艾尔 · Eld 艾德)처럼 뜻 없는 고유어만 음역. 일반명사를 음역하면 조롱(Grim Dawn 「Bastard → 巴斯塔德」).

---

## 1. Dragon Cliff (龙崖, app 758190) — 중국 원작의 UI 용어

[사실] 개발 Meta Interaction, 2018-05-11 출시, 언어 = 简体/繁体/英语(界面+字幕, 음성 없음). 중국어 리뷰 5,679건 89% 호감(스토어 l=schinese, 2026-11-16 조회). — https://store.steampowered.com/app/758190/?l=schinese

출처: 중국어 공략 「龙崖基础指南」 https://steamcommunity.com/sharedfiles/filedetails/?id=1332278060 (플레이어 작성 — 게임 내 표기와 1:1 보장 없음) · 영어 공략 「Dragon Cliff: Guide, beginning to end」 https://steamcommunity.com/sharedfiles/filedetails/?id=1307809345 · 영어 토론 https://steamcommunity.com/app/758190/discussions/0/3014556944206833880

| 범주 | 중국어 (공략 표기) | 영어판 대응 (영어 공략·토론) | 메모 |
|---|---|---|---|
| 주 능력치 | 力量 · 智力 · 敏捷 | Strength(STR) · Intelligence · Agility | 표준 3종 |
| 체력 계열 | 生命/最高血量 · (护身符/套装에) 坚韧 · 活力 | Vitality(VIT) · Stamina(패시브) | 영어 Vitality ↔ 중국어 「活力」 대응은 [추론] |
| 공격 기준치 | **输出值** | **output** («Direct Damage is based on your level and output…» — 영어 토론 검색 요약) | 「출력/산출」을 그대로 쓴 중국식 게임 용어 · 다른 효과의 계산 기준 |
| 행동 순서 | 出手速度 · 进度 · 行动条 | turn progress | ATB식 |
| 치명 | 暴击 · 爆伤 | Crit Hit · Crit damage | 爆伤 = 暴击伤害 줄임 |
| 명중/회피 | 命中修正 · 魔法命中 · 闪躲修正/闪避修正 | Hit adjustment · dodge | 공략 안에서도 闪躲/闪避 혼용 |
| 상태이상 저항 | 韧性 | Resilience | |
| 효과 지속 | 效果精通 | — | 도발·기절·빙결·버프 지속 연장 |
| 저항 | 抗性 · 全抗性 · 魔法抗性 · 元素防御 | Physical / Fire / Divine resistance · Resist all · Damage Reduction · Damage Neutralization | 영어판이 더 세분된 이름 |
| 피해 분류 | 直接伤害 · 间接伤害 · 真实伤害 · 溅射 | Direct damage · DoT · real damage | |
| 자원 | 怒气 · 怒气效率 | Rage (Max Rage) · Rage Points | 전법(战法) 비용 |
| 스킬 | 普攻 · **战法** · 被动 · 天赋 | Tactic · Passive · Talent | 「战法」= 액티브 스킬 |
| **등급** | 普通 → 稀有 → 史诗 → 传奇 → 远古 → 星辰 (공략 안에서 传奇/传说 혼용 · 이 6단은 영웅 등급 문맥 · 장비엔 远古/星辰가 등장) | White … Purple · Orange(영웅) … Legendary · Ancient · Ancient Star(AS) | 최상위 「星辰」(Ancient Star) |
| 옵션 | 词条 · 特效 · 黄字/橙字(黄色/橙色 특효) | enchantments · effects | 词条 = affix 통칭 · 색으로 옵션 층을 부른다 |
| **장비 조작** | 打造(제작) · **合成**(3합1, 등급 상승) · **附魔**(옵션 추가) · **重铸**(옵션 하나 재굴림) · **分解**(재료화) · **特效转移**(특효를 卷轴으로 이동) · 打孔器/万能孔(소켓) · 镶嵌(宝石) | Fabricate/Craft · Combine · Enchant · Reforge · Decompose · Effect Transfer · Scroll · Gem | 스토어 영어 문구 = «Enchant, Reforge and Effect Transfer» |
| 마을 시설 | 酒馆(모집) · 武器店/防具店(제작) · 商店 · 学院(스킬 강화·卷轴 제작) · **炼炉**(합성·부여·재련·분해·특효이전 전부) · 码头(탐험선) · 居民 · 城镇活动 · 召集 | Inn · weapon/armor facilities · Furnaces(forges) · Boats | 장비 가공이 「炼炉」 한 곳에 몰림 |
| 재화 | 金币 · 训练点 · 希望之尘 · 魔晶粉 · 恶魔碎片 · 书籍残页 | Gold · Practice Points(PP) · Ash of Hope · Demon Shards | |
| 엔드게임 | 混沌异界(异界) · 混沌异界钥匙 · 探险 | Mystic Dimension(MD) · sailing voyages | 무한 층 |

[사실] 공략 원문(炼炉 설명): 「炼炉：合成（3合1，稀有度提升）、附魔（远古附加一条属性，星辰两条）、重铸（重铸一条打造提供的属性）、分解（可以获得恶魔碎片以及魔晶粉…）、特效转移（转移一条黄色或者橙色的特效到卷轴上）」 → *용광로: 합성(3합1·희귀도 상승) · 부여(远古는 속성 1줄, 星辰은 2줄 추가) · 재련(제작이 준 속성 1줄 재굴림) · 분해(악마 파편·마정분) · 특효 이전(노랑/주황 특효 1개를 두루마리로).* — https://steamcommunity.com/sharedfiles/filedetails/?id=1332278060
[사실] 교차 확인: 다른 중국어 공략 3편(id 3344732468 · 3553151135 · 3580881683)도 输出值 · 韧性 · 全抗性 · 效果精通 · 词条 · 附魔 · 远古 · 星辰 · 黄色词条를 같은 뜻으로 쓴다(본문 단어 집계). 예: 「增加全抗性和输出值」 — https://steamcommunity.com/sharedfiles/filedetails/?id=3344732468
[추론] 중국어 원작 방치형 RPG도 장비 조작은 **두 글자 동사 명사**(合成·附魔·重铸·分解) + **두 글자 능력치**로 짧게 맞춘다. 영어판은 일부를 길게 풀었다(Damage Neutralization 등). 한국어 원본에서 중국어로 옮길 때도 이 「2자 조어」 관습(重铸, 分解, 附魔)을 따르는 쪽이 중국 유저에게 익숙하다.
[사실] 중국 원작인데도 리뷰에 「好多错别字」(오탈자 많음)가 있다 — https://steamcommunity.com/profiles/76561199157326807/recommended/758190/

---

## 2. 서구 비교작 — 추가 시점 · 번역 주체 · 중국 유저 평

중국어 리뷰 호감도 = 스토어 「您语言的 N 篇用户评测中有 X% 为好评」(2026-11-16 조회, 번역 외 요인 포함).

| 게임 | zh 추가 시점 | 번역 주체 | 중국어 리뷰 (건수 · 호감) | 한 줄 평 |
|---|---|---|---|---|
| **Lootun** (1960270) | **없음** (영어만) | 팬 汉化 → 창작마당 배포 | 1,052 · 93% | 中 유저가 중국어 없이도 산다 · 「我们需要中文」 |
| Backpack Battles (2427700) | 현재 지원 (추가 시점 미확인 · 1.0 2025-06) | 공식 | 7,379 · 87% | 대체로 무탈 · 메커니즘 오역 1건 |
| Loop Hero (1282730) | 현재 지원 (출시 2021-03 · 추가 시점 미확인) | 공식 | 3,823 · 90% | 「中文翻译很雅信达」 칭찬 |
| Darkest Dungeon (262060) | 출시(2016-01) 후 추가 (시점 미확인) | 공식 | 33,283 · 91% | 「部分文本翻译错误，极度影响游戏理解」 |
| Darkest Dungeon II (1940340) | 출시(2023-05) 때 포함 | 공식 | 5,100 · 65% | 톤 불일치 지적(「天工开物之原」) · 저평은 게임성 탓이 큼 |
| Slay the Spire (646570) | **EA(2017-11) 시작 ~1개월 뒤 (2017-12-15 예고, 리뷰 전언)** | 처음 업체 → 이후 커뮤니티가 매주 번역 | 76,679 · 97% | 최다 도움 리뷰가 팬 카드명 대조표(721) |
| Vampire Survivors (1794680) | EA 중 2022-01 테스트 브랜치 → 정식 | 공식(초기 기계번역 흔적) | 26,090 · 97% | 「大大优化与之前的机翻」 · 2026 「中文（台湾）」 표기로 비추천 |
| Halls of Torment (2218750) | EA 중 2024-06 | 공식 | 1,381 · 84% | 추가는 환영 · 능력치 용어 혼동 · 미번역 · 폰트 |
| Soulstone Survivors (2066020) | (리뷰상 이미 내장) | 공식 + 유저 제안 반영 | 3,495 · 81% | 「给制作组提了汉化建议竟然真的采纳了」 |
| **Last Epoch** (899770) | **1.0 (2024-02)** — EA 5년간 없음 | 공식(업체) · 그전엔 팬 汉化(踩蘑菇汉化组) | 13,381 · 54% | 공식판 품질 논란 · 커뮤니티판 채택 거부 |
| Hero Siege (269210) | 시점 미확인 · 오래 무중국어(2016 리뷰 「没汉化」) | 유저 전언: **자원봉사자 1인**(「涛哥」)이 번역 · 일부는 별도 汉化包 | 4,921 · 56% | 「接近机翻」 · 무기명 「投」「短」 · 「凰飞行」 · 퀘스트·스킬 설명 영어 |
| Grim Dawn (219990) | 커뮤니티 번역을 게임 안 다운로드로 제공 · Steam 표에 简中 표기 | **커뮤니티**(Crate 미제공) | 22,515 · 89% | 「官中没包括在Steam下载内容里」 · 「Bastard翻译成巴斯塔德」 |
| Torchlight II (200710) | **출시 5년 뒤(2017)** 스튜디오 폐업 직전 | 공식 · 그전엔 창작마당 MOD | 4,679 · 88% | 늦었지만 감사 · 2026 「滚动条」 오역 |
| Torchlight III (1030210) | 출시 포함 · 퍼블리셔가 중국 기업(完美世界) | 공식 | 1,906 · 25% | 「技能描述甚至仍为英文」 |
| Wizard of Legend (445980) | (리뷰상 내장 · 시점 미확인) | 미확인 | 5,231 · 90% | 리뷰 템플릿 「✓ 自带汉化！」 |
| Melvor Idle (1267910) | (내장 · 시점 미확인) | 미확인 | 3,316 · 84% | 위키가 영어뿐 · 「中文有图标bug」 |
| Hollow Knight: Silksong (1030300) | 출시(2025-09) 포함 → **Patch 4(2025-11) 팬 번역으로 교체** | 공식(2인) → 팬 그룹 Team Cart Fix | 95,344 · 76% (최근 30일 91%) | 출시 직후 38% → 교체 후 회복 |

### 2-1. 게임별 근거 (출처 · 인용)

**Lootun** — 언어 = English only (Steam appdetails). 중국어 스토어에 「本产品尚不支援您的目前所在地的语言」 표시.
- 「我们需要中文 We need Chinese」(2022-08, 도움 77) — https://steamcommunity.com/profiles/76561198252413814/recommended/1960270/
- 「系统好复杂。一般放置没中文根本不在乎，但这游戏..没中文的话各种技能build实在是搞不懂。」(2022-09, 도움 24) → *시스템이 복잡하다. 보통 방치형은 중국어 없어도 상관없는데 이 게임은 중국어 없으면 스킬 빌드를 도저히 모르겠다.* — https://steamcommunity.com/id/GuMingzi/recommended/1960270/
- 「把那个汉化哥们招安，出个中文版，信不信这游戏的销量少说翻十倍。」(2024-06, 도움 23) → *그 번역해 준 형을 영입해 중국어판을 내라, 판매량 최소 10배다.* — https://steamcommunity.com/profiles/76561198968586042/recommended/1960270/
- 「备注字体中文全是都是显示方块…游戏使用textMeshPro字体造成的」(2023-10) → *설명용 폰트는 중국어가 전부 네모로 나온다 — TextMeshPro 폰트에 중국어가 없어서.* — https://steamcommunity.com/profiles/76561198454175895/recommended/1960270/
- 개발자 답(유저 전언): 「我也在做一个自定义语言文件系统，允许玩家在没有官方本地化的情况下添加自己的语言」 → *커스텀 언어 파일 시스템을 만들어 공식 현지화 없이도 플레이어가 언어를 넣게 하겠다.* — https://steamcommunity.com/profiles/76561198091819746/recommended/1960270/
- 현재: 「本游戏中文在创意工坊下载，汉化效果不错」(2025-11) → *중국어는 창작마당에서 받는다, 번역 괜찮다.* — https://steamcommunity.com/profiles/76561198367169588/recommended/1960270/
- 최다 도움(211) 리뷰가 바이두 네트워크 드라이브 汉化 배포글 — https://steamcommunity.com/profiles/76561198047016775/recommended/1960270/

**Backpack Battles**
- 「沸腾大锅翻译错了，我一看每15s给6心6火…结果只能触发一次，改成英文才发现是after15s」(2026-03) → *끓는 가마솥 번역이 틀렸다. 「15초마다」로 읽고 두 개 샀는데 한 번만 발동 — 영어로 바꾸니 「15초 후」였다.* — https://steamcommunity.com/id/voodoopear/recommended/2427700/
- [사실] 스토어 중국어 이름은 현지화 이름 「背包乱斗：福西法的宝藏」 사용.

**Loop Hero**
- 「美术和文本翻译都十分优秀的一款游戏！」(2026-05) → *미술과 텍스트 번역 모두 훌륭하다.* — https://steamcommunity.com/profiles/76561198851984256/recommended/1282730/
- 「很西方中世纪的游戏，中文翻译很雅信达」 → *서양 중세풍인데 중국어 번역이 신·달·아(信达雅)를 갖췄다.* — https://steamcommunity.com/profiles/76561199023863126/recommended/1282730/

**Darkest Dungeon / II**
- DD1: 「部分 文本 翻译错误，极度影响 游戏理解」(2025-12, 2,448시간) → *일부 텍스트 오역이 게임 이해를 크게 해친다.* — https://steamcommunity.com/profiles/76561198883511359/recommended/262060/
- DD2: 「有些翻译和游戏风格并不适配，比如解锁道具的地方叫"天工开物之原"」(2023-05, 도움 374) → *일부 번역이 게임 분위기와 안 맞는다 — 도구 해금 장소 이름이 「天工开物之原」(명대 과학서 『天工开物』 인용).* — https://steamcommunity.com/profiles/76561199030610308/recommended/1940340/
- DD2: 「几个饰品的稀有度从名字来看根本分不出来，勉强从颜色分辨」 → *장신구 몇 개는 이름만으로 등급을 못 가린다, 색으로 겨우 구분.* — https://steamcommunity.com/profiles/76561198369694525/recommended/1940340/

**Slay the Spire**
- [사실] EA 2017-11 시작 후 중국 유저 급증 → 「We rushed to immediately get some localizations in.」 처음 업체 번역 → 주간 패치를 못 따라가 커뮤니티가 매주 신규 콘텐츠 번역 — GamesBeat 2018-04 https://gamesbeat.com/slay-the-spire-has-china-to-thank-for-launching-its-700000-sales-in-steam-early-access/ (「For a while we had more Chinese players than the entire rest of the player base combined.」)
- 최다 도움(721) 중국어 리뷰 = 팬이 만든 카드·유물 이름 대조표, 「2017.12.15 官中马上上线」 → *12월 15일 공식 중국어 곧 나온다.* — https://steamcommunity.com/profiles/76561198281843463/recommended/646570/
- [사실] StS2(2026)의 중국어 부정 리뷰 폭주는 번역이 아니라 밸런스 패치 때문 — 중국 유저는 Discord를 못 써서 Steam 리뷰가 거의 유일한 피드백 창구라는 분석. 중국어 리뷰 35% 호감(시점별 상이) — https://gamegeeker.com/news/slay-the-spire-2-china-review-bomb-over-infinite-nerf · https://pcgamer.com/games/roguelike/slay-the-spire-2-players-leave-over-9-000-negative-steam-reviews-in-one-day-over-a-card-nerf-that-hasnt-even-gone-live-yet-but-chinas-steam-restrictions-might-bear-some-of-the-blame

**Vampire Survivors**
- 「测试版可以开中文了！！」(2022-01, 도움 1,094) → *테스트 브랜치에서 중국어 켤 수 있다!* — https://steamcommunity.com/profiles/76561198822668636/recommended/1794680/
- 「游戏已经完全支持中文，翻译效果也大大优化与之前的机翻，不过还是有机翻的痕迹」(2022-04, 도움 524) → *이제 중국어 완전 지원, 이전 기계번역보다 크게 나아졌지만 아직 기계번역 티가 난다.* — https://steamcommunity.com/profiles/76561198073164602/recommended/1794680/
- 「选项有简体中文和繁体中文，可选了之后显示的却是"中文（中国）"与"中文（台湾）"…在这个问题修复之前我只能给差评」(2026-08, 비추천, 도움 214) → *메뉴엔 简体/繁体인데 고르면 「중국어(중국)」「중국어(대만)」으로 표시된다. 고칠 때까지 비추천.* — https://steamcommunity.com/profiles/76561198808926918/recommended/1794680/

**Halls of Torment**
- 추가 전: 「可惜没有中文…如果有需要，作者可以把文本文档提供给我，我来翻译成中文。」(2023-12, 도움 124) → *중국어가 없어 아쉽다, 텍스트 파일 주면 내가 번역하겠다.* — https://steamcommunity.com/profiles/76561198065351933/recommended/2218750/
- 추가 직후: 「居然更新了中文！你过关！」(2024-06) → *중국어 업데이트했네! 합격!* — https://steamcommunity.com/profiles/76561199184029471/recommended/2218750/
- 「力量=伤害，力度=异常状态持续时间…区域=武器击打范围…另一个范围的=攻击距离…这翻译太坑了」(2024-10, 도움 53) → *「힘」은 데미지, 「위력」은 상태이상 지속, 「구역」은 타격 범위, 또 다른 「범위」는 사거리 — 번역이 함정이다.* — https://steamcommunity.com/profiles/76561198975210998/recommended/2218750/
- 「中文汉化不完全有外语，文本需要优化，字体丑！不能更改字体！」(2026-03, 비추천) → *번역이 불완전해 외국어가 섞이고, 폰트가 못생겼고 바꿀 수도 없다.* — https://steamcommunity.com/profiles/76561198276704891/recommended/2218750/
- 「会英语的用英语…别用简中和繁中就对了，翻译的一坨」(2026-02) — https://steamcommunity.com/profiles/76561198184923430/recommended/2218750/
- [사실] 2024-06 업데이트로 여러 언어 추가(EA 2023-05 시작) — https://www.gamespark.jp/article/2024/06/15/142388.html

**Soulstone Survivors**
- 「给制作组提了汉化建议竟然真的采纳了！战斗随从变成了纳迦守卫更贴近角色了。」(2026-03) → *번역 제안을 정말 반영해 줬다! 「전투 수행원」이 캐릭터에 맞게 「나가 수호자」로 바뀌었다.* — https://steamcommunity.com/profiles/76561198147780145/recommended/2066020/

**Last Epoch**
- EA기: 「更新个基础中文可以卖出1w份,制作组怎么就转不过来这个弯呢？」(2021-06, 도움 248) → *기본 중국어만 넣어도 1만 장은 팔 텐데.* — https://steamcommunity.com/profiles/76561198120175389/recommended/899770/
- 「踩蘑菇汉化组宣布对LE汉化负责」(2021-08, 도움 197) → *팬 번역 그룹 踩蘑菇가 LE 汉化를 맡겠다고 발표.* — https://steamcommunity.com/profiles/76561198263618050/recommended/899770/
- [사실] 1.0 패치 프리뷰(2023-09) 공식 중국어 비판: Online/Offline 오역, 「Solo-self found」→「已经找到」, 용어 불통일, 영어·한국어 잔존, 필터 메뉴에 영어+중국어 혼재. 커뮤니티가 기존 팬 번역 채택을 요청했으나 EHG는 품질 검증이 어렵다며 거절(유저 전언) — https://forum.lastepoch.com/t/the-quality-of-chinese-localization-is-unacceptable/60528
- [사실] EHG가 커뮤니티 번역을 꺼린 이유: 번역자가 중간에 손을 떼면 미완성 번역이 남는다는 우려(검색 요약) — https://forum.lastepoch.com/t/whether-to-sponsor-money-to-provide-chinese/22961

**Grim Dawn**
- [사실] 简中은 커뮤니티 프로젝트(2015-07~, GitHub `grimdawntranslator/community_chinese` + 바이두 티에바 배포). Crate가 번역을 제공하지 않아 번들 불가, 게임 옵션에서 내려받는다. Steam 언어표의 简中 표기는 「번역자들이 공식 인정을 원해 Crate에 요청」한 결과 — https://forums.crateentertainment.com/t/simplified-chinese-translation/29019 · https://steamcommunity.com/app/219990/discussions/0/3338745825902835325 (2018-09: 스토어에 중국어라 보고 샀는데 못 받겠다는 불만)
- 「官中没包括在Steam下载内容里，需要进游戏的设置选择中文来开始官中补丁的下载。可惜这个过程可能出现加载不出语言列表的问题…官方语言没有彩色文本」(2022-01, 도움 421) → *공식 중국어가 Steam 다운로드에 안 들어 있어 게임 설정에서 받아야 하고, 목록이 안 떠서 못 받는 경우가 있으며, 공식판엔 색 글씨가 없다.* — https://steamcommunity.com/id/edwin2o2p/recommended/219990/
- 「汉化是一坨屎。Bastard翻译成巴斯塔德，Master明明在句中是师父的意思被翻译成主人。」(2026-09, 도움 54) → *Bastard를 「바스타드」로 음역했고, 문맥상 「스승」인 Master를 「주인」으로 옮겼다.* — https://steamcommunity.com/id/drbig/recommended/219990/
- 「在建角色的时候无法输入中文…从2015年到2025年都有人提问」(2025-12, 비추천 도움 46) → *캐릭터 생성에서 중국어 입력 불가, 붙여 넣으면 진입 불가 — 2015~2025년 같은 질문.* — https://steamcommunity.com/profiles/76561198802042561/recommended/219990/

**Torchlight II / III**
- T2: 「五年之后，工作室出了中文。时候很晚，很多玩家十分不满意」(2018-05, 도움 191) → *5년 뒤에야 중국어, 늦어서 불만이 많았다.* — https://steamcommunity.com/id/RocK_and_DoG/recommended/200710/ · 「解散前夕，还为游戏增加了简体中文，非常感谢！」(2017-11, 도움 144) — https://steamcommunity.com/profiles/76561198443002750/recommended/200710/
- T2: 「腐坏地穴里的阿农芬艾瑞克滚动条是什么鬼？AI汉化的？」(2026-11) → *「…의 스크롤바」가 뭐냐? AI 번역이냐?* — Scroll(두루마리)을 UI 「滚动条」(스크롤바)로 옮긴 다의어 오역 [추론: 원문 «Scroll»] — https://steamcommunity.com/profiles/76561198087262843/recommended/200710/
- T2: 「成就系统没有汉化」 → *업적 미번역.* — https://steamcommunity.com/profiles/76561198108776225/recommended/200710/
- T3: 「连最基本的汉化问题都没解决，给你放机翻的中文都算是好了，有些关键的地方例如技能描述甚至仍为英文！」(2020-10, 도움 158) → *기본 汉化도 해결 안 됐다, 기계번역이면 그나마 낫고 스킬 설명은 아직 영어다.* — https://steamcommunity.com/id/Aurora0130/recommended/1030210/

**Hero Siege** (도트 D2풍 ARPG — 가장 가까운 장르 비교작 중 하나)
- 「听我一句劝，你把汉化好好弄一下这个游戏养活你这个游戏公司应该没多大问题。」(2020-03, 도움 310) → *충고하는데 중국어만 제대로 하면 이 게임 하나로 회사 먹고산다.* — https://steamcommunity.com/profiles/76561198278950057/recommended/269210/
- 「汉化做的很差，完全接近机翻的水准。我列举几个武器名称【投圆盘】【短】【投】。各种中英混杂、文本描述不通顺、汉化缺失、字体不清晰。要是想做国内市场就好好用心花钱请人汉化，别搞个用爱发电的志愿者的机翻就端上来。」(2026-08, 비추천) → *기계번역 수준. 무기 이름이 「던지기 원반」「짧은」「던지기」. 중영 혼재·문장 부자연·누락·흐린 폰트. 중국 시장을 원하면 돈 주고 사람을 써라, 자원봉사 기계번역을 내놓지 말고.* — https://steamcommunity.com/profiles/76561198324795041/recommended/269210/ [추론: 무기 종류 단어(Discus/Short …)를 문맥 없이 단독 번역한 결과]
- 「名字叫凰飞行是什么意思啊？地又是什么意思，九头蛇又是什么意思啊，我只能看技能图标来猜测效果…任务和技能效果描述怎么是全英文的，一开始我连新手教程都过不去」(2025-11, 비추천) → *「봉황 비행」, 「땅」, 「히드라」가 무슨 스킬이냐, 아이콘 보고 효과를 짐작한다. 퀘스트·스킬 설명은 전부 영어라 튜토리얼도 못 넘겼다.* — https://steamcommunity.com/profiles/76561199837905194/recommended/269210/
- 「汉化也是一坨 还要去找汉化包 还tm支持简体中文」(2026-09) → *번역도 엉망이고 汉化包를 따로 찾아야 하는데 「简体中文 지원」이라고?* — https://steamcommunity.com/profiles/76561198268591603/recommended/269210/
- 옹호: 「其实这游戏一直是为爱发电，是涛哥一直在汉化」(2026-03) → *사실 이 게임 중국어는 줄곧 자원봉사 — 「涛哥」 혼자 번역해 왔다.* — https://steamcommunity.com/profiles/76561198313988777/recommended/269210/
- [사실] 다른 리뷰는 「我用汉化把我号封了」(비공식 汉化 쓰다 계정 정지)라고 주장 — 온라인 게임에서 비공식 번역 파일이 안티치트와 충돌할 수 있다는 위험 신호(진위 미확인) — https://steamcommunity.com/id/zhi66868/recommended/269210/

**Wizard of Legend**
- 중국 리뷰 템플릿 「=======语种======= ☐ 基础英文 ☐ 可以打汉化MOD或补丁 ✓ 自带汉化！」(도움 135) → *언어 항목: 기본 영어 / 한글화 MOD 필요 / ✓ 기본 내장.* — 언어 지원이 평가 체크리스트의 고정 항목 — https://steamcommunity.com/profiles/76561198255056093/recommended/445980/

**Melvor Idle**
- 「官方wiki能有中文就更好了…繁体翻译和简体不一样」(2026-05) → *공식 위키에 중국어가 있으면 좋겠다, 있는 중국어 위키는 느리고 번체라 용어가 다르다.* — https://steamcommunity.com/profiles/76561198450505271/recommended/1267910/
- 「中文有图标bug 啥也不显示」(2026-08, 비추천) — https://steamcommunity.com/profiles/76561199079028293/recommended/1267910/

**Hollow Knight: Silksong** (장르 밖이지만 2025 최대 사례)
- [사실] 출시 직후 简中 리뷰 38% 호감(타 언어 90%대), 「반 문언·반 현대어」, 「번역 크레딧 2인(전작 6인)」 — https://80.lv/articles/hollow-knight-silksong-s-steam-score-drops-over-poor-chinese-localization · https://technode.com/2025/09/06/hollow-knight-silksongs-simplified-chinese-translation-draws-heavy-criticism/ · https://www.engadget.com/gaming/silksong-reviews-drop-to-mostly-negative-for-chinese-players-due-to-confusing-translations-162631762.html (「translation reads like a Wuxia novel」)
- 중국어 최다 도움 리뷰(비추천 5,621)는 반문언체로 번역을 풍자. 「中文版本半文半白的翻译令人不快，豆包的翻译我觉得都比翻译的好！」(추천 3,435) → *반 문언·반 백화 번역이 불쾌하다, 豆包(바이트댄스 AI) 번역이 더 낫다.* — https://steamcommunity.com/profiles/76561199586873359/recommended/1030300/
- 「一代的汉化还挺好的啊为啥换了个汉化组啊」(도움 1,689) → *1편 번역은 괜찮았는데 왜 번역팀을 바꿨나* — 시리즈 용어·문체 연속성 요구 — https://steamcommunity.com/profiles/76561199100648675/recommended/1030300/
- 교체 후: 「（*更新已下调前期难度，并采用新汉化）」(2025-11) · 「该改的都改了…汉化也稍微好了些」(2026-05) — https://steamcommunity.com/id/10110910510810597/recommended/1030300/ · https://steamcommunity.com/profiles/76561198441401700/recommended/1030300/
- [사실] 2025-10 베타 → 2025-11 Patch 4에서 팬 그룹 Team Cart Fix 번역을 공식 채택. 「keeps most existing names … but changes them where the original was wrong or inconsistent with Hollow Knight」 — https://www.teamcherry.com.au/blog/silksong-patch-4 · https://www.pcgamer.com/games/action/silksongs-disastrous-chinese-translation-has-received-an-official-fan-made-overhaul-and-its-just-been-pushed-live-on-pc-with-patch-4

**참고 — 장르 인접 사례**
- Stardew Valley 1.6.4(2024-04): 번역 갱신 + 새 폰트 → 익숙한 이름 교체(复活节→彩蛋节, 防風草→歐防風 등)·자간 불만 → 1.6.6에서 번역·기본 폰트 원복, 새 폰트는 옵션 — https://forums.stardewvalley.net/goto/post?id=128462 · https://forums.stardewvalley.net/threads/please-listen-to-the-voice-of-simplified-chinese-players-revert-the-chinese-font-and-translation.29479
- No Rest for the Wicked(ARPG, 2024~25): 「parry」「block」 장비 용어 혼동, 영·중 뜻이 반대(상승↔감소), 보석 설명 폰트 미표시, 퀘스트에 한국어 노출 — https://forum.norestforthewicked.com/t/about-the-chinese-community/6470 · https://forum.norestforthewicked.com/t/some-problems-with-chinese-translation-in-games/16668 (유저: 「99% of Chinese players cannot use Discord or YouTube」 — 개인 주장)
- BZZZT(2024-12): 11개 언어 지원·중국어 없음 → 중국 유저 부정 리뷰, 30일 호감 38% — https://outsightchinadaily.substack.com/p/203

---

## 3. 중국 유저가 칭찬/처벌하는 것 — 패턴 (근거는 §2)

| 항목 | 반응 | 대표 근거 |
|---|---|---|
| 중국어 없음 | 추천을 누르고도 「我们需要中文」 · 팬 汉化 배포 · 드물게 리뷰 폭격 | Lootun · Last Epoch EA · Halls EA · BZZZT |
| 기계번역 티 (机翻 · AI汉化) | 단골 감점어. 「AI 번역이냐?」 | Vampire Survivors 초기 · Torchlight II · Halls · Last Epoch |
| **규칙·수치 오역** | 플레이 손해로 직결 → 「改成英文才发现」 | Backpack Battles · Halls 능력치 · NRftW 상승↔감소 |
| 용어 불통일 | 같은 개념이 두 단어 · 비슷한 두 개념이 한 단어 | Halls 「范围」 두 개 · Last Epoch · NRftW parry/block |
| 漏翻 · 영어/타 언어 잔존 | 즉시 지적. 업적·필터 메뉴·스킬 설명까지 본다 | Torchlight III · T2 업적 · Halls · Last Epoch(한국어 노출) · NRftW(한국어 노출) |
| 문체·톤 불일치 | 고어·무협체·중국 고전 인용이 서양 다크판타지에 붙으면 비판 | Silksong · DD2 「天工开物之原」 |
| 일반명사 음역 · 문맥 없는 단어 번역 | 조롱 · 「무슨 뜻이냐」 | Grim Dawn 「巴斯塔德」 · Hero Siege 「投」「短」「凰飞行」「地」 · Torchlight II 「滚动条」 |
| 자원봉사·팬 번역을 「공식」으로 내놓기 | 「돈 주고 사람을 써라」 | Hero Siege · Grim Dawn(별도 다운로드) |
| 번역팀 교체로 시리즈 문체 단절 | 「왜 번역팀을 바꿨나」 | Silksong |
| 굳은 용어 변경 | 장기 유저 반발 → 원복 | Stardew 1.6.4→1.6.6 |
| 폰트 | 깨짐(네모) · 못생김 · 크기·교체 불가 · 색 글씨 소실 | Lootun TMP · Halls · Grim Dawn · LE 「字体也很小，没法调」 |
| CJK 입력 | 이름에 중국어 못 넣으면 오래 원망 | Grim Dawn |
| 언어 선택지 이름 | 「中文（台湾）」 · 「Taiwanese」 → 정치 문제로 비추천 | Vampire Survivors · EGG RAIDERS |
| 「支持简体中文」 표기 vs 실제 | 별도 다운로드·미완성이면 「표기 보고 샀다」 불만 | Grim Dawn |
| 위키·공략 | 복잡한 게임은 중국어 위키/공략이 사실상 필수 · 유저가 직접 만든다 | Melvor · StS 대조표 · VS 합성표 |
| **칭찬** | 「自带汉化」 · 빠른 추가(「你过关！」) · 「信达雅」 · 제안 반영 · 좋은 팬판 공식 채택 · 문을 닫는 스튜디오의 늦은 추가에도 감사 | Wizard of Legend · Halls · Loop Hero · Soulstone · Silksong · Torchlight II |

[추론] 「문장 미려함」보다 **규칙을 정확히 읽을 수 있느냐**가 먼저다. 빌드·옵션 중심 게임(이 장르)은 능력치·옵션 문구가 곧 게임이라 오역 비용이 가장 크다 — Lootun 리뷰가 바로 이 말(「没中文的话各种技能build实在是搞不懂」).

---

## 4. Steam 측 사실

**언어표 (Interface / Full Audio / Subtitles)**
- [사실] 언어마다 Subtitles · Interface · Full Audio 체크 — https://partner.steamgames.com/doc/store/localization
- [사실] 「Language support is determined by the in-game language settings, not the store page.」 스토어 페이지 현지화와 게임 내 현지화는 **독립** — 같은 문서.
- [사실] Valve GDC 덱(2024 데이터): 「Steam is more likely to recommend your game if it supports a customer's primary or secondary languages.」 · 매칭 시 유저 언어 설정을 보며 **「Interface at minimum」** · 「Customers can always view and buy games that don't support their language. We're transparent with users when a game doesn't support their language.」 · 2024 유저 1차 언어 = 简中 33.7% > 영어 33.5% — 「Localizing your game's presence on Steam」(Erik Peterson, Valve) https://steamcdn-a.akamaihd.net/steamcommunity/public/images/steamworks_docs/english/LocalizingYourGamesPresenceonSteam.pdf
- [사실] Visibility 문서: 「Steam will be more likely to show your game to players that speak a language supported by your game.」 — https://partner.steamgames.com/doc/marketing/visibility
- [사실] 简中 API 코드 `schinese`, Web API `zh-CN` — https://partner.steamgames.com/doc/store/localization/languages

**부분 번역**
- [사실] Valve 문서에서 「부분 번역 시 체크 금지/불이익」 규정은 찾지 못했다. 문서는 「모든 언어를 할 필요 없다」(ROI 기준 우선순위)만 말한다 — https://partner.steamgames.com/doc/store/localization
- [사실/3자] 체크했는데 실제로 부족하면 환불·부정 리뷰로 돌아온다는 3자 가이드 — https://www.steampageanalyzer.com/blog/steam-localization-languages (2026-06, Valve 비제휴)
- [추론] 「Interface만 체크(자막 없음)」는 정직한 부분 지원 표기 수단. 단 이 장르는 대사보다 UI·툴팁이 본체라 Interface 체크 = 사실상 전부 번역 약속이다.

**스토어 페이지·캡슐 현지화**
- [사실] Valve 덱: 「It's hard to get wishlists from people who can't read your store page. Try localizing your store page into languages you're thinking about adding to your game.」 · 현지화 트레일러/자막 자동 노출 · 현지화 게임명은 해당 언어 검색 제안에 쓰이고 Steam 밖 검색에도 색인 · 「If your game has a localized name, you should also localize your store assets.」 — 위 PDF
- [사실] 현지화 앱 이름은 그 언어 사용자에게 표시·검색 제안에 사용 — https://partner.steamgames.com/doc/store/localization
- [사실/3자] 스토어 번역 페이지 주당 위시리스트 중앙값 62 vs 영어만 18 (100+ 개발자 설문, 2022, 상관관계) · 번역 안 한 언어는 페이지 상단에 「출시 때 미번역 · 위시리스트 보고 우선순위」 공지 권장 — https://howtomarketagame.com/2022/10/05/should-i-translate-my-steam-page-and-other-effects-on-steam-traffic/
- [사실/3자, 2021] 중국어 번역이 없으면 중국 Steam 유저 대부분이 기본 스토어에서 게임을 못 본다 · 「6,000개 게임과 경쟁 vs 34,000개」 · Fellow Traveller: 중국어+현지 PR로 중국 판매 비중 5%↓ → 20%↑ — https://newsletter.gamediscover.co/p/game-localization-for-discovery-its
- [사실/3자, 2020] 중국어 번역 있는 게임의 중국 판매 비중 10~22%(평균 16%), 텍스트 많은데 번역 없으면 1~2% · 중국 환불률 미국의 약 2배(일화) — https://newsletter.gamediscover.co/p/we-need-to-talk-about-steam-and-china
- [사실] Lootun처럼 미지원이면 중국어 스토어에 「本产品尚不支援您的目前所在地的语言」가 뜬다(조회 확인).

**커뮤니티 채널**
- [사실] steamcommunity.com은 중국 본토에서 차단(2017~, GreatFire 2026-07 측정 100% 차단). 스토어는 대체로 접속 — https://www.pcgamer.com/steam-community-access-has-been-blocked-in-china · https://en.greatfire.org/steamcommunity.com/id/gordonwalkedy
- [사실/3자] Discord 접속 불가로 Steam 리뷰가 피드백 창구가 됨(StS2 분석) · 현지 채널 = Bilibili · 小黑盒(HeyBox) · Weibo · 贴吧 · QQ群 — https://localizedirect.com/posts/chinese-game-localization-factsheet (2024-09) · Lootun·Grim Dawn 리뷰에 QQ群 번호가 직접 등장

**판호(版号)**
- [사실] 글로벌 Steam 출시에 판호는 요구되지 않는다 · Steam China(蒸汽平台, 完美世界 운영, 2021-02~)는 판호 + 중국 퍼블리셔 필요 — https://appinchina.co/blog/the-complete-guide-to-steam-china/ (2026-05 갱신: 글로벌 Steam은 「more ambiguous position」) · 중국 변호사 칼럼(2023-10) 「在 Steam 上上架游戏不需要版号」(중국 국내 개발자 관점 위험 경고 포함) https://www.odaily.news/zh-CN/post/5190565
- [사실] 2025년 NPPA 승인 1,771건 중 수입 95건(5.4%) — https://app.cinevva.com/news/2026-01-06-china-game-approvals-2025 · Steam China 검색 결과 약 536개(2026, 단일 2차 출처 appinchina)
- [추론] 한국 개발 인디가 글로벌 Steam에 중국어로 내는 데 중국 측 승인 절차는 없다. 중국 본토 유저는 글로벌 Steam에서 위안화로 구매한다(회색지대가 실무 관행). 蒸汽平台 입점을 노릴 때만 판호·현지 퍼블리셔가 문제.

---

## 5. 아이템·스킬 이름 — 의역(意译) vs 음역(音译)

| 원문 | 중국어 | 방식 | 출처 |
|---|---|---|---|
| Chaos Orb / Exalted Orb / Divine Orb / Orb of Alteration | 混沌石 / 崇高石 / 神圣石 / 改造石 | 의역 + 사물 바꿈(Orb → 石) | https://poedb.tw/cn/Chaos_Orb |
| Normal / Magic / Rare / Unique | 普通 / 魔法 / 稀有 / 传奇 (PoE) | 의역 | https://poedb.tw/cn/Glossary |
| Unique (Diablo II) | **暗金** (= 독특·유일 물품) | 색 이름 관용어(어두운 금색 글씨) | https://www.3dmgame.com/gl/3838021_33.html 「暗金物品也被称为独特、唯一物品」 |
| Unique (Last Epoch) | 공식 「独特」 · 유저는 「暗金」 | 공식 의역 vs 커뮤니티 관용어 공존 | https://news.17173.com/content/02262024/163154418.shtml · https://www.3dmgame.com/gl/3880543_18.html |
| Exalted (Last Epoch) | 崇高 | PoE 선례 차용 [추론] | 같은 3dm 글 |
| Griffon's Eye | 狮鹫之眼 (= 格里风之眼) | 의역판·음역판 공존 → 혼란 | 3dmgame 위 글 |
| Stone of Jordan | 乔丹之石 | 고유명사만 음역 + 보통명사 의역 | 3dmgame 검색 요약 |
| D2 룬 El / Eld / Tir / Nef / Eth / Ith | 艾尔 / 艾德 / 特尔 / 那夫 / 爱斯 / 伊司 | **음역** (뜻 없는 고유어) | https://www.3dmgame.com/gl/3705075.html (검색 요약) |
| Snecko Eye (StS) | 异蛇之眼 | 조어 생물명도 의역(异蛇 = 기이한 뱀) | https://www.18183.com/gonglue/202207/4057927.html |
| outcast (Grim Dawn) | 放逐者 | 의역 · 커뮤니티 용어 합의 | https://forums.crateentertainment.com/t/simplified-chinese-translation/29019 |
| Bastard (Grim Dawn) | 巴斯塔德 | 일반명사 음역 → **조롱** | §2 Grim Dawn 리뷰 |
| Naga 계열 수행원 (Soulstone) | 战斗随从 → 纳迦守卫 | 유저 제안으로 「기능명」→「세계관명」 | §2 Soulstone 리뷰 |
| 게임 제목 | Bayonetta → 猎天使魔女 · Burnout → 火爆狂飙 | 제목도 의역이 관행 | https://localizedirect.com/posts/chinese-game-localization-factsheet |

[사실] 정리 — 서구 ARPG 중국어판의 일반 관행: **보통명사·효과명은 의역**, **인명·지명·뜻 없는 고유어(룬)는 음역**, 등급명은 **장르 선례(D2·PoE)를 따르는 경향**(暗金·崇高). 같은 대상에 의역/음역 두 이름이 퍼지면 공략 간 혼란(狮鹫之眼/格里风之眼).
[추론] 한국어·영어 원본 → 중국어일 때: 영어 아이템·스킬 이름이 원본이면 영어에서 **의역**하고, 인명·고유 지명만 음역. 등급·옵션 단어는 D2/PoE/디아4 중국어판(普通·魔法·稀有·传奇·暗金)과 어긋나지 않게 고르면 학습 비용이 준다. 단 「传奇」가 PoE에선 Unique, 디아4에선 Legendary라 **자기 게임 안에서 하나로 고정**하는 게 핵심.

---

## 6. 실무 교훈 (전부 [추론] — 위 사실에서 끌어낸 것)

1. **용어집(glossary)을 먼저 고정하고 번역은 그 다음.** 능력치·옵션·장비 조작 동사·등급명을 표 하나로 확정 → 출시 후엔 바꾸지 않는다(Stardew 교훈). 바꿀 땐 「틀린 것만」(Silksong 방식).
2. **수치·조건 문장은 번역자에게 맥락을 준다** — 「every 15s」/「after 15s」 같은 문장은 변수·발동 규칙 메모를 붙인다. 오역 비용이 가장 큰 칸. **짧은 이름 문자열(무기 종류·스킬명)도 「무엇의 이름인지」 주석 필수** — 한두 단어짜리가 가장 잘 틀린다(Hero Siege 「投」「短」, Torchlight II 「滚动条」).
3. **비슷한 두 개념에 같은 한자 금지** — 범위/사거리, 막기/쳐내기, 「力量」(Strength)과 「伤害」(데미지)을 분리. 한국어 원본에서 「데미지」·「피해」 구분이 있으면 중국어에서도 두 단어로.
4. **漏翻 0** — 업적 · 필터 · 설정 · 툴팁 · 오류 문구까지 포함한 문자열 전수 점검. 한국어 원문이 중국어 화면에 새는 것(LE · NRftW 사례)이 한국 출신 팀의 특유 위험.
5. **폰트** — 简体 전용(SC) 글리프 폰트를 쓰고, 동적 폰트 폴백·TextMeshPro 아틀라스에 중국어 전 글자가 들어갔는지 확인. 크기 조절 옵션. 색 글씨(옵션 강조)가 중국어에서도 유지되는지.
6. **CJK 입력**(영웅 이름 등)과 中 문자열 저장·세이브 왕복 확인.
7. **언어 선택지 표기 = 「简体中文」「繁體中文」** — 국가·지역명 금지.
8. **스토어 페이지 · 게임 이름 · 캡슐을 같이 현지화** (Valve 권고). 게임 내 번역이 아직이면 페이지만 먼저 번역 + 「출시 시 미번역」 공지(howtomarketagame 방식)도 선택지.
9. **중국어 피드백 창구를 따로 연다** — Steam 중국어 토론 + 小黑盒/Bilibili/QQ群. Discord만 두면 피드백이 리뷰로 터진다(StS2).
10. **커뮤니티 번역 활용은 양날** — 성공(StS 주간 번역 · Silksong 팬판 채택 · Grim Dawn) vs 갈등(LE 채택 거부 → 공식판 혹평) vs 품질 저하(Hero Siege 자원봉사 1인 → 「돈 주고 사람을 써라」). 공식이 소유하는 용어집 + 커뮤니티 교정 루프가 중간안. 단 「简体中文 지원」 표기 게임이 다운로드 별도·미완성이면 불만(Grim Dawn · Hero Siege).
11. **EA 중이라도 빨리** — 중국 유저는 EA 기간에 중국어 요청 리뷰를 쌓고, 추가되면 바로 환영한다(StS · VS · Halls).

---

## 7. 확인 못 한 것

- Dragon Cliff 등급·능력치는 **플레이어 공략 표기**(중국어 공략 4편 단어 집계로 교차 확인)이며 게임 내 문자열을 직접 본 것은 아니다. 「输出值 ↔ output」은 영어 토론 검색 요약에 기댄 대응. 장비 등급 6단의 정확한 이름(장비 vs 영웅)은 미확정.
- Darkest Dungeon 1의 简中 추가 시점, Hero Siege의 추가 시점(번역 주체는 리뷰 전언뿐).
- Valve의 「Interface」 정의(메뉴/HUD 범위) 공식 문구.
- Steam 리뷰 JSON API(appreviews)는 이 환경에서 302로 막혀, 리뷰는 커뮤니티 카드 HTML로 표본만 봤다(게임당 100~310건).

*마지막 업데이트: 2026-11-16*
