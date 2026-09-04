@echo off
setlocal
echo ==============================================================================
echo Presco (INI3A-EQ3) - Setup Automizado para Windows
echo ==============================================================================
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup.ps1" %*
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERRO] Ocorreu uma falha no setup.
    pause
    exit /b %ERRORLEVEL%
)
echo.
echo Setup finalizado! Pressione qualquer tecla para sair.
pause
