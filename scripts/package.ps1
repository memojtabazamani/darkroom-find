$ErrorActionPreference = "Stop"

$rootDir = Split-Path -Parent $PSScriptRoot
Set-Location $rootDir

$manifest = Get-Content -Raw "manifest.json" | ConvertFrom-Json
$version = $manifest.version

$distDir = Join-Path $rootDir "dist"
if (-not (Test-Path $distDir)) {
    New-Item -ItemType Directory -Path $distDir | Out-Null
}

$zipPath = Join-Path $distDir "darkroom-find-v$version.zip"
if (Test-Path $zipPath) {
    Remove-Item -Force $zipPath
}

$items = @("manifest.json", "src", "icons", "fonts", "LICENSE", "THIRD-PARTY-NOTICES.md") | Where-Object { Test-Path $_ }

Write-Host "Creating $zipPath..."
Compress-Archive -Path $items -DestinationPath $zipPath -Force

Write-Host "Done! File ready for Chrome Web Store at: dist\darkroom-find-v$version.zip"
