$ErrorActionPreference = "Stop"

$RootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = Join-Path $RootDir "backend"
$FrontendDir = Join-Path $RootDir "frontend"

function Test-Command {
    param([string]$Name)
    return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

function Test-PortListening {
    param([int]$Port)
    return [bool](Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
}

function Wait-HttpOk {
    param(
        [string]$Url,
        [int]$TimeoutSeconds = 30
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        try {
            $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 2
            if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
                return $true
            }
        } catch {
            Start-Sleep -Milliseconds 500
        }
    }

    return $false
}

Write-Host ""
Write-Host "Starting Vela dev environment..." -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Command "python")) {
    throw "Python was not found in PATH."
}

if (-not (Test-Command "npm.cmd")) {
    throw "npm was not found in PATH."
}

$backendDepsReady = $false
try {
    python -c "import fastapi, uvicorn" 2>$null
    $backendDepsReady = ($LASTEXITCODE -eq 0)
} catch {
    $backendDepsReady = $false
}

if (-not $backendDepsReady) {
    Write-Host "Backend Python dependencies not found. Running pip install..." -ForegroundColor Yellow
    python -m pip install -r (Join-Path $RootDir "requirements.txt")
}

if (-not (Test-Path (Join-Path $FrontendDir "node_modules"))) {
    Write-Host "frontend/node_modules not found. Running npm install..." -ForegroundColor Yellow
    Push-Location $FrontendDir
    try {
        npm install
    } finally {
        Pop-Location
    }
}

$backendUrl = "http://127.0.0.1:8001"
$frontendUrl = "http://127.0.0.1:5173"
$lanIp = (
    ipconfig |
    Select-String -Pattern "IPv4 Address|IPv4 地址" |
    ForEach-Object { ($_ -split ":\s*", 2)[1].Trim() } |
    Where-Object { $_ -and $_ -notlike "127.*" -and $_ -notlike "169.254.*" -and $_ -notlike "198.18.*" -and $_ -notlike "192.168.237.*" -and $_ -notlike "192.168.116.*" } |
    Select-Object -First 1
)
$frontendLanUrl = if ($lanIp) { "http://$($lanIp):5173" } else { $null }

if (-not (Test-PortListening 8001)) {
    Write-Host "Starting backend on $backendUrl ..." -ForegroundColor Green
    Start-Process -FilePath "powershell.exe" `
        -ArgumentList @(
            "-NoExit",
            "-ExecutionPolicy", "Bypass",
            "-Command",
            "Set-Location -LiteralPath '$BackendDir'; python -m uvicorn main:app --reload --host 127.0.0.1 --port 8001"
        ) `
        -WindowStyle Normal
} else {
    Write-Host "Backend port 8001 is already in use. Reusing existing process." -ForegroundColor Yellow
}

if (-not (Test-PortListening 5173)) {
    Write-Host "Starting frontend on $frontendUrl ..." -ForegroundColor Green
    Start-Process -FilePath "powershell.exe" `
        -ArgumentList @(
            "-NoExit",
            "-ExecutionPolicy", "Bypass",
            "-Command",
            "Set-Location -LiteralPath '$FrontendDir'; npm run dev -- --host 0.0.0.0"
        ) `
        -WindowStyle Normal
} else {
    Write-Host "Frontend port 5173 is already in use. Reusing existing process." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Checking services..." -ForegroundColor Cyan

$backendReady = Wait-HttpOk "$backendUrl/" 30
$frontendReady = Wait-HttpOk "$frontendUrl/" 30

Write-Host ""
if ($backendReady) {
    Write-Host "Backend ready:  $backendUrl" -ForegroundColor Green
    Write-Host "API docs:       $backendUrl/docs" -ForegroundColor Green
} else {
    Write-Host "Backend did not respond in time. Check the backend PowerShell window." -ForegroundColor Red
}

if ($frontendReady) {
    Write-Host "Frontend ready: $frontendUrl" -ForegroundColor Green
    if ($frontendLanUrl) {
        Write-Host "Phone on same Wi-Fi: $frontendLanUrl" -ForegroundColor Green
    }
} else {
    Write-Host "Frontend did not respond in time. Check the frontend PowerShell window." -ForegroundColor Red
}

Write-Host ""
Write-Host "You can close this window after the checks finish. Keep the backend/frontend windows open while developing." -ForegroundColor Gray
Write-Host ""
pause
