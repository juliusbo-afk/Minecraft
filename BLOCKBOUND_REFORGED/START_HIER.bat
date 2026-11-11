@echo off
chcp 65001 >nul
cd /d "%~dp0"
title BLOCKBOUND REFORGED Multiplayer Server
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js wurde nicht gefunden.
  echo Installiere Node.js LTS von https://nodejs.org/ und starte diese Datei erneut.
  pause
  exit /b 1
)
echo BLOCKBOUND REFORGED startet ...
echo Browseradresse: http://localhost:3000
echo Dieses Fenster fuer Multiplayer offen lassen.
start "" "http://localhost:3000"
node server.js
pause
