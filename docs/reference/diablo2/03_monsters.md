# Diablo 2 몬스터 전수 조사

> 조사 범위: Diablo II + Lord of Destruction, Act 1~5 정규 몬스터 계열 전체 + 유니크/슈퍼유니크 보스 + 몬스터 모디파이어 + 원소 면역(Immunity).
> 1차 출처: **The Arreat Summit**(Blizzard 공식 아카이브, classic.battle.net 생존분) · d2tomb.com(Tomb of Knowledge) · maxroll.gg. `diablo.fandom.com`/`diablo-archive.fandom.com`/`diablo2.diablowiki.net`/`purediablo.com` 상당수 페이지는 402/403 으로 막혀 직접 인용하지 못했다(`00_overview.md` 와 동일 제약).
> 한글명은 국내 정발판 공식 자막을 페이지별로 전수 대조하지 못해 **커뮤니티 통용 음역**을 썼다 — 표기가 정발판과 다를 수 있음. 스탯(레벨·HP·저항 수치)은 패치마다 바뀌므로 이 문서에는 적지 않았고, 본작 SSOT 가 아니다.

---

## 1. 계열 지도 — 한눈에

D2 몬스터는 액트마다 완전히 새 몬스터를 그리지 않는다. **하나의 "계열"(몬스터 클래스)이 Normal → Nightmare → Hell 난이도, 그리고 이후 액트에서 이름과 색만 바꿔 재등장**하는 구조다(예: Skeleton → Returned → Bone Warrior → Burning Dead → Horror 는 전부 같은 몬스터 AI/모델의 난이도별 개명). 그래서 표의 "몬스터" 한 행은 사실상 하나의 원형(archetype)이고, 비고 칸에 그 원형이 난이도를 거치며 갈아입는 이름들을 적었다.

- **분류 축은 타입 3개**(Normal/Animal · Demon · Undead) — 우리 프로젝트가 쓰는 3분류(Normal/Demon/Undead)와 정확히 대응한다.
- **액트마다 생태 테마가 다르다**: 1막 = 숲/장원(타락한 로그·언데드), 2막 = 사막/무덤(도굴·미라·독사), 3막 = 정글/늪(식인·촉수·타락 성직자), 4막 = 지옥(악마 군세), 5막 = 설산(공성 악마+얼음).
- **정규 계열 수**: 1막 20(구조물 포함) · 2막 18 · 3막 10 · 4막 6 · 5막 16 — 아래 §2 참고.
- **보스급**은 액트보스 5(안다리엘·듀리엘·메피스토·디아블로·바알) + 슈퍼유니크 40여 종으로 별도 §5 에 정리했다.

---

## 2. 전수 표

**죄종 태그**는 분노/시기/탐욕/나태/폭식/색욕/오만 중 0~2개, 해당 없으면 `—`. 한 행 = 한 계열(난이도별 변종은 비고에 묶음).

### Act I — 숲과 장원 (Rogue Encampment ~ Catacombs)

