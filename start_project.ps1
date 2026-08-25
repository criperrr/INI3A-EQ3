# ==============================================================================
# start_project.ps1 - Presco Dev Environment Launcher for Windows
#
# Modes:
#   1. Tunneling Mode (Default):
#      Uses localtunnel for school or restricted networks.
#      Usage: .\start_project.ps1
#
#   2. 100% Local NAT Mode (-LocalNat):
#      Direct local network connection. Zero latency, instant QR code scanning
#      via Expo Go on the same Wi-Fi.
#      Usage: .\start_project.ps1 -LocalNat
# ==============================================================================

[CmdletBinding()]
param(
    [Alias("local-nat", "local", "nat", "l")]
    [switch]$LocalNat,

    [Alias("t")]
    [switch]$Tunnel,

    [Alias("no-wt", "windows", "separate", "w")]
    [switch]$SeparateWindows,

    [Alias("h")]
    [switch]$Help
)

$ErrorActionPreference = "Continue"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# ------------------------------------------------------------------------------
# 0. Help / Options
# ------------------------------------------------------------------------------
if ($Help) {
    Write-Host "========================================================" -ForegroundColor Cyan
    Write-Host " Presco Dev Launcher (Windows PowerShell)" -ForegroundColor Cyan
    Write-Host "========================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Usage:"
    Write-Host "  .\start_project.ps1 [OPTIONS]"
    Write-Host ""
    Write-Host "Options:"
    Write-Host "  -LocalNat, -l         Run in 100% Local Network (NAT) mode (fastest for home/LAN)"
    Write-Host "  -Tunnel, -t           Run in Tunneling mode via localtunnel (default)"
    Write-Host "  -SeparateWindows, -w  Open separate PowerShell windows instead of Windows Terminal tabs"
    Write-Host "  -Help, -h             Show this help message"
    Write-Host ""
    Write-Host "NPM Shortcuts:"
    Write-Host "  npm run dev:win         -> Default tunneling mode"
    Write-Host "  npm run dev:win:local   -> 100% Local NAT mode"
    exit 0
}

$IsLocalNat = $false
if ($LocalNat) {
    $IsLocalNat = $true
}

Write-Host "========================================================" -ForegroundColor Cyan
if ($IsLocalNat) {
    Write-Host " [+] MODE: 100% LOCAL NETWORK (NAT) - Direct Home LAN" -ForegroundColor Green
} else {
    Write-Host " [*] MODE: TUNNELING (Localtunnel) - Restricted/School Network" -ForegroundColor Yellow
}
Write-Host "========================================================" -ForegroundColor Cyan

# ------------------------------------------------------------------------------
# 1. Parse backend configuration from src/backend/.env
# ------------------------------------------------------------------------------
Write-Host "[i] Reading backend configuration..." -ForegroundColor Gray

$backendDir = Join-Path $ScriptDir "src\backend"
$envFile = Join-Path $backendDir ".env"

$DbHost = "localhost"
$DbPort = 5432
$RedisHost = "localhost"
$RedisPort = 6379
$ServerPort = 3333

if (Test-Path $envFile) {
    $envLines = Get-Content $envFile
    foreach ($line in $envLines) {
        $trimmed = $line.Trim()
        if (($trimmed) -and (-not ($trimmed.StartsWith("#")))) {
            $eqIdx = $trimmed.IndexOf("=")
            if ($eqIdx -gt 0) {
                $k = $trimmed.Substring(0, $eqIdx).Trim()
                $v = $trimmed.Substring($eqIdx + 1).Trim().Trim("`"'")

                if ($k -eq "SERVER_PORT" -and $v) {
                    $ServerPort = [int]$v
                }
                elseif ($k -eq "DATABASE_URL" -and $v) {
                    try {
                        $clean = $v -replace "^postgresql://", "postgres://"
                        $uri = [System.Uri]$clean
                        if ($uri.Host) { $DbHost = $uri.Host }
                        if ($uri.Port -gt 0) { $DbPort = $uri.Port }
                    } catch {}
                }
                elseif ($k -eq "REDIS_URL" -and $v) {
                    try {
                        $uri = [System.Uri]$v
                        if ($uri.Host) { $RedisHost = $uri.Host }
                        if ($uri.Port -gt 0) { $RedisPort = $uri.Port }
                    } catch {}
                }
            }
        }
    }
}

# ------------------------------------------------------------------------------
# 2. Port Check Helper
# ------------------------------------------------------------------------------
function Test-ServicePort {
    param(
        [string]$HostName,
        [int]$Port,
        [string]$ServiceName,
        [int]$MaxAttempts = 30
    )

    Write-Host -NoNewline "[...] Waiting for $ServiceName on ${HostName}:${Port}..."
    $attempt = 1

    while ($attempt -le $MaxAttempts) {
        try {
            $tcp = New-Object System.Net.Sockets.TcpClient
            $async = $tcp.BeginConnect($HostName, $Port, $null, $null)
            $success = $async.AsyncWaitHandle.WaitOne(1000, $false)

            if ($success -and $tcp.Connected) {
                $tcp.EndConnect($async)
                $tcp.Close()
                Write-Host " [OK]" -ForegroundColor Green
                return $true
            }
            $tcp.Close()
        } catch {}

        Write-Host -NoNewline "."
        Start-Sleep -Seconds 1
        $attempt++
    }

    Write-Host " Timeout!" -ForegroundColor Red
    Write-Host "[X] $ServiceName is not running on ${HostName}:${Port}." -ForegroundColor Red
    return $false
}

# ------------------------------------------------------------------------------
# 3. Verify Database and Redis
# ------------------------------------------------------------------------------
$pgReady = Test-ServicePort -HostName $DbHost -Port $DbPort -ServiceName "PostgreSQL"
if (-not $pgReady) {
    Write-Host "[!] PostgreSQL is not responding. Please make sure Docker or PostgreSQL service is running." -ForegroundColor Red
    exit 1
}

$redisReady = Test-ServicePort -HostName $RedisHost -Port $RedisPort -ServiceName "Redis"
if (-not $redisReady) {
    Write-Host "[!] Redis is not responding. Please make sure Redis service or container is running." -ForegroundColor Red
    exit 1
}

# ------------------------------------------------------------------------------
# 4. Detect Local LAN IP
# ------------------------------------------------------------------------------
function Get-LanIp {
    try {
        $udp = New-Object System.Net.Sockets.UdpClient
        $udp.Connect("8.8.8.8", 53)
        $localAddr = $udp.Client.LocalEndPoint.Address.ToString()
        $udp.Close()
        if ($localAddr) { return $localAddr }
    } catch {}

    try {
        $netIp = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
            $_.InterfaceAlias -notmatch "Loopback|vEthernet|WSL" -and
            $_.IPAddress -notmatch "^127\.|^169\.254\."
        } | Select-Object -First 1).IPAddress
        if ($netIp) { return $netIp }
    } catch {}

    return "localhost"
}

