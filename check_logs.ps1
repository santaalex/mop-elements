$ErrorActionPreference = 'Stop'

# Configuration
$RemoteUser = "root"
$RemoteHost = "219.151.179.8"

Write-Host "🔍 Fetching remote logs..." -ForegroundColor Cyan

ssh $RemoteUser@$RemoteHost "cd /root/mop-platform && docker compose logs --tail=50 mop-platform"
