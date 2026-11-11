@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo   BLOCKBOUND ULTIMATE - MULTIPLAYER-SERVER
echo.
where node >nul 2>nul
if errorlevel 1 (
 echo Node.js nicht gefunden. Bitte Node.js 20 oder neuer installieren: https://nodejs.org/
 pause
 exit /b 1
)
echo Spiel: http://localhost:3000
echo Server mit STRG+C beenden.
echo.
start "" "http://localhost:3000"
node server/index.js
echo.
echo Server beendet.
pause
