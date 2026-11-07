$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$package = Get-Content -LiteralPath (Join-Path $root "package.json") -Raw | ConvertFrom-Json
$version = $package.version
$dist = Join-Path $root "dist"
$stagingRoot = Join-Path $dist "meterial-extra-$version"
$zip = Join-Path $dist "meterial-extra-$version.zip"
$entries = @(
    ".dockerignore",
    ".env.example",
    ".gitignore",
    "CODE_OF_CONDUCT.md",
    "CONTRIBUTING.md",
    "Dockerfile",
    "LICENSE",
    "README.md",
    "SECURITY.md",
    "compose.yaml",
    "package.json",
    "run.ps1",
    "run.sh",
    "app",
    "docs",
    "scripts"
)

New-Item -ItemType Directory -Path $dist -Force | Out-Null
if (Test-Path -LiteralPath $stagingRoot) {
    Remove-Item -LiteralPath $stagingRoot -Recurse -Force
}
if (Test-Path -LiteralPath $zip) {
    Remove-Item -LiteralPath $zip -Force
}
New-Item -ItemType Directory -Path $stagingRoot -Force | Out-Null

foreach ($entry in $entries) {
    Copy-Item -LiteralPath (Join-Path $root $entry) -Destination (Join-Path $stagingRoot $entry) -Recurse -Force
}

Get-ChildItem -LiteralPath $stagingRoot -Directory -Filter "__pycache__" -Recurse | ForEach-Object {
    Remove-Item -LiteralPath $_.FullName -Recurse -Force
}
Get-ChildItem -LiteralPath $stagingRoot -File -Filter "*.pyc" -Recurse | ForEach-Object {
    Remove-Item -LiteralPath $_.FullName -Force
}

$unexpected = Get-ChildItem -LiteralPath $stagingRoot -Recurse -Force | Where-Object {
    $_.Name -eq "__pycache__" -or $_.Extension -eq ".pyc"
}
if ($unexpected) {
    throw "Unexpected runtime files in release staging: $($unexpected.FullName -join ', ')"
}

Compress-Archive -LiteralPath $stagingRoot -DestinationPath $zip -CompressionLevel Optimal
$result = Get-Item -LiteralPath $zip
[pscustomobject]@{
    Version = $version
    Archive = $result.FullName
    Bytes = $result.Length
    FilesIncluded = $entries.Count
} | ConvertTo-Json -Compress
