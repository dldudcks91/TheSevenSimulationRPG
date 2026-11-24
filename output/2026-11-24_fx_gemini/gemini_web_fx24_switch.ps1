# Waits for round 1 (faithful prompt) of the running batch (PID given) to finish s12, stops that batch in its 15 s
# pause between sheets, then runs round 2 with the freer prompt. Stops without round 2 if the batch died on its own.
param([int]$BatchPid)
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$log = Join-Path $here 'sheets\log.txt'
while ($true) {
    $p = Get-Process -Id $BatchPid -ErrorAction SilentlyContinue
    if (-not $p) { "batch $BatchPid ended by itself - round 2 not started"; exit 1 }
    $text = Get-Content $log -Raw -Encoding utf8
    if ($text -match 's12_pri_b image|s12_pri_b FAILED \(try 2\)') { break }
    if ($text -match 'DAILY LIMIT|three sheets failed') { "round 1 stopped: limit/failures"; exit 1 }
    Start-Sleep -Seconds 2
}
Stop-Process -Id $BatchPid -Confirm:$false
"stopped round-1 batch $BatchPid"
Start-Sleep -Seconds 5
Set-Location $here
$env:FX_HEAD = '_head_free.txt'
python gemini_web_fx24_batch.py s01_war_a s02_war_b s03_rings s04_kni_a s05_kni_b s06_mag_fire s07_mag_ice s08_mag_big s09_arc_a s10_arc_b s11_pri_a s12_pri_b
