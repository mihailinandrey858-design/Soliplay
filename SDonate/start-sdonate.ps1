$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
    Write-Host "Node.js was not found. Install the LTS version from https://nodejs.org/, then reopen PowerShell." -ForegroundColor Red
    exit 1
}

$nodeMajorVersion = [int](node -p "process.versions.node.split('.')[0]")
if ($nodeMajorVersion -lt 20) {
    Write-Host "Node.js 20 or newer is required. Update Node.js from https://nodejs.org/." -ForegroundColor Red
    exit 1
}

$usersFile = Join-Path $PSScriptRoot "data\users.json"
if (-not (Test-Path $usersFile)) {
    Write-Host "First run: create the server administrator account."
    $env:SDONATE_ADMIN_EMAIL = Read-Host "Administrator email"
    $securePassword = Read-Host "New administrator password (at least 12 characters)" -AsSecureString
    $env:SDONATE_ADMIN_PASSWORD = [System.Net.NetworkCredential]::new("", $securePassword).Password
}

node .\server.js
exit $LASTEXITCODE
