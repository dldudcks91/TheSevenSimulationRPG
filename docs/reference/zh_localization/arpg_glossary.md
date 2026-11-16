# zh-CN ARPG 용어집 — 디아블로식 파티 RPG 번역 기준

조사일 2026-11-16 · 대상 = `src/data/` 의 영어 원본 이름(name_en · stat_en · attr_en 등) · 읽기 전용 조사(프로젝트 파일은 안 건드렸다)

## 0. 출처 표기 · 신뢰도

| 기호 | 출처 | 신뢰도 |
|---|---|---|
| **[R]** | **D2R 공식 zhCN 게임 문자열** `item-names.json` · `item-nameaffixes.json` (게임 v31 추출본) — 행마다 `enUS` · `zhTW` · `zhCN` 이 나란히 있다 · https://github.com/yatyricky/d2r-loot-filter/tree/master/game_data/v31/data/data/local/lng/strings | 가장 높음 (게임 데이터 원문) |
| **[L]** | D2 원판(1.x) 공식 **번체** chi 로케일(블리자드 대만판) · https://github.com/blizzhackers/d2data/blob/master/json/localestrings-chi.json | 높음 — 단 번체 · 오역 많음(IAS → 「準確率」) |
| **[W4]** | Wowhead 디아4 cn (공식 현지화 데이터) — 威能 목록 https://www.wowhead.com/diablo-4/cn/aspects · 아이템 툴팁 https://www.wowhead.com/diablo-4/cn/item/harlequin-crest-1306338 · 등급 필터 https://www.wowhead.com/diablo-4/cn/items/corrupted-essence · 키워드 https://www.wowhead.com/diablo-4/cn/skills/keywords:core | 높음 |
| **[17]** | 17173 디아4 기사 — 시즌8 백과 https://news.17173.com/z/d42025/content/12082025/102402645.shtml · 옵션 모음(2023 출시 전) https://news.17173.com/z/an4/content/03232023/103317812.shtml · 행운의 일격 https://news.17173.com/z/d42025/content/12122025/095258357.shtml | 중간 (매체 · 출시 전 글은 옛 번역 섞임) |
| **[P]** | poedb.tw/cn (PoE 국서버 문자열) — 용어집 https://poedb.tw/cn/Glossary · 목걸이 옵션 https://poedb.tw/cn/Amulets · 옵션 이름 https://poedb.tw/cn/Modifiers · 기절 https://poedb.tw/cn/Stun | 높음 |
| **[C]** | D2 중국 커뮤니티 — 163 https://www.163.com/dy/article/EKSP5DFI05465VOH.html · 3DM https://www.3dmgame.com/gl/3838021_29.html · https://www.3dmgame.com/gl/3838021_38.html | 중간 (검색 요약으로만 확인) |
| **[WK]** | 중문 위키 — 七宗罪 https://zh.wikipedia.org/zh-cn/七宗罪 · 七大罪(漫画) https://zh.wikipedia.org/zh-cn/七大罪_(漫画) · 人造人(钢之炼金术师) https://zh.wikipedia.org/zh-cn/人造人_(钢之炼金术师) | 높음 |
| **[DD2]** | 다키스트 던전 2 간체 번역가 글 https://marc-eybertguillon.squarespace.com/blog/darkest-dungeon-classical-chinese | 높음 (번역가 본인) |
| **(관용)** | 출처 URL 없이 업계 관용으로 판단 | 추정 — 표시해 둔다 |
| **(추정)** | 내 판단 · 의역 제안 | 추정 |

**한계** — D2R zhCN 의 **등급 이름 · 옵션 줄 문장**은 `item-modifiers.json` · `ui.json` 에 있는데 이번에 구하지 못했다. 그 칸은 원판 번체 [L] + 커뮤니티 [C] 로 메웠다. 디아3 zhCN 은 1차 자료를 못 찾아 참고만 했다.

---

## 1. 등급 · 아이템 체계

이 게임 등급 = Normal · Magic · Rare · Craft · Epic · Legendary · Unique (`ui/mock.js RARITY`).

| English | 推荐中文 | 来源/依据 | 备注 |
|---|---|---|---|
| Normal | 普通 | [P] · [W4] 필터 | 커뮤니티 「白装」 |
| Magic | 魔法 | [P] · [W4] · [L] | 「蓝装」 |
| Rare | 稀有 | [P] · [W4] | D2 커뮤니티 「黄金/黄装」 [C] |
| Craft | 手工 | D2 커뮤니티 [C] | D2R 공식 표기 미확인 · 대안 打造 · ⚠ D2 은어로 绿色=套装 · 橙色=手工 — 이 게임 Craft 는 초록 |
| Epic | 史诗 | (관용) WoW 보라 | 디아 · PoE 엔 없는 등급 |
| Legendary | 传奇 | [W4] D4 · D3 · [P] | WoW 는 「传说」 · ⚠ 베이스 `Legendary Mallet`=传奇重锤 [R] 와 겹친다(§3) |
| Unique | 暗金 | [W4] D4 필터 · [C] D2 은어 | ⚠ PoE 국서버는 Unique=传奇 [P] → Legendary 와 충돌 · **D4 의 「传奇 + 暗金」 쌍이 이 게임 등급 구성과 같다** · 대안 独特(D4 번체 · [17] 일부 기사) |
| (참고) Mythic | 神话 / 神话暗金 | [17] | 이 게임엔 없음 |
| (참고) Set | 套装 | [C] | 이 게임엔 없음 |
| Superior | 精良 | [R] `Hiquality` | |
| Low Quality · Cracked · Crude · Damaged | 劣质 · 裂纹 · 粗制 · 破损 | [R] | |
| Ethereal | 无形 | [R] `Ethereal Edge`=无形之锋 | |
| Socket | 孔 (UI 凹槽) | [L] 「增加凹槽」 · 커뮤니티 「打孔」 | PoE 는 插槽 [P] |
| Runeword · Rune | 符文之语 · 符文 | [R] Rune · [17] · Wowhead D2 cn 기사 | |
| Affix · Prefix · Suffix | 词缀 · 前缀 · 后缀 | [P] | D4 도 词缀 [17] |
| Implicit | 固有词缀 | [P] | 커뮤니티 「基底词缀」 |
| Base item | 基底 (UI) · 底材 (말) | [P] 「力量基底」 · [C] 「底材」 | 이 게임 「베이스 옵션」 → 基底属性 (추정) |
| Aspect | 威能 | [W4] 페이지 제목 「暗黑破坏神IV 威能」 | 이 게임엔 없음 |
| Item Level · Required Level | 物品等级 · 需要等级 | [C] · [W4] | |
| Item Power | 物品强度 | [W4] | 참고 |
| Quality (PoE) | 品质 | [P] | |

