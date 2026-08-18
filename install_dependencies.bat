@echo off
setlocal EnableDelayedExpansion

:: ==============================================================================
:: install_dependencies.bat - Instalador de Dependencias do Presco (INI3A-EQ3)
:: Instala dependencias da raiz, do backend e do frontend automaticamente.
:: Suporta o parametro --clean ou -c para reinstalacao limpa.
:: ==============================================================================

title Presco - Instalador de Dependencias

echo ==============================================================================
echo                 PRESCO / INI3A-EQ3 - INSTALADOR DE DEPENDENCIAS
echo ==============================================================================
echo.

:: 1. Verificar flag --clean ou -c
set "CLEAN_MODE=0"
for %%a in (%*) do (
    if /i "%%a"=="--clean" set "CLEAN_MODE=1"
    if /i "%%a"=="-c" set "CLEAN_MODE=1"
)

:: 2. Verificar Node.js
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 goto :node_missing

:: 3. Verificar NPM
where npm >nul 2>&1
if %ERRORLEVEL% NEQ 0 goto :npm_missing

for /f "delims=" %%v in ('node -v 2^>nul') do set "NODE_VERSION=%%v"
for /f "delims=" %%v in ('npm -v 2^>nul') do set "NPM_VERSION=%%v"

echo [INFO] Node.js detectado: !NODE_VERSION!
echo [INFO] NPM detectado:     v!NPM_VERSION!
if "!CLEAN_MODE!"=="1" echo [INFO] Modo de Limpeza ativado: node_modules serao limpos antes da instalacao.
echo.

set "ROOT_DIR=%~dp0"
cd /d "%ROOT_DIR%"

:: ------------------------------------------------------------------------------
:: [1/3] Dependencias da Raiz
:: ------------------------------------------------------------------------------
echo ==============================================================================
echo [1/3] Instalando dependencias da raiz do projeto...
echo ==============================================================================
cd /d "%ROOT_DIR%"
if "!CLEAN_MODE!"=="1" (
    if exist "node_modules" rmdir /s /q "node_modules" 2>nul
)
call npm install %*
if %ERRORLEVEL% NEQ 0 goto :root_error
echo [OK] Dependencias da raiz instaladas com sucesso!
echo.

:: ------------------------------------------------------------------------------
:: [2/3] Dependencias do Backend
:: ------------------------------------------------------------------------------
echo ==============================================================================
echo [2/3] Instalando dependencias do Backend: src/backend
echo ==============================================================================
if not exist "%ROOT_DIR%src\backend\package.json" goto :backend_missing

cd /d "%ROOT_DIR%src\backend"
if "!CLEAN_MODE!"=="1" (
    if exist "node_modules" rmdir /s /q "node_modules" 2>nul
)
call npm install %*
if %ERRORLEVEL% NEQ 0 goto :backend_error
echo [OK] Dependencias do Backend instaladas com sucesso!
echo.

:: ------------------------------------------------------------------------------
:: [3/3] Dependencias do Frontend
:: ------------------------------------------------------------------------------
echo ==============================================================================
echo [3/3] Instalando dependencias do Frontend: src/frontend
echo ==============================================================================
if not exist "%ROOT_DIR%src\frontend\package.json" goto :frontend_missing

cd /d "%ROOT_DIR%src\frontend"
if "!CLEAN_MODE!"=="1" (
    if exist "node_modules" rmdir /s /q "node_modules" 2>nul
)
call npm install %*
if %ERRORLEVEL% EQU 0 goto :frontend_ok

echo.
echo [AVISO] Primeira tentativa no frontend retornou erro. Tentando com --legacy-peer-deps...
call npm install --legacy-peer-deps
if %ERRORLEVEL% NEQ 0 goto :frontend_error

:frontend_ok
echo [OK] Dependencias do Frontend instaladas com sucesso!
echo.

:: ------------------------------------------------------------------------------
:: Conclusao com Sucesso
:: ------------------------------------------------------------------------------
cd /d "%ROOT_DIR%"
echo ==============================================================================
echo                 TODAS AS DEPENDENCIAS FORAM INSTALADAS COM SUCESSO!
echo ==============================================================================
echo.
echo Para iniciar o ambiente de desenvolvimento, execute um dos comandos:
echo.
echo   1. start_project.bat              - Inicia com tunel localtunnel
echo   2. start_project.bat -LocalNat    - Inicia em modo 100%% Rede Local / Wi-Fi
echo   3. npm run dev:win                - Atalho via NPM para Windows
echo   4. npm run dev:win:local          - Atalho via NPM para Wi-Fi Local
echo.
echo ==============================================================================
echo.
pause
exit /b 0

:node_missing
echo [ERRO] Node.js nao foi encontrado no sistema ou nao esta no PATH!
echo        Por favor, instale o Node.js v18 ou superior em https://nodejs.org/
echo.
goto :error

:npm_missing
echo [ERRO] NPM nao foi encontrado no sistema ou nao esta no PATH!
echo.
goto :error

:backend_missing
echo [ERRO] Diretorio src\backend\package.json nao encontrado!
goto :error

:frontend_missing
echo [ERRO] Diretorio src\frontend\package.json nao encontrado!
goto :error

:root_error
echo.
echo [ERRO] Falha ao instalar as dependencias da raiz.
goto :error

:backend_error
echo.
echo [ERRO] Falha ao instalar as dependencias do backend.
goto :error

:frontend_error
echo.
echo [ERRO] Falha ao instalar as dependencias do frontend.
echo.
echo DICA PARA WINDOWS: Se ocorrer erro de bloqueio de arquivo (ENOTEMPTY ou EBUSY):
echo   1. Feche todos os terminais do Expo, Metro ou Node em execucao.
echo   2. Execute: .\install.bat --clean
goto :error

:error
cd /d "%ROOT_DIR%"
echo.
echo ==============================================================================
echo [FALHA] Ocorreu um erro durante a instalacao das dependencias.
echo         Verifique as mensagens acima para mais detalhes.
echo ==============================================================================
echo.
pause
exit /b 1
