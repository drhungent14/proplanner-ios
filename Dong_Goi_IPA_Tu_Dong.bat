@echo off
chcp 65001 >nul
title ProPlanner — Đóng gói tự động file ProPlanner.ipa cho iPhone
echo =====================================================================
echo   HỆ THỐNG ĐÓNG GÓI FILE PROPLANNER.IPA TỰ ĐỘNG QUA GITHUB ACTIONS
echo =====================================================================
echo.

cd /d "%~dp0"

echo [1/3] Kiểm tra bản build Web App cục bộ...
call npm.cmd run build
if %errorlevel% neq 0 (
    echo [LỖI] Quá trình build gặp sự cố. Vui lòng kiểm tra lại!
    pause
    exit /b 1
)

echo.
echo [2/3] Đang lưu mã nguồn và đẩy lên GitHub để kích hoạt máy chủ macOS Xcode...
git add -A
git commit -m "chore: build ProPlanner iOS .ipa with Supabase Realtime & iOS Local Notifications" 2>nul

git remote get-url origin >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo [HƯỚNG DẪN LẦN ĐẦU] Chưa gắn link kho chứa GitHub (remote origin).
    set /p REPO_URL="Nhập đường dẫn GitHub Repo của bạn (ví dụ https://github.com/ten-ban/proplanner.git): "
    if not "%REPO_URL%"=="" (
        git branch -M main
        git remote add origin "%REPO_URL%"
    )
)

git push -u origin main
if %errorlevel% equ 0 (
    echo.
    echo [3/3] HOÀN TẤT! Đã gửi lệnh đóng gói lên GitHub Actions.
    echo Hãy mở tab "Actions" trên trang GitHub của bạn, đợi khoảng 3-4 phút
    echo và tải file "ProPlanner-iOS-IPA" về cài qua Sideloadly!
) else (
    echo.
    echo [THÔNG BÁO] Vui lòng kiểm tra kết nối tài khoản GitHub hoặc đường dẫn Repo.
)

echo.
pause
