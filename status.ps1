# HRISEKESA - Self-Containment and Diagnostics Status

$projectRoot = $PSScriptRoot

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host " HRISEKESA - Self-Containment and Diagnostics Status" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "Directory: $projectRoot`n" -ForegroundColor Gray

Write-Host "--- 1. LOCAL COGNITION MODELS (data/models/ollama) ---" -ForegroundColor Yellow
$ollamaExe = Join-Path $projectRoot "tools\ollama\ollama.exe"
if (Test-Path $ollamaExe) {
    $env:OLLAMA_MODELS = Join-Path $projectRoot "data\models\ollama"
    & $ollamaExe list
} else {
    Write-Host "[!] Local tools/ollama/ollama.exe not found." -ForegroundColor Red
}

Write-Host "`n--- 2. LOCAL VOICE MODELS (data/audio) ---" -ForegroundColor Yellow
$audioDir = Join-Path $projectRoot "data\audio"
if (Test-Path $audioDir) {
    $onnxFiles = Get-ChildItem -Path $audioDir -Filter "*.onnx" -ErrorAction SilentlyContinue
    foreach ($f in $onnxFiles) {
        $sizeMB = [math]::Round($f.Length / 1048576, 2)
        Write-Host " [OK] Neural TTS: $($f.Name) ($sizeMB MB)" -ForegroundColor Green
    }
    $whisperDir = Join-Path $audioDir "whisper"
    if (Test-Path $whisperDir) {
        $whisperFiles = Get-ChildItem -Path $whisperDir -Filter "*.pt" -ErrorAction SilentlyContinue
        foreach ($f in $whisperFiles) {
            $wSizeMB = [math]::Round($f.Length / 1048576, 2)
            Write-Host " [OK] Whisper Model: $($f.Name) ($wSizeMB MB)" -ForegroundColor Green
        }
    }
    if (Test-Path (Join-Path $audioDir "whisper-tiny")) {
        Write-Host " [OK] Whisper-Tiny Model Directory present" -ForegroundColor Green
    }
}

if (Test-Path (Join-Path $projectRoot "data\pronunciations.json")) {
    Write-Host " [OK] Sanskrit/Indic Pronunciation Lexicon present" -ForegroundColor Green
}

Write-Host "`n--- 3. BUNDLED RUNTIMES AND TOOLS (tools/) ---" -ForegroundColor Yellow
$checkTools = @(
    "tools\ollama\ollama.exe",
    "tools\bin\piper.exe",
    "tools\bin\uv.exe",
    "tools\bin\python3.11.exe",
    "tools\piper"
)
foreach ($t in $checkTools) {
    $fullPath = Join-Path $projectRoot $t
    if (Test-Path $fullPath) {
        Write-Host " [OK] $t" -ForegroundColor Green
    } else {
        Write-Host " [MISSING] $t" -ForegroundColor DarkGray
    }
}

Write-Host "`n--- 4. ACTIVE PORTS AND SERVICES ---" -ForegroundColor Yellow
$ports = @(4200, 5173, 11434)
foreach ($p in $ports) {
    $conn = Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue
    if ($conn) {
        Write-Host " [OK] Port $p is LISTENING" -ForegroundColor Green
    } else {
        Write-Host " [ ] Port $p is inactive" -ForegroundColor DarkGray
    }
}

Write-Host "`n======================================================================" -ForegroundColor Cyan
