#!/bin/bash

logDir="/var/log/minecraft"
logFile="$logDir/power-serv.log"

if [ ! -d "$logDir" ]; then
    mkdir -p "$logDir"
fi

exec >> "$logFile" 2>&1

pidFile="/tmp/power-servPID.txt"
phaseFile="/tmp/power-servPhase.txt"
acConnected=$(cat "/sys/class/power_supply/AC/online" 2>/dev/null)
currentDate=$(date '+%Y-%m-%d %H:%M:%S')

echo "--------------------------------------------------------"
echo "[$currentDate] Script invocado. Status AC: $acConnected"

is_java_running() {
    pgrep -x "java" > /dev/null 2>&1
}

if [ "$acConnected" == "1" ]; then
    if [ -f "$pidFile" ]; then
        oldPid=$(cat "$pidFile")
        oldPhase=$(cat "$phaseFile")
        
        if [ "$oldPhase" == "1" ]; then
            echo "Tentativa de cancelamento rejeitada: O servidor já está na fase de salvamento (stop emitido)."
            exit 0
        else
            echo "Cancelando contagem regressiva (Enviando SIGINT para o processo $oldPid)..."
            kill -SIGINT "$oldPid" 2>/dev/null
            tmux send-keys -t 0 "/title @a times 20 100 20"
            tmux send-keys -t 0 "/title @a title [\"\",{\"text\":\"a\",\"obfuscated\":true,\"color\":\"dark_green\"},{\"text\":\"AC Connected \",\"color\":\"dark_green\"},{\"text\":\"a\",\"obfuscated\":true,\"color\":\"dark_green\"}]" ENTER; \
            tmux send-keys -t 0 "say tudo bem, carregador conectado novamente, nada ira acontecer."; \
            tmux send-keys -t 0 'say O CARREGADOR FOI CONECTADO! Desligamento de emergência cancelado.' ENTER
            echo "Cancelamento concluído."
            exit 0
        fi
    else
        echo "AC conectado. Nenhum desligamento pendente. Saindo."
        exit 0
    fi
fi

if ! is_java_running; then
    echo "Servidor Java inativo. Saindo."
    exit 0
fi

if [ -f "$pidFile" ] && kill -0 $(cat "$pidFile") 2>/dev/null; then
    echo "Um processo de desligamento já está em andamento neste PID. Ignorando invocação duplicada."
    exit 0
fi

echo $$ > "$pidFile"
echo "0" > "$phaseFile"

trap 'echo "[$currentDate] Contagem regressiva interrompida via TRAP IPC."; \
rm -f "$pidFile" "$phaseFile"; \
exit 0' SIGINT

tmux send-keys -t 0 '/title @a times 20 100 20' ENTER
tmux send-keys -t 0 '/title @a subtitle {"text":"OLHE O CHAT"}' ENTER
tmux send-keys -t 0 '/title @a title ["",{"text":"as","obfuscated":true,"color":"dark_red"},{"text":"AC DISCONNECTED","color":"dark_red"},{"text":"as","obfuscated":true,"color":"dark_red"}]' ENTER
tmux send-keys -t 0 "say O servidor vai ser encerrado. Não há garantia que a bateria vai aguentar o servidor. Contagem regressiva:" ENTER
for i in {60..1}; do
    tmux send-keys -t 0 "say ${i}s" ENTER
    sleep 1
done

echo "1" > "$phaseFile"
echo "Enviando comando stop para o Tmux..."
tmux send-keys -t 0 "stop" ENTER

trap '' SIGINT

while is_java_running; do
    echo "Aguardando jvm morrer (salvar o mundo)"
    sleep 2
done

echo "Processo Java encerrado com sucesso. Executando chamada de sistema poweroff."
rm -f "$pidFile" "$phaseFile"
poweroff