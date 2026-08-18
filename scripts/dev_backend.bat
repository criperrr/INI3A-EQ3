@echo off
title Presco Backend
cd /d "%~dp0..\src\backend"
echo ========================================================
echo  PRESCO BACKEND SERVER (Port 3333)
echo ========================================================
set DEBUG=*
set NODE_ENV=development
npm run dev
