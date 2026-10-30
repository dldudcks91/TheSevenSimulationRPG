"""Standalone research plots, with censored starts retained in denominators."""
import argparse
import json
import math
from pathlib import Path
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
from matplotlib.patches import Rectangle
from analyze_sweep import records
from run_sweep import BASE

plt.rcParams.update({'font.family':'Malgun Gothic','axes.unicode_minus':False,'font.size':11})
OUT=BASE/'figures';OUT.mkdir(exist_ok=True)


def grid_plot():
    s=json.loads((BASE/'grid/summary.json').read_text(encoding='utf-8'))
    fig,ax=plt.subplots(figsize=(11,7))
    ax.add_patch(Rectangle((30,80),10,20,color='#a5d6a7',alpha=.3))
    colors={1:'#888888',1.25:'#448aff',1.5:'#e65100'}
    for xp,color in colors.items():
        for rounds,marker in [(9,'o'),(7,'^')]:
            a=[r for r in s['all']if r['xp']==xp and r['rounds']==rounds]
            ax.scatter([r['median']if r['median']is not None else 63 for r in a],[r['rate40']*100 for r in a],
                       c=color,marker=marker,s=28,alpha=.48,label=f'XP ×{xp} · {rounds}라운드')
    base=next(r for r in s['all']if r['id']=='g0000')
    ax.scatter([base['median']],[base['rate40']*100],s=150,c='black',marker='*',zorder=8)
    ax.annotate('현재 기준선',(base['median'],base['rate40']*100),xytext=(43,52),arrowprops={'arrowstyle':'->'})
    ax.axvline(40,color='#388e3c',ls='--',lw=1);ax.axhline(80,color='#388e3c',ls='--',lw=1)
    ax.set(xlabel='첫 보스 격파 중앙값 (분; >60은 오른쪽 끝)',ylabel='40분 안 격파 (%)',xlim=(10,65),ylim=(0,103),
           title='8축 576조합 전수 — 같은20개 시작 시드\n빠른 완료와 목표 페이싱을 함께 비교')
    ax.grid(alpha=.2);ax.legend(ncol=2,loc='lower left',fontsize=9)
    fig.tight_layout();fig.savefig(OUT/'grid_tradeoffs.png',dpi=170);plt.close(fig)


def refinement_plot():
    if not(BASE/'refinement/summary.json').exists():return
    s=json.loads((BASE/'refinement/summary.json').read_text(encoding='utf-8'))['all']
    hp=sorted({r['enemyHp']for r in s},reverse=True);xp=sorted({r['xp']for r in s});attack=sorted({r['enemyAttack']for r in s},reverse=True)
    fig,axes=plt.subplots(1,len(attack),figsize=(15,7),sharey=True)
    for ax,a in zip(axes,attack):
        arr=np.full((len(hp),len(xp)),np.nan)
        for i,h in enumerate(hp):
            for j,x in enumerate(xp):
                r=next(r for r in s if r['enemyHp']==h and r['xp']==x and r['enemyAttack']==a)
                arr[i,j]=r['rate40']*100
                text=f"{r['clear40']}/20\n{r['median']:.1f}분"if r['median']is not None else f"{r['clear40']}/20\n>60분"
                ax.text(j,i,text,ha='center',va='center',color='white'if arr[i,j]<65 else'black',fontsize=9)
        im=ax.imshow(arr,vmin=0,vmax=100,cmap='YlGnBu_r',aspect='auto')
        ax.set_xticks(range(len(xp)),[str(x)for x in xp],rotation=35);ax.set_yticks(range(len(hp)),[str(x)for x in hp]);ax.set_xlabel('1장 XP 배수');ax.set_title(f'일반 구간 데미지 ×{a}')
    axes[0].set_ylabel('1장 일반 구간 HP 배수')
    fig.suptitle('책Lv10 · 시작 무기+100% · 9라운드 · 챕터보스 유지 — 90조합\n칸마다40분 안 성공 수와 전체 중앙값',y=1.02)
    fig.tight_layout();fig.savefig(OUT/'refinement_heatmap.png',dpi=170,bbox_inches='tight');plt.close(fig)


def wilson(k,n,z=1.96):
    p=k/n;d=1+z*z/n;c=(p+z*z/(2*n))/d;h=z*math.sqrt(p*(1-p)/n+z*z/(4*n*n))/d
    return max(0,c-h),min(1,c+h)


def holdout_plot():
    if not(BASE/'holdout/jobs.json').exists():return
    data=records(BASE/'holdout');primary=[r for r in data if r['policy']=='active']
    if not primary:return
    fig,ax=plt.subplots(figsize=(11,7));times=np.arange(0,91,1)
    for i,r in enumerate(primary):
        xs=[x['clearSeconds']/60 if x['clearSeconds']is not None else math.inf for x in r['rows']]
        counts=[sum(x<=t for x in xs)for t in times];rates=np.array(counts)/len(xs)
        ax.step(times,rates*100,where='post',label=r['id'],lw=2)
        if i<2:
            bounds=[wilson(k,len(xs))for k in counts]
            ax.fill_between(times,[x[0]*100 for x in bounds],[x[1]*100 for x in bounds],alpha=.08,step='post')
    ax.axvline(40,color='#388e3c',ls='--');ax.axhline(80,color='#388e3c',ls='--')
    ax.set(xlabel='첫 출정 후 가상 경과 (분)',ylabel='누적 첫 보스 격파 (%)',xlim=(0,90),ylim=(0,101),title='선택에 쓰지 않은 자연 시작 시드 — 누적 격파율\n미완료 조건도 전체 분모에 포함')
    ax.grid(alpha=.2);ax.legend(loc='lower right');fig.tight_layout();fig.savefig(OUT/'holdout_cdf.png',dpi=170);plt.close(fig)


if __name__=='__main__':
    grid_plot();refinement_plot();holdout_plot();print(str(OUT))
