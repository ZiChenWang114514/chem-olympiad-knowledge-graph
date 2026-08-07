# Launch one codex-deepseek verifier after workers finish
$ErrorActionPreference = 'Stop'
$SiteLink = 'D:\ccho-site-public'
$ExamLink = 'D:\ccho-exams-link'
$DeepSeekHome = 'C:\Users\11234\Documents\Codex\2026-08-08\new-chat\outputs\codex-deepseek'
$catalogPath = Join-Path $DeepSeekHome 'runtime\codex-deepseek-catalog.json'
$codexCmd = 'C:\Users\11234\AppData\Roaming\npm\codex.cmd'
$Pipeline = Join-Path $SiteLink '_stem_pipeline'
$logDir = Join-Path $Pipeline 'logs'
$catalogForToml = $catalogPath.Replace('\', '\\')

$prompt = Get-Content -LiteralPath (Join-Path $Pipeline 'prompts\verify-prompt.md') -Raw -Encoding UTF8
$prompt += @"

Use ASCII workdir D:\ccho-site-public.
Copy passed stems into public/data/stems/ and rebuild index+manifest, then npm run audit:public.
"@
$stdin = Join-Path $logDir 'prompt-stdin-verify.md'
$utf8 = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($stdin, $prompt, $utf8)

$bat = Join-Path $logDir 'run-verify.cmd'
$line = @(
  '@echo off',
  'setlocal',
  "cd /d `"$SiteLink`"",
  "`"$codexCmd`" -c model=`"deepseek-v4-flash`" -c model_provider=`"codex_deepseek_proxy`" -c model_reasoning_effort=`"high`" -c model_catalog_json=`"$catalogForToml`" -c model_providers.codex_deepseek_proxy.name=`"codex-deepseek`" -c model_providers.codex_deepseek_proxy.base_url=`"http://127.0.0.1:11435`" -c model_providers.codex_deepseek_proxy.wire_api=`"responses`" -c model_providers.codex_deepseek_proxy.requires_openai_auth=false -c model_providers.codex_deepseek_proxy.stream_idle_timeout_ms=1800000 exec --skip-git-repo-check -C `"$SiteLink`" --add-dir `"$ExamLink`" -s danger-full-access --dangerously-bypass-approvals-and-sandbox - < `"$stdin`"",
  'exit /b %ERRORLEVEL%'
) -join "`r`n"
[System.IO.File]::WriteAllText($bat, $line, [System.Text.Encoding]::ASCII)

$log = Join-Path $logDir 'verify.log'
$err = Join-Path $logDir 'verify.err.log'
Write-Host 'Starting verify worker...'
$p = Start-Process -FilePath 'cmd.exe' -ArgumentList @('/c', $bat) -WorkingDirectory $SiteLink -RedirectStandardOutput $log -RedirectStandardError $err -PassThru -WindowStyle Hidden
Write-Host "Verify PID=$($p.Id)"
Set-Content (Join-Path $logDir 'verify.pid') $p.Id
