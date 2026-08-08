# Polish all stems via DeepSeek official API (fallback if 8443 down).
# Usage:
#   powershell -File run-polish.ps1
#   powershell -File run-polish.ps1 -Concurrency 10
#   powershell -File run-polish.ps1 -Concurrency 10 -Limit 5
param(
  [int]$Concurrency = 10,
  [int]$Limit = 0,
  [switch]$Force
)

$ErrorActionPreference = 'Stop'
$Site = 'D:\ccho-site-public'
if (-not (Test-Path -LiteralPath $Site)) {
  $Site = 'D:\打工2\projects\化学竞赛知识图谱-public'
}

$key = [Environment]::GetEnvironmentVariable('DEEPSEEK_API_KEY', 'Process')
if ([string]::IsNullOrWhiteSpace($key)) {
  $key = [Environment]::GetEnvironmentVariable('DEEPSEEK_API_KEY', 'User')
}
if ([string]::IsNullOrWhiteSpace($key)) {
  throw 'DEEPSEEK_API_KEY not set in User/Process environment'
}
$env:DEEPSEEK_API_KEY = $key

# Prefer local gateway if up, else official
$useBase = 'https://api.deepseek.com'
try {
  $tcp = Test-NetConnection -ComputerName 127.0.0.1 -Port 8443 -WarningAction SilentlyContinue
  if ($tcp.TcpTestSucceeded) {
    $useBase = 'http://127.0.0.1:8443/ds-datatask'
    Write-Host "Upstream: $useBase"
  } else {
    Write-Host "Upstream: $useBase (8443 down)"
  }
} catch {
  Write-Host "Upstream: $useBase (probe failed)"
}
$env:DEEPSEEK_BASE_URL = $useBase
$env:DEEPSEEK_MODEL = 'deepseek-v4-flash'

Set-Location -LiteralPath $Site
$args = @('_stem_pipeline/polish-stems.mjs', '--concurrency', "$Concurrency")
if ($Limit -gt 0) { $args += @('--limit', "$Limit") }
if ($Force) { $args += '--force' }

Write-Host "node $($args -join ' ')"
& node @args
exit $LASTEXITCODE
