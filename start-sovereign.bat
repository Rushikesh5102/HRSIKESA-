@echo off
title HṚṢĪKEŚA Sovereign OS Control Plane
echo ===============================================================================
echo                HṚṢĪKEŚA (हृषीकेश) — SOVEREIGN CONTROL PLANE
echo               Autonomous Multi-Agent Personal Operating System
echo ===============================================================================
echo.

cd /d "%~dp0"

echo [*] Checking database directory...
if not exist "data" mkdir "data"

echo [*] Verifying frontend production build...
if not exist "ui\dist\index.html" (
    echo [*] Building frontend interface...
    call npm --prefix ui run build
)

echo [*] Launching Sovereign Backend Kernel on http://127.0.0.1:4200 ...
echo [*] Press Ctrl+C to safely terminate server.
echo.

node --import tsx src/index.ts

pause
