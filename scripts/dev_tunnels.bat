@echo off
title Presco Tunnels
cd /d "%~dp0.."
echo ========================================================
echo  PRESCO LOCALTUNNELS (API: 3333, Expo: 8081)
echo ========================================================
start /b npx --yes localtunnel --port 3333 --subdomain ini3a-eq3-api
npx --yes localtunnel --port 8081 --subdomain ini3a-eq3-app
