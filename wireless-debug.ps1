#!/usr/bin/env pwsh
# Wireless ADB Debugging - Interactive Helper
# Usage: .\wireless-debug.ps1

$adbPath = "$env:LOCALAPPDATA\Android\platform-tools"
if (-not ($env:Path -like "*$adbPath*")) {
    $env:Path = "$adbPath;$env:Path"
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Wireless ADB Debugging Helper" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "On your Android phone:" -ForegroundColor Yellow
Write-Host "  1. Go to Settings > Developer Options > Wireless Debugging" -ForegroundColor White
Write-Host "  2. Enable Wireless Debugging" -ForegroundColor White
Write-Host "  3. Tap 'Pair device with pairing code'" -ForegroundColor White
Write-Host ""

# Check for existing wireless connections
$devices = adb devices 2>$null | Select-String -Pattern "\d+\.\d+\.\d+\.\d+.*device$"
if ($devices) {
    Write-Host "Already connected wirelessly:" -ForegroundColor Green
    Write-Host $devices -ForegroundColor Green
    $reuse = Read-Host "Use existing connection? (y/n)"
    if ($reuse -eq "y") {
        Write-Host "Ready! Run 'npx cap run android' to deploy your app." -ForegroundColor Green
        exit 0
    }
}

# Step 1: Pair
Write-Host "--- STEP 1: PAIR ---" -ForegroundColor Magenta
$pairAddress = Read-Host "Enter pairing IP:PORT (e.g. 192.168.1.50:37123)"
if (-not $pairAddress) {
    Write-Host "No address provided. Exiting." -ForegroundColor Red
    exit 1
}

Write-Host "Running: adb pair $pairAddress" -ForegroundColor DarkGray
adb pair $pairAddress

if ($LASTEXITCODE -ne 0) {
    Write-Host "Pairing failed. Check your IP/port and try again." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Pairing successful!" -ForegroundColor Green
Write-Host ""

# Step 2: Connect
Write-Host "--- STEP 2: CONNECT ---" -ForegroundColor Magenta
Write-Host "Now look at the Wireless Debugging main screen (NOT the pairing dialog)." -ForegroundColor Yellow
Write-Host "You'll see an IP:PORT under 'IP address & Port'." -ForegroundColor Yellow
Write-Host ""
$connectAddress = Read-Host "Enter connection IP:PORT (e.g. 192.168.1.50:41567)"
if (-not $connectAddress) {
    Write-Host "No address provided. Exiting." -ForegroundColor Red
    exit 1
}

Write-Host "Running: adb connect $connectAddress" -ForegroundColor DarkGray
adb connect $connectAddress

if ($LASTEXITCODE -ne 0) {
    Write-Host "Connection failed. Check your IP/port and try again." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Connected! Device ready." -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Connected devices:" -ForegroundColor Cyan
adb devices
Write-Host ""
Write-Host "You can now run:" -ForegroundColor Yellow
Write-Host "  npx cap run android        # Deploy Capacitor app" -ForegroundColor White
Write-Host "  chrome://inspect            # Open in Chrome for DevTools" -ForegroundColor White
Write-Host "  adb logcat                  # View device logs" -ForegroundColor White
Write-Host ""
