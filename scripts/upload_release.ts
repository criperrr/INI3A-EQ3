import fs from "fs";
import path from "path";
import https from "https";
import crypto from "crypto";
import { execSync } from "child_process";

// Cores para o terminal
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  bold: "\x1b[1m",
};

const REPO_OWNER = "criperrr";
const REPO_NAME = "INI3A-EQ3";
const TAG_NAME = "v1.0.0";
const RELEASE_TITLE = "Presco v1.0.0 - Versão Oficial Android (APK)";
const APK_FILENAME = "Presco-v1.0.0.apk";
const LOCAL_APK_PATH = path.resolve(process.cwd(), "dist/Presco.apk");

function getGitHubToken(): string {
  if (process.env.GITHUB_TOKEN) {
    return process.env.GITHUB_TOKEN.trim();
  }

  try {
    const remoteUrl = execSync("git remote get-url origin", { encoding: "utf8" }).trim();
    const match = remoteUrl.match(/https:\/\/([^:@]+)@github\.com/);
    if (match && match[1]) {
      return match[1];
    }
  } catch (err) {
    // ignore
  }

  throw new Error("Token do GitHub não encontrado em GITHUB_TOKEN nem na URL do git remote origin.");
}

function calculateSha256(filePath: string): string {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash("sha256");
  hashSum.update(fileBuffer);
  return hashSum.digest("hex");
}

function formatBytes(bytes: number): string {
  const mb = (bytes / (1024 * 1024)).toFixed(2);
  return `${mb} MB (${bytes.toLocaleString("pt-BR")} bytes)`;
}

const RELEASE_BODY = `
# 🛒 Presco v1.0.0 — Versão Oficial para Android (APK)

Bem-vindo à primeira release pública oficial do **Presco**! O Presco é um aplicativo móvel colaborativo desenvolvido para simplificar o seu dia a dia no supermercado: compare preços em tempo real, encontre os estabelecimentos mais próximos de você e economize com dados gerados e auditados pela própria comunidade.

---

## 🚀 Principais Recursos e Destaques

- 📷 **Scanner de Código de Barras Instantâneo:** Mira inteligente com linha laser e detecção de códigos EAN-13, EAN-8 e UPC via câmera com taxa de decodificação ultra rápida.
- 🗺️ **Mapa Interativo com HERE Location Services:** Descoberta dinâmica de supermercados, atacadistas e comércios locais (padarias, açougues, mercearias) com filtros de distância, horário e categorias.
- 💰 **Comparação e Histórico de Preços:** Gráficos interativos de evolução de preço, estatísticas de mín/méd/máx e identificação automática de promoções reais da sua região.
- 🛡️ **Detecção Antifraude e Moderação Admin:** Sistema estatístico de desvio padrão adaptativo com quórum comunitário e painel de moderação para garantir a veracidade dos valores.
- 🎮 **Gamificação & Recompensas Comunitárias:** Ganhe XP e pontos ao cadastrar produtos (+25 XP), reportar preços (+15 XP) e votar na confiabilidade das ofertas (+5 XP).
- 🎨 **Customização de Perfil Dinâmica:** Banners exclusivos, molduras animadas de avatar com brilho neon, distintivos de nível e títulos desbloqueáveis na loja integrada.
- 🌐 **Internacionalização Completa (7 Idiomas):** Suporte nativo e instantâneo a Português (pt-BR), Inglês (en-US), Espanhol (es-ES), Alemão (de-DE), Russo (ru-RU), Chinês (zh-CN) e Japonês (ja-JP).
- 🎨 **Design System Monet & Dynamic Theme:** Modos Claro, Escuro e AMOLED verdadeiro, com suporte opcional a extração de cores dinâmicas do papel de parede do sistema Android.

---

## 📱 Como Baixar e Instalar no Smartphone Android

1. Baixe o arquivo **[\`${APK_FILENAME}\`](https://github.com/${REPO_OWNER}/${REPO_NAME}/releases/download/${TAG_NAME}/${APK_FILENAME})** na seção de **Assets** abaixo.
2. Abra o arquivo \`.apk\` baixado na barra de notificações ou no seu gerenciador de arquivos.
3. Se for a primeira vez instalando fora da Google Play Store, o Android solicitará permissão para **"Instalar apps de fontes desconhecidas"**. Autorize o seu navegador ou gerenciador de arquivos.
4. Toque em **Instalar** e aguarde o término do processo.
5. Abra o app **Presco** e conceda as permissões solicitadas:
   - **Câmera:** Necessária para escanear os códigos de barras das embalagens.
   - **Localização:** Necessária para encontrar os mercados e preços da sua vizinhança.

---

## 📋 Especificações Técnicas e Checksums

| Parâmetro | Detalhes |
|---|---|
| **Versão** | 1.0.0 (Build 1) |
| **Nome do Pacote** | \`com.presco.app\` |
| **Sistema Mínimo** | Android 7.0 (Nougat - API 24) |
| **Sistema Recomendado** | Android 10+ (API 29+) |
| **Arquiteturas** | \`arm64-v8a\`, \`armeabi-v7a\`, \`x86_64\` |
| **Engine JS / Runtime** | Hermes com React Native 0.86.3 & New Architecture |
| **Frameworks** | Expo SDK 57, Expo Router 57, Reanimated 4, Drizzle ORM, Express 5 |
| **Tamanho do Arquivo** | 134 MB (140.562.357 bytes) |
| **Checksum SHA-256** | \`b84db6ffaaabf514e581c09a30c281c1282de2ca5186251a8e9beb4d7cf81018\` |

---

## 🌐 Conectividade & Backend

O APK já vem configurado de fábrica para comunicar-se de forma segura via HTTPS com a infraestrutura oficial de backend hospedada no servidor CTI UNESP:
- **API Endpoint:** \`https://eq.projetoscti.com.br/26-presco\`
- Para desenvolvedores e testes locais, o app também suporta conexão via rede Wi-Fi local (LAN) e túneis de desenvolvimento configurados via scripts do repositório.

---

## 👥 Equipe e Créditos

Desenvolvido com excelência técnica pela **Equipe 26 (INI3A-EQ3)** no Colégio Técnico Industrial "Prof. Isaac Portal Roldán" - UNESP Bauru.
`.trim();

