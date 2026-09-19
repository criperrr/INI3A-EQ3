#!/usr/bin/env bash
# Abre o Finder destacando o APK de release e abrindo o Android File Transfer / OpenMTP

APK_PATH="/Users/mac406/Downloads/presco-app-release.apk"

echo "========================================================="
echo " 📁 Abrindo Finder com o APK e o aplicativo de transferência MTP"
echo "========================================================="

# Revela o arquivo no Finder
open -R "$APK_PATH"

# Se o Android File Transfer estiver instalado, abre ele
if [ -d "/Applications/Android File Transfer.app" ]; then
    open -a "/Applications/Android File Transfer.app"
elif [ -d "/Applications/OpenMTP.app" ]; then
    open -a "/Applications/OpenMTP.app"
fi
