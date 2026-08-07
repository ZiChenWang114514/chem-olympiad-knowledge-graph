$ErrorActionPreference = 'Continue'
$out = 'D:\ccho-site-public\_stem_pipeline'
$log = Join-Path $out 'logs\monitor.log'
function Log([string]$m) {
  $line = '[' + (Get-Date -Format 'HH:mm:ss') + '] ' + $m
  Add-Content -LiteralPath $log -Value $line -Encoding utf8
  Write-Output $line
}
Log 'monitor start'
$stable = 0
$prev = -1
while ($true) {
  $stems = @(Get-ChildItem -LiteralPath (Join-Path $out 'out\stems') -Filter '*.json' -ErrorAction SilentlyContinue).Count
  $done = @(Get-ChildItem -LiteralPath (Join-Path $out 'logs') -Filter 'shard-*-DONE.txt' -ErrorAction SilentlyContinue).Count
  $cmd = @(Get-Process -Name cmd -ErrorAction SilentlyContinue).Count
  $codex = @(Get-Process -Name codex -ErrorAction SilentlyContinue).Count
  Log "stems=$stems doneShards=$done cmd=$cmd codex=$codex"
  if ($stems -eq $prev -and $stems -gt 50) { $stable++ } else { $stable = 0 }
  $prev = $stems
  if ($done -ge 8 -or ($stems -ge 200 -and $cmd -lt 3 -and $stable -ge 3)) {
    Log 'launching verify'
    & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $out 'run-verify.ps1')
    break
  }
  if ($cmd -eq 0 -and $stems -eq 0) {
    Log 'workers died with no stems'
    break
  }
  Start-Sleep -Seconds 90
}
Log 'monitor exit'
