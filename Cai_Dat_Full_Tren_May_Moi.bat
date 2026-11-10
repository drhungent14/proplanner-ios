@echo off
chcp 65001 >nul
title Cai Dat Tu Dong ProPlanner Tren May Tinh Moi - 1 Cham
echo ====================================================================
echo   HE THONG TU DONG CAI DAT PROPLANNER TREN MAY TINH MOI (1-CHAM)
echo   - Tu dong kiem tra ^& cai dat Node.js LTS (neu may chua co)
echo   - Tu dong cai dat thu vien npm ^& ket noi dam may Supabase
echo   - Tu dong tao Shortcut tren man hinh Desktop ^& mo App
echo ====================================================================
echo.

cd /d "%~dp0"

echo [1/4] Dang kiem tra Node.js tren may tinh...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [!] May tinh moi chua co Node.js. Dang tu dong tai va cai dat Node.js LTS...
    winget install OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
    set "PATH=%PATH%;C:\Program Files\nodejs;%APPDATA%\npm"
) else (
    echo [OK] Da phat hien Node.js tren may tinh!
)

echo.
echo [2/4] Dang cai dat cac goi thu vien cua du an (node_modules)...
if exist "pnpm-lock.yaml" del /f /q "pnpm-lock.yaml" >nul 2>nul
call npm.cmd install --legacy-peer-deps

echo.
echo [3/4] Dang tao Shortcut "ProPlanner - Bac Si Hung" ngoai man hinh Desktop...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut([Environment]::GetFolderPath('Desktop') + '\ProPlanner - Bac Si Hung.lnk'); $s.TargetPath = '%~dp0Chay_Web_App.bat'; $s.WorkingDirectory = '%~dp0'; $s.Description = 'Mo ung dung ProPlanner'; $s.Save()"
echo [OK] Da tao Shortcut ngoai Desktop thanh cong!

echo.
echo [4/4] Dang khoi dong ProPlanner va dong bo du lieu tu dam may Supabase...
start "" "http://localhost:5173"
call .\node_modules\.bin\vite.cmd --host --port 5173
pause
