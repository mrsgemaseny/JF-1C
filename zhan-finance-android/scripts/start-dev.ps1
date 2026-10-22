# Starts Metro for Expo Go on a real phone in the same Wi-Fi network.
# Why: the PC has several adapters (Radmin VPN 26.x, link-local 169.254.x).
# Expo picks the first one for the QR code, the phone cannot reach it and
# Expo Go shows "Could not connect to the server / Try again".
# This script pins Metro to the real Wi-Fi IPv4 address.

param(
    [switch]$Clear
)

$ErrorActionPreference = 'Stop'

$wifi = Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object {
        $_.IPAddress -match '^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)' -and
        $_.InterfaceAlias -notmatch 'Radmin|VPN|vEthernet|VirtualBox|VMware|WSL|Hamachi|ZeroTier|Tailscale'
    } |
    Select-Object -First 1

if (-not $wifi) {
    Write-Host 'Wi-Fi IPv4 address not found. Connect the PC to the same Wi-Fi as the phone.' -ForegroundColor Red
    exit 1
}

$ip = $wifi.IPAddress
Write-Host "Metro host: $ip ($($wifi.InterfaceAlias))" -ForegroundColor Green

# Free port 8081 from a hung Metro instance
$busy = Get-NetTCPConnection -LocalPort 8081 -State Listen -ErrorAction SilentlyContinue
foreach ($conn in $busy) {
    Write-Host "Stopping hung process on 8081 (PID $($conn.OwningProcess))" -ForegroundColor Yellow
    Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
}

# Warn if the firewall will block the phone
$rule = Get-NetFirewallRule -DisplayName 'Expo Metro 8081' -ErrorAction SilentlyContinue
if (-not $rule) {
    Write-Host 'Firewall rule "Expo Metro 8081" is missing. Run once in an ADMIN PowerShell:' -ForegroundColor Yellow
    Write-Host '  New-NetFirewallRule -DisplayName "Expo Metro 8081" -Direction Inbound -Protocol TCP -LocalPort 8081 -Action Allow -Profile Any' -ForegroundColor Yellow
}

$env:REACT_NATIVE_PACKAGER_HOSTNAME = $ip

$expoArgs = @('expo', 'start', '--lan')
if ($Clear) { $expoArgs += '-c' }

Write-Host "In Expo Go open: exp://${ip}:8081" -ForegroundColor Cyan
& npx @expoArgs
