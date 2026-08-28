# verify — UI 변경 검증

SKILL.md 4단계에서 편다. 헤드리스 명령의 **원문은 [src/dev/README.md](src/dev/README.md)** 가 SSOT — 여기 다시 타이핑하지 않고, 그 문서에 없는 운용 규칙만 적는다.

## 0. 서버

- 사용자가 `start.bat` 으로 **8777** 을 띄워 뒀으면 그걸 쓴다
- 안 떠 있으면 `src/` 에서 `python -m http.server 8788` 을 **background** 로 띄운다 (8777 과 충돌하지 않게)
- `file://` 로는 안 된다 — ES Modules 가 CORS 로 막힌다

## 1. 도구와 캐시

둘 다 지키지 않으면 검증 결과가 거짓이 된다.

- 헤드리스는 **PowerShell 도구로만** 돌린다. git-bash 에서는 `msedge` 가 즉시 반환하고 출력이 빈 파일로 떨어진다
- 캐시를 끈다 — 프로필 폴더를 지우고 `--disk-cache-size=1`. 안 끄면 CSV·JS 가 캐시돼 고친 화면이 안 나온다

## 2. 한국어 리터럴 (다국어 위반)

렌더러 세 파일(`app.js` · `battle.js` · `tip.js`)에 한국어 리터럴이 남으면 안 된다. **주석은 제외**해야 하므로 단순 grep 으로는 못 잡는다 — 블록 주석과 줄 주석을 지운 뒤 한글을 찾는다:

```bash
for f in src/ui/app.js src/ui/battle.js src/ui/tip.js; do echo "--- $f"; \
  perl -CSD -0777 -ne 's{/\*.*?\*/}{$&=~tr/\n//cdr}ges; s{//[^\n]*}{}g; my $i=0; for (split /\n/,$_,-1){ $i++; print "$i: $_\n" if /\p{Hangul}/ }' "$f"; done
```

- **출력이 비어 있어야 통과.** 블록 주석은 줄 수를 보존한 채 지우므로 찍히는 줄 번호가 실제 줄 번호다
- `grep "[가-힣]"` 은 이 환경에서 한글이 아닌 기호(`·` `—` `×` 등)까지 잡고, `grep -P` 는 로케일 때문에 거부된다. 그래서 perl 을 쓴다
- 잡히면 그 문자열을 `src/ui/i18n.js` 의 `STRINGS` 로 옮긴다 (ko/en 함께)
- **`en` 누락은 `ko` 로 폴백돼 이 검사에 안 걸린다** — 새로 추가한 키는 눈으로 확인한다

## 3. 렌더 예외 검출 (dump-dom)

- [src/dev/README.md](src/dev/README.md) 의 헤드리스 DOM 덤프 스니펫을 그대로 쓰고 URL 만 바꾼다
- `index.html?dev=battle&lang=ko` 덤프에 `class="report-head"` 가 있으면 통과. 렌더 중 예외가 나면 그 자리가 비어 있다
- `&lang=en` 으로도 한 번 더 — 영어에서만 터지는 치환·조립이 있다
- 바꾼 화면이 리포트가 아니면, 그 화면의 고정 class 를 하나 골라 같은 방식으로 존재를 확인한다

## 4. 스크린샷 — ko/en 둘 다

- [src/dev/README.md](src/dev/README.md) 의 스크린샷 명령에 `--window-size=1280,700` 을 더해 찍는다 (하한 폭 · 세로 예산 기준 — 수치 근거는 [src/ui/README.md](src/ui/README.md))
- 같은 화면을 `?lang=ko` 와 `?lang=en` 두 번 찍는다. 영어는 같은 내용이 더 길어 칸이 넘친다
- 화면에는 개발용 URL 로 도달한다(`?screen=` · `?dev=` · `?tab=`) — 클릭이 필요하면 그 화면에 도달 경로가 없다는 뜻이다. `?tab=` 은 `?dev=` 뒤
- 출력 파일은 저장소 밖(임시 폴더)에 두고 **보고에 경로를 적는다**

## 5. 단정 유지

- `test.html` 을 덤프해 `<title>` 이 `PASS n/n` 이고 실패 목록이 비어 있어야 한다
- 렌더러만 고쳤어도 돌린다 — 조립(`src/ui/data.js`)이나 표시 사전(`src/ui/mock.js`)을 스쳤으면 로직이 굶는다
- 실패가 뜨면 렌더러에서 고치지 말고 `/client`

## 6. 눈으로 보는 체크

문서와 화면을 나란히 놓고 본다. §번호는 [SCREEN_DESIGN.md](docs/client/SCREEN_DESIGN.md).

- 비어 있는 칸이 없는가 — 결과가 없어도 숫자를 찍는다 (§4-1 · §4-3)
- 인게임 패널에 설명 문장이 새로 들어가지 않았는가 (§12)
- 되돌릴 수 없는 버튼이 한 번에 눌리지 않는가 (§3)
- 툴팁이 화면 밖으로 나가지 않는가
- 하한 폭에서 가로 스크롤이 생기지 않는가 ([src/ui/README.md](src/ui/README.md))
- 문구가 `t()` / `L()` 을 거쳤는가 — 언어 토글을 눌러 확인한다
- 고친 절의 "보여준다 / 결정 / 규칙" 표와 화면이 일치하는가. 어긋나면 **문서를 먼저** 고친다
