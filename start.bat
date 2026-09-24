@echo off
setlocal enabledelayedexpansion

title HṚṢĪKEŚA — Sovereign Operating System Launcher
echo ======================================================================
echo  HṚṢĪKEŚA (हृषीकेश) — Self-Contained Sovereign AI Operating System
echo ======================================================================
echo.

set "PROJECT_ROOT=%~dp0"
if "%PROJECT_ROOT:~-1%"=="\" set "PROJECT_ROOT=%PROJECT_ROOT:~0,-1%"

:: 1. Force Project-Local Models & Tools
set "OLLAMA_MODELS=%PROJECT_ROOT%\data\models\ollama"
set "PATH=%PROJECT_ROOT%\tools\bin;%PROJECT_ROOT%\tools\ollama;%PATH%"

echo [*] Project Root: %PROJECT_ROOT%
echo [*] Local Models Directory: %OLLAMA_MODELS%
echo.

:: 2. Ensure Project-Local Ollama Server is Running
echo [*] Verifying Local Ollama Runner...
curl -s http://127.0.0.1:11434/api/version >nul 2>&1
if %errorlevel% neq 0 (
    echo [*] Starting bundled Ollama service from tools\ollama\ollama.exe...
    start "" /b "%PROJECT_ROOT%\tools\ollama\ollama.exe" serve
    timeout /t 3 /nobreak >nul
) else (
    echo [✓] Ollama service already responding on port 11434.
)

:: 3. List Local Models Available
echo [*] Local Models in data\models\ollama:
"%PROJECT_ROOT%\tools\ollama\ollama.exe" list

:: 4. Start HṚṢĪKEŚA Kernel
echo.
echo [*] Launching HṚṢĪKEŚA Sovereign Kernel & API Gateway on port 4200...
npm run dev
