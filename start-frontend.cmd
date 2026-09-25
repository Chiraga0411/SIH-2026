@echo off
cd /d "%~dp0frontend"
if not exist node_modules (
  echo Installing frontend dependencies...
  call npm install --no-audit --no-fund || exit /b 1
)
echo Starting UI on http://localhost:5173 ...
call npm run dev