---

## 2. 장비 칸 · 무기군 · 방어구군

| English | 推荐中文 | 来源/依据 | 备注 |
|---|---|---|---|
| Weapon | 武器 | (관용) | |
| Helmet | 头盔 | [R] `hlm` | |
| Armor (칸) | 铠甲 | (추정) | 「护甲」은 PoE · D4 의 방어 수치 이름이라 칸 이름과 갈라 둔다 |
| Gloves | 手套 | [R] | |
| Boots | 靴子 | [R] `boots` | 베이스 `Boots` 는 短靴 [R] `lbt` |
| Amulet | 护符 | [R] `amu` | ⚠ 베이스 `Talisman`=护身符 [R] 와 비슷하다 · KR 「목걸이」 직역이면 项链 [R] `necklace` |
| Ring | 戒指 | [R] `rin` | |
| Greatsword (양손검) | 巨剑 | (추정) | 베이스 `Great Sword`=重剑 [R] 과 겹치지 않게 |
| Axe | 斧 | [R] | |
| Mace (둔기) | 钝器 | (추정) | 직역 锤 · 베이스 `Mace`=钉锤 [R] 와 갈림 |
| Spear | 长矛 | [L] | 베이스 `Spear`=矛 [R] |
| Staff | 法杖 | (관용) | |
| Orb | 法珠 | [R] Orb 계열 「鹰眼法珠」 등 | |
| Crucifix | 十字架 | (추정) | |
| Bible | 圣经 | (추정) | 대안 圣典 |
| Bow · Crossbow | 弓 · 弩 | [R] | |
| Twin Daggers | 双匕首 | (추정) | 확장 직업 |
| Scythe (무기군) | 镰刀 | [R] `scythe` | 베이스 `Scythe`(창 그룹)는 巨镰 [R] |
| Heavy Armor · Light Armor | 重甲 · 轻甲 | (관용) | |
| Robe | 法袍 | [R] `Ormus' Robes`=奥玛斯的法袍 | |
| Plate | 板甲 | [R] `Light Plate`=轻板甲 | |
| Leather | 皮革 | [R] `lea`=皮甲 | 칸 이름이면 皮甲 |
| Tiara | 冠冕 | [R] `ci2` | |
| Gauntlet | 护手 | [R] `hgl` | |
| Greaves | 护胫 | [R] `greave` | |

---

## 3. 베이스 아이템 전수 (item_base.csv · weapon_base.csv)

「推荐」은 D2R zhCN 공식명이 있으면 그것을 그대로 둔다. ⚠ 는 공식명이 어색하거나 이 게임 안에서 충돌하는 것. 「D2 공식 없음」 행은 직역 제안이다.

### 3-1 방어구 · 장신구

