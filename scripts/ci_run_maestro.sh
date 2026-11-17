#!/usr/bin/env bash
set -euo pipefail

SUITE="${1:-quality}"
export PATH="$HOME/.maestro/bin:$PATH"

echo "[INFO] Aguardando emulador Android responder ao adb..."
adb wait-for-device

echo "[INFO] Dispositivos conectados:"
adb devices

echo "[INFO] Instalando APK Debug do Presco..."
adb install -r src/frontend/android/app/build/outputs/apk/debug/app-debug.apk

echo "[INFO] Verificando pacote instalado no emulador..."
adb shell pm list packages | grep com.presco.app || (echo "[ERRO] Pacote com.presco.app não encontrado no emulador!" && exit 1)
echo "[OK] Pacote com.presco.app verificado com sucesso."

echo "[INFO] Concedendo permissões do sistema..."
adb shell pm grant com.presco.app android.permission.ACCESS_FINE_LOCATION 2>/dev/null || true
adb shell pm grant com.presco.app android.permission.ACCESS_COARSE_LOCATION 2>/dev/null || true

echo "[INFO] Configurando redirecionamento de portas ADB..."
adb reverse tcp:8081 tcp:8081
adb reverse tcp:3333 tcp:3333

echo "[INFO] Iniciando Metro Bundler em background..."
cd src/frontend
npx expo start --host lan > /tmp/metro.log 2>&1 &
METRO_PID=$!
cd ../..

cleanup() {
  echo "[INFO] Encerrando processos de suporte..."
  kill "$METRO_PID" 2>/dev/null || true
  pkill -f "expo start" 2>/dev/null || true
}
trap cleanup EXIT

echo "[INFO] Aguardando Metro Bundler responder..."
timeout 60 bash -c 'until curl -s http://localhost:8081/status; do sleep 2; done'
echo "[OK] Metro Bundler pronto."

echo "[INFO] Pré-aquecendo bundle JavaScript no Metro..."
RAW_BUNDLE_URL=$(curl -s -H "Expo-Platform: android" -H "Accept: application/expo+json,application/json" http://localhost:8081 | grep -oE 'http://[^"]+entry\.bundle[^"]+' | head -n 1 || true)
if [ -n "$RAW_BUNDLE_URL" ]; then
  BUNDLE_URL=$(echo "$RAW_BUNDLE_URL" | sed -E 's|^http://[^/]+|http://localhost:8081|')
else
  BUNDLE_URL="http://localhost:8081/node_modules/expo-router/entry.bundle?platform=android&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.bytecode=1&transform.routerRoot=app"
fi
echo "[INFO] Compilando bundle inicial: $BUNDLE_URL"
curl -s "$BUNDLE_URL" > /dev/null 2>&1 || true
EAGER_BUNDLE_URL="${BUNDLE_URL/lazy=true/lazy=false}"
curl -s "$EAGER_BUNDLE_URL" > /dev/null 2>&1 || true
echo "[OK] Bundle pré-aquecido."

echo "[INFO] Conectando app ao Metro Bundler via deep-link..."
adb logcat -c || true
adb shell am start -a android.intent.action.VIEW -d "presco://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081" 2>/dev/null || true

echo "[INFO] Aguardando inicialização completa do contexto React Native..."
for i in $(seq 1 50); do
  if adb logcat -d 2>/dev/null | grep -qE "AsyncStorageExpoMigration"; then
    echo "[OK] Contexto React Native inicializado (${i}s)."
    break
  fi
  sleep 1
done
sleep 5

echo "[INFO] Executando suíte Maestro ($SUITE)..."
mkdir -p reports/maestro
if [ "$SUITE" = "quick" ]; then
  npm run test:maestro:quick
else
  npm run test:maestro:quality
fi
echo "[OK] Suíte Maestro finalizada com sucesso."
