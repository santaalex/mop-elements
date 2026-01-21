# Deploy to Private Cloud
# Usage: ./deploy.ps1

$ServerIP = "219.151.179.8"
$User = "root"
# Note: You will be prompted for password by SSH/SCP if keys are not set up.

Write-Host "📦 Packaging application..." -ForegroundColor Cyan

# Set strict error handling
$ErrorActionPreference = 'Stop'

# 1. Archive files from DISK (Includes uncommitted changes)
# Ensure clean start
$ZipFile = "mop-platform-deploy.zip"
# Clean previous artifacts
if (Test-Path $ZipFile) { Remove-Item $ZipFile -ErrorAction SilentlyContinue }
if (Test-Path "deploy_temp") { Remove-Item -Recurse -Force "deploy_temp" -ErrorAction SilentlyContinue }

Write-Host "📂 Preparing files from disk (Skipping node_modules)..." -ForegroundColor Cyan
New-Item -ItemType Directory -Force -Path "deploy_temp" | Out-Null

# Copy everything EXCEPT exclude list
robocopy . deploy_temp /E /XD node_modules .next .git .vscode deploy_temp /XF $ZipFile *.log *.tar.gz

# Check for robocopy errors (Robocopy returns exit codes < 8 for success/partial success)
if ($LASTEXITCODE -ge 8) {
    Write-Error "Robocopy failed with exit code $LASTEXITCODE"
}

# Reset error preference for external commands if needed, but keeping Stop is safer for PowerShell cmdlets
Start-Sleep -Seconds 3
Write-Host "🗜️ Zipping files..." -ForegroundColor Cyan
Compress-Archive -Path "deploy_temp\*" -DestinationPath $ZipFile -Force

if (-not (Test-Path $ZipFile)) {
    Write-Error "Failed to create zip file!"
}

Remove-Item -Recurse -Force "deploy_temp"

Write-Host "🚀 Uploading to $ServerIP..." -ForegroundColor Cyan
# 2. Upload
scp $ZipFile ${User}@${ServerIP}:/root/$ZipFile

Write-Host "🔧 Running remote deployment..." -ForegroundColor Cyan
# 3. Setup and Deploy Remotely
# - Stop existing containers
# - Install unzip
# - Clean directory
# - Unzip & Run
$RemoteCommands = "
    echo '🛑 Stopping existing containers...';
    docker stop mop-platform || true;
    docker rm mop-platform || true;

    echo '🔧 ensuring unzip is installed...';
    if command -v apt-get >/dev/null; then apt-get update && apt-get install -y unzip; fi;
    if command -v yum >/dev/null; then yum install -y unzip; fi;

    echo '🧹 Cleaning up old files...';
    rm -rf /root/mop-platform;
    mkdir -p /root/mop-platform;

    echo '📦 Extracting new files...';
    unzip -o /root/$ZipFile -d /root/mop-platform;
    
    cd /root/mop-platform;
    
    # Fix potential line ending issues
    sed -i 's/\r$//' scripts/setup_remote.sh;
    
    chmod +x scripts/setup_remote.sh;
    ./scripts/setup_remote.sh; 
    
    # 🔓 Fix SQLite Permissions: Allow Container User (nextjs) to Write
    chmod -R 777 prisma;
    chmod 666 prisma/dev.db;

    echo '🐳 Starting services...';
    docker compose up -d --build;

    echo '⏳ Waiting for database to initialize...';
    sleep 5;

    echo '🗄️ Running Database Migrations (Native)...';
    docker compose exec -T mop-platform prisma migrate deploy;

    echo '🌱 Seeding Database (Native)...';
    docker compose exec -T mop-platform prisma db seed;

    echo '✅ Database initialized!';
"

# Remove Carriage Returns from the command string to prevent bash errors
$RemoteCommands = $RemoteCommands -replace "`r", ""

ssh ${User}@${ServerIP} $RemoteCommands

Write-Host "✅ Deployment initiated! Check http://${ServerIP}:3000" -ForegroundColor Green
Remove-Item $ZipFile
