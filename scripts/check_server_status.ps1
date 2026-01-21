$ServerIP = "219.151.179.8"
$User = "root"

$Commands = @"
echo '========================================='
echo '           SERVER HEALTH REPORT          '
echo '========================================='
echo ''
echo '[SYSTEM LOAD]'
uptime
echo ''
echo '[MEMORY USAGE]'
free -h
echo ''
echo '[DISK USAGE - Root]'
df -h /
echo ''
echo '[TOP 5 CPU PROCESSES]'
ps -eo pid,ppid,cmd,%mem,%cpu --sort=-%cpu | head -n 6
echo ''
echo '[DOCKER CONTAINERS]'
docker stats --no-stream --format 'table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}'
echo '========================================='
"@

# Replace Windows CRLF with Unix LF
$LinuxCommands = $Commands -replace "`r", ""

Write-Host "Connecting to $ServerIP to check resources..." -ForegroundColor Cyan

# Use a Here-String for the ssh command to avoid quoting nesting hell
# We pipe the commands into bash via SSH's stdin which is much safer for special chars
$Bytes = [System.Text.Encoding]::UTF8.GetBytes($LinuxCommands)
$Encoded = [Convert]::ToBase64String($Bytes)

# Decode on remote side and execute
ssh -t $User@$ServerIP "echo $Encoded | base64 -d | bash"
