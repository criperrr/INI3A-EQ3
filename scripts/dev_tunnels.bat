@echo off
title Presco Backend Tunnel Agent
cd /d "%~dp0.."
echo ========================================================
echo  PRESCO API CLOUD TUNNEL AGENT (Port 3333)
echo ========================================================
npx tsx ./scripts/start_api_tunnel.ts
