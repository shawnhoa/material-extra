$ErrorActionPreference = 'Stop'
if (Test-Path .env) { Get-Content .env | ForEach-Object { if ($_ -match '^\s*([^#=]+)=(.*)$') { [Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim(), 'Process') } } }
if (-not $env:DATA_DIR) { $env:DATA_DIR = './data' }
if (-not $env:PORT) { $env:PORT = '8080' }
if (-not $env:ADMIN_PORT) { $env:ADMIN_PORT = '8081' }
New-Item -ItemType Directory -Force $env:DATA_DIR | Out-Null
python app/blog.py