| English | 推荐中文 | 来源/依据 | 备注 |
|---|---|---|---|
| Cloth Armor | 布甲 | D2 공식 없음 (추정) | 원판 번체에선 Quilted=布甲였으나 D2R 은 内衬甲 → 충돌 없음 |
| Quilted Armor | 内衬甲 | [R] `qui` | 번체 棉布甲 |
| Ghost Armor | 幽灵甲 | [R] `xui` | |
| Dusk Shroud | 灰幕寿衣 | [R] `uui` | |
| Light Plate | 轻板甲 | [R] `ltp` | |
| Mage Plate | 法师铠 | [R] `xtp` | |
| Archon Plate | 统治者板甲 | [R] `utp` | Archon = 统治者 (지팡이와 같다) |
| Ancient Armor | 古代甲 | [R] `aar` | 번체 上古铠甲 이 더 무겁게 읽힌다 |
| Ornate Plate | 花纹战甲 | [R] `xar` | |
| Sacred Armor | 神圣铠甲 | [R] `uar` | 3DM 공략도 같은 표기 |
| Cloth Hood | 布兜帽 | D2 공식 없음 (추정) | |
| Circlet | 头环 | [R] `ci0` | |
| Tiara | 冠冕 | [R] `ci2` | |
| Diadem | 权冠 | [R] `ci3` | |
| Cap | 软帽 | [R] `cap` | |
| War Hat | 战争帽 | [R] `xap` | |
| Shako | 军帽 | [R] `uap` | |
| Great Helm | 重盔 | [R] `ghm` | D2R 은 Great = 重 |
| Winged Helm | 翼盔 | [R] `xhm` | |
| Spired Helm | 塔盔 | [R] `uhm` | |
| Cloth Gloves | 布手套 | D2 공식 없음 (추정) | |
| Heavy Gloves | 重手套 | [R] `vgl` | |
| Sharkskin Gloves | 鲨鱼皮手套 | [R] `xvg` | |
| Vampirebone Gloves | 吸能鬼骨手套 | [R] `uvg` | ⚠ D2R 은 Vampire 를 일관되게 「吸能鬼」로 옮겼다(`Vampire Gaze`=吸能鬼的凝视) · 자연스러운 쪽은 吸血鬼骨手套 |
| Gauntlets | 护手 | [R] `hgl` | |
| War Gauntlets | 战争护手 | [R] `xhg` | |
| Ogre Gauntlets | 食肉魔护手 | [R] `uhg` | Ogre = 食肉魔 (Ogre Maul 과 같다) |
| Boots | 短靴 | [R] `lbt` | |
| Heavy Boots | 重靴 | [R] `vbt` | |
| Sharkskin Boots | 鲨鱼皮靴 | [R] `xvb` | |
| Scarabshell Boots | 圣甲虫壳靴 | [R] `uvb` | |
| Greaves | 护胫靴 | [R] `hbt` | |
| War Boots | 战争靴 | [R] `xhb` | |
| Myrmidon Greaves | 侍从护胫 | [R] `uhb` | ⚠ 번체 勇士护胫 이 뜻에 가깝다 |
| Talisman | 护身符 | [R] `talisman` | 키는 이름 조각이지만 같은 낱말 · 칸 Amulet(护符)과 비슷 — §2 |
| Gold Necklace | 金项链 | D2 공식 없음 (추정) | [R] necklace=项链 |
| Eye Pendant | 眼形吊坠 | D2 공식 없음 (추정) | 더 고어하게 眼珠吊坠 |
| Silver Ring | 银戒 | D2 공식 없음 (추정) | [R] Silver=白银 → 白银戒指 도 가능 |
| Signet | 印戒 | D2 공식 없음 (추정) | 대안 印章戒指 |
| Glutton Ring | 贪食者之戒 | D2 공식 없음 (추정) | 의역 대안 饕餮之戒 (규칙 6 의역 금지라 대안으로만) |

### 3-2 무기