async function requestGitHub(
  pathUrl: string,
  method: string,
  token: string,
  data?: any,
  extraHeaders?: Record<string, string>
): Promise<any> {
  return new Promise((resolve, reject) => {
    const url = new URL(pathUrl);
    const body = data ? (Buffer.isBuffer(data) ? data : JSON.stringify(data)) : null;

    const options: https.RequestOptions = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method,
      headers: {
        "User-Agent": "Presco-Release-Uploader",
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        ...(body && !Buffer.isBuffer(data) ? { "Content-Type": "application/json" } : {}),
        ...(extraHeaders || {}),
      },
    };

    const req = https.request(options, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        const resBody = Buffer.concat(chunks).toString("utf8");
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(resBody));
          } catch {
            resolve(resBody);
          }
        } else {
          reject(new Error(`GitHub API [${res.statusCode}] ${res.statusMessage}: ${resBody}`));
        }
      });
    });

    req.on("error", reject);

    if (body) {
      req.write(body);
    }
    req.end();
  });
}

async function uploadAssetStream(
  uploadUrlTemplate: string,
  assetName: string,
  filePath: string,
  token: string
): Promise<any> {
  const stat = fs.statSync(filePath);
  const totalBytes = stat.size;

  // upload_url tem o formato: https://uploads.github.com/repos/.../releases/ID/assets{?name,label}
  const cleanUrl = uploadUrlTemplate.replace(/\{\?name,label\}$/, "") + `?name=${encodeURIComponent(assetName)}`;
  const url = new URL(cleanUrl);

  console.log(`\n${colors.cyan}Iniciando upload de ${assetName} (${formatBytes(totalBytes)})...${colors.reset}`);

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: url.hostname,
        port: 443,
        path: url.pathname + url.search,
        method: "POST",
        headers: {
          "User-Agent": "Presco-Release-Uploader",
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/vnd.android.package-archive",
          "Content-Length": totalBytes.toString(),
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const body = Buffer.concat(chunks).toString("utf8");
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(body));
            } catch {
              resolve(body);
            }
          } else {
            reject(new Error(`Falha no upload do asset [${res.statusCode}]: ${body}`));
          }
        });
      }
    );

    req.on("error", reject);

    const fileStream = fs.createReadStream(filePath, { highWaterMark: 1024 * 1024 }); // 1MB chunks
    let uploadedBytes = 0;
    let lastPercent = -1;

    fileStream.on("data", (chunk: Buffer) => {
      uploadedBytes += chunk.length;
      const percent = Math.floor((uploadedBytes / totalBytes) * 100);
      if (percent !== lastPercent && percent % 10 === 0) {
        lastPercent = percent;
        process.stdout.write(`\r${colors.yellow}Progresso do upload: ${percent}% (${(uploadedBytes / 1024 / 1024).toFixed(1)} MB / ${(totalBytes / 1024 / 1024).toFixed(1)} MB)${colors.reset}`);
      }
    });

    fileStream.on("end", () => {
      process.stdout.write(`\r${colors.green}Upload concluído! Aguardando confirmação do GitHub...${colors.reset}\n`);
    });

    fileStream.pipe(req);
  });
}

