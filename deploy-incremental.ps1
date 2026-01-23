# Deploy to Private Cloud (Incremental)
# Usage: ./deploy-incremental.ps1

$ServerIP = "219.151.179.8"
$User = "root"

Write-Host "📦 Packaging application (Incremental)..." -ForegroundColor Cyan

# Set strict error handling
$ErrorActionPreference = 'Stop'

# 1. Archive files from DISK
$ZipFile = "mop-platform-deploy-inc.zip"

# Clean previous artifacts
if (Test-Path $ZipFile) { Remove-Item $ZipFile -ErrorAction SilentlyContinue }
if (Test-Path "deploy_temp") { Remove-Item -Recurse -Force "deploy_temp" -ErrorAction SilentlyContinue }

Write-Host "📂 Preparing files (Excluding DB & heavy node_modules)..." -ForegroundColor Cyan
New-Item -ItemType Directory -Force -Path "deploy_temp" | Out-Null

# Copy everything EXCEPT exclude list
# Added *.db *.db-journal to exclude list to PRESERVE REMOTE DATA
robocopy . deploy_temp /E /XD node_modules .next .git .vscode deploy_temp /XF $ZipFile *.log *.tar.gz *.db *.db-journal

# Check for robocopy errors (exit code < 8 is success)
if ($LASTEXITCODE -ge 8) {
    Write-Error "Robocopy failed with exit code $LASTEXITCODE"
}

Start-Sleep -Seconds 1
Write-Host "🗜️ Zipping files..." -ForegroundColor Cyan
Compress-Archive -Path "deploy_temp\*" -DestinationPath $ZipFile -Force

if (-not (Test-Path $ZipFile)) {
    Write-Error "Failed to create zip file!"
}

Remove-Item -Recurse -Force "deploy_temp"

Write-Host "🚀 Uploading to $ServerIP..." -ForegroundColor Cyan
scp $ZipFile ${User}@${ServerIP}:/root/$ZipFile

Write-Host "🔧 Running remote deployment..." -ForegroundColor Cyan
# 3. Setup and Deploy Remotely (Incremental: NO CLEANUP of existing folder)
$RemoteCommands = "
    # Ensure directory exists but DO NOT DELETE IT
    mkdir -p /root/mop-platform;
    
    echo '📦 Overwriting with new files...';
    # unzip -o overwrites existing files without prompting
    unzip -o /root/$ZipFile -d /root/mop-platform;
    
    cd /root/mop-platform;
    
    # Fix permissions
    chmod +x scripts/setup_remote.sh;
    
    # Ensure prisma permissions are still correct (idempotent)
    chmod -R 777 prisma;
    
    # Do not reset DB, just migrate if needed
    echo '🗄️ Running Migrations (if any)...';
    docker compose exec -T mop-platform prisma migrate deploy;
    
    echo '🐳 Restarting/Rebuilding services...';
    # Rebuild to pick up code changes
    docker compose up -d --build;
    
    echo '✅ Incremental update complete!';
"

# Remove Carriage Returns
$RemoteCommands = $RemoteCommands -replace "`r", ""

ssh ${User}@${ServerIP} $RemoteCommands

Write-Host "✅ Deployment updated! Check http://${ServerIP}:3000" -ForegroundColor Green
Remove-Item $ZipFile
