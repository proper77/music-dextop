@echo off
setlocal enabledelayedexpansion
title BitChord Unified Desktop (Windows)

echo ============================================
echo   BitChord Unified Windows Desktop Builder
echo ============================================
echo.

where flutter >nul 2>&1
if %errorlevel% neq 0 (
  echo [!] Flutter SDK not found in PATH.
  echo     Install Flutter for Windows: https://docs.flutter.dev/get-started/install/windows
  echo     Or run BitChord-Desktop.bat to launch the live desktop app window immediately.
  pause
  exit /b 1
)

if not exist "windows" (
  echo [1/4] Generating Windows desktop runner...
  call flutter create --platforms=windows .
)

echo [2/4] Fetching Flutter dependencies...
call flutter pub get

echo [3/4] Building Windows Release executable...
set "SYNC_URL=%BITCHORD_SYNC_URL%"
if "%SYNC_URL%"=="" set "SYNC_URL=https://ais-dev-svjilu3eecrunzjygvrdvp-379631084715.europe-west3.run.app"
call flutter build windows --release --dart-define=BITCHORD_SYNC_URL=%SYNC_URL%

if exist "build\windows\x64\runner\Release\bitchord_unified.exe" (
  echo [4/4] Launching BitChord Windows Desktop...
  start "" "build\windows\x64\runner\Release\bitchord_unified.exe"
) else (
  echo [!] Build finished. Check build\windows\runner\Release\ for executable.
)
pause
