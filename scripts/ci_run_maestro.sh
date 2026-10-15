#!/usr/bin/env bash
set -euo pipefail

SUITE="${1:-quality}"
export PATH="$HOME/.maestro/bin:$PATH"

echo "📱 Aguardando emulador Android responder ao adb..."
adb wait-for-device

echo "📱 Dispositivos conectados:"
adb devices

echo "📦 Instalando APK Debug do Presco..."
adb install -r src/frontend/android/app/build/outputs/apk/debug/app-debug.apk

echo "🔍 Verificando pacote instalado no emulador..."
adb shell pm list packages | grep com.presco.app || (echo "❌ Pacote com.presco.app não encontrado no emulador!" && exit 1)
echo "✅ Pacote com.presco.app verificado com sucesso."

echo "🔑 Concedendo permissões do sistema..."
adb shell pm grant com.presco.app android.permission.ACCESS_FINE_LOCATION 2>/dev/null || true
adb shell pm grant com.presco.app android.permission.ACCESS_COARSE_LOCATION 2>/dev/null || true

echo "🔀 Configurando redirecionamento de portas ADB..."
adb reverse tcp:8081 tcp:8081
adb reverse tcp:3333 tcp:3333

echo "🚀 Iniciando Metro Bundler em background..."
cd src/frontend
npx expo start --localhost > /tmp/metro.log 2>&1 &
METRO_PID=$!
cd ../..

cleanup() {
  echo "🧹 Encerrando processos de suporte..."
  kill "$METRO_PID" 2>/dev/null || true
  pkill -f "expo start" 2>/dev/null || true
}
trap cleanup EXIT

echo "⏳ Aguardando Metro Bundler responder..."
timeout 60 bash -c 'until curl -s http://localhost:8081/status; do sleep 2; done'
echo "✅ Metro Bundler pronto."

echo "🧪 Executando suíte Maestro ($SUITE)..."
mkdir -p reports/maestro
if [ "$SUITE" = "quick" ]; then
  npm run test:maestro:quick
else
  npm run test:maestro:quality
fi
echo "✅ Suíte Maestro finalizada com sucesso."
