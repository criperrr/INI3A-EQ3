@echo off
title Presco Frontend
cd /d "%~dp0..\src\frontend"
echo ========================================================
echo  PRESCO FRONTEND EXPO APP (Port 8081)
echo ========================================================

if not "%~1"=="" set EXPO_PUBLIC_API_URL=%~1
if not "%~2"=="" set REACT_NATIVE_PACKAGER_HOSTNAME=%~2
if not "%~3"=="" set EXPO_PACKAGER_PROXY_URL=%~3
if not "%~4"=="" set EXPO_DEBUG=%~4

if "%~5"=="--tunnel" (
    echo [i] Running in Tunnel mode...
    npm run start -- --clear
) else (
    echo [i] Running in Local NAT LAN mode...
    npm run start -- --lan --clear
)
