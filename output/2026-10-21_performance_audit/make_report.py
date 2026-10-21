from pathlib import Path
import json, html, hashlib, datetime
OUT=Path(__file__).resolve().parent;ROOT=OUT.parents[1]
def read(n):return json.loads((OUT/n).read_text(encoding='utf-8'))
def esc(s):return html.escape(str(s))
def mb(n):return f'{n/1e6:,.2f} MB'
def table(headers,rows):return '<table><thead><tr>'+''.join('<th>'+esc(h)+'</th>' for h in headers)+'</tr></thead><tbody>'+''.join('<tr>'+''.join('<td>'+str(c)+'</td>' for c in row)+'</tr>' for row in rows)+'</tbody></table>'
def filelink(path,line=None):return f'<a href="../../{esc(path)}">{esc(path)}</a>'+ (f' : {line}' if line else '')
S=read('summary.json');A=read('static_analysis.json');B=read('boundary_benchmarks.json');T=read('tests.json');L=read('layout_experiment.json')
images=read('images.json');code=read('code.json');data=read('data.json')
changed=[]
for r in A['modules']:
    actual=hashlib.sha256((ROOT/r['path']).read_bytes()).hexdigest()
    if actual!=r['sha256']:changed.append({'path':r['path'],'inspected_sha256':r['sha256'],'current_sha256':actual})
(OUT/'changed_during_audit.json').write_text(json.dumps(changed,ensure_ascii=False,indent=2),encoding='utf-8')
parts=['''<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>The Seven — 성능 점검 2026-10-21</title>
<style>body{font:16px/1.75 system-ui,sans-serif;color:#e7ecf3;background:#10151e;margin:0}main{max-width:1120px;margin:auto;padding:40px 24px 100px}h1{font-size:34px;line-height:1.3}h2{margin-top:48px;border-top:1px solid #344052;padding-top:24px}h3{margin-bottom:8px}a{color:#96c6ff}p{max-width:1000px}small,.muted{color:#aab8ca}.lead{font-size:20px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:14px}.card{padding:20px;background:#1b2432;border-radius:8px}.num{display:block;font-size:27px;color:#b9d9ff}table{border-collapse:collapse;width:100%;font-size:14px;display:block;overflow:auto}th,td{text-align:left;vertical-align:top;padding:10px;border-bottom:1px solid #344052}th{color:#b9d9ff;white-space:nowrap}code{color:#e6c590}li{margin:7px 0}.issue{border-left:4px solid #dfb665;padding-left:18px;margin:30px 0}.tag{font-size:13px;background:#344052;border-radius:4px;padding:4px 8px}details{margin:22px 0;padding:14px;background:#17202d}summary{cursor:pointer}input{padding:10px;width:min(90%,650px);background:#10151e;color:white;border:1px solid #657994}.bar{height:22px;background:#75abdf;min-width:2px}.compare{display:grid;grid-template-columns:130px 1fr 100px;gap:12px;align-items:center;margin:12px 0}.note{border:1px solid #4c6079;padding:14px;border-radius:6px}footer{margin-top:50px;color:#aab8ca}</style><main>
<p class="muted">TheSevenSimulationRPG · 2026-10-21 · 로컬 작업 트리 성능 감사</p>
<h1>가장 먼저 줄일 비용은<br>전투 화면의 레이아웃과 이펙트 선로딩입니다.</h1>
<p class="lead">이번 데스크톱 관측에서 기본 화면의 지속적인 심한 정체는 확인되지 않았습니다. 전투 표시 방식과 초기 요청 구조에는 측정 가능한 개선 여지가 있습니다. 코드·데이터·그림 원본은 수정하지 않았습니다.</p>
''']
parts.append('<div class="grid">'+''.join(f'<div class="card"><span class="num">{v}</span>{label}</div>' for v,label in [(f"{S['file_count']:,}",'전체 파일 목록 점검'),(f"{S['image_count']:,}",'이미지 메타데이터 검사'),(f"{A['non_source_image_count']:,}",'원본 폴더 밖 이미지 디코딩 검사'),(f"{A['module_count']} + {A['loaded_csv_count']}",'시작 시 JS 모듈 + CSV 요청')])+'</div>')
parts.append('''<h2>범위와 측정 조건</h2><p>저장소의 파일 목록·크기·이미지 규격을 전수 집계하고, 코드 패턴과 정적 import 연결을 검사했습니다. 게임 실행 경로의 렌더링·전투·저장·정산·데이터 로더는 코드를 따라 심층 확인했습니다. 모든 행을 사람이 검토했다거나 모든 게임 조합을 실행했다는 뜻은 아닙니다.</p>
<ul><li>대상은 현재 TheSevenSimulationRPG입니다. 별도 northward-idle 프로젝트는 포함하지 않았습니다. prototypes·과거 output·문서 그림은 용량 집계에 포함하되 본 게임 실행 비용과 구분했습니다.</li><li>.git·node_modules·__pycache__와 이번 감사 산출물은 집계에서 제외했습니다. 코드 인벤토리는 src·scripts·prototypes 등 HTML/CSS/JS/Python 138개입니다. 과거 output 스냅샷은 현재 실행 코드로 취급하지 않았습니다.</li><li>Windows의 headless Edge, 1600×900 화면, 별도 임시 브라우저 저장소, 로컬 serve.py :8879. 외부 요청을 차단해 폰트 CDN·Firebase는 측정에서 빠졌습니다. 실제 사용자 저장소는 사용하지 않았습니다.</li><li>Playwright 라우팅은 HTTP 캐시를 비활성화합니다. 표의 로딩 시간은 로컬 환경의 관측값이며 실제 배포망·캐시 재방문 속도를 대표하지 않습니다. 원본 app.js는 메모리 안에서만 측정 접근자를 붙였습니다.</li><li>대표 화면 8종을 각각 2~12초 관측했습니다. 별도로 CPU 4배 지연 비교, 전투 즉시 정산, 100회 전투 후 저장, 연구소 3시간 정산, 미니게임 채점 마이크로벤치마크를 수행했습니다. 장시간 메모리 누수·실물 모바일 GPU 성능은 판정하지 않았습니다.</li></ul>''')
if changed:
    parts.append('<p class="note">점검 도중 다른 작업에 의한 파일 변경이 관측됐습니다. 테스트도 첫 실행 600/613 → 후속 실행 604/613으로 달라졌습니다. 정적 스냅샷 이후 변경된 실행 모듈: '+', '.join(esc(r['path']) for r in changed)+'. 수치는 각 산출물이 기록한 실행 시점의 결과입니다. 관련 지문은 <a href="changed_during_audit.json">변경 기록</a>에 남겼습니다.</p>')