| 계열 | 몬스터 (영문) | 한글명 | 등장 지역·맥락 | 생김새·특징 | 죄종 태그 |
|---|---|---|---|---|---|
| Fallen | Fallen | 폴른 | Blood Moor~Stony Field 전역 | 작고 빨간 뿔난 잡귀, 동료가 죽으면 비명 지르며 도망쳤다가 다시 몰려온다. 비고: Carver/Devilkin/Dark One/Warped One | 분노 |
| Fallen Shaman | Fallen Shaman | 폴른 샤먼 | Fallen 무리에 섞여 등장 | 파이어볼트로 원거리 지원, 죽은 Fallen을 다시 일으켜 세운다. 비고: Carver/Devilkin/Dark/Warped Shaman | 분노 |
| Quill Rat | Quill Rat | 퀼 랫 | Blood Moor, Stony Field | 가시투성이 대형 설치류, 근접 시 가시 발사. 비고: Spike Fiend/Thorn Beast/Razor Spine/Jungle Urchin | — |
| Zombie | Zombie | 좀비 | Blood Moor, Den of Evil | 느리게 걷는 부패한 시체, 독 저항. 비고: Hungry Dead/Ghoul/Plague Bearer/Drowned Carcass | 폭식 |
| Wendigo | Wendigo | 윈디고 | Dark Wood, Black Marsh | 거대한 설인형 야수(원전 배치는 숲이지만 신화상 "겨울에 인간을 잡아먹는 괴물"). 비고: Gargantuan Beast/Brute/Yeti/Crusher/Wailing Beast — 우리 monster_base **Yeti** 와 직접 대응 | 나태·폭식 |
| Corrupt Rogue (근접) | Dark Hunter | 다크 헌터 | Burial Grounds~Outer Cloister | Andariel의 독에 타락해 옛 동료를 공격하는 로그 궁수대의 근접형. 원래 선한 NPC의 반전된 모방체. 비고: Vile/Black/Flesh Hunter | 시기 |
| Corrupt Rogue (궁수) | Dark Ranger | 다크 레인저 | 위와 동일 | 화살 원거리 딜러형. 비고: Vile/Dark/Black/Flesh Archer | 시기 |
| Corrupt Rogue (창병) | Dark Spearwoman | 다크 스피어우먼 | 위와 동일 | 창을 쓰는 근접 변종. 비고: Vile/Dark/Black/Flesh Lancer | 시기 |
| Skeleton | Skeleton | 스켈레톤 | Cave, Crypt, Mausoleum 등 | 기본 언데드 그런트, 언데드 전용기 취약. 비고: Returned/Bone Warrior/**Burning Dead**(화염 변종)/Horror | — |
| Skeleton Archer | Skeleton Archer | 스켈레톤 아처 | 위와 동일 | 화살 스켈레톤. 비고: Returned/Bone Warrior/Burning Dead/Horror Archer | — |
| Skeleton Mage | Skeleton Mage | 스켈레톤 메이지 | Crypt, Mausoleum | 냉기/화염/번개/독 중 하나의 원소 볼트. 비고: Returned/Bone/Burning Dead/Horror Mage | — |
| Goatman | Goatman | 고트맨 | Stony Field, Underground Passage | 염소 얼굴의 전쟁부족 그런트. 씨족명 자체가 전쟁·피 테마(Blood/Death/Hell Clan). 비고: Moon/Night/Blood/Death/Hell Clan | 분노 |
| Blood Hawk | Blood Hawk | 블러드 호크 | Cold Plains, Stony Field | Blood Hawk Nest 에서 계속 태어나는 맹금. 비고: Foul Crow/Black Raptor/Cloud Stalker | — |
| Tainted | Tainted | 테인티드 | Jail 레벨들 | 번개 속성 공격 + 번개 저항을 가진 오염된 인간형. 비고: Misshapen/Disfigured/Afflicted/Damned | — |
| Giant Spider | Giant Spider | 자이언트 스파이더 | Spider Forest(재사용), Black Marsh | 거미줄로 공격속도 저하. 비고: Arach/**Poison Spinner**/**Flame Spider**/Spider Magnus(색별 속성 상이) | — |
| Wraith | Wraith | 레이스 | Forgotten Tower, Crypt | 형체 없는 유령, 접촉 시 마나를 빨아먹는다 — "기생"에 직결. 비고: Ghost/Spector/Apparition/Dark Shape | 시기 |
| Vampire | Vampire | 뱀파이어 | Catacombs | 생명력을 흡수하고 파이어볼/메테오까지 쓰는 상급 언데드. 비고: Banished/Ghoul Lord/Night Lord/Dark Lord/**Blood Lord**(Act5 의 동명 별도 계열과 이름만 중복) | 색욕·폭식 |
| Flying Scimitar | Flying Scimitar | 플라잉 시미터 | 트랩에서 생성 | 실체 없이 떠다니는 칼, 트랩이 소환하는 부산물 | — |
| Blood Hawk Nest | Blood Hawk Nest | 블러드 호크 둥지 | Cold Plains, Stony Field | 파괴 전까지 Blood Hawk 를 계속 낳는 구조물 | — |
| Gargoyle Trap | Gargoyle Trap | 가고일 트랩 | Catacombs | 파이어볼을 쏘는 벽면 장치, 우리 base **Gargoyle** 과 이름만 겹침(실제로는 몬스터가 아니라 트랩) | — |

### Act II — 사막과 무덤 (Lut Gholein ~ Tal Rasha's Tomb)

| 계열 | 몬스터 (영문) | 한글명 | 등장 지역·맥락 | 생김새·특징 | 죄종 태그 |
|---|---|---|---|---|---|
| Greater Mummy | Greater Mummy | 그레이터 미이라 | Stony Tomb, Tal Rasha's Tomb | 하급 미이라를 일으키고 독구름을 뿜는 무덤 수호자. 비고: Hollow One/Guardian/Unraveler/**Horadrim Ancient**(Tal Rasha 무덤 최종 수호) | 탐욕 |
| Mummy | Mummy | 미이라 | Stony Tomb, Tombs 전역 | 죽을 때 독구름 폭발. 비고: Dried Corpse/Decayed/Embalmed/Preserved Dead/Cadaver | 탐욕 |
| Sand Raider | Sand Raider | 샌드 레이더 | Rocky Waste, Dry Hills | 사막을 떠도는 인간형 약탈자·도굴꾼. 비고: Marauder/Invader/Infidel/Assailant | 탐욕 |
| Bat Demon | Bat Demon | 배트 데몬 | Far Oasis, 동굴 지역 | 번개 공격을 쓰는 박쥐떼, 흡혈 이미지. 비고: Desert Wing/Fiend/**Gloom Bat**(3막 하수도에 재등장)/Blood Diver/Dark Familiar | 폭식 |
| Claw Viper | Claw Viper | 클로 바이퍼 | Claw Viper Temple | 냉기 공격을 쓰는 뱀 신전 수호 무녀. 비고: Tomb Viper/Salamander/Pit Viper/Serpent Magus | — |
| Blunderbore | Blunderbore | 블런더보어 | Lost City, 무덤 주변 | 스턴 공격을 쓰는 거구 오우거. 비고: Gorebelly/Mauler/Urdar | — |
| Lightning Spire | Lightning Spire | 라이트닝 스파이어 | 무덤 함정방 | 번개를 뿜는 고정 탑, 마법/물리 저항 매우 높음 | 탐욕(보물 함정) |
| Mummy Sarcophagus | Mummy Sarcophagus | 미이라 석관 | 무덤 | 파괴 전까지 Mummy 를 계속 소환하는 관 | 탐욕 |
| Fire Tower | Fire Tower | 파이어 타워 | 무덤 함정방 | 회전하며 화염 레이저 발사, 회피 패턴 요구 | 탐욕(보물 함정) |
| Leaper | Leaper | 리퍼 | Far Oasis, 동굴 | 바바리안 도약기와 비슷한 돌진 공격. 비고: Sand/Cave Leaper, Tree Lurker, Tomb/Cliff Creeper | — |
| Scarab Demon | Scarab Demon | 스캐럽 데몬 | Rocky Waste, Far Oasis | 이집트 황금 풍뎅이 모티프 곤충, 번개 공격. 비고: Dung Soldier/Death Beetle/Steel Scarab/Bone Scarab | 탐욕 |
| Sand Maggot | Sand Maggot | 샌드 매것 | Maggot Lair | 알을 낳고 부화시키는 거대 구더기 여왕. 비고: Rock Worm/Devourer/Giant Lamprey/Blood Maggot | 폭식 |
| Sand Maggot Egg | Sand Maggot Egg | 샌드 매것 알 | Maggot Lair | 경험치 없음, 부화해 Young 을 생성 | 폭식 |
| Sand Maggot Young | Sand Maggot Young | 샌드 매것 유충 | Maggot Lair | 경험치 없음, 성체로 성장 | 폭식 |
| Vulture Demon | Vulture Demon | 벌처 데몬 | Rocky Waste, Dry Hills | 시체를 맴도는 독수리 떼. 비고: Carrion Bird/Undead Scavenger/Hell Buzzard/Winged Nightmare | — |
| Swarm | Swarm | 스웜 | Far Oasis, Lost City | 스태미나를 빨아먹는 벌레떼. 비고: Itches/Black Locusts/Plague Bugs/Hell Swarm | 폭식 |
| Sabre Cat | Sabre Cat | 세이버 캣 | Rocky Waste, Dry Hills | 사막 부족이 부리는 검치호. 비고: Huntress/Night Tiger/Hell Cat | — |
| Slinger | Slinger | 슬링어 | Rocky Waste, Dry Hills | 투석·투창형 사막 부족 원거리 딜러. 비고: Spear Cat/Night Slinger/Hell Slinger | — |

### Act III — 정글과 사원 (Kurast ~ Durance of Hate)

| 계열 | 몬스터 (영문) | 한글명 | 등장 지역·맥락 | 생김새·특징 | 죄종 태그 |
|---|---|---|---|---|---|
| Fetish Shaman | Fetish Shaman | 페티시 샤먼 | Spider Forest~Flayer Jungle | 정글 원주민 주술사, 인페르노형 광역 주문. 비고: **Flayer Shaman**(NM)/**Soul Killer Shaman**(Hell) — 스펙이 지목한 "Flayer(Soul Killer)" 가 바로 이 계열의 Hell 개명 | — |
| Giant Mosquito | Giant Mosquito | 자이언트 모스키토 | Spider Forest, Flayer Jungle | 체력·스태미나를 빨아먹는 대형 모기. 비고: Sucker/Feeder | 폭식 |
| Thorned Hulk | Thorned Hulk | 쏜드 헐크 | Great Marsh, Flayer Jungle | 가시덩굴로 뒤덮인 거대 식물 골렘. 비고: Bramble Hulk/Thrasher/Spikefist | — |
| Baboon Demon | Baboon Demon | 바분 데몬 | Spider Forest(2막에서도 재사용) | 나무를 타는 원숭이형 악마 무리. 비고: Dune Beast/Jungle Hunter/Doom Ape/Temple Guard | — |
| Frog Demon | Swamp Dweller | 스웜프 드웰러 | Great Marsh, Flayer Jungle | 늪지에서 튀어나오는 개구리형 괴물, 스펙이 지목한 "Swamp Dweller". 비고: Bog Creature/Slime Prince | 시기 |
| Willowisp | Willowisp | 윌로위습(도깨비불) | Great Marsh, Kurast Bazaar | 빛으로 유인해 번개로 공격하는 형체 없는 언데드 불꽃. 비고: Gloam/Burning Soul | 색욕 |
| Tentacle Beast | Water Watcher | 워터 워처 | Great Marsh, 강변 | 물 속에서 촉수로 공격하는 심연 수생 괴물 — 스펙이 지목한 원형 그 자체. 비고: River Stalker/Stygian Watcher | 시기 |
| Zakarum Zealot | Zakarum Zealot | 자카룸 젤롯 | Ruined Temple, Travincal | 타락한 자카룸 교단의 광신도 전사. 비고: Zakarumite/Faithful/Zealot | 오만 |
| Zakarum Priest | Zakarum Priest | 자카룸 프리스트 | Ruined Temple, Travincal | 아군을 치유하며 번개/블리자드를 쓰는 사제. 비고: Sexton/Cantor/Heirophant | 오만 |
| Council Member | Council Member | 카운슬 멤버(평의회원) | Travincal, Durance of Hate | 도시를 타락시킨 로브 차림의 최고 평의회, 번개/저주 캐스터 | 오만 |

### Act IV — 지옥 (Pandemonium Fortress ~ Chaos Sanctuary)

| 계열 | 몬스터 (영문) | 한글명 | 등장 지역·맥락 | 생김새·특징 | 죄종 태그 |
|---|---|---|---|---|---|
| Finger Mage | Finger Mage | 핑거 메이지 | River of Flame, Plains of Despair | 마나를 급속히 빨아먹는 손가락 형상 부유체. 비고: Groper/Strangler/Storm Caster | — |
| Megademon | Megademon | 메가데몬 | Plains of Despair, Chaos Sanctuary | 거대한 뿔 달린 악마 군주, 인페르노급 화염 공격. 비고: **Balrog**(화염)/**Pit Lord**(화염, 슈퍼유니크 "Infector of Souls" 베이스)/**Venom Lord**(독, 스펙이 지목한 계열) | 분노·색욕 |
| Regurgitator | Regurgitator | 리거저테이터 | Plains of Despair | 시체를 먹고 토해내는 데모, "삼키기·소화" 그 자체. 비고: **Corpulent**/Corpse Spitter/**Maw Fiend** — 스펙이 지목한 두 이름 모두 이 계열 | 폭식 |
| Oblivion Knight | Oblivion Knight | 오블리비언 나이트 | River of Flame, Chaos Sanctuary | 검 또는 원소 속성으로 빛나는 손을 가진 기사, 저주·본 스피릿/스피어 시전. 비고: **Doom Knight**/**Abyss Knight** — 스펙이 지목한 두 이름 모두 이 계열 | 오만 |
| Vile Mother | Vile Mother | 바일 마더 | River of Flame | 살아있는 한 계속 Vile Child 를 낳는 기생적 번식체. 비고: Flesh Spawner/Stygian Hag/Grotesque | 시기 |
| Vile Child | Vile Child | 바일 차일드 | River of Flame | Vile Mother 의 새끼, 처치해도 경험치 없음. 비고: Flesh Beast/Stygian Dog/Grotesque Wyrm | 시기 |

