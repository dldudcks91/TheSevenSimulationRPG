"""Check report evidence links and record source drift without changing the product."""
import hashlib,json,re
from pathlib import Path
OUT=Path(__file__).resolve().parent
ROOT=OUT.parents[1]
manifest=json.loads((OUT/'source_manifest.json').read_text(encoding='utf-8'))
supp=json.loads((OUT/'asset_module_manifest.json').read_text(encoding='utf-8'))
all_files={**manifest['files'],**supp}
frozen_changed=[p for p,m in all_files.items() if hashlib.sha256((OUT/'snapshot'/'src'/p).read_bytes()).hexdigest()!=m['sha256']]
live_changed=[p for p,m in all_files.items() if not (ROOT/'src'/p).exists() or hashlib.sha256((ROOT/'src'/p).read_bytes()).hexdigest()!=m['sha256']]
report=(OUT/'REPORT.md').read_text(encoding='utf-8')
links=re.findall(r'\]\(([^)]+)\)',report)
missing=[url for url in links if not url.startswith(('http:','https:')) and not (OUT/url.split('#')[0]).exists()]
summary=json.loads((OUT/'simulation'/'summary.json').read_text(encoding='utf-8'))
validation=json.loads((OUT/'simulation'/'validation.json').read_text(encoding='utf-8'))
current=OUT/'current_validation'
current_manifest=json.loads((current/'source_manifest.json').read_text(encoding='utf-8'))
current_frozen_changed=[p for p,m in current_manifest['files'].items() if hashlib.sha256((current/'snapshot'/'src'/p).read_bytes()).hexdigest()!=m['sha256']]
current_live_changed=[p for p,m in current_manifest['files'].items() if not (ROOT/'src'/p).exists() or hashlib.sha256((ROOT/'src'/p).read_bytes()).hexdigest()!=m['sha256']]
current_validation=json.loads((current/'simulation'/'validation.json').read_text(encoding='utf-8'))
current_runs=json.loads((current/'simulation'/'run_info.json').read_text(encoding='utf-8'))
current_comparison=json.loads((current/'simulation'/'version_comparison.json').read_text(encoding='utf-8'))
current_regression=json.loads((current/'browser'/'baseline_assertions.json').read_text(encoding='utf-8'))
result={'report_links':len(links),'missing_links':missing,'frozen_changed':frozen_changed,
        'live_source_changed_since_capture':live_changed,
        'live_gameplay_or_data_changed':[p for p in live_changed if p.startswith(('game_logic/','data/'))],
        'accounts':summary['accounts'],'expeditions':summary['completedExpeditions'],
        'failed_accounts':summary['failedAccounts'],'cross_checks_passed':validation['passed'],
        'cross_checks_total':validation['checks'],
        'latest':{'captured_at_utc':current_manifest['captured_at_utc'],
                  'frozen_changed':current_frozen_changed,'live_changed_since_latest_capture':current_live_changed,
                  'accounts':current_comparison['accounts'],
                  'expeditions':current_comparison['checks']['newCompletedExpeditions'],
                  'cross_checks':current_validation,'run_errors':current_runs['errors'],
                  'regression_passed':current_regression['passed'],
                  'regression_failed':current_regression['failed'],
                  'regression_page_errors':current_regression['page_errors']}}
(OUT/'report_validation.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(result,ensure_ascii=True,indent=2))
if missing or frozen_changed or summary['failedAccounts'] or validation['failed'] or current_frozen_changed or current_validation['failed'] or current_runs['errors'] or current_regression['failed'] or current_regression['page_errors']:
    raise SystemExit(1)