parts.append('<h2>개선 우선순위</h2>')
issues=[
('1순위 · 재현 확인','전투 게이지의 width/height 애니메이션이 레이아웃을 반복시킵니다.',
 'HP·행동 게이지·쿨다운 마스크를 매 갱신마다 width/height로 쓰고 CSS가 0.1초간 보간합니다. 일반 전투 12초 동안 레이아웃 544회, 후반 전투 740회가 관측됐습니다. CPU 4배 지연의 같은 저장 상태 비교에서는 게이지를 scaleX/scaleY로 바꾼 메모리 실험이 레이아웃 시간을 915→154ms로 줄였습니다. 전체 TaskDuration도 5.74→3.27초로 감소했습니다.',
 '게이지 외곽 크기는 고정하고 내부 채움만 transform으로 바꾸는 것이 첫 후보입니다. DOM 조회 결과를 유닛별로 보관하고, HP 글자는 값이 바뀔 때만 갱신합니다. 실험판은 원인 확인용이며, 실제 적용 때는 쿨다운 방향·리셋·일시정지·배속·스킨별 표시를 검증해야 합니다.',
 [('src/ui/battle.js',874),('src/ui/battle.js',915),('src/ui/style.css',1983),('src/ui/style.css',2018)]),
('1순위 · 재현 확인','이펙트를 꺼도 전체 스타일의 스킬 그림을 받습니다.',
 'mountBattle이 무조건 fxPreload를 호출하고, fxPreload는 SKILL_ART 전체를 순회합니다. 해당 전투에 없는 스킬도 포함됩니다. 스킬 그림은 88개, 4,895,950바이트이며, 이펙트 On/Off 양쪽에서 동일하게 요청됐습니다. 첫 대표 전투의 /fx/ 전체 요청은 90건·약 4.99MB입니다. 스킬 88장의 단순 RGBA 환산은 51.9MB로, 실제 상주 메모리 측정값은 아닙니다.',
 '설정이 꺼져 있으면 선로딩을 건너뛰고, 현재 파티·적 스킬에 필요한 그림부터 불러옵니다. 다음 라운드용 그림은 낮은 우선순위로 준비하고, 도감에서 한 스타일 전체를 보는 경우에만 전체 로딩합니다. 기존 코드 이펙트 fallback을 유지하면 로딩 중 전투를 막지 않을 수 있습니다.',
 [('src/ui/battle.js',258),('src/ui/fx.js',475),('src/ui/fx.js',483)]),
('2순위 · 구조 확인','시작 메뉴 전에 전체 게임 JS와 65개 CSV를 로드합니다.',
 f"정적 import 연결은 35개 JS·{mb(A['module_bytes'])}, CSS는 0.50MB입니다. loadData는 65개 CSV·0.41MB를 모두 받은 뒤 시스템을 조립하며, boot는 이를 기다립니다. 합계 약 3.23MB의 JS/CSS/CSV가 그림보다 먼저 필요합니다. CSV는 1,988행으로 작아 데이터 크기 자체보다 요청 수와 시작 시 의존성이 문제입니다.",
 '배포용 번들·압축을 도입하고, 시작 메뉴·실제 게임·도감·개발 도구를 지연 로딩 경계로 나눕니다. CSV 편집 원본은 유지하면서 빌드 때 하나의 데이터 팩으로 묶을 수 있습니다. 행 순서가 난수 계약이므로 정렬이나 재배열은 금물입니다. 현재 로컬 서버에는 압축이 없지만 실제 배포 서버의 압축 여부는 확인하지 않았습니다.',
 [('src/ui/app.js',52),('src/ui/app.js',8252),('src/ui/data.js',121),('src/ui/data.js',131),('src/index.html',7)]),
('2순위 · 비용 확인','작은 조작도 전체 본문을 지우고 전투 재생기를 다시 만듭니다.',
 'render는 관전 재생기를 중지하고 main.innerHTML을 비운 뒤 다시 생성합니다. 관전 재개는 타임라인을 처음부터 현재 위치까지 적용해 화면을 복원합니다. 이 과정은 현재 위치가 뒤일수록 사건 수에 비례합니다. 이번 측정에서 render 중앙값은 연구소 8.0ms, 도감 10.8ms, 후반 관전 6.7ms였습니다. 이 수치는 JS 호출 시간이며 이후 paint까지 포함한 프레임 시간은 아닙니다.',
 '가방 선택·골드·탭 상태·상세창 변경은 해당 영역만 갱신하고, 관전 DOM과 재생기 수명은 유지합니다. 타임라인 체크포인트는 실제로 긴 런에서 재마운트 비용이 커질 때 도입합니다. 현재 수치만으로 즉각적인 프레임 장애라고 단정하지는 않습니다.',
 [('src/ui/app.js',590),('src/ui/app.js',599),('src/ui/app.js',615),('src/ui/battle.js',265),('src/ui/battle.js',1407)]),
('2순위 · 배포 용량','아트 폴더의 97.5%가 제작 원본·작업 자료입니다.',
 f"src/assets/art는 약 2.43GB입니다. 이름에 source가 있는 폴더는 {A['asset_source_files']:,}파일·2.37GB이며, 그 밖의 모든 자산은 {mb(A['non_source_asset_bytes'])}입니다. 이 60.83MB도 모두 사용 중이라는 뜻은 아닙니다. 전체 src를 배포/패키징하면 원본이 함께 실릴 수 있으나, 브라우저가 2.43GB를 자동으로 받는 것은 아닙니다.",
 '원본을 지우지 말고 배포 산출물에 필요한 파일만 포함하는 manifest를 만듭니다. source·icons_source·fx_source·dev·과거 작업물을 배포 대상에서 제외하고, 선택 가능한 스킨·동적 경로를 누락하지 않는 검증을 둡니다. 이름 검색에서 안 나왔다고 미사용으로 확정하지 않습니다.',
 [('src/assets/art/README.md',None),('src/ui/mock.js',694),('src/ui/skill_art.js',142)]),
('3순위 · 현재 비용 작음','전체 상태의 JSON 복사와 저장이 중복됩니다.',
 'serialize가 JSON.stringify→JSON.parse로 깊은 복사를 만든 뒤 writeSave가 다시 stringify합니다. 연구소 산출·레벨업·원정 정산 경로에서 동기 저장을 호출하므로 같은 200ms 앱 눈금에 저장이 겹칠 여지가 있습니다. 다만 이번 100회 전투 후 표본은 리포트 20개·아이템 48개·42.9KB이며, serialize 중앙값 0.3ms, 직렬화+저장 0.8ms로 현재 주 병목은 아닙니다.',
 '한 앱 눈금에서 변경 여부를 모아 한 번만 저장하거나 저장 전용 직렬화 경로를 검토합니다. 중요한 사용자 동작·종료 경계의 저장 보장은 유지해야 합니다. 현재 데이터만으로 저장소 교체나 Worker 도입을 우선할 근거는 없습니다.',
 [('src/ui/app.js',83),('src/ui/app.js',2930),('src/game_logic/state.js',114),('src/game_logic/state.js',314),('src/ui/storage.js',26)]),
('3순위 · 성장 시 재측정','전투와 미니게임에 반복 배열 생성이 있으나 현재 규모에서는 작습니다.',
 '전투 0.1초 tick은 같은 유닛 목록을 여러 번 spread/filter합니다. 미니게임은 매 animation frame마다 입력을 처음부터 채점하며 채광은 등장 종료 순서를 매번 정렬합니다. 그러나 채광 51개 표적·42입력의 채점 1,000회 평균은 약 0.020ms였고, 등록 영웅 없는 최대 연구 지점의 3시간 정산은 1.4ms였습니다. 채집·벌목 측정은 입력 없는 기준선이라 최악값이 아닙니다.',
 '동시 부대·유닛·미니게임 길이를 늘릴 때 다시 프로파일링합니다. 필요하면 정적 정렬·조회를 미리 만들고 플레이 표시용 채점만 증분 처리합니다. 최종 보상 검증에는 전체 입력 재검증을 유지합니다. 전투 루프 순서나 난수 소비 순서를 바꾸는 최적화는 결과 변경 위험이 있습니다.',
 [('src/game_logic/battle.js',1887),('src/ui/app.js',5782),('src/game_logic/state.js',2448),('src/game_logic/state.js',2163)]),
('3순위 · 자산 정리','실제 게임용 이미지는 대체로 이미 적절한 규격입니다.',
 '원본 폴더 밖 이미지 1,537장을 모두 디코딩했고 오류는 없었습니다. 1,204장은 256×256, 190장은 384×384입니다. 초상·아이콘 전체를 일괄 축소할 필요는 없습니다. 스킬 FX 718개·33.02MB에는 선택 가능한 그림체들이 섞여 있습니다. 바이트 동일 중복 그룹은 원본 포함 38개·중복분 9.18MB여서 원본 분리에 비해 효과가 작습니다.',
 '고해상도 배경은 실제 CSS 표시 크기와 DPR에 따라 단계별 버전을 검토합니다. login.webp(2914×1440)는 단순 RGBA 16.8MB이지만 현재 UI 코드에서 직접 참조를 찾지 못해 첫 로딩 병목으로 분류하지 않았습니다. 별도 원본 보존 정책과 동적 경로를 확인한 뒤 배포만 정리합니다.',
 [('src/ui/mock.js',596),('src/ui/mock.js',645),('src/ui/skill_art.js',147)]),
]
for priority,title,evidence,action,refs in issues:
    parts.append(f'<article class="issue"><span class="tag">{esc(priority)}</span><h3>{esc(title)}</h3><p>{esc(evidence)}</p><p><b>개선 방향:</b> {esc(action)}</p><small>'+ ' · '.join(filelink(p,l) for p,l in refs)+'</small></article>')

