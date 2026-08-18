@echo off
:: ==============================================================================
:: start_project.bat - Windows Batch Launcher for Presco
:: Bypasses PowerShell execution policies automatically
:: ==============================================================================
powershell -ExecutionPolicy Bypass -NoProfile -File "%~dp0start_project.ps1" %*
