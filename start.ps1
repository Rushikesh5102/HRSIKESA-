# HṚṢĪKEŚA (हृषीकेश) — Self-Contained Sovereign Runtime Launcher

$ErrorActionPreference = 'Stop'
$projectRoot = $PSScriptRoot

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host " HṚṢĪKEŚA (हृषीकेश) — Sovereign AI Operating System Local Runtime" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Enforce Local Directory Scoping
$env:OLLAMA_MODELS = Join-Path $projectRoot "data\models\ollama"
$toolsBin = Join-Path $projectRoot "tools\bin"
$toolsOllama = Join-Path $projectRoot "tools\ollama"
$env:PATH = "$toolsBin;$toolsOllama;" + $env:PATH

Write-Host "[*] Project Directory: $projectRoot" -ForegroundColor Gray
Write-Host "[*] Models Directory:  $env:OLLAMA_MODELS" -ForegroundColor Gray
Write-Host ""

# 2. Check / Start Local Ollama Server
Write-Host "[*] Checking Local Ollama Inference Engine..." -ForegroundColor Yellow
$ollamaReady = $false
try {
    $resp = Invoke-RestMethod -Uri "http://127.0.0.1:11434/api/version" -TimeoutSec 2 -ErrorAction Stop
    $ollamaReady = $true
    Write-Host "[✓] Ollama active (version: $($resp.version))" -ForegroundColor Green
} catch {
    $ollamaExe = Join-Path $toolsOllama "ollama.exe"
    if (Test-Path $ollamaExe) {
        Write-Host "[*] Launching bundled Ollama from tools\ollama\ollama.exe..." -ForegroundColor Yellow
        Start-Process -FilePath $ollamaExe -ArgumentList "serve" -WindowStyle Hidden
        Start-Sleep -Seconds 3
        try {
            $resp = Invoke-RestMethod -Uri "http://127.0.0.1:11434/api/version" -TimeoutSec 3 -ErrorAction Stop
            $ollamaReady = $true
            Write-Host "[✓] Ollama successfully auto-started on port 11434" -ForegroundColor Green
        } catch {
            Write-Host "[!] Ollama started but taking longer to respond. Proceeding..." -ForegroundColor Yellow
        }
    } else {
        Write-Host "[!] tools\ollama\ollama.exe not found. Falling back to system Ollama." -ForegroundColor Yellow
    }
}

# 3. Display Local Models
Write-Host ""
Write-Host "[*] Self-Contained Models:" -ForegroundColor Cyan
try {
    & (Join-Path $toolsOllama "ollama.exe") list
} catch {
    ollama list
}

# 4. Start HṚṢĪKEŚA Microkernel
Write-Host ""
Write-Host "[*] Starting HṚṢĪKEŚA Sovereign Microkernel on port 4200..." -ForegroundColor Green
npm run dev
