# ─── DragonGrade — Setup Localhost (Windows PowerShell) ──────────────────────
# Jalankan sekali untuk setup awal dari root folder project

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  DragonGrade — Setup Localhost" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

# === BACKEND SETUP ===
Write-Host "`n[BACKEND] Membuat virtual environment..." -ForegroundColor Yellow
if (-Not (Test-Path "venv")) {
    python -m venv venv --upgrade-deps
    Write-Host "✓ venv dibuat" -ForegroundColor Green
} else {
    Write-Host "✓ venv sudah ada, skip" -ForegroundColor Gray
}

Write-Host "`n[BACKEND] Install Python dependencies..." -ForegroundColor Yellow
& "venv\Scripts\python.exe" -m pip install --upgrade pip
& "venv\Scripts\pip.exe" install -r requirements.txt
Write-Host "✓ Python deps terinstall" -ForegroundColor Green

# === FRONTEND SETUP ===
Write-Host "`n[FRONTEND] Install Node dependencies..." -ForegroundColor Yellow
Set-Location frontend
npm install
Set-Location ..
Write-Host "✓ Node deps terinstall" -ForegroundColor Green

# Cek model
Write-Host ""
if (Test-Path "best_mobilenetv2_dragonfruit.keras") {
    Write-Host "✓ Model ditemukan" -ForegroundColor Green
} else {
    Write-Host "⚠ File 'best_mobilenetv2_dragonfruit.keras' tidak ditemukan!" -ForegroundColor Red
}

Write-Host ""
Write-Host "Setup selesai! Untuk menjalankan:" -ForegroundColor Cyan
Write-Host "  Terminal 1: venv\Scripts\Activate.ps1 && python app.py" -ForegroundColor White
Write-Host "  Terminal 2: cd frontend && npm run dev" -ForegroundColor White
