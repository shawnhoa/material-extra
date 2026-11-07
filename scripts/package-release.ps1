$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$package = Get-Content -LiteralPath (Join-Path $root "package.json") -Raw | ConvertFrom-Json
$version = $package.version
$dist = Join-Path $root "dist"
$stagingRoot = Join-Path $dist "meterial-extra-$version"
$zip = Join-Path $dist "meterial-extra-$version.zip"
$entries = @(
    ".dockerignore",
    ".gitignore",
    "API_TEMPLATE.md",
    "BRAND_ASSET_LICENSE.md",
    "CODE_OF_CONDUCT.md",
    "CONTRIBUTING.md",
    "DEPLOYMENT.md",
    "Dockerfile",
    "LICENSE",
    "README.md",
    "README_zh_CN.md",
    "RELEASE_NOTES_v0.1.0.md",
    "SECURITY.md",
    "config.example.js",
    "config.js",
    "index.html",
    "nginx.conf",
    "package.json",
    "run.ps1",
    "run.sh",
    "docs",
    "public",
    "scripts",
    "src"
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

Compress-Archive -LiteralPath $stagingRoot -DestinationPath $zip -CompressionLevel Optimal
$result = Get-Item -LiteralPath $zip
[pscustomobject]@{
    Version = $version
    Archive = $result.FullName
    Bytes = $result.Length
    FilesIncluded = $entries.Count
} | ConvertTo-Json -Compress