parts.append('<h2>게이지 비교 실험</h2><p>동일한 저장 상태, 10초 관측, CPU 4배 지연. width/height 갱신과 보간을 transform으로 바꾼 브라우저 메모리 실험입니다. 각 조건 1회이며, 전체 UI 회귀·화질 검증을 완료한 수정안은 아닙니다.</p>')
for r in L['results']:
    ms=r['metrics']['LayoutDuration']*1000
    parts.append(f'<div class="compare"><span>{"현재 구현" if r["mode"]=="original" else "transform 실험"}</span><div class="bar" style="width:{ms/10:.1f}%"></div><b>{ms:.0f} ms</b></div>')
parts.append('<p><a href="layout_experiment.json">실험 원자료</a> · <a href="layout_experiment.py">실험 코드</a> · <a href="effects_comparison.json">이펙트 On/Off 비교</a></p>')
parts.append('<h2>대표 화면 관측</h2>')
rows=[]
names={'menu':'시작 메뉴','newgame':'새 게임','battle':'첫 전투','late_battle':'후반 전투','reports':'리포트 20개·캐릭터','resource':'연구소','codex':'도감','help':'도움말'}
for r in read('browser_summary.json'):
    q=read('browser_'+r['label']+'.json');metric={x['name']:x['value'] for x in q['metricsAfter']['metrics']};before={x['name']:x['value'] for x in q['metricsBefore']['metrics']}
    rows.append([f'<a href="browser_{r["label"]}.json">{names[r["label"]]}</a>',f'{r["readyMs"]:.0f}ms',str(q['observeSeconds'])+'초',str(q['dom']),f'{(metric["ScriptDuration"]-before["ScriptDuration"])*1000:.1f}ms',f'{(metric["LayoutDuration"]-before["LayoutDuration"])*1000:.1f}ms',str(len(q['pageErrors']))])
