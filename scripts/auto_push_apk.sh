#!/usr/bin/env bash
# Loop infinito para monitorar dispositivos Android conectados via ADB
# e enviar o APK de produção automaticamente para /sdcard/Download/

APK_PATH="/Users/mac406/Downloads/presco-app-release.apk"
ADB="/opt/homebrew/bin/adb"

if [ ! -f "$APK_PATH" ]; then
    echo "[-] Erro: APK não encontrado em $APK_PATH"
    exit 1
fi

echo "========================================================"
echo " 🚀 Auto-Push APK: Monitorando dispositivos conectados"
echo " 📦 Arquivo: presco-app-release.apk (134 MB)"
echo " 📂 Destino: /sdcard/Download/presco-app-release.apk"
echo "========================================================"

# Conjunto de dispositivos já atendidos nesta sessão
declare -A PROCESSED_DEVICES

while true; do
    # Lista apenas os seriais de dispositivos com status 'device' (autorizados)
    CURRENT_DEVICES=$("$ADB" devices | awk 'NR>1 && $2=="device" {print $1}')
    
    for DEV in $CURRENT_DEVICES; do
        if [ -z "${PROCESSED_DEVICES[$DEV]:-}" ]; then
            MODEL=$("$ADB" -s "$DEV" shell getprop ro.product.model 2>/dev/null | tr -d '\r\n')
            echo ""
            echo "📱 [$(date '+%H:%M:%S')] Novo dispositivo detectado: $DEV ($MODEL)"
            echo "⏳ Enviando APK para /sdcard/Download/..."
            
            if "$ADB" -s "$DEV" push "$APK_PATH" /sdcard/Download/presco-app-release.apk; then
                echo "✅ [$(date '+%H:%M:%S')] Transferência concluída com sucesso no dispositivo $DEV ($MODEL)!"
                PROCESSED_DEVICES[$DEV]=1
            else
                echo "❌ Falha ao enviar para o dispositivo $DEV. Tentará novamente no próximo ciclo."
            fi
        fi
    done
    
    # Limpa da memória dispositivos que foram desconectados para permitir reconexão futura se necessário
    for KNOWN_DEV in "${!PROCESSED_DEVICES[@]}"; do
        if ! echo "$CURRENT_DEVICES" | grep -q "^$KNOWN_DEV$"; then
            echo "🔌 Dispositivo desconectado: $KNOWN_DEV (removido do cache)"
            unset "PROCESSED_DEVICES[$KNOWN_DEV]"
        fi
    done

    sleep 2
done
