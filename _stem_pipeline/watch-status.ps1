$out = 'D:\ccho-site-public\_stem_pipeline'
while ($true) {
  $stems = @(Get-ChildItem (Join-Path $out 'out\stems\*.json') -EA SilentlyContinue).Count
  $latex = @(Get-ChildItem (Join-Path $out 'out\latex\*.tex') -EA SilentlyContinue).Count
  $done = @(Get-ChildItem (Join-Path $out 'logs\shard-*-DONE.txt') -EA SilentlyContinue).Count
  $alive = @(Get-Process cmd -EA SilentlyContinue).Count
  $ts = Get-Date -Format 'HH:mm:ss'
  Write-Host "[$ts] stems=$stems latex=$latex doneShards=$done cmdProcs=$alive"
  if ($done -ge 10) { break }
  Start-Sleep -Seconds 60
}
