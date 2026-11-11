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
call npm run dist
if errorlevel 1 ( echo Error al crear el instalador & pause & exit /b 1 )
echo.
echo Listo. El instalador esta en la carpeta "dist".
explorer dist
pause