| English | 推荐中文 | 来源/依据 | 备注 |
|---|---|---|---|
| Long Sword | 长剑 | [R] `lsd` | |
| Bastard Sword | 手半剑 | [R] `bsw` | 번체 重剑 |
| Two-Handed Sword | 双手剑 | [R] `2hs` | |
| Great Sword | 重剑 | [R] `gsd` | |
| Espandon | 西铁大剑 | [R] `92h` | ⚠ 번체 双手重剑 |
| Claymore | 双手大剑 | [R] `clm` | |
| Zweihander | 双手重剑 | [R] `9fb` | |
| Highland Blade | 高地剑 | [R] `7cm` | |
| Balrog Blade | 炎魔剑 | [R] `7gs` | |
| Colossus Blade | 巨神刃 | [R] `7gd` | |
| Axe | 斧 | [R] `axe` | |
| Hand Axe | 手斧 | [R] `hax` | |
| Battle Axe | 战斗斧 | [R] `btx` | |
| Great Axe | 重斧 | [R] `gax` | |
| Hatchet | 小斧 | [R] `9ha` | |
| Tabar | 塔巴战斧 | [R] `9bt` | |
| Giant Axe | 巨斧 | [R] `gix` | |
| Tomahawk | 土著战斧 | [R] `7ha` | |
| Decapitator | 斩首斧 | [R] `7bt` | |
| Champion Axe | 冠军斧 | [R] `7ga` | |
| Club | 木棒 | [R] `clb` | |
| Mace | 钉锤 | [R] `mac` | |
| War Hammer | 战锤 | [R] `whm` | |
| Maul | 大锤 | [R] `mau` | |
| Flanged Mace | 凸缘钉锤 | [R] `9ma` | |
| Battle Hammer | 战斗锤 | [R] `9wh` | |
| Martel de Fer | 尖头锤 | [R] `9gm` | |
| Reinforced Mace | 加固锤 | [R] `7ma` | |
| Legendary Mallet | 传奇重锤 | [R] `7wh` | ⚠ 등급 Legendary=传奇 와 겹친다 → 대안 传说之锤 (원판 번체 傳說之鎚) |
| Ogre Maul | 食肉魔锤 | [R] `7m7` | |
| Spear | 矛 | [R] `spr` | 한 글자가 목록에서 약하면 长矛 (번체) |
| Pike | 尖枪 | [R] `pik` | |
| Polearm | 长柄武器 | D2 공식 없음 (추정) | 짧게 长柄刃 |
| Scythe | 巨镰 | [R] `scy` | 무기군 Scythe(镰刀)와 갈림 |
| Lance | 骑枪 | [R] `9p9` | |
| Halberd | 斧枪 | [R] `hal` | |
| Thresher | 砍斧 | [R] `7s8` | |
| War Pike | 战争长枪 | [R] `7p7` | |
| Great Polearm | 重型长柄武器 | D2 공식 없음 (추정) | D2R Great=重 패턴 · 짧게 重型长柄刃 |
| Giant Thresher | 巨型砍斧 | [R] `7wc` | |
| Bow | 弓 | (관용) | D2 베이스 아님 |
| Short Bow | 短弓 | [R] `sbw` | |
| Hunter's Bow | 猎弓 | [R] `hbw` | |
| Long Bow | 长弓 | [R] `lbw` | |
| Short Battle Bow | 短战弓 | [R] `sbb` | |
| Razor Bow | 刀锋弓 | [R] `8hb` | |
| Long Battle Bow | 长战弓 | [R] `lbb` | |
| Diamond Bow | 钻石弓 | [R] `6s7` | |
| Blade Bow | 利刃弓 | [R] `6hb` | |
| Hydra Bow | 九头蛇弓 | [R] `6lw` | |
| Staff | 法杖 | D2 공식 없음 (추정) | |
| Short Staff | 短杖 | [R] `sst` | |
| Long Staff | 长杖 | [R] `lst` | |
| War Staff | 战杖 | [R] `wst` | |
| Jo Staff | 杖棍 | [R] `8ss` | |
| Gothic Staff | 哥特杖 | [R] `8bs` | |
| Rune Staff | 符文杖 | [R] `8ws` | |
| Walking Staff | 步行杖 | D2 공식 없음 (추정) | [R] Walking Stick=手杖 |
| Elder Staff | 接骨木杖 | [R] `6cs` | ⚠ Elder 를 「딱총나무」로 읽은 번역 · 번체 长者法杖 → 长老之杖 가 뜻에 맞다 |
| Archon Staff | 统治者之杖 | [R] `6ws` | |
| Orb | 法珠 | (추정) | [R] `Orb` 키=宝球(이름 조각) |
| Eagle Orb | 鹰眼法珠 | [R] `ob1` | |
| Sacred Globe | 圣洁之球 | [R] `ob2` | |
| Jared's Stone | 杰瑞德之石 | [R] `ob5` | |
| Glowing Orb | 闪光宝珠 | [R] `ob6` | D2R 안에서도 法珠/宝珠 섞임 |
| Crystal Globe | 水晶球 | D2 공식 없음 (추정) | Sacred Globe 패턴이면 水晶之球 |
| Swirling Crystal | 漩涡水晶 | [R] `oba` | |
| Heavenly Stone | 天界石 | [R] `obb` | |
| Eldritch Orb | 怪异法珠 | [R] `obc` | |
| Dimensional Shard | 次元碎片 | [R] `obf` | |
| Crucifix | 十字架 | D2 공식 없음 (추정) | |
| Scepter | 权杖 | [R] `scp` | |
| Rood | 圣十字 | D2 공식 없음 (추정) | 교회의 큰 십자가 |
| Archangel Rod | 大天使杖 | D2 공식 없음 (추정) | [R] Seraph Rod=炽天使杖 패턴 |
| Rune Scepter | 符文权杖 | [R] `9sc` | |
| Crozier | 牧杖 | D2 공식 없음 (추정) | 주교 지팡이 · 主教牧杖 |
| Cherub Rod | 智天使杖 | D2 공식 없음 (추정) | Cherub = 智天使 |
| Mighty Scepter | 强威权杖 | [R] `7sc` | |
| Ferula | 教宗杖 | D2 공식 없음 (추정) | 음역 费鲁拉 |
| Seraph Rod | 炽天使杖 | [R] `7qs` | |
| Bible | 圣经 | D2 공식 없음 (추정) | |
| Psalter | 诗篇集 | D2 공식 없음 (추정) | |
| Martyrology | 殉道录 | D2 공식 없음 (추정) | 정식 殉道圣人录 |
| Lectern Bible | 讲台圣经 | D2 공식 없음 (추정) | |
| Breviary | 日课经 | D2 공식 없음 (추정) | 가톨릭 정식 명칭 |
| Wicked Bible | 邪恶圣经 | D2 공식 없음 (추정) | |
| Great Bible | 大圣经 | D2 공식 없음 (추정) | 1539 영역 성경의 통칭 |
| Missal | 弥撒书 | D2 공식 없음 (추정) | |
| Apocrypha | 伪经 | [R] `Apocrypha` 키 | 키는 베이스가 아닌 이름 · 성서학 용어로는 次经 · 外典 |
| Devil's Bible | 魔鬼圣经 | D2 공식 없음 (추정) | |
| Crossbow | 弩 | [R] `mxb` | |
| Repeating Crossbow | 连击弩 | [R] `rxb` | |
| Light Crossbow | 轻弩 | [R] `lxb` | |
| Heavy Crossbow | 重弩 | [R] `hxb` | |
| Chu-Ko-Nu | 诸葛弩 | [L] · zhTW `8rx` | ⚠ zhCN 공식은 巧工弩 [R] — Chu-Ko-Nu 의 실제 뜻(제갈량의 쇠뇌)은 诸葛弩 |
| Arbalest | 巨弩 | [R] `8lx` | |
| Ballista | 弩炮 | [R] `8hx` | |
| Highland Crossbow | 高地弩 | D2 공식 없음 (추정) | 高地剑 패턴 |
| Balrog Crossbow | 炎魔弩 | D2 공식 없음 (추정) | 炎魔剑 패턴 |
| Colossus Crossbow | 巨神弩 | [R] `6hx` | |
| (참고) Morning Star | 流星锤 | [R] `mst` | CLAUDE.md 예시 |

---

## 4. 능력치 · 전투 수치

### 4-1 영웅 능력치 (hero_attribute.csv)

| English | 推荐中文 | 来源/依据 | 备注 |
|---|---|---|---|
| Strength (STR) | 力量 | [L] · [P] · D4 [17] | 약자 力 |
| Agility (DEX) | 敏捷 | [L] · [P] | 약자 敏 |
| Intelligence (INT) | 智力 | D4 [17] | PoE 국서버는 智慧 [P] · D2 는 Energy=精力 [L] |
| Vitality (VIT) | 体力 | [L] 「體力」 | 대안 体质(D&D 계열) · D4 엔 없음 |
| Luck (LCK) | 幸运 | (관용) | 약자 运 |
| Leadership (LDR) | 统率 | (관용) 코에이 삼국지 계열 | |
| Charisma (CHA) | 魅力 | (관용) | |

### 4-2 전투 수치 (combat_stat.csv) — 게임별 차이

