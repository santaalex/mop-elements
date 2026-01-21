# Incremental Deploy to Private Cloud (Preserves Data)
# Usage: ./deploy_incremental.ps1

$ServerIP = "219.151.179.8"
$User = "root"

# 0. Pre-flight Check (Safety First)
Write-Host "🔍 Pre-flight Code Verification..." -ForegroundColor Cyan

# Kill any lingering node processes to unlock files (Prevent locking issues during zip)
Stop-Process -Name "node" -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

Write-Host "🏗️  Building project locally to verify integrity..." -ForegroundColor Cyan
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Error "❌ Build failed! Aborting deployment to protect the server."
}

Write-Host "✅ Build passed. Proceeding with incremental packaging..." -ForegroundColor Green
Start-Sleep -Seconds 2

Write-Host "📦 Packaging application (Incremental update)..." -ForegroundColor Cyan

# Set strict error handling
$ErrorActionPreference = 'Stop'

# 1. Archive files from DISK
$ArchiveFile = "mop-platform-update.tar.gz"
# Clean previous artifacts
if (Test-Path $ArchiveFile) { Remove-Item $ArchiveFile -ErrorAction SilentlyContinue }
if (Test-Path "deploy_temp") { Remove-Item -Recurse -Force "deploy_temp" -ErrorAction SilentlyContinue }

Write-Host "📂 Preparing files..." -ForegroundColor Cyan
New-Item -ItemType Directory -Force -Path "deploy_temp" | Out-Null

# Copy files (Exclude local DB and build artifacts)
robocopy . deploy_temp /E /XD node_modules .next .git .vscode deploy_temp /XF $ArchiveFile *.log *.tar.gz *.zip dev.db dev.db-wal dev.db-shm

if ($LASTEXITCODE -ge 8) {
    Write-Error "Robocopy failed with exit code $LASTEXITCODE"
}

Start-Sleep -Seconds 2
Write-Host "🗜️ Archiving files (using tar for Linux compatibility)..." -ForegroundColor Cyan
# Use tar to avoid backslash issues in zip
tar -acvf $ArchiveFile -C deploy_temp .

if ($LASTEXITCODE -ne 0) {
    Write-Error "Tar failed!"
}

Remove-Item -Recurse -Force "deploy_temp"

Write-Host "🚀 Uploading update package to $ServerIP..." -ForegroundColor Cyan
scp $ArchiveFile ${User}@${ServerIP}:/root/$ArchiveFile

Write-Host "🔧 Running SAFE remote update..." -ForegroundColor Cyan

# Remote Script: Backup Data -> Swap Code -> Restore Data -> Migrate
$RemoteCommands = "
    set -e; # Exit on error

    echo '🛑 Stopping container (minimizing downtime)...';
    docker compose stop mop-platform || true;

    echo '🛡️ Backing up critical data (DB & Env)...';
    
    # Create backup dir
    mkdir -p /root/mop_data_backup;
    
    # Backup DB files (Handle WAL/SHM files correctly)
    if ls /root/mop-platform/prisma/dev.db* 1> /dev/null 2>&1; then
        cp /root/mop-platform/prisma/dev.db* /root/mop_data_backup/;
        echo '  ✅ Database files (including WAL/SHM) backed up';
    else
        echo '  ⚠️ No existing database found (First run?)';
    fi
    
    # Backup .env
    if [ -f /root/mop-platform/.env ]; then
        cp /root/mop-platform/.env /root/mop_data_backup/.env.bak;
        echo '  ✅ .env backed up';
    fi

    echo '🧹 Replacing code files...';
    rm -rf /root/mop-platform;
    mkdir -p /root/mop-platform;

    echo '📦 Extracting update...';
    tar -xzf /root/$ArchiveFile -C /root/mop-platform;
    
    cd /root/mop-platform;

    echo '♻️ Restoring data...';
    # Restore DB
    if ls /root/mop_data_backup/dev.db* 1> /dev/null 2>&1; then
        mkdir -p prisma;
        cp /root/mop_data_backup/dev.db* prisma/;
        chmod 777 prisma;
        chmod 666 prisma/dev.db*;
        echo '  ✅ Database files restored';
    fi

    # Restore .env
    if [ -f /root/mop_data_backup/.env.bak ]; then
        cp /root/mop_data_backup/.env.bak .env;
        echo '  ✅ Server .env restored';
    fi

    chmod +x scripts/setup_remote.sh;
    
    echo '🐳 Restarting services...';
    docker compose up -d --build;

    echo '⏳ Waiting for DB...';
    sleep 5;

    echo '🗄️ Applying Schema Changes (Safe Migration)...';
    docker compose exec -T mop-platform prisma migrate deploy;

    echo '✅ Update Complete!';
"

# Sanitize
$RemoteCommands = $RemoteCommands -replace "`r", ""

# Pipe the clean commands to SSH
Write-Host "📡 Transmitting commands to remote shell..." -ForegroundColor Cyan
$RemoteCommands | ssh ${User}@${ServerIP} "bash -s"

Write-Host "✅ Incremental Update Success! System is live." -ForegroundColor Green
Remove-Item $ArchiveFile
