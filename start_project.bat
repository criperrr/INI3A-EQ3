@echo off
setlocal
echo ==============================================================================
echo Presco (INI3A-EQ3) - Inicializador Windows
echo ==============================================================================
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start_project.ps1" %*
