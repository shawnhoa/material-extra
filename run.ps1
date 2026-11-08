$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
if (-not (Test-Path .env) -and (Test-Path .env.example)) { Copy-Item .env.example .env }
if (Test-Path .env) { Get-Content .env | ForEach-Object { if ($_ -match '^\s*([^#=]+)=(.*)$') { [Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim(), 'Process') } } }
if (-not $env:DATA_DIR) { $env:DATA_DIR = './data' }
if (-not $env:PORT) { $env:PORT = '8080' }
if (-not $env:ADMIN_PORT) { $env:ADMIN_PORT = '8081' }
New-Item -ItemType Directory -Force $env:DATA_DIR | Out-Null
if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
  Write-Host '[material-extra] 未找到 python，请先安装 Python 3.10+ 并加入 PATH。'
  exit 1
}
Write-Host "访客端 http://localhost:$env:PORT/   管理端 http://localhost:$env:ADMIN_PORT/admin"
python app/blog.py
