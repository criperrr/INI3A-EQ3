# ==============================================================================
# start_project.ps1 - Presco Dev Environment Launcher for Windows
#
# Modes:
#   1. 100% Local NAT Mode (-LocalNat / npm run dev:win:local):
#      Direct local network connection. Zero latency, instant QR code scanning
#      via Expo Go on the same Wi-Fi.
#      Usage: .\start_project.ps1 -LocalNat
#
#   2. Tunneling Mode (Default / npm run dev:win):
#      Uses cloud tunnel for API and native Expo tunnel for mobile devices.
#      Usage: .\start_project.ps1
# ==============================================================================

[CmdletBinding()]
param(
    [Alias("local-nat", "local", "nat", "l")]
    [switch]$LocalNat,

    [Alias("t")]
    [switch]$Tunnel,

    [Alias("c", "verify")]
    [switch]$Check,

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
    Write-Host "  -Tunnel, -t           Run in Tunneling mode (for school / mobile data networks)"
    Write-Host "  -Check, -c            Run Connection Diagnostic Agent only"
    Write-Host "  -SeparateWindows, -w  Open separate PowerShell windows instead of Windows Terminal tabs"
    Write-Host "  -Help, -h             Show this help message"
    Write-Host ""
    Write-Host "NPM Shortcuts:"
    Write-Host "  npm run dev:win         -> Default tunneling mode"
    Write-Host "  npm run dev:win:local   -> 100% Local NAT mode"
    Write-Host "  npm run dev:check       -> Run connection diagnostic agent"
    exit 0
}

# Run diagnostic agent only if requested
if ($Check) {
    npx tsx (Join-Path $ScriptDir "scripts\verify_connection.ts")
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
    Write-Host " [*] MODE: TUNNELING - Cloud API Tunnel + Native Expo Tunnel" -ForegroundColor Yellow
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

$redisReady = Test-ServicePort -HostName $RedisHost -Port $RedisPort -ServiceName "Redis" -MaxAttempts 3
if (-not $redisReady) {
    Write-Host "[i] Redis is offline on ${RedisHost}:${RedisPort}. Presco Backend will operate in In-Memory session mode." -ForegroundColor Yellow
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
        if ($localAddr -and $localAddr -notmatch "^127\.|^169\.254\.") { return $localAddr }
    } catch {}

    try {
        $netIp = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
            $_.InterfaceAlias -notmatch "Loopback|vEthernet|WSL|Docker" -and
            $_.IPAddress -notmatch "^127\.|^169\.254\."
        } | Select-Object -First 1).IPAddress
        if ($netIp) { return $netIp }
    } catch {}

    return "127.0.0.1"
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

    # Run diagnostic agent
    npx tsx (Join-Path $ScriptDir "scripts\verify_connection.ts") --local

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
    Write-Host "[*] Starting API cloud tunnel agent and services..." -ForegroundColor Yellow
    $tunnelFile = Join-Path $ScriptDir ".tunnel_url"
    if (Test-Path $tunnelFile) { Remove-Item -Force $tunnelFile }

    # Launch tunnel agent first in background
    Start-Process cmd.exe -ArgumentList "/k `"$tunnelsBat`""

    Write-Host -NoNewline "[...] Waiting for API Cloud Tunnel URL..."
    $BackendUrl = ""
    $attempt = 1
    while ($attempt -le 20) {
        if (Test-Path $tunnelFile) {
            $content = (Get-Content $tunnelFile -Raw).Trim()
            if ($content -and $content.StartsWith("http")) {
                $BackendUrl = $content
                Write-Host " [OK]" -ForegroundColor Green
                break
            }
        }
        Start-Sleep -Seconds 1
        Write-Host -NoNewline "."
        $attempt++
    }

    if (-not $BackendUrl) {
        Write-Host " Timeout!" -ForegroundColor Yellow
        $BackendUrl = "http://${LanIp}:${ServerPort}"
        Write-Host "[!] Falling back to LAN API URL: $BackendUrl" -ForegroundColor Yellow
    } else {
        Write-Host "[+] Verified API Tunnel URL: $BackendUrl" -ForegroundColor Green
    }

    # Run diagnostic agent for tunnel mode
    npx tsx (Join-Path $ScriptDir "scripts\verify_connection.ts") --tunnel --url="$BackendUrl"

    $launched = $false
    if ($hasWt) {
        try {
            Write-Host "[i] Launching with Windows Terminal tabs..." -ForegroundColor Cyan
            $wtArgs = "-w 0 new-tab cmd.exe /k `"$backendBat`" `; split-pane -V cmd.exe /k `"$frontendBat`" `"$BackendUrl`" `"`" `"`" `"true`" `"--tunnel`""
            Start-Process wt.exe -ArgumentList $wtArgs -ErrorAction Stop
            $launched = $true
        } catch {
            Write-Host "[!] Windows Terminal launch failed, falling back to separate windows..." -ForegroundColor Yellow
        }
    }

    if (-not $launched) {
        Write-Host "[i] Launching separate terminal windows..." -ForegroundColor Cyan
        Start-Process cmd.exe -ArgumentList "/k `"$backendBat`""
        Start-Process cmd.exe -ArgumentList "/k `"$frontendBat`" `"$BackendUrl`" `"`" `"`" `"true`" `"--tunnel`""
    }
}

Write-Host ""
Write-Host "========================================================" -ForegroundColor Green
Write-Host " [OK] Presco Dev Environment started successfully!" -ForegroundColor Green
Write-Host " To stop services, simply close the opened terminal windows." -ForegroundColor Gray
Write-Host "========================================================" -ForegroundColor Green