$LanIp = Get-LanIp
Write-Host "[i] Detected Local LAN IP: $LanIp" -ForegroundColor Cyan

# ------------------------------------------------------------------------------
# 5. Launch Backend Server & Frontend Expo
# ------------------------------------------------------------------------------
$backendBat = Join-Path $ScriptDir "scripts\dev_backend.bat"
$frontendBat = Join-Path $ScriptDir "scripts\dev_frontend.bat"
$tunnelsBat = Join-Path $ScriptDir "scripts\dev_tunnels.bat"

$hasWt = (-not $SeparateWindows) -and ($null -ne (Get-Command wt.exe -ErrorAction SilentlyContinue))

if ($IsLocalNat) {
    $BackendUrl = "http://${LanIp}:${ServerPort}"
    Write-Host "[+] Direct Backend API URL: $BackendUrl" -ForegroundColor Green
    Write-Host "[+] Expo Bundler will serve over LAN (exp://${LanIp}:8081)" -ForegroundColor Green
    Write-Host "[i] Open Expo Go on your mobile (same Wi-Fi) and scan the QR code!" -ForegroundColor Yellow

    $launched = $false
    if ($hasWt) {
        try {
            Write-Host "[i] Launching with Windows Terminal split panes..." -ForegroundColor Cyan
            $wtArgs = "-w 0 new-tab cmd.exe /k `"$backendBat`" `; split-pane -V cmd.exe /k `"$frontendBat`" `"$BackendUrl`" `"$LanIp`""
            Start-Process wt.exe -ArgumentList $wtArgs -ErrorAction Stop
            $launched = $true
        } catch {
            Write-Host "[!] Windows Terminal launch failed, falling back to separate windows..." -ForegroundColor Yellow
        }
    }

    if (-not $launched) {
        Write-Host "[i] Launching separate terminal windows..." -ForegroundColor Cyan
        Start-Process cmd.exe -ArgumentList "/k `"$backendBat`""
        Start-Process cmd.exe -ArgumentList "/k `"$frontendBat`" `"$BackendUrl`" `"$LanIp`""
    }

} else {
    # Tunneling mode
    Write-Host "[*] Starting localtunnel and services..." -ForegroundColor Yellow
    $BackendUrl = "https://ini3a-eq3-api.loca.lt"
    $FrontendUrl = "https://ini3a-eq3-app.loca.lt"

    $launched = $false
    if ($hasWt) {
        try {
            Write-Host "[i] Launching with Windows Terminal tabs..." -ForegroundColor Cyan
            $wtArgs = "-w 0 new-tab cmd.exe /k `"$backendBat`" `; split-pane -V cmd.exe /k `"$frontendBat`" `"$BackendUrl`" `"`" `"$FrontendUrl`" `"true`" `"--tunnel`" `; new-tab cmd.exe /k `"$tunnelsBat`""
            Start-Process wt.exe -ArgumentList $wtArgs -ErrorAction Stop
            $launched = $true
        } catch {
            Write-Host "[!] Windows Terminal launch failed, falling back to separate windows..." -ForegroundColor Yellow
        }
    }

    if (-not $launched) {
        Write-Host "[i] Launching separate terminal windows..." -ForegroundColor Cyan
        Start-Process cmd.exe -ArgumentList "/k `"$backendBat`""
        Start-Process cmd.exe -ArgumentList "/k `"$frontendBat`" `"$BackendUrl`" `"`" `"$FrontendUrl`" `"true`" `"--tunnel`""
        Start-Process cmd.exe -ArgumentList "/k `"$tunnelsBat`""
    }
}

Write-Host ""
Write-Host "========================================================" -ForegroundColor Green
Write-Host " [OK] Presco Dev Environment started successfully!" -ForegroundColor Green
Write-Host " To stop services, simply close the opened terminal windows." -ForegroundColor Gray
Write-Host "========================================================" -ForegroundColor Green