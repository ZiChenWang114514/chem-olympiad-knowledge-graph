# Launch N codex workers via DeepSeek local proxy (ds-datatask upstream).
# Usage:
#   powershell -File run-workers.ps1
#   powershell -File run-workers.ps1 -Concurrency 50
#   powershell -File run-workers.ps1 -Concurrency 200
param(
  [int]$Concurrency = 10,
  [int]$MaxConcurrency = 200
)

$ErrorActionPreference = 'Stop'
if ($Concurrency -lt 1) { throw 'Concurrency must be >= 1' }
if ($Concurrency -gt $MaxConcurrency) {
  Write-Warning "Capping concurrency $Concurrency -> $MaxConcurrency (API said ~200 is OK; raise -MaxConcurrency if needed)"
  $Concurrency = $MaxConcurrency
}

$SiteLink = 'D:\ccho-site-public'
$ExamLink = 'D:\ccho-exams-link'
$DeepSeekHome = 'C:\Users\11234\Documents\Codex\2026-08-08\new-chat\outputs\codex-deepseek'
$proxyScript = Join-Path $DeepSeekHome 'Run-Proxy.ps1'
$catalogPath = Join-Path $DeepSeekHome 'runtime\codex-deepseek-catalog.json'
$pidPath = Join-Path $DeepSeekHome 'proxy.pid'
$codexCmd = 'C:\Users\11234\AppData\Roaming\npm\codex.cmd'
$Pipeline = Join-Path $SiteLink '_stem_pipeline'

if (-not (Test-Path -LiteralPath (Join-Path $Pipeline 'shards\shard-00\tasks.json'))) {
  throw 'Run: node _stem_pipeline/build-inventory.mjs first (and rebuild shards for high concurrency if needed)'
}
if (-not (Test-Path -LiteralPath $SiteLink)) { throw "Missing site junction $SiteLink" }
if (-not (Test-Path -LiteralPath $ExamLink)) { throw "Missing exam junction $ExamLink" }

$listener = Get-NetTCPConnection -LocalPort 11435 -State Listen -ErrorAction SilentlyContinue
if (-not $listener) {
  Write-Host 'Starting DeepSeek proxy (upstream http://127.0.0.1:8443/ds-datatask) ...'
  $proxy = Start-Process -FilePath 'powershell.exe' -ArgumentList @(
    '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $proxyScript
  ) -WindowStyle Hidden -PassThru
  Set-Content -LiteralPath $pidPath -Value $proxy.Id -Encoding ascii
  $deadline = (Get-Date).AddSeconds(20)
  do {
    Start-Sleep -Milliseconds 300
    $listener = Get-NetTCPConnection -LocalPort 11435 -State Listen -ErrorAction SilentlyContinue
  } until ($listener -or (Get-Date) -ge $deadline)
  if (-not $listener) { throw 'DeepSeek proxy failed to start on 11435 — check gateway 8443 and DEEPSEEK_API_KEY' }
}

$catalogForToml = $catalogPath.Replace('\', '\\')
$logDir = Join-Path $Pipeline 'logs'
$jobs = @()
$width = [Math]::Max(2, "$($Concurrency-1)".Length)

# If inventory has fewer shards than concurrency, reuse shards round-robin
$shardDirs = @(Get-ChildItem (Join-Path $Pipeline 'shards') -Directory | Sort-Object Name)
if ($shardDirs.Count -eq 0) { throw 'No shards found' }

for ($i = 0; $i -lt $Concurrency; $i++) {
  $id = ('{0:d' + $width + '}') -f $i
  $shardName = $shardDirs[$i % $shardDirs.Count].Name
  $log = Join-Path $logDir "worker-$id.log"
  $err = Join-Path $logDir "worker-$id.err.log"

  $promptTemplate = Get-Content -LiteralPath (Join-Path $Pipeline 'prompts\worker-prompt.md') -Raw -Encoding UTF8
  $promptBody = $promptTemplate -replace 'shard-XX', $shardName
  $promptBody += @"

---
RUNTIME (ASCII paths):
- site workdir: D:\ccho-site-public
- exam MD root: D:\ccho-exams-link\MinerU_MD
- shard tasks: _stem_pipeline/shards/$shardName/tasks.json
- stems out: _stem_pipeline/out/stems/{problemId}.json
- latex out: _stem_pipeline/out/latex/{problemId}.tex
- done marker: _stem_pipeline/logs/worker-$id-DONE.txt
- concurrency slot: $id / $Concurrency
If tasks.json lists Chinese absolute paths under D:\打工2\..., rewrite them to D:\ccho-exams-link\... when reading.
Prefer improving existing stems over placeholders. Do not invent answers.
"@
  $stdinFile = Join-Path $logDir "prompt-stdin-$id.md"
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

  Write-Host "Starting worker $id -> $shardName ..."
  $p = Start-Process -FilePath 'cmd.exe' -ArgumentList @('/c', $bat) `
    -WorkingDirectory $SiteLink `
    -RedirectStandardOutput $log `
    -RedirectStandardError $err `
    -PassThru -WindowStyle Hidden

  $jobs += [pscustomobject]@{ Slot = $id; Shard = $shardName; Pid = $p.Id; Log = $log; Bat = $bat }
  Set-Content -LiteralPath (Join-Path $logDir "worker-$id.pid") -Value $p.Id -Encoding ascii
}

$jobs | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $logDir 'workers.json') -Encoding utf8
Write-Host "Launched $($jobs.Count) workers (cap $MaxConcurrency). Upstream: http://127.0.0.1:8443/ds-datatask via proxy :11435"
$jobs | Format-Table | Out-String | Write-Host
