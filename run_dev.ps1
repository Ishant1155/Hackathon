# MindGuard AI - Full Stack Development Runner (PowerShell)
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "            MINDGUARD AI DEVELOPMENT LAUNCHER            " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Starting FastAPI Backend (Port 8000) and Vite Frontend (Port 5173)...`n" -ForegroundColor Yellow

$backendJob = Start-Process python -ArgumentList "-m uvicorn app.main:app --host 127.0.0.1 --port 8000" -WorkingDirectory "$PSScriptRoot\backend" -PassThru
Write-Host "[OK] Backend process launched (PID: $($backendJob.Id))" -ForegroundColor Green

$frontendJob = Start-Process npm -ArgumentList "run dev" -WorkingDirectory "$PSScriptRoot\frontend" -PassThru
Write-Host "[OK] Frontend process launched (PID: $($frontendJob.Id))`n" -ForegroundColor Green

Write-Host "Platform URLs:" -ForegroundColor Cyan
Write-Host "  Frontend Dashboard : http://localhost:5173" -ForegroundColor White
Write-Host "  Backend API Docs   : http://localhost:8000/docs" -ForegroundColor White
Write-Host "  Backend Health     : http://localhost:8000/api/health`n" -ForegroundColor White

Write-Host "Press Ctrl+C or close this window when done testing." -ForegroundColor Gray
try {
    Wait-Process -Id $frontendJob.Id
} finally {
    Stop-Process -Id $backendJob.Id -ErrorAction SilentlyContinue
    Stop-Process -Id $frontendJob.Id -ErrorAction SilentlyContinue
}