### Act V — 설산과 공성전 (Harrogath ~ Worldstone Keep)

| 계열 | 몬스터 (영문) | 한글명 | 등장 지역·맥락 | 생김새·특징 | 죄종 태그 |
|---|---|---|---|---|---|
| Enslaved | Enslaved (Baal's Minion) | 인슬레이브드 | Bloody Foothills, Frigid Highlands | 바알에게 사로잡혀 짐승으로 변한 옛 주민, Overseer 자극 시 자폭형(Suicide Minion)으로 전환. 비고: Slayer/Ice Boar/Fire Boar/Hellspawn/Icespawn | — |
| Death Mauler | Death Mauler | 데스 몰러 | Frigid Highlands, Arreat Plateau | 거대한 주먹의 근접 브루트. 비고: Death Brawler/Death Slasher/Death Berserker/Death Brigadier | — |
| Catapult | Catapult | 캐터펄트 | Siege Encampment | 화염/번개/냉기/독 중 하나를 원거리 투사하는 공성 병기 | 분노 |
| Overseer | Overseer | 오버시어(감독관) | Bloody Foothills 등 전역 | 채찍으로 미니언을 광폭화시키고 치유하는 감독관 — 지배·복종 구도. 비고: Lasher/Blood Boss/Hell Whip | 오만 |
| Demon Imp | Demon Imp | 데몬 임프 | Glacial Trail, Frozen Tundra | 순간이동하며 화염을 던지고 Siege Beast 에 올라타는 임프 — 우리 base **Imp** 와 직접 대응. 비고: Rascal/Gremlin/Trickster/Rogue | — |
| Siege Beast | Siege Beast | 시즈 비스트(공성 짐승) | Siege Encampment, Arreat Plateau | 갑주를 두른 공성용 돌격 짐승, 근접 충돌 + 지면 진동 공격. 비고: Crush Beast/Blood Bringer/Gore Bearer/Demon Steed | 분노 |
| Abominable | Abominable | 어보미너블 | Frozen River, Glacial Trail | 거대한 손으로 후려치는 얼음 오우거. 비고: Snow Drifter/Chilled Froth/Frozen Abyss | 나태 |
| Reanimated Horde | Reanimated Horde | 리애니메이티드 호드 | Glacial Trail, Frozen Tundra | 돌격 공격 + 재소생하는 언데드 야만인 무리. 비고: Rot Walker/Prowling Dead/Unholy Corpse/Defiled Warrior | — |
| Succubus | Succubus | 서큐버스 | Frigid Highlands, Arreat Plateau | 빠른 기동 + 다양한 저주를 쓰는 유혹형 악마 — 스펙이 지목한 원형 그 자체, 우리 base **Succubus** 와 직접 대응. 비고: Vile Temptress/Stygian Harlot/Hell/Blood Temptress | 색욕 |
| Stygian Fury | Stygian Fury | 스티지언 퓨리 | 위와 동일 | 저주+원거리 공격을 쓰는 세이렌형 악마, "피의 마나" 저주는 시전자에게도 반동 피해. 비고: **Siren**(신화상 뱃사람을 유혹해 죽이는 요괴)/Vile Witch/Blood Witch/Hell Witch | 색욕 |
| Frozen Horror | Frozen Horror | 프로즌 호러 | Icy Cellar, Glacial Trail | 냉기 폭발(Arctic Blast) 시전하는 얼음 언데드 — 나태 원소(냉기) 그 자체. 비고: Frozen Creeper/Terror/Scourge/Scorch | 나태 |
| Blood Lord | Blood Lord | 블러드 로드 | Frozen River, Nihlathak's Temple | 광란(Frenzy) 공격을 쓰는 흡혈 언데드 군주 — "흡혈" 은 색욕과 폭식 양쪽 키워드에 걸림. 비고: Moon/Night Lord, Hell/Death Lord(Act1 Vampire 계열과 최상위 이름이 겹침) | 폭식·색욕 |
| Putrid Defiler | Putrid Defiler | 퓨트리드 디파일러 | Ancients' Way, Icy Cellar | 날카로운 앞다리로 찌르며 Pain Worm 을 낳는 부패한 어미 곤충. 비고: Retched/Fetid/Rancid/Rank Defiler | 폭식 |
| Pain Worm | Pain Worm | 페인 웜 | 위와 동일 | Putrid Defiler 가 낳는 소형 기생 벌레. 비고: Torment/Agony/Menace/Anguish Worm | 폭식 |
| Minion of Destruction | Minion of Destruction | 미니언 오브 디스트럭션 | Throne of Destruction 한정 | 최종 던전 전용 고레벨(55/57/60) 악마 잡몹 | — |

**총 계 §2 행 수**: Act1 20 + Act2 18 + Act3 10 + Act4 6 + Act5 16 = **70행**.

---

## 3. 죄종별 후보 — 우리 7보스에 바로 붙는 것

### 분노 (사탄 · 화염)
- **Fallen / Fallen Shaman** — 파이어볼트를 쏘며 무리 지어 폭주하는 잡귀, 화염 전장 잡몹으로 그대로 대입 가능
- **Goatman**(Blood/Death/Hell Clan) — 전쟁부족 그런트, "학살·폭주" 결과 직결
- **Siege Beast / Catapult** — 공성 병기·돌격 짐승, "전쟁·용암 대장간" 테마의 정예급 후보
- **Megademon(Balrog/Pit Lord)** — 뿔 달린 화염 악마 군주, 챕터보스 바로 아래 급 정예로 적합

### 시기 (레비아탄 · 바다/심연)
- **Tentacle Beast(Water Watcher)** — 스펙이 지목한 정확한 원형, 심연 수생 촉수 그 자체
- **Frog Demon(Swamp Dweller)** — 늪지 심연 생물
- **Wraith** — 마나를 빨아먹는 유령, "기생" 키워드에 직결
- **Corrupt Rogue 3종** — 원래 선한 NPC가 타락해 옛 동료를 공격하는 구도, "모방·변형" 키워드에 직결
- **Vile Mother / Vile Child** — 살아있는 한 끝없이 새끼를 낳는 기생적 번식 구도

### 탐욕 (맘몬 · 황금/사막)
- **Mummy / Greater Mummy / Horadrim Ancient** — 무덤을 지키는 보물 수호자, "사막·보물 수호자" 정확 매치
- **Sand Raider** — 사막을 떠도는 도굴꾼·약탈자
- **Scarab Demon** — 이집트 황금 풍뎅이 상징의 곤충형
- **Mummy Sarcophagus / Lightning Spire / Fire Tower** — 무덤 함정 구조물, 보물수호 기믹 참고용

### 나태 (벨페고르 · 냉기)
- **Abominable** — 손으로 후려치는 얼음 오우거
- **Frozen Horror** — 이름부터 냉기 언데드, 냉기 폭발 시전
- **Wendigo** — 설원에서 인간을 잡아먹는다는 신화 원형(원작 배치는 숲이지만 아키타입은 냉기·식인과 강하게 결부되며, 우리 base Yeti 와 이미 대응)

### 폭식 (바알제붑 · 파리/벌레/부패)
- **Regurgitator(Corpulent/Maw Fiend)** — 스펙이 지목한 정확한 원형, 시체를 삼키고 토해낸다
- **Putrid Defiler + Pain Worm** — 부패한 어미가 기생 벌레를 낳는 구도, 포식과 기생충 둘 다 겸함
- **Sand Maggot(+Egg+Young)** — 알을 낳고 부화하는 번식 사이클 자체가 "폭식·번식" 테마
- **Swarm / Giant Mosquito** — 벌레떼, 흡혈
- **Hell Bovine("The Cow King" 슈퍼유니크의 기반)** — 스펙이 직접 예시로 든 이스터에그성 몬스터, 폭식 챕터 유머 요소로 참고 가능

### 색욕 (아스모데우스 · 독)
- **Succubus(Vile Temptress 등)** — 스펙이 지목한 정확한 원형, 우리 base Succubus 와 직접 대응
- **Stygian Fury(Siren)** — 뱃사람을 유혹해 죽이는 세이렌 신화와 정확히 매치
- **Willowisp** — 빛으로 유인해 죽이는 유혹의 컨셉
- **Vampire / Blood Lord** — 흡혈 + 색기라는 이중 결(색욕 키워드 "흡혈"과 직결)

### 오만 (루시퍼 · 천사/신전/조각상)
- **Oblivion Knight(Doom Knight/Abyss Knight)** — 스펙이 지목한 정확한 원형
- **Zakarum Zealot / Zakarum Priest / Council Member** — 신의 이름을 참칭하며 타락한 교단·성직자·평의회, "오만" 그 자체
- **The Ancients(코르실·탈릭·마독)** — "고대의 형제" 수호 거상, 조각상·거인 테마에 직결(§5 참고)
- **Izual**(4막 유니크) — 원래 천사 장군이 타락한 존재, "타락천사" 컨셉의 원형

---

## 4. 우리 로스터에 없는 것 — 신규 monster_base 후보

| 후보 베이스 | 원작 사례 | 우리 타입 | 어느 죄종 | 왜 필요한가 |
|---|---|---|---|---|
| Mummy(미이라) | Mummy / Greater Mummy / Horadrim Ancient | Undead | 탐욕 | 15종 베이스에 "무덤 보물 수호자" 아키타입이 없다. 사막·황금 챕터의 상징적 실루엣 |
| Maggot/Worm(구더기·벌레) | Sand Maggot, Pain Worm | Normal | 폭식 | 번식·부화 사이클 자체가 폭식 테마의 핵심인데 벌레형 베이스가 전무 |
| Wisp(도깨비불) | Willowisp | Demon | 색욕(또는 공통) | 무형·부유형 원거리 유혹 몹 실루엣이 없음. 근접 위주인 기존 15종과 형태가 겹치지 않는다 |
| Tentacle(촉수괴물) | Tentacle Beast / Water Watcher | Normal | 시기 | 심연 수생 촉수 아키타입 부재 — 시기 챕터의 상징 실루엣 |
| Scarab(딱정벌레) | Scarab Demon | Normal | 탐욕 | 곤충형 베이스가 전무, 황금 풍뎅이는 탐욕의 상징성이 강하다 |
| Naga(뱀여인) | Claw Viper | Demon | 시기·색욕 | Lizardman 은 도마뱀형이라 결이 다르다. 뱀 인간형 신전 수호자 실루엣 부재 |
| Harpy(괴조) | Blood Hawk, Vulture Demon | Normal | 공통(필러) | 비행형 견제 잡몹 실루엣이 15종에 없음 |
| Dark Knight(암흑기사) | Oblivion Knight / Doom Knight | Undead 또는 Demon | 오만 | 오만 챕터 전용 정예 기사 실루엣 부재 — 현재는 Human/Skeleton 재활용으로만 근사 가능 |
| Demon Lord(대악마) | Megademon(Balrog/Pit Lord) | Demon | 분노(공통 보스급) | 뿔 달린 대형 화염 악마 군주 실루엣이 없다. 챕터보스 바로 아래 급 정예로 적합 |

---

## 5. 유니크·슈퍼유니크 보스 & 몬스터 모디파이어

### 5-1. 액트 보스 5종
안다리엘(Andariel, 1막) · 듀리엘(Duriel, 2막) · 메피스토(Mephisto, 3막) · 디아블로(Diablo, 4막) · 바알(Baal, 5막). 공통 특성: 냉각(Chill)은 걸리지만 완전 동결 불가, 스턴 지속시간 무시, Crushing Blow 피해 절반. Ignore Target Defense 는 본체가 아니라 소환된 미니언에만 적용된다. Pandemonium Event 의 "우버(Uber)" 버전은 여기에 Magic Resistant + Extra Fast 가 추가된다.

### 5-2. 슈퍼유니크 — 액트별 목록(기반 계열 · 특징)
액트마다 고정 위치에 항상 등장하는 이름 있는 보스. 다수가 §2 의 정규 계열을 기반으로 모디파이어를 얹은 개체다.

- **Act I**: 콥스파이어(Zombie) · 비시보시(Fallen Shaman, Magic Resistant+Fire Enchanted) · 본브레이커(Skeleton, Extra Strong+Magic Resistant) · 블러드 레이븐(Corrupt Rogue Archer) · 콜드크로우(Dark Ranger, Cold Enchanted) · 라카니슈(Carver, Lightning Enchanted+Extra Fast) · 트리헤드 우드피스트(Wendigo, Extra Strong+Extra Fast) · 그리스월드(타락한 대장장이 NPC) · 카운티스/백작부인(Fire Enchanted) · 대장장이(The Smith, Extra Strong) · 핏스폰 파울독(Tainted, Cursed+Cold Enchanted) · 플레임스파이크 더 크롤러(Giant Spider, Fire Enchanted+Cursed) · 본애쉬(Skeleton Mage, Extra Strong+Cold Enchanted) · 카우 킹(Hell Bovine, 시크릿 카우 레벨)
- **Act II**: 라다멘트(Greater Mummy, Extra Fast) · 크리핑 피처(Mummy, Extra Strong+Cold Enchanted) · 블러드위치 더 와일드(Sabre Cat, Extra Strong+Cursed) · 비틀버스트(Scarab Demon, Magic Resistant) · 콜드웜 더 버로어(Sand Maggot 여왕, Cold Enchanted+Magic Resistant) · 다크 엘더(Zombie, Extra Fast+Magic Resistant) · 팽스킨(Claw Viper, Lightning Enchanted+Extra Fast) · 파이어 아이(Sand Raider, Fire Enchanted+Extra Fast) · 서머너(Extra Strong+Extra Fast) · 에인션트 카 더 소울리스(Greater Mummy, Magic Resistant+Extra Strong+Lightning Enchanted)
- **Act III**: 사크 더 버닝(Giant Spider, Extra Strong+Cursed) · 위치 닥터 엔두구(Fetish Shaman, Magic Resistant+Fire Enchanted) · 스톰트리(Thorned Hulk, Extra Fast+Lightning Enchanted) · 배틀메이드 사리나(Corrupt Rogue, Extra Fast+Spectral Hit) · 아이스호크 리프트윙(Bat Demon, Cold Enchanted+Teleport) · 이스마일 바일핸드/겔렙 플레임핑거/투록 아이스피스트/브렘 스파크피스트/와이안드 보이드브링어/매퍼 드래곤핸드(전부 Council Member 기반, 6인 회의체)
- **Act IV**: 이주얼(옛 천사 장군, 타락) · 헤파스토 디 아머러(Extra Strong+Cursed+Magic Resistant) · 인펙터 오브 소울즈(Megademon, Extra Fast+Spectral Hit) · 로드 드 세이즈(Oblivion Knight, Extra Strong+Aura+도둑) · 그랜드 비지어 오브 카오스(Finger Mage, Extra Strong+Fire Enchanted)
- **Act V**: 닥 파렌(Demon Imp) · 셴크 디 오버시어(Overseer, Extra Strong) · 엘드리치 더 렉티파이어(Enslaved, Extra Fast) · 쓰레시 소켓(Siege Beast, Cursed) · 아이백 디 언리쉬드(Death Mauler, Extra Fast+Extra Strong) · 샤프투스 슬레이어(Extra Fast) · 프로즌슈타인(Abominable, Cold Enchanted+Mana Burn) · 본소 브레이커(Extra Strong+Magic Resistant) · 스냅칩 셰터(Frozen Horror, Cursed+Cold Enchanted) · 핀들스킨(Reanimated Horde 계열, Fire Enchanted) · 니흘라댁(Arctic Blast+Corpse Explosion+Teleport, 최종 던전 입구 보스) · 콜렌조 디 어나이얼레이터(Fallen Shaman, Fire Enchanted) · 아크멜 더 커스드(Greater Mummy, 독 면역) · 바르툭 더 블러디(Council Member, Lightning Enchanted) · 벤타 디 언홀리(Megademon, Extra Fast) · 리스터 더 토멘터(Spectral Hit) · **더 에인션츠(코르실·탈릭·마독)** — 바알 직전, 고대 바바리안 영웅 3형제 거상(탈릭 Fire Enchanted+회오리, 마독 Shout+Double Throw, 코르실 Leap Attack)

### 5-3. 몬스터 모디파이어(접두어) — Champion / Unique
**공통 보너스**: 미니언 HP ×2(N)/×1.75(NM)/×1.5(H), 챔피언 HP ×3/×2.5/×2, 유니크 HP ×4/×3/×2. 레벨은 챔피언 +2, 유니크·미니언 +3.

| 모디파이어 | 등급 | 효과 |
|---|---|---|
| (일반) Champion | 챔피언 | 데미지 +90/75/66%, 공격력 +67/56/49%, 이동속도 +20 |
| Ghostly | 챔피언 | 냉기 데미지 +33~50%, 물리 피해 저항 80% |
| Fanatic | 챔피언 | 이동속도 +100, 방어력 −70% |
| Berserker | 챔피언 | 데미지 +270/225/198%, 기본 체력은 챔피언의 1/4 |
| Possessed | 챔피언 | 체력 챔피언의 2배, 저주 면역 |
| Aura | 유니크 | 마이트/홀리 파이어/블레스드 에임/홀리 프리즈/홀리 쇼크/컨빅션/파나티시즘 중 랜덤 |
| Cursed | 유니크 | 피격 시 50% 확률로 Amplify Damage 시전 |
| Cold/Fire/Lightning Enchanted | 유니크 | 해당 원소 데미지 +66~100%, 해당 원소 저항 +75%, 사망 시 관련 폭발/노바 |
| Extra Fast | 유니크 | 이동속도 +100 |
| Extra Strong | 유니크 | 데미지 +135/112/99%, 공격력 +90/75/66% |
| Magic Resistant | 유니크 | 냉기/화염/번개 저항 각 +40% |
| Mana Burn | 유니크 | 마나 데미지 +66~100%, 마법 저항 +20% |
| Multishot | 유니크 | 발사체 수 3배 |
| Spectral Hit | 유니크 | 원소 저항 +40%, 원소 데미지 +66~100% |
| Stone Skin | 유니크 | 피해 저항 +50%, 방어력 ×2 |
| Teleport | 유니크 | 체력 30% 이하이거나 원거리 몹이 근접 시 순간이동 |

---

## 6. 원소 면역(Immunity) — 스테이지 원소 배정 참고

**메커니즘**: D2 의 저항치는 %로 관리되며 **99% 이상이면 완전 면역**이다. Normal~Nightmare 초반까지는 계열별로 부분 저항만 있지만, **Hell 난이도부터는 거의 모든 몬스터 계열이 최소 하나의 속성에 100% 면역**을 갖도록 설계돼 있다(위 §5-3 의 Cold/Fire/Lightning Enchanted 접두어가 붙으면 유니크·챔피언은 면역을 하나 더 얹어 최대 2중 면역까지 간다). 면역은 오직 팔라딘 컨빅션 오라 / 네크로맨서 로워 레지스트 저주로만 "일부" 깎을 수 있고(정상 감소량의 1/5), 완전히 뚫리지는 않는 게 원칙이다 — 그래서 D2 빌드는 "면역 못 뚫는 속성 하나는 버리고 물리/용병으로 우회"하는 설계가 강제된다.

**계열-면역 경향(일반화, 확정 수치 아님)**: Undead 계열은 냉기·마법 계열에 강한 경향, Demon 계열은 화염에 강한 경향, Animal 계열은 원소 면역이 적고 물리 위주인 경향이 있다 — 정확한 수치는 패치·난이도마다 다르므로 이 문서에는 적지 않는다.

**커뮤니티에 통용되는 구체 사례**(공식 수치표로 재확인하지 못해 `(미확인)` 처리):
- Burning Dead(스켈레톤 화염 변종) — 화염 면역 `(미확인)`
- Hollow One(Greater Mummy 계열) — 마법 면역 `(미확인)`
- Claw Viper 계열 — 냉기 면역 `(미확인)`
- Council Member 계열 — Hell 에서 번개 면역이 흔하다는 것이 커뮤니티에 널리 알려진 통설(소서리스 라이트닝 빌드가 트라빈칼에서 자주 막히는 이유) `(미확인)`

**본작 활용 시사점**: 정확한 면역표를 그대로 옮길 필요는 없다 — 다만 "이 계열은 이 속성과 세트로 묶인다"는 **원형-원소 짝짓기 자체**는 참고할 가치가 있다. 예: 얼음 계열(Frozen Horror/Abominable) → 나태/냉기, 화염 데몬(Fallen/Megademon) → 분노/화염, 독 데몬(Venom Lord) → 색욕/독. 우리 7죄종 표의 보스 원소 배정과 방향이 이미 일치한다.

---

*마지막 업데이트: 2026-09-16*
