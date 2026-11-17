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

interface ReleaseMetadata {
  repoOwner: string;
  repoName: string;
  tagName: string;
  version: string;
  versionCode: number | string;
  releaseTitle: string;
  apkFilename: string;
  localApkPath: string;
}

function readJsonSafe(filePath: string): any {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return {};
  }
}

function resolveArgValue(flag: string): string | undefined {
  const prefix = `--${flag}=`;
  const found = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length).trim() : undefined;
}

function resolveReleaseMetadata(): ReleaseMetadata {
  const rootPkg = readJsonSafe(path.resolve(process.cwd(), "package.json"));
  const appJson = readJsonSafe(path.resolve(process.cwd(), "src/frontend/app.json"));

  const pkgVersion = String(rootPkg.version || appJson?.expo?.version || "0.0.0").replace(/^v/, "");
  const rawTag = resolveArgValue("tag") || process.env.RELEASE_TAG || `v${pkgVersion}`;
  const tagName = rawTag.startsWith("v") ? rawTag : `v${rawTag}`;
  const version = tagName.replace(/^v/, "");
  const versionCode = appJson?.expo?.android?.versionCode ?? "N/A";

  const repoOwner = process.env.GITHUB_REPOSITORY_OWNER || "criperrr";
  const repoName = process.env.GITHUB_REPOSITORY?.split("/")[1] || "INI3A-EQ3";

  const apkOverride = resolveArgValue("apk") || process.env.APK_PATH;
  const defaultApk = path.resolve(process.cwd(), "dist/Presco.apk");
  const releaseApk = path.resolve(
    process.cwd(),
    "src/frontend/android/app/build/outputs/apk/release/app-release.apk"
  );
  const localApkPath = apkOverride
    ? path.resolve(process.cwd(), apkOverride)
    : fs.existsSync(defaultApk)
      ? defaultApk
      : releaseApk;

  return {
    repoOwner,
    repoName,
    tagName,
    version,
    versionCode,
    releaseTitle: `Presco ${tagName} - Versão Oficial Android (APK)`,
    apkFilename: `Presco-${tagName}.apk`,
    localApkPath,
  };
}

