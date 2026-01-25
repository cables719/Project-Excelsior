$ErrorActionPreference = "SilentlyContinue"

Write-Host "--- PROJECT EXCELSIOR: STARTUP SEQUENCE ---" -ForegroundColor Cyan

# 1. Kill potentially stuck node processes (Port 3000 blockers)
Write-Host "Checking for stuck processes..."
$nodeProcs = Get-Process node -ErrorAction SilentlyContinue
if ($nodeProcs) {
    Write-Host "Killing $($nodeProcs.Count) Node processes..." -ForegroundColor Yellow
    Stop-Process -Name node -Force
}

# 2. Clear Next.js Lock File
$lockFile = "web\.next\dev\lock"
if (Test-Path $lockFile) {
    Write-Host "Clearing stale lock file..." -ForegroundColor Yellow
    Remove-Item $lockFile -Force
}

# 3. Start Server
Write-Host "Starting Web Server..." -ForegroundColor Green
Set-Location "web"
npm run dev