| English | 推荐中文 | 来源/依据 | 备注 |
|---|---|---|---|
| Physical Damage | 物理伤害 | [W4] 피해 종류 필터 | |
| Magic Damage | 魔法伤害 | (관용) | |
| Crit Chance | 暴击率 | [P] 「全域暴击率」 | D4 는 暴击几率 [W4] · 플레이어는 「暴击率」 짧은 쪽 |
| Crit Damage | 暴击伤害 | D4 [17] | PoE 는 暴击伤害加成 [P] |
| Defense Ignore | 无视防御 | (관용) | D2 「忽视目标防御」 [L] |
| Resist Reduction | 抗性降低 | (추정) | PoE 「穿透」[P] 는 별개 규칙 — 이 게임은 음수 저항이라 穿透 쓰지 않는다 |
| Damage vs Type | 对类型伤害加成 | (추정) | 예: 对恶魔伤害 |
| Damage vs Ailing | 对异常敌人伤害 | (추정) | 「异常状态」= Ailment [P] |
| Max HP | 最大生命值 | D4 [17] · [P] 最大生命 | |
| Physical Defense | 物理防御 | [L] 「防御」 | 「护甲」은 D4·PoE 의 다른 수치 |
| Fire Resist | 火焰抗性 | [P] · [17] | |
| Cold Resist | 冰霜抗性 | [P] | D4 출시 전 기사 寒冷抗性 [17] · D4 피해 종류는 冰霜 [W4] |
| Lightning Resist | 闪电抗性 | [P] · [17] | |
| Poison Resist | 毒素抗性 | [W4] 「毒素伤害」 | D4 옛 기사 毒性抗性 [17] · PoE 는 混沌 |
| All Resist (참고) | 所有抗性 | [W4] · [P] | |
| Max Resist Bonus | 最大抗性提高 | [L] 「最大火焰抵抗」 | |
| Damage Reduction | 伤害减免 | D4 [17] | |
| Reflect Damage | 伤害反射 | (관용) 「反伤」 | 고정 반사(D2 「攻击者受到伤害」 [L]) = Thorns 荆棘 |
| Life Steal | 生命偷取 | [P] · [L] 「击中偷取生命」 | 말·스킬 맛으로는 吸血 (KR 흡혈) |
| HP Regen | 生命再生 | [P] 「每秒再生 X 生命」 | 대안 生命回复 |
| Attack Speed | 攻击速度 | [W4] · [P] | 은어 攻速 |
| Hit Recovery | 受击恢复 | (추정) | D2 은어 快速打击恢复(FHR) [C] · [L] 원판은 오역 |
| Ailment & Debuff Duration Reduction | 异常与减益时间缩短 | (추정) | |
| Cooldown Reduction | 冷却缩减 | D4 [17] | D3 「技能冷却时间减少」(游民星空 2014 · 검색 요약) |
| Item Find | 物品寻获 | (추정) | 은어 MF · D2 「更佳的机会取得魔法装备」[L] · KR 드랍률 직역이면 掉落率 |
| Gold Find | 金币寻获 | (추정) | D2 「额外金币」 [L] |
| Cast Speed (cast_speed_pct) | 施法速度 | [P] 「施法速度加快」 | D2 FCR 「快速施法」 [C] |
| Accuracy (hit_bonus) | 命中 | [P] 「命中值」 | D2 원판 准确率 [L] |
| Crushing Blow (둔기 특성) | 压碎性打击 | [L] 「壓碎性打擊」 | |
| Start gauge (start_gauge_pct) | 起始行动值 | (추정) | 이 게임 고유 |

---

## 5. 상태 · 키워드 (D2 / D4 / PoE 대조)

| English | 推荐中文 | 来源/依据 | 备注 |
|---|---|---|---|
| Damage over Time (DoT) | 持续伤害 | [P] · D4 [17] | |
| Thorns | 荆棘 | D4 (vhpg 검색 요약) | D2 「攻击者受到伤害」 |
| Armor (수치) | 护甲 | [P] · D4 | |
| Block | 格挡 | [P] 「格挡率」 · [L] | |
| Dodge / Evasion | 闪避 | [P] | D4 옛 기사 躲闪 [17] |
| Penetration | 穿透 | [P] 「伤害穿透」 | |
| Stun | 眩晕 | [P] 페이지 안 혼용(晕眩·眩晕·击晕) | D4 는 昏迷 [W4] · D2 원판 击昏 [L] · 셋이 다 다르다 → 가장 흔한 眩晕 (관용) |
| Freeze | 冻结 | [P] · [W4] | D2 원판 冰冻 [L] |
| Chill / Slow | 冰缓 / 减速 | [P] · [W4] | |
| Burn / Ignite | 燃烧 | [W4] | PoE 는 点燃 [P] |
| Poison | 中毒 | [P] | D4 피해 종류는 毒素 |
| Bleed | 流血 | [P] · [W4] | |
| Shield | 护盾 | [P] 「能量护盾」 | D4 Barrier=屏障 |
| Taunt | 嘲讽 | [P] Stun 페이지 | D2 원판 嘲弄 [L] |
| Summon / Minion | 召唤 / 召唤生物 | [W4] · [P] | |
| Aura | 光环 | [P] · [W4] | |
| Curse | 诅咒 | [P] · [W4] · [L] | |
| Buff / Debuff | 增益 / 减益 | [P] 용어집 본문 | |
| Knockback · Blind | 击退 · 致盲 | [P] · [L] | |
| Crowd Control | 控制 | [W4] | |
| Vulnerable · Overpower · Fortify | 易伤 · 压制 · 强固 | [W4] | D4 전용 · 참고 |
| Lucky Hit | 幸运一击 | [W4] · [17] | D4 전용 · 참고 |
| Elite | 精英 | 游民星空 「精英伤害」 | |
| Boss | 首领 | [17] | 「BOSS」 그대로도 흔하다 |