function getGitHubToken(): string {
  const envToken = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (envToken) {
    return envToken.trim();
  }

  try {
    const remoteUrl = execSync("git remote get-url origin", { encoding: "utf8" }).trim();
    const match = remoteUrl.match(/https:\/\/([^:@]+)@github\.com/);
    if (match && match[1]) {
      return match[1];
    }
  } catch {
    // ignore
  }

  throw new Error("Token do GitHub não encontrado em GITHUB_TOKEN/GH_TOKEN nem na URL do git remote origin.");
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

function buildReleaseBody(meta: ReleaseMetadata, sizeFormatted: string, sha256: string): string {
  return `
# Presco ${meta.tagName} — Versão Oficial para Android (APK)

Release oficial do **Presco**! O Presco é um aplicativo móvel colaborativo desenvolvido para simplificar o seu dia a dia no supermercado: compare preços em tempo real, encontre os estabelecimentos mais próximos de você e economize com dados gerados e auditados pela própria comunidade.

---

## Principais Recursos e Destaques

- **Scanner de Código de Barras Instantâneo:** Mira inteligente com linha laser e detecção de códigos EAN-13, EAN-8 e UPC via câmera.
- **Mapa Interativo com HERE Location Services:** Descoberta dinâmica de supermercados, atacadistas e comércios locais com filtros de distância, horário e categorias.
- **Comparação e Histórico de Preços:** Gráficos interativos de evolução de preço, estatísticas de mín/méd/máx e identificação automática de promoções reais da sua região.
- **Detecção Antifraude e Moderação Admin:** Sistema estatístico de desvio padrão adaptativo com quórum comunitário e painel de moderação para garantir a veracidade dos valores.
- **Gamificação & Recompensas Comunitárias:** Ganhe XP e pontos ao cadastrar produtos (+25 XP), reportar preços (+15 XP) e votar na confiabilidade das ofertas (+5 XP).
- **Customização de Perfil Dinâmica:** Banners exclusivos, molduras animadas de avatar, distintivos de nível e títulos desbloqueáveis na loja integrada.
- **Internacionalização Completa (7 Idiomas):** Suporte a Português (pt-BR), Inglês (en-US), Espanhol (es-ES), Alemão (de-DE), Russo (ru-RU), Chinês (zh-CN) e Japonês (ja-JP).
- **Design System Monet & Dynamic Theme:** Modos Claro, Escuro e AMOLED verdadeiro, com suporte opcional a extração de cores dinâmicas do sistema Android.

---

## Como Baixar e Instalar no Smartphone Android

1. Baixe o arquivo **[\`${meta.apkFilename}\`](https://github.com/${meta.repoOwner}/${meta.repoName}/releases/download/${meta.tagName}/${meta.apkFilename})** na seção de **Assets** abaixo.
2. Abra o arquivo \`.apk\` baixado na barra de notificações ou no seu gerenciador de arquivos.
3. Se for a primeira vez instalando fora da Google Play Store, autorize **"Instalar apps de fontes desconhecidas"** para o seu navegador ou gerenciador de arquivos.
4. Toque em **Instalar** e aguarde o término do processo.
5. Abra o app **Presco** e conceda as permissões solicitadas:
   - **Câmera:** Necessária para escanear os códigos de barras das embalagens.
   - **Localização:** Necessária para encontrar os mercados e preços da sua vizinhança.

---

## Especificações Técnicas e Checksums

| Parâmetro | Detalhes |
|---|---|
| **Versão** | ${meta.version} (Build ${meta.versionCode}) |
| **Nome do Pacote** | \`com.presco.app\` |
| **Sistema Mínimo** | Android 7.0 (Nougat - API 24) |
| **Sistema Recomendado** | Android 10+ (API 29+) |
| **Engine JS / Runtime** | Hermes com React Native 0.86.3 & New Architecture |
| **Frameworks** | Expo SDK 57, Expo Router 57, Reanimated 4, Drizzle ORM, Express 5 |
| **Tamanho do Arquivo** | ${sizeFormatted} |
| **Checksum SHA-256** | \`${sha256}\` |

---

## Conectividade & Backend

O APK comunica-se via HTTPS com a infraestrutura oficial de backend hospedada no servidor CTI UNESP:
- **API Endpoint:** \`https://eq.projetoscti.com.br/26-presco\`
- Para desenvolvedores e testes locais, o app também suporta conexão via rede Wi-Fi local (LAN) e túneis de desenvolvimento configurados via scripts do repositório.

---

## Equipe e Créditos

Desenvolvido pela **Equipe 26 (INI3A-EQ3)** no Colégio Técnico Industrial "Prof. Isaac Portal Roldán" - UNESP Bauru.
`.trim();
}

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

  const cleanUrl = uploadUrlTemplate.replace(/\{\?name,label\}$/, "") + `?name=${encodeURIComponent(assetName)}`;
  const url = new URL(cleanUrl);

  console.log(`\n${colors.cyan}[INFO] Iniciando upload de ${assetName} (${formatBytes(totalBytes)})...${colors.reset}`);

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

    const fileStream = fs.createReadStream(filePath, { highWaterMark: 1024 * 1024 });
    let uploadedBytes = 0;
    let lastPercent = -1;

    fileStream.on("data", (chunk: Buffer) => {
      uploadedBytes += chunk.length;
      const percent = Math.floor((uploadedBytes / totalBytes) * 100);
      if (percent !== lastPercent && percent % 10 === 0) {
        lastPercent = percent;
        process.stdout.write(
          `\r${colors.yellow}[INFO] Progresso do upload: ${percent}% (${(uploadedBytes / 1024 / 1024).toFixed(1)} MB / ${(totalBytes / 1024 / 1024).toFixed(1)} MB)${colors.reset}`
        );
      }
    });

    fileStream.on("end", () => {
      process.stdout.write(`\r${colors.green}[OK] Upload concluído! Aguardando confirmação do GitHub...${colors.reset}\n`);
    });

    fileStream.pipe(req);
  });
}

