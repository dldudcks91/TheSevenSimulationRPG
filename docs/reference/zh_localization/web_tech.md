# 간체 중국어(zh-CN) 웹 기술 조사 — 무빌드 웹 게임 → Steam 데스크톱 래퍼

작성 2026-11-16. 표기: **[실측]** = 이 세션에서 직접 내려받아 잰 값 · **[출처]** = URL 로 확인한 사실 · **[추정]** = 근거 위의 내 판단(확인 안 됨).
외부 검색에는 프로젝트명 · 개인 정보를 넣지 않았다.

## 0. 이 프로젝트에서 읽은 것 (읽기만 했다)

- 본문 글꼴: `--font-main: 'Pretendard', 'Malgun Gothic', sans-serif` (style.css:187). 표시 글꼴: `--font-display: 'Cinzel', 'Times New Roman', serif` (style.css:188) — Cinzel 은 라틴 전용.
- Pretendard 는 `index.html` 에서 **jsdelivr CDN**(`pretendard-dynamic-subset.css` v1.3.9), Cinzel 은 **Google Fonts CDN** 로 받는다. 로컬 폰트 파일 · `@font-face` 는 저장소에 0개 → **Steam 오프라인 빌드는 어차피 자체 호스팅이 필요하다.**
- `<html lang="ko">`, `i18n.js` 가 `document.documentElement.lang = current` 로 동기화하고 `?lang=` 와 localStorage(`thesevensim.lang`)를 이미 쓴다. `LANGS = ['ko','en']`, 누락 시 `e[current] ?? e.ko` 로 **ko 폴백**.
- `letter-spacing` px 값이 곳곳에 있다(브랜드 3px, raid 2.4px · 4px, 툴팁 헤더 1~2px). `text-transform` 은 style.css/raid.css 에 0건(grep 확인).
- `word-break: keep-all` 이 style.css 에만 20여 곳, tutorial.css 에 1곳 있다(한국어 어절 보호용). → **중국어에선 함정 (아래 §3-1).**
- 글자 크기 사다리: `--fs-2xs 9px / xs 12px / sm 13px / md 15px / lg 18px / xl 24px`. 화면은 1600×800 한 장을 `transform` 으로 통째로 줄이고 늘린다(`#stage`).
- 숫자는 `toLocaleString()` 을 **로케일 인자 없이** 부른다(battle.js · app.js 여러 곳) → 브라우저/OS 로케일을 따르지 게임 언어를 안 따른다. 컴팩트 표기(K/M, 만/억)는 안 쓴다 — 전부 쉼표 풀 숫자.

## 1. 글꼴 — 시스템 스택과 한자 통일(Han unification) 문제

### 1-1. 현재 스택이 중국어에서 깨지는 이유 **[실측]**

Pretendard 동적 서브셋 CSS(v1.3.9)의 weight 400 `unicode-range` 를 합쳐 보니:
- **CJK 통합 한자 435자**를 Pretendard 가 맡겠다고 선언(中 U+4E2D · 万 U+4E07 포함).
- **전각 문장부호가 전부 들어 있다**: ，U+FF0C · 。U+3002 · 、U+3001 · ：U+FF1A · ！U+FF01 · 「U+300C · …U+2026 · —U+2014 · “U+201C.
- 간체 전용자(么 U+4E48 · 发 U+53D1 · 门 U+95E8)는 **없다.**