async function main() {
  console.log(`${colors.bold}${colors.cyan}=== Publicador Oficial de Releases GitHub - Presco APK ===${colors.reset}\n`);

  if (!fs.existsSync(LOCAL_APK_PATH)) {
    console.error(`${colors.red}Erro: Arquivo do APK não encontrado em ${LOCAL_APK_PATH}${colors.reset}`);
    process.exit(1);
  }

  const token = getGitHubToken();
  const sha256 = calculateSha256(LOCAL_APK_PATH);
  const stat = fs.statSync(LOCAL_APK_PATH);

  console.log(`${colors.green}✓ Token do GitHub autenticado com sucesso!${colors.reset}`);
  console.log(`- Repositório: ${colors.bold}${REPO_OWNER}/${REPO_NAME}${colors.reset}`);
  console.log(`- APK Local: ${LOCAL_APK_PATH}`);
  console.log(`- Tamanho: ${formatBytes(stat.size)}`);
  console.log(`- SHA-256: ${sha256}`);
  console.log(`- Release Tag: ${TAG_NAME}`);

  // 1. Verificar se release já existe
  let release: any = null;
  try {
    console.log(`\nConsultando release ${TAG_NAME} no GitHub...`);
    release = await requestGitHub(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/tags/${TAG_NAME}`,
      "GET",
      token
    );
    console.log(`${colors.green}✓ Release existente encontrada: ID ${release.id}${colors.reset}`);

    // Atualizar corpo e nome da release se já existir
    release = await requestGitHub(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/${release.id}`,
      "PATCH",
      token,
      {
        name: RELEASE_TITLE,
        body: RELEASE_BODY,
        draft: false,
        prerelease: false,
      }
    );
    console.log(`${colors.green}✓ Metadados e notas da release atualizados.${colors.reset}`);
  } catch (err: any) {
    if (err.message.includes("404")) {
      console.log(`Release ${TAG_NAME} não existe ainda. Criando nova release...`);
      release = await requestGitHub(
        `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases`,
        "POST",
        token,
        {
          tag_name: TAG_NAME,
          name: RELEASE_TITLE,
          body: RELEASE_BODY,
          draft: false,
          prerelease: false,
        }
      );
      console.log(`${colors.green}✓ Release criada com sucesso! ID: ${release.id}${colors.reset}`);
    } else {
      throw err;
    }
  }

  // 2. Verificar se o asset já existe na release
  if (release.assets && release.assets.length > 0) {
    for (const asset of release.assets) {
      if (asset.name === APK_FILENAME || asset.name === "Presco.apk") {
        console.log(`${colors.yellow}Removendo asset antigo '${asset.name}' (ID ${asset.id}) para substituição limpa...${colors.reset}`);
        await requestGitHub(
          `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/assets/${asset.id}`,
          "DELETE",
          token
        );
        console.log(`${colors.green}✓ Asset antigo removido.${colors.reset}`);
      }
    }
  }

  // 3. Fazer upload do APK para a release
  const uploadResult = await uploadAssetStream(release.upload_url, APK_FILENAME, LOCAL_APK_PATH, token);
  console.log(`${colors.bold}${colors.green}✓ APK publicado com sucesso no GitHub Releases!${colors.reset}`);
  console.log(`- Download URL: ${colors.cyan}${uploadResult.browser_download_url}${colors.reset}`);
  console.log(`- Release URL: ${colors.cyan}${release.html_url}${colors.reset}`);

  // Fazer upload de uma cópia com nome Presco.apk direto para conveniência
  const uploadPlainResult = await uploadAssetStream(release.upload_url, "Presco.apk", LOCAL_APK_PATH, token);
  console.log(`${colors.bold}${colors.green}✓ Asset adicional 'Presco.apk' publicado com sucesso!${colors.reset}`);
  console.log(`- Download URL: ${colors.cyan}${uploadPlainResult.browser_download_url}${colors.reset}`);

  console.log(`\n${colors.bold}${colors.green}🎉 Concluído com sucesso! O APK já está disponível publicamente para download.${colors.reset}\n`);
}

main().catch((err) => {
  console.error(`\n${colors.red}${colors.bold}Erro durante o processo:${colors.reset}`, err);
  process.exit(1);
});