async function main() {
  const meta = resolveReleaseMetadata();
  console.log(`${colors.bold}${colors.cyan}=== Publicador de Releases GitHub - Presco APK ===${colors.reset}\n`);

  if (!fs.existsSync(meta.localApkPath)) {
    console.error(`${colors.red}[ERRO] Arquivo do APK não encontrado em ${meta.localApkPath}${colors.reset}`);
    process.exit(1);
  }

  const token = getGitHubToken();
  const sha256 = calculateSha256(meta.localApkPath);
  const stat = fs.statSync(meta.localApkPath);
  const sizeFormatted = formatBytes(stat.size);
  const releaseBody = buildReleaseBody(meta, sizeFormatted, sha256);

  console.log(`${colors.green}[OK] Token do GitHub autenticado com sucesso!${colors.reset}`);
  console.log(`- Repositório: ${colors.bold}${meta.repoOwner}/${meta.repoName}${colors.reset}`);
  console.log(`- APK Local: ${meta.localApkPath}`);
  console.log(`- Tamanho: ${sizeFormatted}`);
  console.log(`- SHA-256: ${sha256}`);
  console.log(`- Release Tag: ${meta.tagName} (Build ${meta.versionCode})`);

  let release: any = null;
  try {
    console.log(`\n[INFO] Consultando release ${meta.tagName} no GitHub...`);
    release = await requestGitHub(
      `https://api.github.com/repos/${meta.repoOwner}/${meta.repoName}/releases/tags/${meta.tagName}`,
      "GET",
      token
    );
    console.log(`${colors.green}[OK] Release existente encontrada: ID ${release.id}${colors.reset}`);

    release = await requestGitHub(
      `https://api.github.com/repos/${meta.repoOwner}/${meta.repoName}/releases/${release.id}`,
      "PATCH",
      token,
      {
        name: meta.releaseTitle,
        body: releaseBody,
        draft: false,
        prerelease: false,
      }
    );
    console.log(`${colors.green}[OK] Metadados e notas da release atualizados.${colors.reset}`);
  } catch (err: any) {
    if (err.message.includes("404")) {
      console.log(`[INFO] Release ${meta.tagName} não existe ainda. Criando nova release...`);
      release = await requestGitHub(
        `https://api.github.com/repos/${meta.repoOwner}/${meta.repoName}/releases`,
        "POST",
        token,
        {
          tag_name: meta.tagName,
          name: meta.releaseTitle,
          body: releaseBody,
          draft: false,
          prerelease: false,
        }
      );
      console.log(`${colors.green}[OK] Release criada com sucesso! ID: ${release.id}${colors.reset}`);
    } else {
      throw err;
    }
  }

  if (release.assets && release.assets.length > 0) {
    for (const asset of release.assets) {
      if (asset.name === meta.apkFilename || asset.name === "Presco.apk") {
        console.log(`${colors.yellow}[INFO] Removendo asset antigo '${asset.name}' (ID ${asset.id}) para substituição limpa...${colors.reset}`);
        await requestGitHub(
          `https://api.github.com/repos/${meta.repoOwner}/${meta.repoName}/releases/assets/${asset.id}`,
          "DELETE",
          token
        );
        console.log(`${colors.green}[OK] Asset antigo removido.${colors.reset}`);
      }
    }
  }

  const uploadResult = await uploadAssetStream(release.upload_url, meta.apkFilename, meta.localApkPath, token);
  console.log(`${colors.bold}${colors.green}[OK] APK publicado com sucesso no GitHub Releases!${colors.reset}`);
  console.log(`- Download URL: ${colors.cyan}${uploadResult.browser_download_url}${colors.reset}`);
  console.log(`- Release URL: ${colors.cyan}${release.html_url}${colors.reset}`);

  const uploadPlainResult = await uploadAssetStream(release.upload_url, "Presco.apk", meta.localApkPath, token);
  console.log(`${colors.bold}${colors.green}[OK] Asset adicional 'Presco.apk' publicado com sucesso!${colors.reset}`);
  console.log(`- Download URL: ${colors.cyan}${uploadPlainResult.browser_download_url}${colors.reset}`);

  console.log(`\n${colors.bold}${colors.green}[OK] Concluído com sucesso! O APK já está disponível publicamente para download.${colors.reset}\n`);
}

main().catch((err) => {
  console.error(`\n${colors.red}${colors.bold}[ERRO] Erro durante o processo:${colors.reset}`, err);
  process.exit(1);
});
