# 管理员 PowerShell：将 api.wxmtu.com 指到本机 relay-bridge HTTPS
# 用法:
#   1. pnpm tls:gen
#   2. config/relay-bridge.yaml → tls.enabled: true
#   3. 以管理员运行 .\scripts\setup-hosts-mengtu.ps1 -Enable
#   4. 以管理员运行 pnpm start:relay（监听 443）

param(
  [switch]$Enable,
  [switch]$Disable
)

$hostsFile = "$env:SystemRoot\System32\drivers\etc\hosts"
$marker = "# wechathook-mengtu-relay"
$entry = "127.0.0.1 api.wxmtu.com $marker"

$content = Get-Content $hostsFile -Raw
$content = ($content -split "`n" | Where-Object { $_ -notmatch [regex]::Escape($marker) }) -join "`n"

if ($Enable) {
  if ($content -notmatch "api\.wxmtu\.com") {
    Add-Content -Path $hostsFile -Value "`n$entry"
    Write-Host "Added: $entry"
  } else {
    Write-Host "api.wxmtu.com already in hosts"
  }
}

if ($Disable) {
  Set-Content -Path $hostsFile -Value $content.TrimEnd()
  Write-Host "Removed wechathook hosts entry"
}

Write-Host "Relay-bridge HTTP: config/relay-bridge.yaml listen.port (default 8789)"
Write-Host "Mengtu shell HTTPS: enable tls in relay-bridge.yaml + admin pnpm start:relay"