parts.append(table(['화면','로컬 준비 시간','관측 시간','DOM 수','JS 실행 누적','레이아웃 누적','JS 오류'],rows))
parts.append('<p class="muted">준비 시간에는 계측·로컬 서버·요청 가로채기 비용이 포함됩니다. 각 표본의 난수 초기 상태가 다르므로 화면 간 시간 차이를 순수 기능 차이로 해석하면 안 됩니다. 후반 전투의 lv=70 요청은 게임 코드가 실제 만렙 50으로 제한했습니다. 시작 메뉴도 intro 이미지 등을 미리 받지만, 대량 FX 요청은 전투 진입 시 발생합니다.</p>')
parts.append('<h2>데이터·메모리·검증 결과</h2>')
parts.append(f'<ul><li>CSV 전체 {len(data)}개·0.45MB 중 실제 로더는 65개·0.41MB·1,988행을 읽습니다. inherited 25개는 현재 로더에 없습니다. 큰 표는 balance 305행, stage 91행, skill 95행으로, CSV 전체를 DB로 바꿀 규모는 아닙니다.</li><li>정적 JS 연결에서 누락된 import는 없었습니다. 8개 대표 화면에서 pageerror는 0개였습니다. 이미지 헤더 검사 3,335장 및 원본 폴더 밖 실제 디코딩 1,537장에서 읽기 오류는 없었습니다. 모든 동적 아트 경로가 실제로 존재한다는 보장은 별도입니다.</li><li>전투 로그 DOM은 진영별 60줄로 제한되고, 리포트도 부대별 20개로 제한됩니다. 숨긴 탭에서는 전체 render를 건너뛰며, 재생기 종료 시 interval·timeout을 정리합니다. 따라서 로그·리포트가 무조건 끝없이 쌓인다는 지적은 하지 않습니다.</li><li>캔버스/WebGL 재작성·DB 도입·전투 Worker 이관보다 앞의 두 개선이 우선입니다. 현재 측정은 장시간 메모리 누수 여부를 판정하기에 충분하지 않습니다.</li><li>전체 기존 테스트: <b>{esc(T["head"])} — {T["passed"]}개 통과, {len(T["failures"])}개 실패</b>. 게임 파일을 수정하지 않은 상태의 기존 검증 결과이며, 성능 최적화로 발생한 회귀는 아닙니다. 기대값 노후화와 실제 결함은 별도로 분류해야 합니다. 골든 파일을 덮어쓰지는 않았습니다.</li></ul>')
parts.append('<details><summary>실패 테스트 요약 보기</summary><ul>'+''.join('<li>'+esc(x[:300])+('…' if len(x)>300 else '')+'</li>' for x in T['failures'])+'</ul><a href="tests.json">실패 전문 및 실행 시간</a></details>')
parts.append('<p>경계 상태 원자료: <a href="boundary_benchmarks.json">전투·100회 후 저장·3시간 정산</a>. 전투 정산은 첫 호출 41ms, 나머지 3.2~8.7ms였지만 각 스테이지 표본 1개이며 워밍업 차이도 있습니다. 최악의 전투 비용으로 일반화하지 않습니다.</p>')
parts.append('<h2>파일별 전수 목록</h2><p>크기·규격·행 수는 감사 시작 시점의 목록입니다. 정적 패턴 개수는 점검 단서이며 결함 개수가 아닙니다. 전체 목록은 CSV로 열거나 정렬할 수 있습니다.</p><ul>'+''.join(f'<li><a href="{stem}.csv">{label} CSV</a> · <a href="{stem}.json">JSON</a></li>' for stem,label in [('files','전체 5,250파일'),('images','이미지 3,335장'),('code','코드 138파일'),('data','CSV 데이터 90파일')])+'<li><a href="duplicates.json">바이트 동일 자산 목록</a> · <a href="static_analysis.json">모듈 그래프·분류·해시</a></li></ul>')
parts.append('<details><summary>코드 138파일의 크기·반복 작업 패턴 보기</summary><input id="filter" placeholder="파일명으로 검색" aria-label="코드 파일 검색"><div id="code-table">'+table(['파일','크기','줄','innerHTML 대입','타이머/rAF','배치 읽기'],[[filelink(r['path']),f'{r["bytes"]/1000:.1f}KB',r['lines'],r['innerHTML'],r['timers'],r['layout_reads']] for r in sorted(code,key=lambda r:r['path'])])+'</div></details>')
parts.append('<details><summary>데이터 90파일 보기</summary>'+table(['파일','크기','데이터 행','열'],[[filelink(r['path']),f'{r["bytes"]/1000:.1f}KB',r.get('rows','오류'),r.get('columns','—')] for r in sorted(data,key=lambda r:r['path'])])+'</details>')
parts.append('''<h2>권장 작업 순서와 완료 기준</h2><ol><li><b>게이지 transform 전환:</b> 현재와 동일한 저장·배속·포커스 상태로 전후 측정. 타이밍·정산·보상 결과는 같아야 하고, 방향·쿨 완료·리셋이 시각적으로 같아야 합니다.</li><li><b>FX 선로딩 범위 축소:</b> FX Off에서는 스킬 그림 요청 0건, On에서는 필요한 스킬만 요청. 새 적·전직·설정 전환 시 fallback과 로딩 완료를 확인합니다.</li><li><b>전체 render 호출 축소:</b> 선택·툴팁·가방 갱신 시 전투 DOM을 유지하고, 긴 런에서도 조작 지연이 증가하지 않는지 확인합니다.</li><li><b>배포용 빌드와 자산 manifest:</b> JS/CSS 압축·지연 로딩·CSV 묶기. 원본은 보존하고 배포 산출물에서만 제외합니다. 실제 배포의 첫 방문·재방문·느린 네트워크에서 다시 측정합니다.</li><li><b>나머지 미세 최적화:</b> 저장·배열 생성·채점은 현재 낮은 비용을 기록해 두고, 콘텐츠 규모가 늘거나 프로파일에서 커질 때 진행합니다.</li></ol>
<footer>이번 작업의 변경 범위: output/2026-10-21_performance_audit 아래 감사 스크립트·CSV·JSON·이 HTML 보고서. 게임 코드·데이터·그림에는 수정 없음. 모든 용량은 별도 표기가 없으면 10진 MB/GB입니다.</footer>
<script>document.getElementById('filter').addEventListener('input',e=>{const q=e.target.value.toLowerCase();document.querySelectorAll('#code-table tbody tr').forEach(r=>r.hidden=!r.textContent.toLowerCase().includes(q))})</script></main></html>''')
(OUT/'report.html').write_text(''.join(parts),encoding='utf-8')
print('Created',OUT/'report.html')