→ `lang="zh-CN"` 으로 바꾸고 `font-family` 를 그대로 두면 한 문장 안에서 **Pretendard(한국식 글리프·부호 위치) ↔ Malgun Gothic ↔ 시스템 폴백**이 글자 단위로 섞인다. Malgun Gothic 은 KS X 1001 한자를 갖고 있다(한자는 Windows 8 부터) [출처: https://www.fonts.com/font/microsoft-corporation/malgun-gothic · https://en.wikipedia.org/wiki/Malgun_Gothic]. **그래서 zh 모드에선 한국어 글꼴을 스택에서 통째로 빼야 한다** — 뒤에 붙이는 걸로는 해결이 안 된다(앞 글꼴이 글리프를 가진 글자는 앞 글꼴이 이긴다).

### 1-2. `lang` 이 하는 일 / 못 하는 일

- `lang` 이 정하는 것: (a) `sans-serif` · `serif` 같은 **제네릭의 스크립트별 글꼴**, (b) 글꼴 안에 `locl` 이 있을 때 **지역별 글리프 변형**, (c) 지정 글꼴이 없는 한자의 **폴백 글꼴 선택**. Han 통일 때문에 "코드포인트 + lang 둘 다 있어야 올바르게 보인다" [출처: https://lists.w3.org/Archives/Public/public-css-archive/2017Aug/0567.html].
- `lang` 이 못 하는 것: **이미 글리프를 가진 앞 글꼴을 건너뛰게 하지 못한다.** 스택 순서가 우선.
- Chromium(Electron/NW.js/WebView2 포함)은 lang 힌트가 없으면 Accept-Language · UI 로케일로 한자 변형을 정한다. 영어/한국어 Windows 에서 `en-US` 만 있으면 신호가 없어 일본식으로 갈 수 있다. Electron 은 예전에 Accept-Language 에 **첫 언어만** 넘겨서 Chromium 이 일본어 글꼴을, Electron 이 중국어 글꼴을 골랐다 [출처: https://github-redirect.dependabot.com/electron/electron/pull/23247]. VS Code(Electron) 이슈엔 zh-CN 기본 sans-serif 가 **SimSun(명조)** 으로 잡히는 보고가 있다 [출처: https://github.com/microsoft/vscode/issues/5260] → **제네릭에 맡기지 말고 이름을 명시한다.**
- 태그는 `zh-CN`(또는 `zh-Hans`)로 단다. `zh` 단독은 간체/번체 신호가 약하다 [추정: WordPress 코어가 SC 스택을 `html[lang="zh-CN"]` 로 한정한 사례 https://core.trac.wordpress.org/ticket/45408]. CSS 선택자는 `:lang(zh)` 가 zh-CN · zh-Hans 둘 다 잡는다(접두 일치). `:lang(zh-Hans)` 는 `lang="zh-CN"` 을 **못 잡는다.**

### 1-3. 플랫폼별 간체 글꼴 (스택용)

| 플랫폼 | 간체 UI 글꼴 | 비고 |
|---|---|---|
| Windows 10/11 | **Microsoft YaHei**(+ `Microsoft YaHei UI`) | 기본 포함. 선택 기능(FOD) 「Chinese (Simplified) Supplemental Fonts」는 DengXian · FangSong · KaiTi · SimHei 뿐이고 **YaHei 는 거기 없다** = 기본 OS 글꼴 [출처: https://learn.microsoft.com/en-us/windows/deployment/windows-missing-fonts · https://learn.microsoft.com/en-us/typography/font-list/microsoft-yahei (Win 7~11 포함)]. 영어/한국어 Windows 에서도 있다(언어팩과 별개) [추정 — 문서가 로케일별 설치를 명시하진 않음, Tiny11 같은 변형판은 미확인] |
| macOS / iOS | **PingFang SC** | OS 기본 |
| Linux 일반 | Noto Sans CJK SC · Source Han Sans SC · WenQuanYi Micro Hei | 설치 여부는 배포판 의존. 없으면 네모(두부) [출처: 여러 포럼 — https://forum.inductiveautomation.com/t/chinese-characters-are-displayed-as-boxes/23947/6] |
| Android / HarmonyOS | Noto Sans CJK SC / HarmonyOS Sans SC | |
| Steam Deck (SteamOS) | **미확인** | 기본 설치 여부를 확정하는 1차 자료를 못 찾았다. 간접 증거만 있다(Proton 일본어 가이드가 "Noto Sans CJK JP 가 기본으로 들어 있는 듯"). → **번들 권장** (§6) |

### 1-4. 바로 쓸 CSS 패턴

```css
/* 기본(ko/en) 스택은 그대로 둔다 */
:root { --font-main: 'Pretendard', 'Malgun Gothic', sans-serif; }

/* zh: 한국어 글꼴을 스택에서 통째로 뺀다. 번들 서브셋이 있으면 맨 앞(모든 플랫폼에서 같은 모양) */
:root:lang(zh) {
  --font-main: 'GameSansSC',            /* 번들 서브셋 (§2-3) */
               'PingFang SC', 'Microsoft YaHei UI', 'Microsoft YaHei',
               'HarmonyOS Sans SC', 'Noto Sans CJK SC', 'Source Han Sans SC',
               'WenQuanYi Micro Hei', sans-serif;
  --font-display: 'Cinzel', 'GameSerifSC', 'Noto Serif CJK SC', 'Source Han Serif SC',
                  'Songti SC', 'SimSun', serif;
}
```
- `Cinzel` 을 display 앞에 두면 라틴은 Cinzel, 한자는 뒤의 Serif SC 로 **글자 단위 폴백**된다(Cinzel 에 한자 글리프가 없으므로). `GameSerifSC` 는 `unicode-range` 로 한자/CJK 부호만 맡게 해도 된다.
- 라틴 · 숫자는 zh 글꼴(YaHei 등)이 그린다. Pretendard 를 라틴용으로 남기려면 **라틴 범위만 가진 별도 `@font-face`**(`unicode-range: U+0000-00FF …`)로 감싸야 한다 — 동적 서브셋 CSS 를 그대로 쓰면 위 435자/부호가 새어 들어온다. 단순함을 택하면 라틴도 zh 글꼴에 맡긴다.
- `system-ui` · 제네릭 단독 스택은 피한다(위 Electron/VS Code 사례).
- 이름: 시스템에 깔린 OTC 는 `Noto Sans CJK SC`, Google 웹폰트는 `Noto Sans SC` — 같은 디자인, 다른 패밀리명. 둘 다 적는다.
- Pretendard 는 OFL + **Reserved Font Name "Pretendard"**(CSS 헤더 확인). 서브셋을 직접 만들어 배포하면 수정판이라 **패밀리명을 바꿔야** 한다 [출처: 헤더 + https://openfontlicense.org 규칙; 정확한 요건은 OFL.txt 로 재확인].
- Noto Sans SC 는 `fsSelection` USE_TYPO_METRICS 꺼짐 · hhea ascent 1160 / descent 288 → **`line-height: normal` ≈ 1.448em** [실측]. 현재 body 는 `line-height: 1.6` 고정이라 대부분 영향 없지만 `line-height: 1 / 1.2` 로 박은 칸(예: style.css:3444 `1.2`)은 한자에서 빡빡하다 → zh 에서 최소 1.3~1.4 [추정].

## 2. 다크판타지 제목 글꼴 (상업 무료) + 서브셋

### 2-1. 후보 (라이선스는 확인한 것만 확정 표기)

| 글꼴 | 라이선스 | 인상 | 크기 | Google Fonts |
|---|---|---|---|---|
| **Noto Serif SC** (= Source Han Serif SC) | OFL [출처: google/fonts METADATA.pb `license: "OFL"` — https://raw.githubusercontent.com/google/fonts/main/ofl/notoserifsc/METADATA.pb] | 송체(明朝), 가는 획과 굵은 획 대비 → Cinzel 과 결이 맞음. 안전한 1순위 | 가변 TTF **25.1MB** · wght 200~900 [실측] | 예, 슬라이스 |
| **ZCOOL XiaoWei 站酷小薇** | OFL (같은 방식 확인) | 송체 계열 굵은 표제체 | 슬라이스 합 3.1MB(단일 굵기) [실측] | 예 |
| **Ma Shan Zheng 马善政** | OFL | 붓글씨 해서 — 먹/피 느낌, 가독성은 작은 크기에서 약함 | 슬라이스 합 3.4MB | 예 |
| Liu Jian Mao Cao 柳建毛草 · Long Cang 龙藏体 | OFL | 초서/붓. 장식용(제목 한두 줄) | ~3MB | 예 |
| ZCOOL QingKe HuangYou 庆科黄油体 | OFL | 둥글고 귀여움 → 다크판타지엔 안 맞음 | 2.9MB | 예 |
| **LXGW WenKai 霞鹜文楷** | OFL-1.1, 상업 무료, 앱 내장 허용. 파생물은 예약명 「霞鹜/LXGW」 못 씀. 웹폰트용 WOFF2 변환은 예외 허용(데스크톱 글꼴로 따로 배포 안 할 때) [출처: https://github.com/lxgw/LxgwWenKai] | 따뜻한 해서 — 다크판타지보다 서정 | Regular TTF **24.7MB**, Lite **13.3MB** (v1.530) [실측: GitHub releases API] | 예(문서에 명시) |
| 演示悠然小楷 | **확인 못 함** — 검색에 안 잡힘. OFL.txt/LICENSE 를 직접 보고 쓸 것 | | | |

피해야 할 것 [추정, 일반 상식]: 방정(方正) · 한의(汉仪) · 화강(华康) 계열은 게임 내장 시 별도 계약이 필요한 경우가 많다. 「무료 상업 사용」을 내건 글꼴도 **앱/게임 내장 · 서브셋 가능 여부**는 각 라이선스 문서로 따로 확인.

### 2-2. Google Fonts 슬라이싱 실태 **[실측]**

`fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;700` 를 현대 Chrome UA 로 받음:
- `@font-face` **202개**(굵기당 101 슬라이스). 라틴/키릴/베트남 등 외에 CJK 가 약 86 슬라이스.
- Noto Serif SC 400: 슬라이스 평균 **58KB**, 최대 102KB, 합 **5.75MB**. Noto Sans SC 400: 평균 43KB, 최대 78KB, 합 **4.33MB**. (woff2, 슬라이스는 빈도순으로 묶여 있어 앞쪽 번호가 상용자.)
- **UA 없이(WebFetch 등) 받으면 unicode-range 없는 전체 TTF 한 장**이 나온다 — 구형/미상 UA 는 슬라이싱을 못 받는다.
- 게임이 쓰는 한자 ~1,500~2,500자(§5)가 슬라이스 몇 개에 흩어지는지는 측정 안 함. 흩어지면 사실상 30~60 슬라이스(1~3MB) 받게 된다 [추정] — **직접 서브셋 한 장(아래)과 크기가 비슷하다.** 그래서 슬라이싱의 이점이 작고, 오프라인(Steam)에서는 쓸 수 없다.

### 2-3. 자체 서브셋 (pyftsubset/fonttools) **[실측]**

google/fonts 저장소의 가변 TTF 를 `fontTools 4.60.2`(+brotli)로 직접 잘라 woff2 로 저장. 글자 집합 = GB2312 1급(3,755자) + 문장부호 + ASCII(총 3,880자), `layout_features=*`(halt/chws/locl 유지):

| 글자 수 | Noto Serif SC 700 정적 | Noto Sans SC 700 정적 | Serif 가변 | Sans 가변 |
|---|---|---|---|---|
| 1,625자 | 328 KB | 248 KB | 612 KB | 462 KB |
| 3,880자 (GB2312 1급) | **734 KB** | **562 KB** | 1,373 KB | 1,043 KB |
| 6,888자 (GB2312 전체) | 1,316 KB | 995 KB | 2,461 KB | 1,838 KB |

- 대략 **글자당 0.19KB(Serif) / 0.14KB(Sans)** (정적 단일 굵기) — 선형 근사 [추정].
- 가변(전 굵기 축)은 정적 단일 굵기의 약 **2배**. 400+700 둘 다 정적으로 쓰면 가변과 비슷해지니, 굵기가 2개 이상이면 가변이 낫다.
- 제목용(Serif 700~900)은 쓰는 글자만 뽑으면 훨씬 작다(제목/이름에 쓰는 몇백 자 → 수십~100KB대) [추정].
- 만드는 법: 게임 텍스트 전체(CSV zh 열 + i18n zh)에서 distinct 문자를 뽑아 `--text-file` 로 넘긴다. **새 번역이 들어오면 재생성**해야 누락 글자(두부)가 안 생긴다 — CI/스크립트에서 "zh 문자열의 모든 코드포인트가 서브셋 cmap 에 있는지" 단정 하나를 둘 것 [추정].
```
pyftsubset NotoSansSC[wght].ttf --text-file=zh_chars.txt --flavor=woff2 \
  --layout-features='*' --unicodes=U+0020-007E,U+00B7,U+2014,U+2018-201D,U+2026,U+3000-303F,U+FF01-FF5E \
  --output-file=GameSansSC.woff2
```
(`wght` 한 값만: `fonttools varLib.instancer in.ttf wght=700 -o out.ttf` 후 subset.)

## 3. 줄바꿈과 조판

### 3-1. **이 프로젝트의 최대 함정: `word-break: keep-all`**
- `keep-all` = CJK 글자 사이 줄바꿈을 **억제**한다 [출처: https://developer.mozilla.org/en-US/docs/Web/CSS/word-break]. 한국어는 어절 사이 공백이 있어 무해하지만, **중국어는 공백이 없다 → 문장부호(，。)에서만 끊긴다.** 부호 없는 긴 설명/이름은 한 줄로 삐져나오거나 `overflow:hidden` 이면 잘린다. 이 프로젝트엔 툴팁 · 도감 · 이야기 · 로그 · 슬롯 이름 등 20여 곳이 걸려 있다.
- 처방: 리터럴 `keep-all` 을 변수로 바꾸고 zh 에서 뒤집는다.
```css
:root { --wb: keep-all; }
:root:lang(zh) { --wb: normal; }
.tip-card .tip-name, .dw-story-text, /* … */ { word-break: var(--wb); }
```
  (또는 zh 에서 `*:lang(zh) { word-break: normal !important }` 한 줄 — 거칠지만 확실.) `overflow-wrap: anywhere` 가 같이 걸린 곳은 넘칠 때만 끊으니 그대로 둬도 됨.
- `word-break: auto-phrase`(구절 단위 끊기)는 **일본어 전용**, 한·중은 "향후" [출처: https://developer.chrome.com/blog/css-i18n-features]. 쓰지 말 것. 수동 제어는 `<wbr>` · 제로폭 공백 · `&zwj;` 로.

### 3-2. 금칙(禁则)
- 브라우저 기본(`line-break: auto/normal`)이 UAX#14 로 닫는 부호(。，、！？：；”）》】)를 줄 머리에 안 둔다 [추정: 표준 동작, MDN `line-break` 문서는 구체 문자 목록을 안 줌]. `line-break: strict` 는 가장 엄격한 규칙이지만 추가로 막는 건 주로 일본어(작은 가나 · ー) — **중국어에는 거의 차이 없고 해롭지 않다** [출처: https://developer.mozilla.org/en-US/docs/Web/CSS/line-break + 추정]. `loose` 는 짧은 줄(신문)용.
- 破折号 `——`(U+2014 ×2) · 省略号 `……`(U+2026 ×2)는 한 줄 끝/머리에서 쪼개지지 않아야 한다 [출처: W3C clreq https://www.w3.org/TR/clreq/ — "두 글자 대시/말줄임표는 줄 사이로 갈라지면 안 된다"].
- `hanging-punctuation` 은 Safari 만이라 의존 금지 [추정].
```css
:root:lang(zh) body { line-break: strict; word-break: normal; }
```

### 3-3. 전각/반각 · 따옴표 · 부호 관례
- 중국어 문장 안의 부호는 **전각**: ，。：；！？、 — 라틴 텍스트 안에서만 반각. 저장은 전각 라틴/숫자(Ａ１)를 피하고 폭은 레이아웃이 처리하라고 clreq 가 명시 [출처: https://www.w3.org/TR/clreq/ §4.1].
- 따옴표: **중국 대륙은 “ ”(바깥) ‘ ’(안쪽) 곡선 따옴표, 가로쓰기** / **대만 · 홍콩은 「 」 『 』** [출처: clreq "在中国大陆，采用先双、后单的引号体例，弯引号用于横排"]. → zh-CN 번역에서 `「」` 를 쓰지 말 것. (한국어 원문의 「 」 는 zh 에서 “ ” 로 바꿔야 함 — 이 저장소 문서들이 「」를 많이 쓴다.)
- 간체 글꼴의 “ ” 는 U+201C/201D 인데 **글꼴이 라틴(서양)식 폭으로 그릴지 전각 폭으로 그릴지가 글꼴마다 다르다**(YaHei 는 반각 폭, 일부 CJK 글꼴은 전각) [추정] — 시각 점검 항목.
- `text-spacing-trim`(연속 부호 사이 공백 접기): 기본 `normal` 이 이미 켜진 상태. 글꼴에 `halt` 또는 `chws` 가 있어야 동작 [출처: https://developer.mozilla.org/en-US/docs/Web/CSS/text-spacing-trim]. 내가 받은 Noto Sans SC 는 `halt` 만, Noto Serif SC 는 `chws`+`halt` 둘 다 가짐 [실측]. 서브셋에서 `layout_features=*` 를 꼭 유지. MDN 은 이 속성을 "제한적 지원 · 실험적"으로 표기 — 지원 여부와 무관하게 깨지지 않게 설계.

### 3-4. 중문–라틴/숫자 사이 띄어쓰기 (盘古之白)
- **브라우저가 자동으로 해 준다:** `text-autospace: normal`(초기값)은 한자↔라틴 · 한자↔숫자 사이에 작은 간격을 자동 삽입. 명시적 공백이 이미 있으면 자동 간격은 억제되므로 번역문에 공백이 있든 없든 안 깨진다 [출처: https://developer.mozilla.org/en-US/docs/Web/CSS/text-autospace].
- 지원: Chrome/Edge **140+** (= Electron 38+ 로 추정, 버전 매핑은 [추정]) · Safari 18.4+(단, Safari 는 기본값이 `no-autospace` 였다는 보고) · Firefox 미지원(144까지) [출처: https://caniuse.com/mdn-css_properties_text-autospace · https://lists.w3.org/Archives/Public/public-css-archive/2025Jun/0774.html]. MDN 은 "Baseline 2025 newly available"로 표기.
- **게임 관례 [추정 — 1차 자료 못 찾음]:** UI 라벨/칩(「攻击+120」「Lv.5」「3个」)은 공백 없이 붙이고, 긴 설명문에서만 양쪽을 띄우는 편이 많다. 번역가에게 "한자와 숫자/영문 사이 공백은 넣지 않는다, CSS 에 맡긴다"를 규칙으로 주면 일관된다. 영문 아이템명이 문장 중간에 들어가는 이 게임(아이템·스킬 이름이 영어 원본)에선 특히 이 규칙이 필요.
- WebKitGTK/WKWebView(Tauri 의 mac/Linux) 에서는 `text-autospace` 가 없을 수 있으니, Chromium 계열이 아닌 래퍼를 쓰면 폴리필(pangu.js 류, 문자열 삽입)이 필요 [추정]. Electron/NW.js 면 불필요.

### 3-5. letter-spacing · text-transform
- `text-transform: uppercase` — 한자에 효과 없음(라틴만 바뀜). 이 프로젝트는 쓰는 곳이 없다 → 문제없음.
- `letter-spacing` — 한자에도 **글자마다** 붙는다(마지막 글자 뒤 공간 포함 → 가운데 정렬 시 한쪽으로 쏠림). 라틴 대문자 로고용 `3px / 2.4px / 4px` 를 한자에 그대로 쓰면 18px 글자에 3px = 0.17em 로 성기다. zh 에서 **`em` 단위 0~0.08em** 로 덮어쓰기 권장 [추정]. 워드마크는 이미 그림이라 영향 없음.
```css
:root:lang(zh) .raid-eyebrow, :root:lang(zh) .raid-result-panel h2 { letter-spacing: .08em; }
```

### 3-6. 말줄임 · 자르기
- `text-overflow: ellipsis` 의 「…」 는 **그 요소의 첫 글꼴**에서 가져온다. 중국어 글꼴의 …(U+2026)은 세로 가운데 6점(……식), Pretendard 것은 기준선. zh 스택에서 Pretendard 를 뺐으니 자연히 맞는다.
- 줄 수 제한은 `-webkit-line-clamp` 가 한자도 정상 처리.
- JS 로 글자 수 자르기는 UTF-16 단위가 아니라 `Intl.Segmenter('zh', {granularity:'word'})` 또는 `[...str]` 로. (BMP 밖 한자는 드물지만 코드포인트로.) [추정]
- 번역문 폭 예산은 한국어 슬롯 기준으로 잡되 §5 참조.

### 3-7. 세로 메트릭 · 최소 글자 크기
- 한자는 em 박스를 꽉 채워서 같은 px 에서 라틴/한글보다 **획이 빽빽**하다. 화면 글자 크기 사다리에서 `--fs-2xs: 9px` 는 한자로는 **사실상 못 읽는다** [추정].
- Chromium 의 로케일별 최소 글자 크기(중·일·한 12px 강제)는 **Chrome 118(2023-10)에 폐지**돼 다른 언어와 같아졌다 [출처: https://developer.chrome.com/blog/css-i18n-features ; Chromium intent https://groups.google.com/a/chromium.org/g/blink-dev/c/QpQeCiNGhDs]. 구버전 Electron 이면 12px 미만이 12px 로 올려질 수 있다(Electron `webPreferences.minimumFontSize`로 확인 — Electron 쪽 문서는 이번에 못 읽음).
- **Steam Deck 환산 [계산, 추정 포함]:** 이 게임은 1600×800 한 장을 창에 맞춰 축소한다. Deck 화면 1280×800 이면 배율 min(1280/1600, 800/800) = **0.8**. 그러면 12px → 9.6px, 13px → 10.4px, 9px → 7.2px. Valve 는 Deck Verified 에서 **"가장 작은 글자가 1280×800 에서 9px 미만이면 안 된다"**, 권장은 12px [출처: https://partner.steamgames.com/doc/steamdeck/compat]. 한자는 같은 px 에서 더 읽기 어려우니 **zh 의 최소 단계는 13px(→10.4px), 본문 14~15px** 로 올리는 것을 권장. `--fs-2xs` 는 zh 에서 11~12px 로.
```css
:root:lang(zh) { --fs-2xs: 11px; --fs-xs: 13px; --fs-sm: 14px; }  /* [추정] 시작값, 실측 후 조정 */
```
  (사다리를 올리면 칸 폭이 넘칠 수 있다 — 한자 글자 수가 적어 대체로 상쇄되지만 §5 로 확인.)
- 소수 배율(`transform: scale(0.8)`)에서의 글꼴 힌팅/흐림은 한자에서 더 눈에 띈다 [추정]. 가능하면 래퍼에서 정수 배율 또는 창 크기에 맞춘 레이아웃 재계산이 낫다 — 이 프로젝트의 ADR-0087 구조상 별도 논의 거리.

## 4. 숫자 · 단위 · 시간

### 4-1. `Intl.NumberFormat('zh-CN')` 실제 출력 **[실측: Node 18.13, ICU 72.1 — Chromium/Electron 은 더 최신 ICU 라 세부가 다를 수 있음]**

| 입력 | 옵션 | 결과 |
|---|---|---|
| 1234567.891 | 기본 | `1,234,567.891` (쉼표 천단위, 마침표 소수) |
| 1234 | compact | `1234` (천 단위 압축 없음) |
| 12345 | compact | `1.2万` |
| 1234567 | compact | `123万` (기본이 유효숫자 2자리 근처 반올림 — 소수 자리를 직접 지정해야 함) |
| 123456789 | compact | `1.2亿` |
| 1.5e12 | compact | `1.5万亿` |
| 0.256 | percent | `26%` (공백 없음); maxFractionDigits 1 → `25.6%` |
| 45 | unit second | `45秒` ; hour long → `3小时` ; minute narrow → `3分钟` |
| -3h | RelativeTimeFormat | `3小时前` |
| now | DateTimeFormat medium | `2026年11月16日 18:47:58` |
| ["a","b","c"] | ListFormat | `a、b和c` |
- `ko` compact 도 `1.2만 / 1.2억` 로 같은 만진법(10⁴ 단위)이라, **한국어 쪽에 이미 만/억 로직이 있다면 zh 가 그대로 재사용**된다. 이 저장소는 compact 를 안 쓰므로 해당 없음.
- `Intl.PluralRules('zh-CN')` 는 1과 2 모두 `other` → `t()` 의 `{one, other}` 객체는 zh 에서 평문 문자열로 넣으면 된다(`n===1 ? s.one : s.other` 분기는 객체일 때만 탄다).
- 정렬: `Intl.Collator('zh-CN')` 은 병음순(阿 李 王 张), `zh-u-co-stroke` 는 획순 [실측]. 이름/도감 정렬이 있으면 명시할 것.
- 호출부 함정: **`n.toLocaleString()` 에 로케일 인자가 없다.** 한국 OS + zh UI 면 ko 포맷으로 나온다(쉼표라 우연히 같지만, 날짜 `new Date().toLocaleString()` 은 확연히 다름). 모두 `Intl.NumberFormat(langTag)` 로 통일하고 `lang()` → BCP47 태그 매핑(`zh` → `'zh-CN'`) 한 곳에서 한다.

### 4-2. 중국 RPG 에서 플레이어 기대 [추정 — 1차 자료 못 찾음]
- 검색에서 "중국 게임 UI 의 万/亿 관례"를 직접 다룬 자료를 못 찾았다(서양 K/M 글만 나옴). 아래는 일반 지식이다.
- 중국어 화자는 큰 수를 **만(万)·억(亿) 4자리 단위**로 읽는다. 방치형·모바일 RPG 는 1.23万 / 4.5亿 식 압축을 흔히 쓴다. **K/M 약어는 오히려 낯설다.** 전투력/데미지 같은 큰 수에는 万/亿 압축을 쓰고, 소량(수천 이하)은 풀 숫자.
- 이 게임은 지금 풀 숫자 + 쉼표라 **zh 출시 1차는 쉼표 풀 숫자 유지**도 합리적(숫자가 5~6자리 이내면 읽힘). 천 단위 쉼표는 중국 표준(GB/T 15835)에서 허용은 되나 万 단위 관행과 다르다는 점만 인지 [추정]. 숫자가 8자리 이상으로 커지는 구간(후반 골드·데미지 합계)에서 万/亿 압축 도입을 검토.
- 시간: 카운트다운은 `01:23:45` 형식이 보편, 라벨은 `2小时30分钟` / `3天`. 단독 `分`은 점수(分)와 혼동되므로 분 단위엔 `分钟`; `时分秒` 연속형 `1时23分45秒` 은 UI 에서 흔하나 `小时` 가 정식 [추정].
- 퍼센트는 `26%`(공백 없음, 반각 %).

## 5. 텍스트 길이 — 영어/한국어 대비

### 5-1. 이 게임 사전에서 잰 ko/en **[실측]** (`ui/i18n.js` 의 ko·en 쌍 1,678개, 치환자는 `99` 로 치환)
- 폭 가정: 한글 1.0em, 라틴 평균 0.52em(대문자 0.64, 공백 0.27, 숫자 0.58).
- ko 글자 수(공백 제외) / en 글자 수: 중앙 **0.40** (p10 0.27, p90 0.71).
- ko 폭 / en 폭: 중앙 **0.81** (p10 0.53, p90 1.19). 영어 3~8자 짧은 칸만 0.91, 9자 이상은 0.76~0.80.
- ko 문자열 길이 중앙 7자, p90 26자, 최대 287자.
→ 지금 레이아웃은 **영어가 가장 넓은 기준**(주석에도 "영어 라벨이 드는 하한"이라 적혀 있음)이고 한국어는 그보다 좁다.

### 5-2. 중국어 추정 **[추정 — 근거: 외부 수치 + 위 실측]**
- 외부: 영→중 번역은 글자 수가 **30~50% 줄고**(번역사 블로그 https://www.polilingua.com/blog/post/chinese-translation-text-compression.htm), 어느 연구는 부피 감소 62%(간체)를 보고. 단 이건 글자 수/분량이고 **폭은 한 글자 = 1em 이라 라틴 평균(~0.5em)의 약 2배**라 줄어든 만큼 상쇄돼 시각 폭은 영어와 비슷하거나 약간 작다 [출처: https://simplelocalize.io/blog/posts/text-expansion-ui-localization/ 등 여러 글 — 단일 권위 표는 못 찾음].
- 한국어와 비교: 한자어(한자어 명사)는 한글 음절 ↔ 한자가 거의 1:1 이고, 조사/어미(은·는·을·를·하다·합니다)가 중국어엔 없어서 문장은 **한글 음절 수의 약 0.6~0.8배** 글자 수가 된다 [추정]. 그러면 zh 폭 ≈ ko 폭의 0.6~0.8배, **en 폭의 약 0.5~0.65배** [추정].
- 결론: 폭 때문에 깨질 곳은 거의 없다(영어 기준 칸이므로). 깨질 곳은 (a) 고정 `width/min-width` 가 있는 버튼이 **너무 길어 보이는** 문제, (b) 음역 고유명사(예 `阿斯莫德·暗影领主`)와 라틴 혼용 문자열, (c) §3-1 의 keep-all 줄바꿈, (d) 글자 크기를 올릴 때(§3-7)의 칸 넘침. **검증은 가짜 번역(pseudo-localization)이 아니라 실제 zh 문자열로 최장 N개를 뽑아 보는 것**: 각 키에서 `W(zh) = 한자 1.0 + 라틴 0.52 + …` 를 같은 식으로 재서 ko 최댓값과 비교하는 스크립트(위 ratio.js 와 같은 방식)를 번역 입고 시 돌리면 된다.

### 5-3. 한자 개수 가늠 **[실측 + 추정]**
- 저장소의 ko 문자열에서 distinct 한글 음절: `data/*.csv` 1,070 / (코드 주석 포함 UI js 982 — 주석이 섞여 과대) / 합쳐 1,180. i18n.js 사전만으로 590.
- 한자 distinct 수는 한글 음절보다 **크다** (같은 음절이 여러 한자로 갈림). 이 규모 게임이면 **약 1,500~2,500 한자** 안팎 [추정]. 서브셋 설계 한도는 GB2312 1급 3,755 로 넉넉히 잡되 실제는 번역 입고 후 distinct 로 확정.

## 6. Steam 데스크톱 래퍼 — 중국어 글꼴 번들이 필요한가

- **Windows(Electron/NW.js/Tauri-WebView2 모두 Chromium):** YaHei 가 기본 OS 글꼴이라 시스템 글꼴만으로 렌더되고, 중국어 언어팩이 없어도 된다(위 §1-3 출처). 단 lang/스택이 틀리면 SimSun(명조)이나 일본식 글리프로 간다(§1-2).
- **macOS:** PingFang SC 로 충분.
- **Linux · Steam Deck:** 기본 CJK 설치를 확정하는 자료가 없다. Arch 계열 SteamOS 에서 Noto CJK 가 없으면 네모가 나온다. 래퍼가 **Windows 빌드를 Proton 으로 돌리는 경우**(Deck 에서 흔함)엔 Wine 환경에 YaHei 가 없다 — Proton 의 기본 폰트 구성은 이번에 확인 못 했다 [추정].
- **결론: 번들 권장** — 서브셋 woff2 Sans SC(본문 400/700 가변 ≈ 1.0MB @ 3,880자) + Serif SC(제목 ≈ 0.7MB) 합 **~2MB** 로 모든 플랫폼에서 **같은 모양**과 두부 방지를 얻는다. 시스템 글꼴 스택은 폴백으로만 남긴다. 번들은 `@font-face { src:url(...) format('woff2'); font-display: swap }` 로 상대경로 → 래퍼가 어느 엔진이든 동작.
- Tauri 는 엔진이 플랫폼마다 다르다(WebView2 / WKWebView / WebKitGTK) → `text-autospace` · `text-spacing-trim` 지원 편차(§3-3, 3-4). Electron 은 Chromium 고정이라 이 편차가 없다 [추정].
- **Steam 쪽 언어 코드:** 간체 = `schinese`(웹 API `zh-CN`), 번체 = `tchinese`(`zh-TW`). 스토어 페이지 지원 언어 · Steamworks `GetCurrentGameLanguage` 의 반환값이 이 코드다 [출처: https://partner.steamgames.com/doc/store/localization/languages]. 첫 실행 기본 언어를 Steam 언어로 고르려면 `schinese` → 내부 `zh`(또는 `zh-CN`) 매핑 필요.
- 웹판(GitHub Pages 등)과 래퍼는 **origin 이 달라** localStorage 를 공유하지 않는다 (§7).

## 7. 접근성 · SEO · `?lang=` · localStorage

- `<html lang>`: 지금 `applyDocumentLang()` 이 `document.documentElement.lang = current` 로 단다. 내부 키를 `zh` 로 하면 `lang="zh"` 가 된다 → **`zh-CN`(또는 `zh-Hans`)으로 매핑**해서 달 것. 스크린리더 TTS 음성 선택과 글꼴 선택 모두 이 값을 쓴다.
- 문장 중간의 영문 고유명사(이 게임은 아이템·스킬 영문 원본 병기)는 `<span lang="en">` 로 감싸면 TTS 가 영어로 읽는다 [추정]. 글꼴 선택에는 영향 없음(라틴은 어차피 스택 첫 글꼴).
- `document.title`: 이미 `t('app.title')` 로 동기화. zh 제목 문자열만 추가. 이 SPA 는 JS 렌더라 언어별 SEO 는 사실상 없음(검색엔진은 초기 HTML 의 `ko` 를 본다) — 필요하면 정적 랜딩/`<link rel="alternate" hreflang="zh-Hans" href="?lang=zh">` + `<meta name="description">`/`og:locale="zh_CN"` 정도 [추정, 우선순위 낮음].
- `?lang=`: 지금 `LANGS.includes(q)` 로 완전 일치만 받는다. `zh-CN` · `zh-cn` · `zh-Hans` · `zh` 를 하나로 정규화해 받는 함수 한 곳이 있으면 외부 링크(스토어 · 커뮤니티)가 안 깨진다.
- `navigator.languages` 로 첫 방문 기본값: `zh-CN`/`zh-Hans`/`zh-SG` → zh, `zh-TW`/`zh-HK`/`zh-Hant` → **간체만 있으면 en 이 낫다**(번체 사용자에게 간체는 가독성 문제) — 제품 판단 [추정].
- localStorage 함정: (1) 키가 origin 별이다 → 웹판 / 래퍼 / 서로 다른 포트(개발 8777) 모두 따로. (2) 프라이빗 모드 · 차단 → 이미 try/catch 로 처리돼 있음. (3) 폴백 순서: 지금 `e[current] ?? e.ko` 이므로 **zh 가 비어 있으면 한글이 중국어 UI 에 섞여 나온다** → zh 는 `en` 으로 폴백하게 하거나 번역 누락 단정을 둘 것. (4) `L = v => v[current] ?? v.ko` 와 mock.js 의 `{ko, en}` 쌍, CSV `_kr/_en` 열 규약 — zh 추가는 쌍을 삼중으로 넓히는 일이라 **데이터 쪽 변경**(별도 합의 필요 영역). (5) 세이브에 로컬라이즈된 문자열(영웅 이름 등)을 저장하고 있다면 zh 에서 한국어/영어가 나온다 — 키/삼중 쌍으로 저장하는지 확인 [추정, 세이브 스키마 미확인].
- 문법 템플릿: 중국어는 수량 표현에 **양사(个/件/把/枚…)** 가 필요하다 — `t(key,{n})` 템플릿은 키마다 따로 양사를 쓰는 것으로 흡수된다. 복수형 없음.

## 8. 권장안 요약 (시작값)

1. `LANGS` 에 `zh` 추가, html `lang` 은 `zh-CN`, 숫자/날짜는 `Intl` 에 `'zh-CN'` 명시 (`toLocaleString()` 무인자 호출 정리).
2. `:root:lang(zh)` 로 `--font-main` / `--font-display` 를 **한국어 글꼴 없이** 재정의(§1-4). Pretendard 435자+부호 새는 문제 때문.
3. `word-break: keep-all` 20여 곳을 `var(--wb)` 로, zh 에서 `normal`.
4. 글꼴 번들: Noto Sans SC(가변 서브셋 ≈ 1MB @3,880자) + Noto Serif SC(제목 ≈ 0.7MB). 둘 다 OFL. CSV/사전에서 distinct 문자 추출 → `pyftsubset` → CI 단정.
5. 글자 크기: zh 에서 `--fs-2xs 11 / xs 13 / sm 14` 로 시작, Deck 환산(×0.8) 후 9px 이상 확인.
6. letter-spacing px → zh 에서 em(0~0.08em). `text-autospace`/`text-spacing-trim` 은 건드리지 않고 기본값에 맡긴다(Chromium 140+).
7. 따옴표는 “ ” (대륙). 대시 `——`, 말줄임 `……` 각각 2글자.
8. 큰 숫자 ≥ 8자리 구간에서만 万/亿 압축 검토(`notation:'compact'` + 소수 자리 직접 지정), 아니면 쉼표 풀 숫자 유지.
9. Steam: `schinese` → 기본 언어, 글꼴 번들 필수(Deck/Proton), 웹판과 localStorage 분리 인지.

## 9. 못 찾은 것 / 확인 필요
- SteamOS · Proton 의 기본 CJK 글꼴 구성(1차 자료 없음) → Deck 실기기에서 `fc-list :lang=zh` 와 간체 문자열 렌더 확인.
- 중국 RPG UI 의 万/亿 관례와 盘古之白 실제 게임사 규칙(1차 자료 없음).
- Electron 의 `minimumFontSize` 기본값과 Electron↔Chromium 버전 매핑(문서 미확인).
- 演示悠然小楷 라이선스.
- 영→중 UI 문자열 폭 비율의 권위 있는 표(없음 — 이 게임 실제 번역으로 재야 함).

## 출처 목록
- Pretendard 동적 서브셋 CSS (unicode-range 직접 파싱): https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard-dynamic-subset.css
- Google Fonts CSS (Noto Serif/Sans SC, ZCOOL, Ma Shan Zheng 등 슬라이스 실측): https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;700&display=swap
- google/fonts 가변 TTF(서브셋 실험): https://github.com/google/fonts/tree/main/ofl/notoserifsc · .../notosanssc
- LXGW WenKai: https://github.com/lxgw/LxgwWenKai
- MDN word-break / line-break / text-autospace / text-spacing-trim: https://developer.mozilla.org/en-US/docs/Web/CSS/word-break · /line-break · /text-autospace · /text-spacing-trim
- Chrome CSS i18n 기능: https://developer.chrome.com/blog/css-i18n-features
- W3C clreq: https://www.w3.org/TR/clreq/
- text-autospace 지원: https://caniuse.com/mdn-css_properties_text-autospace · https://lists.w3.org/Archives/Public/public-css-archive/2025Jun/0774.html
- Microsoft YaHei · 선택 글꼴: https://learn.microsoft.com/en-us/typography/font-list/microsoft-yahei · https://learn.microsoft.com/en-us/windows/deployment/windows-missing-fonts
- Han 통일 + lang: https://lists.w3.org/Archives/Public/public-css-archive/2017Aug/0567.html
- Electron 언어/글꼴 이슈: https://github-redirect.dependabot.com/electron/electron/pull/23247 · https://github.com/microsoft/vscode/issues/5260
- Steam 언어 코드 / Deck 글자 크기: https://partner.steamgames.com/doc/store/localization/languages · https://partner.steamgames.com/doc/steamdeck/compat
- Chromium 최소 글자 크기 통일: https://groups.google.com/a/chromium.org/g/blink-dev/c/QpQeCiNGhDs
- 텍스트 길이: https://www.polilingua.com/blog/post/chinese-translation-text-compression.htm · https://simplelocalize.io/blog/posts/text-expansion-ui-localization/
- 측정 스크립트 · 서브셋 산출물(sub.py · ratio.js · *.woff2)은 조사 세션의 임시 폴더에 두었고 저장소에는 넣지 않았다
