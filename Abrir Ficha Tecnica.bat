@echo off
title Ficha Tecnica TBT - inicializador
REM Sobe o servidor local e abre o navegador automaticamente.
REM Mantenha a janela do servidor (preta) ABERTA enquanto usa o sistema.

cd /d "%~dp0"

echo Iniciando o servidor da Ficha Tecnica TBT...
start "Ficha Tecnica TBT (SERVIDOR - nao feche esta janela)" powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0serve.ps1"

echo Aguardando o servidor subir...
timeout /t 3 /nobreak >nul

echo Abrindo no navegador...
start "" "http://localhost:8770/"

echo.
echo Pronto. Se o navegador nao abrir, acesse manualmente:  http://localhost:8770/
echo (Para encerrar, feche a janela preta do servidor.)
timeout /t 4 /nobreak >nul
