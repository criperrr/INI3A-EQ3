# Presco - Distribuição Oficial do APK e Documentação da Release v1.0.0

> **Documento:** `apk-release-distribution.md`  
> **Status:** Oficialmente Publicado no GitHub Releases  
> **Versão:** `v1.0.0` (Build 1)  
> **Repositório:** [criperrr/INI3A-EQ3](https://github.com/criperrr/INI3A-EQ3)  
> **Link da Release:** [GitHub Releases - Presco v1.0.0](https://github.com/criperrr/INI3A-EQ3/releases/tag/v1.0.0)

---

## 1. Visão Geral da Release

Esta versão consolida o build final para produção do aplicativo **Presco** no ecossistema Android. O APK foi compilado utilizando o compilador nativo Gradle com suporte à Nova Arquitetura do React Native (*New Architecture / TurboModules / Bridgeless*), engine de execução bytecode **Hermes** e compatibilidade com processadores modernos de 64 bits e 32 bits.

O aplicativo já sai configurado de fábrica para comunicar-se via HTTPS diretamente com o backend do projeto hospedado no servidor CTI UNESP (`https://eq.projetoscti.com.br/26-presco`), não necessitando de nenhuma configuração manual por parte do usuário final.

### 📦 Identificação e Checksums do Binário

| Atributo | Valor / Especificação |
|---|---|
| **Nome do Arquivo Principal** | `Presco-v1.0.0.apk` |
| **Nome do Arquivo Alternativo** | `Presco.apk` |
| **Package Name (ID do Aplicativo)** | `com.presco.app` |
| **Versão da Aplicação** | `1.0.0` |
| **Versão do Código (VersionCode)** | `1` |
| **Tamanho do Arquivo** | **134 MB** (140.562.357 bytes) |
| **Algoritmo de Integridade** | SHA-256 |
| **Hash SHA-256** | `b84db6ffaaabf514e581c09a30c281c1282de2ca5186251a8e9beb4d7cf81018` |
| **Assinatura** | Release Keystore (v1 + v2 Signature Scheme) |
| **Engine JS** | Hermes Bytecode |
| **Arquiteturas Suportadas (ABIs)** | `arm64-v8a` (padrão em 95%+ dos celulares modernos), `armeabi-v7a` (32 bits), `x86_64` (emuladores e Chromebooks) |

---

## 2. Links de Download e Acesso Rápido

- 📥 **Download Direto (GitHub Releases):**  
  [https://github.com/criperrr/INI3A-EQ3/releases/download/v1.0.0/Presco-v1.0.0.apk](https://github.com/criperrr/INI3A-EQ3/releases/download/v1.0.0/Presco-v1.0.0.apk)
- 📥 **Download Alternativo (Presco.apk):**  
  [https://github.com/criperrr/INI3A-EQ3/releases/download/v1.0.0/Presco.apk](https://github.com/criperrr/INI3A-EQ3/releases/download/v1.0.0/Presco.apk)
- 🌐 **Página da Release no GitHub:**  
  [https://github.com/criperrr/INI3A-EQ3/releases/tag/v1.0.0](https://github.com/criperrr/INI3A-EQ3/releases/tag/v1.0.0)

---

## 3. Requisitos de Sistema

### Requisitos Mínimos (Hardware & Software)
- **Sistema Operacional:** Android 7.0 (Nougat - API Level 24) ou posterior.
- **Memória RAM:** Mínimo de 2 GB de RAM (Recomendado: 3 GB ou superior).
- **Armazenamento:** 200 MB de espaço livre para instalação e cache de imagens.
- **Hardware de Câmera:** Câmera traseira com foco automático para escaneamento de códigos de barras em ambientes de supermercado.
- **Serviços de Localização:** Módulo GPS integrado habilitado.
- **Conectividade:** Conexão à internet ativa (Wi-Fi, 4G ou 5G).

---

## 4. Guia de Instalação Passo a Passo

### Método 1: Instalação Direta no Smartphone (Usuário Final)

1. **Baixar o APK:**
   - No navegador do seu celular (Chrome, Samsung Internet, Firefox), acesse o link de download direto da release.
   - O navegador exibirá um aviso padrão de segurança: *"O arquivo pode ser nocivo. Deseja manter Presco-v1.0.0.apk mesmo assim?"*. Toque em **Fazer o download mesmo assim**.
2. **Autorizar a Instalação de Fontes Desconhecidas:**
   - Após a conclusão do download, toque no arquivo na barra de notificações ou abra seu aplicativo de **Arquivos / Downloads**.
   - Se for a primeira vez que você instala um aplicativo baixado fora da Google Play Store por aquele navegador ou gerenciador, o Android exibirá um pop-up: *"Para sua segurança, seu smartphone não tem permissão para instalar apps desconhecidos dessa fonte"*.
   - Toque em **Configurações** e ative a chave **"Permitir desta fonte"**.
3. **Confirmar a Instalação:**
   - Retorne à tela anterior e toque em **Instalar**.
   - Se o **Google Play Protect** exibir uma caixa de diálogo informando *"App bloqueado pelo Play Protect"* (pois trata-se de um binário de release estudantil/independente não publicado na Play Store comercial), toque em **Mais detalhes** e depois em **Instalar assim mesmo**.
4. **Abrir e Conceder Permissões:**
   - Toque em **Abrir**.
   - Na primeira inicialização, conceda:
     - **Permissão de Câmera:** *"Permitir durante o uso do app"* (necessária para ler códigos de barras).
     - **Permissão de Localização:** *"Permitir durante o uso do app"* (necessária para calcular a distância dos mercados e exibir ofertas da sua região).

---

### Método 2: Instalação via Cabo USB / ADB (Para Desenvolvedores e Apresentação)

Se você estiver com o celular conectado ao computador via cabo USB com a **Depuração USB** ativada:

```bash
# 1. Verificar se o dispositivo foi reconhecido
adb devices

# 2. Instalar o APK substituindo versões existentes
adb install -r dist/Presco.apk

# 3. (Opcional) Inicializar o aplicativo diretamente pelo terminal
adb shell am start -n com.presco.app/.MainActivity
```

Caso já exista uma versão de desenvolvimento anterior com assinatura conflitante instalada:
```bash
# Desinstalar a versão anterior e reinstalar limpo
adb uninstall com.presco.app
adb install dist/Presco.apk
```

---

## 5. Permissões do Aplicativo e Justificativa de Privacidade

O Presco segue o princípio do menor privilégio, solicitando estritamente os acessos necessários para a experiência do usuário:

| Permissão Android | Nome no Sistema | Finalidade Técnica |
|---|---|---|
| `CAMERA` | Câmera | Captura de frames de vídeo em tempo real para o leitor de código de barras MLKit (EAN-13, EAN-8 e UPC). Não armazena vídeos nem envia gravações para a rede. |
| `ACCESS_FINE_LOCATION` | Localização Precisa | Consulta de coordenadas de latitude/longitude para busca de supermercados em um raio de 15 km via PostGIS e cálculo de distâncias. |
| `ACCESS_COARSE_LOCATION` | Localização Aproximada | Fallback caso o usuário prefira não fornecer localização GPS precisa por satélite. |
| `INTERNET` | Acesso à Internet | Comunicação com o backend CTI para consulta de produtos, envio de preços, votos e download de imagens otimizadas. |
| `VIBRATE` | Controle de Vibração | Fornecimento de feedback háptico tátil (`expo-haptics`) ao escanear com sucesso, votar e navegar entre telas. |

---

## 6. Funcionalidades Embutidas e Validadas nesta Release

1. **Dashboard & Feed de Ofertas:**
   - Exibição de produtos populares, promoções dinâmicas e acesso rápido aos mercados mais próximos.
   - Navegação por abas com suporte a gestos horizontais (swipe) e transições físicas fluidas.
2. **Scanner de Código de Barras de Alto Desempenho:**
   - Mira ótica com linha laser reativa, cantos de acento temático e botão de alternância de lanterna para corredores escuros de supermercados.
   - Integração com a base OpenFoodFacts e auto-cache transparente no PostgreSQL.
3. **Mapa Nativo com HERE Location Services:**
   - Renderização nativa do Google Maps sem travamentos.
   - Marcadores inteligentes de supermercados, atacadistas, açougues, padarias e mercearias.
   - Filtros por distância, categoria e cálculo de trajeto.
4. **Ficha de Produto e Histórico Comparativo:**
   - Detalhes do produto com marcas, categorias múltiplas e selo de promoção.
   - Gráfico temporal de evolução de preços com ênfase nas cotações mais recentes.
   - Lista comparativa de preços em todos os supermercados cadastrados na região.
5. **Auditoria Comunitária & Gamificação:**
   - Sistema de votação de confiabilidade com pontuação de XP instantânea (+15 XP por reporte, +5 XP por voto).
   - Bloqueio de auto-voto e proteção contra fazenda de XP.
   - Algoritmo de desvio padrão adaptativo para detecção de anomalias e retenção preventiva de preços fora da curva de mercado.
6. **Perfil Dinâmico e Loja de Customizações:**
   - Cálculo automático de níveis e patentes de contribuidor.
   - Loja integrada sem consumo de saldo de XP: desbloqueio por marcos de conquista com banners em alta definição, molduras animadas com brilho neon, distintivos de nível e títulos de honra.
7. **Internacionalização Universal:**
   - Suporte completo e dinâmico a 7 idiomas: Português, Inglês, Espanhol, Alemão, Russo, Chinês e Japonês.
8. **Design System Adaptativo (Monet):**
   - Suporte a Modo Claro, Modo Escuro e Modo AMOLED profundo para economia de bateria em telas OLED, com paletas dinâmicas que respeitam a identidade visual do Presco.

---

## 7. Troubleshooting e Resolução de Problemas

### P1: O aplicativo exibe "Falha ao analisar o pacote" ao tentar instalar
- **Causa:** O download do arquivo `.apk` foi interrompido antes de completar os 134 MB, ou o dispositivo possui versão do Android inferior à 7.0 (API 24).
- **Solução:** Apague o arquivo incompleto e faça o download novamente garantindo uma conexão estável. Verifique nas configurações do celular se a versão do Android é 7.0 ou superior.

### P2: O aplicativo diz "App não instalado pois já existe um pacote conflitante"
- **Causa:** Uma versão de desenvolvimento (Debug build gerada via Expo Go ou build local não assinado) já está instalada no aparelho com a mesma chave `com.presco.app`.
- **Solução:** Desinstale o aplicativo Presco existente no celular e, em seguida, instale novamente o APK de Release baixado.

### P3: O mapa nativo fica cinza ou fecha inesperadamente
- **Causa:** Serviços do Google Play desatualizados ou permissão de localização negada.
- **Solução:** Conceda a permissão de localização nas configurações do Android para o app Presco e certifique-se de que o Google Play Services está atualizado.

### P4: O scanner de código de barras não abre a câmera
- **Causa:** Permissão de câmera negada na primeira inicialização.
- **Solução:** Acesse *Configurações do Android → Aplicativos → Presco → Permissões → Câmera* e selecione *"Permitir durante o uso do app"*.

---

## 8. Manutenção e Próximos Passos

- Para novas versões ou correções de bugs, utilize o script automatizado `npx tsx scripts/upload_release.ts` para compilar e subir novas tags de release diretamente ao GitHub.
- Para compilar uma nova versão do APK localmente, utilize:
  ```bash
  npm run android:apk
  ```
  O script gerará o novo arquivo e o disponibilizará automaticamente em `dist/Presco.apk`.