**어느 쪽이 흔한가** — 플레이어 대화는 짧은 쪽(暴击率 · 暴伤 · 攻速 · 冷却缩减)이 이긴다. 공식 UI 는 D4 가 「几率」, PoE 가 「率」. 같은 화면에서 「率」과 「几率」을 섞지만 않으면 된다.

---

## 6. 스킬 태그 · 직업 · 장 · 물약

| English | 推荐中文 | 来源/依据 | 备注 |
|---|---|---|---|
| Area | 范围 | (관용) | AoE |
| Single | 单体 | (관용) | |
| Multi-hit | 多段 | (관용) | |
| DoT | 持续伤害 | [P] | |
| Channeling | 引导 | (관용) | |
| Shout | 战吼 | (관용) | D2 원판 Warcries=吶喊 [L] |
| Blessing | 祝福 | (관용) | |
| Aura | 光环 | [P] · [W4] | |
| Boost | 强化 | (관용) | ⚠ 대장간 「강화」와 같은 글자 — 겹치면 增幅 |
| Restore | 恢复 | (관용) | |
| Curse | 诅咒 | [W4] | |
| Control | 控制 | [W4] | |
| Transform | 变身 | (관용) | D2 원판 「狼人变化」 [L] |
| Summon | 召唤 | [W4] | |
| Sacrifice | 献祭 | (관용) | |
| Warrior · Knight | 战士 · 骑士 | (관용) | |
| Mage | 法师 | [L] Sorceress=法师 | |
| Archer | 弓箭手 | (관용) | |
| Priest | 牧师 | (관용) WoW | 대안 祭司 |
| Assassin | 刺客 | [L] | |
| Necromancer | 死灵法师 | [L] · [W4] 직업 필터 | |
| Burning Battlefield | 燃烧战场 | (추정) | |
| Twisted Forest | 扭曲森林 | (추정) | |
| Golden Desert | 黄金沙漠 | (추정) | |
| Frozen Tundra | 冰封冻原 | (추정) | ⚠ KR 은 「망각의 동토」 · 4단 단어 Forgotten 과 잇는다(sin_word 비고) → 그 연결을 살리면 遗忘冻土 |
| Caverns of the Abyss | 深渊洞窟 | (추정) | |
| Corrupted Palace | 堕落宫殿 | (추정) | 4단 단어 Corrupted=堕落 과 잇는다 |
| Ruins of God | 神之废墟 | (추정) | |
| Minor Healing Potion | 初级治疗药水 | [R] `hp1` | |
| Light Healing Potion | 次级治疗药水 | [R] `hp2` | |
| Healing Potion | 治疗药水 | [R] `hp3` | |
| Greater Healing Potion | 高级治疗药水 | [R] `hp4` | |
| Super Healing Potion | 超级治疗药水 | [R] `hp5` | |

---

## 7. 칠죄종

### 7-1 표준 명사와 작품별 표기

| English | 推荐中文 | 来源/依据 | 备注 |
|---|---|---|---|
| Pride | 傲慢 | [WK] 七宗罪 「现今七宗罪一般指傲慢、嫉妒、愤怒、怠惰、贪婪、暴食、色欲」 | 七大罪 傲慢之罪 · 강철 傲慢 |
| Envy | 嫉妒 | [WK] | 七大罪 嫉妒之罪 · 강철 嫉妒 |
| Wrath | 愤怒 | [WK] 본문 | 대안 暴怒(같은 문서 목록) · 七大罪 愤怒之罪 · ⚠ 暴怒 는 暴食 과 첫 글자가 같다 |
| Sloth | 怠惰 | [WK] | 대안 懒惰 · 七大罪 怠惰之罪 · 강철 怠惰 |
| Greed | 贪婪 | [WK] | 七大罪 zh-cn 「贪婪之罪」 · 강철 표는 强欲(일본어 강욕) |
| Gluttony | 暴食 | [WK] | 대안 饕餮 · 贪食 |
| Lust | 色欲 | [WK] | 대안 情欲 · 淫欲(위키엔 없음) |

- 《七大罪》(漫画) zh-cn: 〈愤怒之罪〉梅里奥达斯 · 〈嫉妒之罪〉戴安娜 · 〈贪婪之罪〉班 · 〈怠惰之罪〉金恩 · 〈色欲之罪〉哥塞尔 · 〈暴食之罪〉玛琳 · 〈傲慢之罪〉艾斯卡诺 [WK]. 「罪名 + 之罪」가 고정 문형이다.
- 《钢之炼金术师》 인조인간: 음역(拉斯特 · 恩维 · 古利德 · 斯洛思 · 普莱德 등)이 이름이고, 칠죄종 대조표는 色欲 · 暴食 · 嫉妒 · 强欲 · 怠惰 · 愤怒 · 傲慢 [WK].
- **이 게임 권장: 傲慢 · 嫉妒 · 愤怒 · 怠惰 · 贪婪 · 暴食 · 色欲** (위키 첫 문장 그대로 · 일곱 첫 글자가 서로 다르다).

### 7-2 sin_word.csv 35 단어 — 아이템 이름 앞 단어 제안 (전부 추정)

뽑은 기준 — 영어 형용사 직역 · 두 글자 · **다른 죄종과 첫 글자가 겹치지 않음**(item_design §1 「갈망 ↔ 갈취」 규칙을 중국어에도 적용 · 35개 첫 글자 전부 다름 확인) · 한 죄종 안에서도 단끼리 글자가 덜 겹치게.

