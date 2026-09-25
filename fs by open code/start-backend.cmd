@echo off
cd /d "%~dp0backend"
if not exist node_modules (
  echo Installing backend dependencies...
  call npm install --no-audit --no-fund || exit /b 1
)
echo Starting gateway on http://127.0.0.1:4000 ...
call npm start
