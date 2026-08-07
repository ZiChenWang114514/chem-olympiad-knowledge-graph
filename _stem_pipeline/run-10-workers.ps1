# Launch 10 codex workers via DeepSeek proxy (ASCII junctions only)
$ErrorActionPreference = 'Stop'
$SiteLink = 'D:\ccho-site-public'
$ExamLink = 'D:\ccho-exams-link'
$DeepSeekHome = 'C:\Users\11234\Documents\Codex\2026-08-08\new-chat\outputs\codex-deepseek'
$proxyScript = Join-Path $DeepSeekHome 'Run-Proxy.ps1'
$catalogPath = Join-Path $DeepSeekHome 'runtime\codex-deepseek-catalog.json'
$pidPath = Join-Path $DeepSeekHome 'proxy.pid'
$codexCmd = 'C:\Users\11234\AppData\Roaming\npm\codex.cmd'
$Pipeline = Join-Path $SiteLink '_stem_pipeline'

if (-not (Test-Path -LiteralPath (Join-Path $Pipeline 'shards\shard-00\tasks.json'))) {
  throw 'Run build-inventory.mjs first'
}
if (-not (Test-Path -LiteralPath $SiteLink)) { throw "Missing site junction $SiteLink" }
if (-not (Test-Path -LiteralPath $ExamLink)) { throw "Missing exam junction $ExamLink" }

$listener = Get-NetTCPConnection -LocalPort 11435 -State Listen -ErrorAction SilentlyContinue
if (-not $listener) {
  $proxy = Start-Process -FilePath 'powershell.exe' -ArgumentList @(
    '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $proxyScript
  ) -WindowStyle Hidden -PassThru
  Set-Content -LiteralPath $pidPath -Value $proxy.Id -Encoding ascii
  $deadline = (Get-Date).AddSeconds(20)
  do {
    Start-Sleep -Milliseconds 300
    $listener = Get-NetTCPConnection -LocalPort 11435 -State Listen -ErrorAction SilentlyContinue
  } until ($listener -or (Get-Date) -ge $deadline)
  if (-not $listener) { throw 'DeepSeek proxy failed to start on 11435' }
}

$catalogForToml = $catalogPath.Replace('\', '\\')
$logDir = Join-Path $Pipeline 'logs'
$jobs = @()
foreach ($i in 0..9) {
  $id = '{0:d2}' -f $i
  $log = Join-Path $logDir "worker-$id.log"
  $err = Join-Path $logDir "worker-$id.err.log"

  $promptTemplate = Get-Content -LiteralPath (Join-Path $Pipeline 'prompts\worker-prompt.md') -Raw -Encoding UTF8
  $promptBody = $promptTemplate -replace 'shard-XX', "shard-$id"
  $promptBody += @"

---
RUNTIME (ASCII paths):
- site workdir: D:\ccho-site-public
- exam MD root: D:\ccho-exams-link\MinerU_MD
- shard tasks: _stem_pipeline/shards/shard-$id/tasks.json
- stems out: _stem_pipeline/out/stems/{problemId}.json
- latex out: _stem_pipeline/out/latex/{problemId}.tex
- done marker: _stem_pipeline/logs/shard-$id-DONE.txt
If tasks.json still lists Chinese absolute paths under D:\打工2\..., rewrite them to D:\ccho-exams-link\... when reading.
"@
  $stdinFile = Join-Path $logDir "prompt-stdin-$id.md"
  # UTF-8 no BOM for fewer surprises; content is mostly ASCII + Chinese which UTF-8 handles when redirected
  $utf8 = New-Object System.Text.UTF8Encoding $false
  [System.IO.File]::WriteAllText($stdinFile, $promptBody, $utf8)

  $bat = Join-Path $logDir "run-worker-$id.cmd"
  $line = @(
    '@echo off',
    'setlocal',
    "cd /d `"$SiteLink`"",
    "`"$codexCmd`" -c model=`"deepseek-v4-flash`" -c model_provider=`"codex_deepseek_proxy`" -c model_reasoning_effort=`"high`" -c model_catalog_json=`"$catalogForToml`" -c model_providers.codex_deepseek_proxy.name=`"codex-deepseek`" -c model_providers.codex_deepseek_proxy.base_url=`"http://127.0.0.1:11435`" -c model_providers.codex_deepseek_proxy.wire_api=`"responses`" -c model_providers.codex_deepseek_proxy.requires_openai_auth=false -c model_providers.codex_deepseek_proxy.stream_idle_timeout_ms=1800000 exec --skip-git-repo-check -C `"$SiteLink`" --add-dir `"$ExamLink`" -s danger-full-access --dangerously-bypass-approvals-and-sandbox - < `"$stdinFile`"",
    'exit /b %ERRORLEVEL%'
  ) -join "`r`n"
  [System.IO.File]::WriteAllText($bat, $line, [System.Text.Encoding]::ASCII)

  Write-Host "Starting worker $id ..."
  $p = Start-Process -FilePath 'cmd.exe' -ArgumentList @('/c', $bat) `
    -WorkingDirectory $SiteLink `
    -RedirectStandardOutput $log `
    -RedirectStandardError $err `
    -PassThru -WindowStyle Hidden

  $jobs += [pscustomobject]@{ Shard = $id; Pid = $p.Id; Log = $log; Bat = $bat }
  Set-Content -LiteralPath (Join-Path $logDir "worker-$id.pid") -Value $p.Id -Encoding ascii
}

$jobs | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $logDir 'workers.json') -Encoding utf8
Write-Host "Launched $($jobs.Count) workers."
$jobs | Format-Table | Out-String | Write-Host