| 죄종 | 1단 (Lv1) | 2단 (Lv10) | 3단 (Lv30) | 4단 (Lv40) | 5단 = 죄종 이름 (Lv50) |
|---|---|---|---|---|---|
| Wrath | Indignant 义愤 | Raging 盛怒 | Rampaging 狂乱 | Slaughtering 屠戮 | Wrathful 愤怒 |
| Envy | Begrudging 眼红 | Jealous 猜忌 | Spiteful 怨恨 | Treacherous 背叛 | Envious 嫉妒 |
| Greed | Acquisitive 占有 | Exploitative 剥削 | Extorting 勒索 | Rapacious 掠夺 | Greedy 贪婪 |
| Sloth | Lazy 慵懒 | Weary 倦怠 | Lethargic 萎靡 | Forgotten 遗忘 | Slothful 怠惰 |
| Gluttony | Gorging 过食 | Hungering 饥饿 | Predatory 捕食 | Abyssal 深渊 | Gluttonous 暴食 |
| Lust | Amorous 恋慕 | Obsessive 执迷 | Debauched 放荡 | Corrupted 堕落 | Lustful 色欲 |
| Pride | Conceited 自负 | Contemptuous 轻蔑 | Dominating 支配 | Usurping 篡夺 | Prideful 傲慢 |

- 손볼 후보 — 眼红(구어 · 대안 艳羡) · 倦怠 ↔ 怠惰 가 「怠」를 같이 쓴다(대안 厌倦) · 过食(밋밋 · 의역 대안 狼吞) · 捕食(의역 대안 吞噬). 「诅咒」는 스킬 태그 Curse 와 겹쳐 뺐다.
- 신단(`<1단 형용사> Shrine`) 예 — Indignant Shrine → 义愤圣坛.

---

## 8. 시스템 · UI 낱말

| English | 推荐中文 | 来源/依据 | 备注 |
|---|---|---|---|
| Expedition | 远征 | (관용) | 다키스트 던전은 「探险」(3DM 공략 · 검색 요약) |
| Exploration | 探索 | (관용) | |
| Tavern | 酒馆 | 다키스트 던전 zh (3DM 공략 · 검색 요약) | |
| Blacksmith | 铁匠铺 | 다키스트 던전 zh (같은 출처) | 사람은 铁匠 |
| Codex / Bestiary | 图鉴 | (관용) | 怪物图鉴 |
| Mastery | 专精 | 그림 던 「专精」 (游民星空 · 검색 요약) | WoW 「精通」은 능력치 이름이라 피한다 |
| Class advancement | 转职 | (관용) | |
| Formation (편성) | 编队 | (관용) 수집형 RPG | 위치 배치 뜻이면 阵型 |
| Roster | 英雄名册 | 다키스트 던전 zh (검색 요약) | |
| Commission / Quest | 委托 | 원신 「每日委托」(biligame 위키 · 검색 요약) | 일반 퀘스트는 任务 |
| Salvage | 分解 | (관용) D3 · D4 | |
| Temper | 淬炼 | D4 Tempering [17] | |
| Enhance / Upgrade | 强化 | (관용) | 스킬 태그 Boost 와 겹침 주의(§6) |
| Masterwork (참고) | 精造 | D4 [17] | |
| Craft | 制作 | (관용) | 대안 打造 |
| Potion | 药水 | [R] | |
| Gold | 金币 | [R] `gld` | |
| Inventory | 背包 | (관용) | D2 원판 物品栏 [L] |
| Stash | 储物箱 | [L] 「儲物箱/儲藏箱」 | 대안 仓库 |
| Shrine | 圣坛 | D4 (17173 · 검색 요약) | PoE 神龛(poedb · 검색 요약) · D2 원판 神殿 [L] |
| Raid | 团队副本 | (관용) WoW | 짧게 突袭 |
| Arena / Duel arena | 竞技场 / 决斗场 | (관용) | 이 게임 「결투장」 → 决斗场 |
| Ladder | 天梯 | [L] | |
| Season · Paragon | 赛季 · 巅峰 | [17] | 참고 |
| Normal · Nightmare · Hell (난이도) | 普通 · 噩梦 · 地狱 | [L] 「惡夢」「地獄」 | D4 는 梦魇 [17] |
| Identify | 鉴定 | [R] 「鉴定卷轴」 | |
| Town Portal | 城镇传送 | [R] | |

---

## 9. 이름 조합 규칙

**출처에서 확인한 문형**

| 게임 | 앞 옵션(Prefix) | 뒤 옵션(Suffix) | 예 |
|---|---|---|---|
| D2R zhCN [R] | 맨 형용사 2자 또는 「X的」 | 「X之」 | Cruel 暴虐 · Vicious 凶恶 · King's 国王的 · Jeweler's 珠宝匠的 / of the Whale 巨鲸之 · of Quickness 极速之 · of the Leech 水蛭之 |
| D2R 레어 이름 [R] | 이름 조각 둘을 잇는다 | | Doom 厄运 + Grip 紧握 · Bane 之灾 · Song 之歌 |
| D2R 유니크 [R] | 「人名的X」 또는 「X之Y」 | | 泰瑞尔的力量 · 安达莉尔的仪容 · 大君之怒 · 亚瑞特之貌 · 死神丧钟 |
| PoE 국서버 [P] | 「X的」 | 「X之」 | 致命的 · 反抗者的 / 深渊之 · 对立之 |
| PoE 매직 전체 이름 | 앞 + 뒤 + 베이스 | | 「磨砂之冲击长弓」(Frosted Long Bow of Impact · 중문 fandom 옛 판 · 검색 요약) |
| D4 zhCN [W4] | 威能 이름 「X之威能」 | | |

