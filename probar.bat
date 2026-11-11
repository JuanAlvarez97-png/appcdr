@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Instala Node.js LTS desde https://nodejs.org y vuelve a ejecutar este archivo.
  pause
  exit /b 1
)
call npm install
if errorlevel 1 ( echo Error en npm install & pause & exit /b 1 )
call npm start
