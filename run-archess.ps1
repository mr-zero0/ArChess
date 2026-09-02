$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$venvPython = Join-Path $root ".venv\Scripts\python.exe"

Set-Location $root

if (-not (Test-Path $venvPython)) {
    Write-Host "Creating Python virtual environment..."
    python -m venv .venv
}

Write-Host "Installing Python dependencies..."
& $venvPython -m pip install -r requirements.txt

Push-Location (Join-Path $root "frontend")
try {
    Write-Host "Installing frontend dependencies..."
    npm install
    Write-Host "Building React and Phaser..."
    npm run build
}
finally {
    Pop-Location
}

Write-Host "Starting ArChess at http://127.0.0.1:5000/"
& $venvPython game.py