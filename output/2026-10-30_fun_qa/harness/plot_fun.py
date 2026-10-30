"""Create a self-contained interactive QA chart and a PNG preview (no CDN)."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
HERE=Path(__file__).resolve().parent
OUT=HERE.parent/'simulation'
data=[]
for file in OUT.glob('*_seed*.json'):
    r=json.loads(file.read_text(encoding='utf-8'))
    data.append({'seed':r['seed'],'policy':r['policy'],'clears':[x['t']for x in r['clears']],'rewards':[x['t']for x in r['rounds']if x['actualXp']>0 or x['gold']>0 or x['drops']>0 or x['blueprints']>0]})
html='''<!doctype html><meta charset="utf-8"><title>New-player fun QA</title>
<style>body{font:16px Segoe UI,Arial,sans-serif;color:#253044;background:#f5f7fb;margin:0;padding:28px}main{max-width:1180px;margin:auto}h1{font-size:26px;margin:0 0 9px}p{margin:8px 0;color:#536174;line-height:1.5}button{border:1px solid #c3cbd8;background:white;color:#253044;padding:9px 24px;border-radius:6px;margin:12px 6px 10px 0;cursor:pointer}button.on{background:#253f65;color:white}section{background:white;padding:20px 24px;margin:16px 0;border-radius:12px;box-shadow:0 2px 10px #dbe1ea}h2{font-size:19px;margin:0 0 8px}.legend{display:flex;gap:22px;font-size:14px;margin:10px 0}.key{display:inline-block;width:12px;height:12px;margin-right:7px;border-radius:3px}.note{font-size:13px;color:#667489}svg{width:100%;display:block}#hover{min-height:23px;font-size:14px;font-variant-numeric:tabular-nums}circle:hover{stroke:#172a45;stroke-width:2}</style>
<main><h1>신규 플레이 재미 QA: 진행과 보상 간격</h1><p>2026-10-30 03:07 KST 사본의 50개 진행 조건: 20쌍의 기본/대응 정책과 무관리 10개. 기본 배속 1x의 가상 접속 시간이며, 재화와 해금 조건을 적용했습니다. 03:38 사본의 대표 10개 재검증 결과는 <a href="../REPORT.md">종합 보고서</a>에서 구분해 확인할 수 있습니다.</p>
<div><button data-end="600">10 minutes</button><button data-end="3600">60 minutes</button><button class="on" data-end="86400">24 hours</button></div>
<div class="legend"><span><i class="key" style="background:#cc7b26"></i>Basic: CSV-order mastery (weak proxy)</span><span><i class="key" style="background:#16847b"></i>Adaptive: combat build + warning response + farming</span><span><i class="key" style="background:#7b8796"></i>Passive: no management</span></div>
<section><h2>New stages cleared</h2><p class="note">Line = median, band = middle 50% of accounts. Different difficulties count as new clears. Hover to inspect.</p><svg id="progress" viewBox="0 0 1080 390"></svg><div id="hover"></div></section>
<section><h2>Longest interval without a battle reward</h2><p class="note">Each dot is one account. A reward means actual added hero XP, gold, gear or a blueprint from a completed round. Existing laboratory income does not count here. Hover a dot for its seed and interval.</p><svg id="gaps" viewBox="0 0 1080 245"></svg></section>
<p class="note">The adaptive comparison bundles several legal choices, so this is not a farming-only causal test. A simulator measures opportunities and stalls, not human enjoyment. Useful gear includes utility tradeoffs beyond a single combat score. Management occurs every 5 minutes with zero invented click cost.</p></main>
<script>const DATA=__DATA__,COL={basic:'#cc7b26',adaptive:'#16847b',passive:'#7b8796'},NAMES={basic:'Basic (20)',adaptive:'Adaptive (20)',passive:'Passive (10)'},POL=['basic','adaptive','passive'];let END=86400;const NS='http://www.w3.org/2000/svg';const el=(tag,attrs,parent,text)=>{const n=document.createElementNS(NS,tag);Object.entries(attrs||{}).forEach(([k,v])=>n.setAttribute(k,v));if(text!==undefined)n.textContent=text;parent.appendChild(n);return n};const quant=(xs,p)=>{xs=xs.slice().sort((a,b)=>a-b);const i=(xs.length-1)*p,k=Math.floor(i);return xs[k]+(xs[Math.ceil(i)]-xs[k])*(i-k)};const fmt=t=>t<3600?(t/60).toFixed(1)+' min':(t/3600).toFixed(2)+' h';
function draw(){const s=document.querySelector('#progress');s.replaceChildren();const L=62,R=1045,T=20,B=335,steps=200,groups=Object.fromEntries(POL.map(p=>[p,DATA.filter(d=>d.policy===p)])),scores=Object.fromEntries(POL.map(p=>[p,Array.from({length:steps+1},(_,i)=>{const t=END*i/steps,vs=groups[p].map(d=>d.clears.filter(v=>v<=t).length);return [quant(vs,.25),quant(vs,.5),quant(vs,.75)]})])),max=Math.max(5,...Object.values(scores).flat().map(v=>v[2])),cap=Math.ceil(max/5)*5,X=t=>L+(R-L)*t/END,Y=v=>B-(B-T)*v/cap;
for(let i=0;i<=5;i++){const yy=Y(cap*i/5);el('line',{x1:L,y1:yy,x2:R,y2:yy,stroke:'#e6ebf2'},s);el('text',{x:L-12,y:yy+5,'text-anchor':'end',fill:'#607086','font-size':13},s,Math.round(cap*i/5));const t=END*i/5,xx=X(t);el('text',{x:xx,y:B+25,'text-anchor':'middle',fill:'#607086','font-size':13},s,fmt(t));}
POL.forEach(p=>{const a=scores[p],top=a.map((v,i)=>[X(END*i/steps),Y(v[2])]),bot=a.map((v,i)=>[X(END*i/steps),Y(v[0])]).reverse();el('path',{d:'M'+[...top,...bot].map(v=>v.join(',')).join('L')+'Z',fill:COL[p],opacity:.13},s);el('path',{d:'M'+a.map((v,i)=>[X(END*i/steps),Y(v[1])].join(',')).join('L'),fill:'none',stroke:COL[p],'stroke-width':3},s)});
const cross=el('line',{x1:L,y1:T,x2:L,y2:B,stroke:'#526b8b','stroke-dasharray':'3 4',visibility:'hidden'},s);const cover=el('rect',{x:L,y:T,width:R-L,height:B-T,fill:'transparent'},s);cover.addEventListener('mousemove',e=>{const bb=s.getBoundingClientRect(),x=(e.clientX-bb.left)/bb.width*1080,t=Math.max(0,Math.min(END,(x-L)/(R-L)*END)),idx=Math.round(t/END*steps);cross.setAttribute('visibility','visible');cross.setAttribute('x1',X(t));cross.setAttribute('x2',X(t));document.querySelector('#hover').textContent=fmt(t)+' — '+POL.map(p=>NAMES[p]+': '+scores[p][idx][1].toFixed(1)+' new clears').join(' · ')});cover.addEventListener('mouseleave',()=>cross.setAttribute('visibility','hidden'));
const g=document.querySelector('#gaps');g.replaceChildren();const vals=DATA.map(d=>{const a=[0,...d.rewards.filter(t=>t<=END),END];let best={seconds:0,from:0,to:0};for(let i=1;i<a.length;i++)if(a[i]-a[i-1]>best.seconds)best={seconds:a[i]-a[i-1],from:a[i-1],to:a[i]};return {...d,gap:best}}),gm=Math.max(60,...vals.map(v=>v.gap.seconds)),GX=v=>180+v/gm*855;
for(let i=0;i<=5;i++){const xx=GX(gm*i/5);el('line',{x1:xx,y1:15,x2:xx,y2:185,stroke:'#e6ebf2'},g);el('text',{x:xx,y:215,'text-anchor':'middle',fill:'#607086','font-size':13},g,fmt(gm*i/5))}
POL.forEach((p,j)=>{const yy=45+j*57;el('text',{x:8,y:yy+5,fill:COL[p],'font-size':15},g,NAMES[p]);vals.filter(v=>v.policy===p).forEach((v,i)=>{const cc=el('circle',{cx:GX(v.gap.seconds),cy:yy+(i%5-2)*4.3,r:5.2,fill:COL[p],opacity:.75},g);el('title',{},cc,p+' seed '+v.seed+': '+fmt(v.gap.seconds)+' without a battle reward ('+fmt(v.gap.from)+'–'+fmt(v.gap.to)+')')})})}
document.querySelectorAll('button').forEach(b=>b.onclick=()=>{END=+b.dataset.end;document.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));draw()});draw();</script>'''.replace('__DATA__',json.dumps(data,separators=(',',':')))
path=OUT/'fun_charts.html'
path.write_text(html,encoding='utf-8')
with sync_playwright() as p:
    browser=p.chromium.launch(channel='msedge',headless=True)
    page=browser.new_page(viewport={'width':1280,'height':1180},device_scale_factor=1)
    page.goto(path.resolve().as_uri())
    page.screenshot(path=str(OUT/'fun_charts_24h.png'),full_page=True)
    page.locator('button[data-end="600"]').click()
    page.screenshot(path=str(OUT/'fun_charts_10m.png'),full_page=True)
    browser.close()
print(path)
