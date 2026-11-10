@echo off
chcp 65001 >nul
echo Đang khởi động ProPlanner Web App trên máy tính...
set "PATH=%USERPROFILE%\.tools\nodejs;C:\Users\Hung_Giang\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback;C:\Users\Hung_Giang\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;%PATH%"
cd /d "%~dp0"
start "" "http://localhost:5173"
call .\node_modules\.bin\vite.cmd --host
pause
