-- Macro para copiar o APK para a janela do Android File Transfer
tell application "Finder"
    set theFile to (POSIX file "/Users/mac406/Downloads/presco-app-release.apk") as alias
    set the clipboard to theFile
end tell

tell application "Android File Transfer"
    activate
end tell

delay 1

tell application "System Events"
    tell process "Android File Transfer"
        -- Se estiver na janela de arquivos, envia Command+V
        keystroke "v" using {command down}
    end tell
end tell
