@echo off
title Cluster Frontend
echo Starting Cluster Frontend (Vite)...
cd /d "%~dp0"
call npm run dev
pause
