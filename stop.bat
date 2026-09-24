@echo off
setlocal
echo ======================================================================
echo  Stopping HṚṢĪKEŚA Processes & Local Services
echo ======================================================================

echo [*] Stopping node and tsx processes...
taskkill /F /IM node.exe /T 2>nul
taskkill /F /IM tsx.exe /T 2>nul

echo [*] Stopping local Ollama server...
taskkill /F /IM ollama.exe /T 2>nul
taskkill /F /IM "ollama app.exe" /T 2>nul

echo [✓] All HṚṢĪKEŚA services stopped.