- **「X of Y」 → 「Y之X」** — 순서를 뒤집는다: Caverns of the Abyss → 深渊洞窟 / 深渊之窟 · Ruins of God → 神之废墟 · Skin of the Vipermagi → 蝮蛇法妖之皮 [R].
- **뒤 옵션 「X之」은 베이스 바로 앞에 붙는다** — 「之」로 끝나는 조각이라 중국어 어순상 명사 앞에만 설 수 있다. 그래서 전체 순서가 「앞 + 뒤之 + 베이스」가 된다 (추정 — PoE 옛 위키 예와 맞는다).

**이 게임 이름 문형(item_design §1 「이름」: Magic = `A Base` · Rare/Epic/Legendary = `A and B Base`)에 맞춘 제안 (추정)**

| 안 | 매직 | 레어 이상 | 판단 |
|---|---|---|---|
| **A — 「之」 (권장)** | 盛怒之长剑 | 盛怒与猜忌之长剑 | KR 「A의 / A와 B의」와 1:1 · D4 「X之威能」 · D2R 「X之」와 같은 결 · 다크 판타지 어조 |
| B — 맨 붙임 (D2R 앞 옵션식) | 盛怒长剑 | 盛怒猜忌长剑 | 가장 짧다 · 레어는 단어 경계가 흐려진다 |
| C — 「的」 (PoE 앞 옵션식) | 盛怒的长剑 | 盛怒与猜忌的长剑 | 구어체 · 어조가 가볍다 |

- 「与」 대신 「而」(盛怒而猜忌)는 형용사 병렬이라 뜻은 맞지만 이름으로는 낯설다 → 与.
- 정예 몬스터(`Wrathful Skeleton Knight`)도 같은 문형 → 愤怒之骷髅骑士 (D2R 은 Skull 을 骷髅로 쓴다 — `Skull Cap`=骷髅帽 [R]).
- 등급 색 · 등급 이름을 이름 안에 넣지 않는다 — `Legendary Mallet`(传奇重锤)처럼 등급어와 겹치는 베이스는 §3 대안을 본다.

---

## 10. 어조 · 문체

- **이름(아이템 · 스킬 · 장소)** — 2~4자 · 「之」 소유격 · 사자성어 리듬. D2R 유니크가 모범: 死神丧钟 · 末日使者 · 夜翼面纱 · 风之力 · 大君之怒 [R].
- **세계관 글(몬스터 · 스테이지 · 영웅 이야기)** — **현대 서면어 + 약간의 문언 허사**. D4 zhCN 공식 플레이버 예: 「你拥有从天上摘取星辰的力量，犹如孩童摘取枝条上的果子一样轻松。」 — 无名 [W4 아이템 툴팁]. 「犹如 · 之 · 其 · 乃 · 亦」 정도만 쓰고 완전한 문언(半文言 전면)은 피한다 — 읽는 속도가 떨어진다 (추정).
- **문언은 이름에 집중해서 쓴다** — 다키스트 던전 2 간체 번역진은 대중문화 인용을 버리고 고전(도연명 · 삼국지연의)에서 가져왔다: 스킬 Ruin → 「玉碎」, Reflection → 「明鉴」, 장신구 Cruel Intent → 【灭】 · Selfish Motivation → 【浊】. 직역 「残忍意图 · 自私动机」은 「플레이어가 기억하기 어렵다」며 버렸다 [DD2]. ⚠ 이 게임은 규칙 6(의역 금지 · 영어 원본 직역)이라 DD2 식 의역은 **플레이버 글에만** 참고한다.
- **툴팁 · 옵션 줄** — 평이한 현대어 · 숫자 먼저: 「+12.0% 暴击几率」 · 「+(20—30)% 火焰抗性」 [W4] · [P]. 규칙 7(툴팁은 짧게) 그대로.
- **과거형 서술(이 게임 「소설체」 규칙)** — 중국어는 시제가 없어 「了 · 曾 · 已」와 시간어로 낸다. 「了」를 문장마다 박지 않는다 (추정).
- **피할 것** — 인터넷 은어(yyds · 绝绝子) · 가벼운 「的」 남발 · 번체 글자 섞임(鎚 · 鎧 — 원판 [L] 표기를 옮길 때 주의).

---

## 11. 이번 조사에서 짚을 점

1. **D2R zhCN 은 원판 번체와 다른 새 번역이다** — Quilted Armor 内衬甲(번체 棉布甲) · Greater Healing Potion 高级治疗药水(원판 强力药剂) · Horadric Cube 赫拉迪姆魔盒. 중국 커뮤니티 공략은 두 판이 섞여 있다.
2. **D2R zhCN 공식명 중 어색한 것 넷** — 吸能鬼(Vampire) · 接骨木杖(Elder Staff) · 巧工弩(Chu-Ko-Nu) · 侍从护胫(Myrmidon). 그대로 쓸지 대안을 쓸지는 결정할 일.
3. **등급어 충돌** — PoE 는 Unique=传奇, D4 는 Legendary=传奇 · Unique=暗金. 이 게임은 둘 다 있어 D4 쌍이 맞다. 베이스 「传奇重锤」가 등급어와 겹친다.
4. **D2R 의 「Great = 重 · Giant = 巨/巨型」** 규칙 — 이 게임 Great Polearm · Great Bible 등 새 이름을 지을 때 따를지 정해야 한다(Great Bible 은 역사명 大圣经 이 따로 있다).
5. 못 구한 것 — D2R zhCN 등급 이름 · 옵션 줄 원문(`item-modifiers.json` · `ui.json`) · 디아3 zhCN 1차 자료.

*마지막 업데이트: 2026-11-16*
