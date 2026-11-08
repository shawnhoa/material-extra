@echo off
chcp 65001 >nul

setlocal

cd /d "%~dp0"



if not exist ".env" (

  if exist ".env.example" copy /y ".env.example" ".env" >nul

)



for /f "usebackq eol=# tokens=1,* delims==" %%A in (".env") do (

  if not "%%A"=="" set "%%A=%%B"

)



if not defined DATA_DIR set "DATA_DIR=./data"

if not defined PORT set "PORT=8080"

if not defined ADMIN_PORT set "ADMIN_PORT=8081"

if not defined ADMIN_USERNAME set "ADMIN_USERNAME=admin"

if not exist "%DATA_DIR%" mkdir "%DATA_DIR%"



where python >nul 2>nul

if errorlevel 1 (

  echo [material-extra] 未找到 python 命令，请先安装 Python 3.10+ 并勾选 "Add python.exe to PATH"。

  echo [material-extra] 下载地址：https://www.python.org/downloads/

  pause

  exit /b 1

)



echo.

echo  访客端 http://localhost:%PORT%/

echo  管理端 http://localhost:%ADMIN_PORT%/admin

echo  首次运行会自动生成管理员密码，请查看下方输出。

echo.



python "app\blog.py"

set "EXIT_CODE=%ERRORLEVEL%"

if not "%EXIT_CODE%"=="0" (

  echo.

  echo [material-extra] 服务退出，代码 %EXIT_CODE%。

  pause

)

exit /b %EXIT_CODE%

