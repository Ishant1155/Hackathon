@echo off
title MindGuard AI Local Launcher
echo ==========================================================
echo             MINDGUARD AI DEVELOPMENT LAUNCHER            
echo ==========================================================
echo Starting Backend (FastAPI on Port 8000)...
start "MindGuard Backend" cmd /k "cd /d %~dp0backend && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

echo Starting Frontend (Vite on Port 5173)...
start "MindGuard Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo Application started!
echo Frontend: http://localhost:5173
echo Backend API Docs: http://localhost:8000/docs
echo.
pause
