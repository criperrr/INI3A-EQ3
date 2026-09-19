/**
 * scripts/lib/jdk.ts
 * Resolução autônoma de um JDK compatível com o Android Gradle Plugin.
 *
 * Motivação (problemas reais enfrentados no deploy de 2026-09-09):
 *  - `java` na PATH pode ser um JRE (sem `javac`): o Gradle falha com
 *    "No Java compiler found, please ensure you are running Gradle with a JDK".
 *  - Um JDK novo demais (ex.: 26) quebra o AGP em `JdkImageTransform`/`jlink`
 *    e em "A restricted method in java.lang.System has been called".
 * Ambos passam despercebidos porque `java -version` responde normalmente.
 *
 * Este módulo procura um JDK na faixa suportada em todos os lugares onde ele
 * costuma estar (incluindo o JBR do Android Studio) e, se não achar, baixa o
 * Temurin para o diretório do usuário — sem sudo e sem alterar o sistema.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { detectOS, run, info, ok, warn, dim, type OS } from "./system.ts";

/** Faixa aceita pelo AGP usado por Expo 57 / RN 0.86. */
export const JDK_MIN = 17;
export const JDK_MAX = 21;
/** Versão baixada quando nenhum JDK local serve. */
export const JDK_PREFERRED = 17;

const HOME = os.homedir();

export function jdkInstallRoot(): string {
  return detectOS() === "windows"
    ? path.join(process.env.LOCALAPPDATA || path.join(HOME, "AppData", "Local"), "jdks")
    : path.join(HOME, ".local", "jdks");
}

function javacPath(javaHome: string): string {
  return path.join(javaHome, "bin", detectOS() === "windows" ? "javac.exe" : "javac");
}

/** Major version de um JAVA_HOME, ou null se não houver compilador utilizável. */
export function jdkMajor(javaHome: string): number | null {
  const javac = javacPath(javaHome);
  if (!fs.existsSync(javac)) return null; // JRE puro: é exatamente este o caso que quebra o Gradle
  const res = run(javac, ["-version"]);
  const out = `${res.stdout} ${res.stderr}`;
  const m = out.match(/javac\s+(\d+)/);
  return m ? Number(m[1]) : null;
}

export function jdkIsSupported(javaHome: string): boolean {
  const major = jdkMajor(javaHome);
  return major !== null && major >= JDK_MIN && major <= JDK_MAX;
}

/** Diretórios onde um JDK costuma estar, por sistema operacional. */
function candidateHomes(osId: OS): string[] {
  const out: string[] = [];
  const push = (p?: string | null) => {
    if (p && fs.existsSync(p) && !out.includes(p)) out.push(p);
  };
  const expandDir = (dir: string, suffix = "") => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir)) {
      push(path.join(dir, entry, suffix));
    }
  };

  push(process.env.JAVA_HOME);
  expandDir(jdkInstallRoot());

  if (osId === "linux") {
    expandDir("/usr/lib/jvm");
    expandDir("/usr/lib64/jvm");
    // JBR embutido no Android Studio (já é um JDK completo)
    push("/opt/android-studio/jbr");
    push(path.join(HOME, "Android", "Studio", "jbr"));
    push(path.join(HOME, ".local", "share", "JetBrains", "Toolbox", "apps", "android-studio", "jbr"));
  } else if (osId === "macos") {
    expandDir("/Library/Java/JavaVirtualMachines", "Contents/Home");
    expandDir(path.join(HOME, "Library/Java/JavaVirtualMachines"), "Contents/Home");
    push("/opt/homebrew/opt/openjdk@17");
    push("/usr/local/opt/openjdk@17");
    push("/Applications/Android Studio.app/Contents/jbr/Contents/Home");
  } else {
    expandDir("C:\\Program Files\\Eclipse Adoptium");
    expandDir("C:\\Program Files\\Java");
    expandDir("C:\\Program Files\\Microsoft\\jdk");
    push("C:\\Program Files\\Android\\Android Studio\\jbr");
  }
  return out;
}

/** Procura um JDK já instalado dentro da faixa suportada. Prefere o mais novo. */
export function findSupportedJdk(): string | null {
  const found: Array<{ home: string; major: number }> = [];
  for (const home of candidateHomes(detectOS())) {
    const major = jdkMajor(home);
    if (major !== null && major >= JDK_MIN && major <= JDK_MAX) found.push({ home, major });
  }
  if (!found.length) return null;
  found.sort((a, b) => b.major - a.major);
  return found[0]!.home;
}

/** Diagnóstico legível do porquê os JDKs presentes não servem. */
export function describeRejectedJdks(): string[] {
  const notes: string[] = [];
  for (const home of candidateHomes(detectOS())) {
    const javac = fs.existsSync(javacPath(home));
    if (!javac) {
      notes.push(`${home} — sem 'javac' (é um JRE, não um JDK)`);
      continue;
    }
    const major = jdkMajor(home);
    if (major !== null && (major < JDK_MIN || major > JDK_MAX)) {
      notes.push(`${home} — Java ${major}, fora da faixa suportada ${JDK_MIN}–${JDK_MAX}`);
    }
  }
  return notes;
}

function adoptiumTarget(osId: OS): { os: string; arch: string; ext: string } {
  const arch = process.arch === "arm64" ? "aarch64" : process.arch === "x64" ? "x64" : process.arch;
  if (osId === "macos") return { os: "mac", arch, ext: "tar.gz" };
  if (osId === "windows") return { os: "windows", arch, ext: "zip" };
  return { os: "linux", arch, ext: "tar.gz" };
}

/**
 * Baixa o Temurin para o diretório do usuário (sem sudo) e devolve o JAVA_HOME.
 * Idempotente: se já houver uma instalação válida, reaproveita.
 */
export async function installTemurin(major = JDK_PREFERRED): Promise<string | null> {
  const osId = detectOS();
  const root = jdkInstallRoot();
  const dest = path.join(root, `temurin${major}`);
  const macHome = path.join(dest, "Contents", "Home");

  for (const candidate of [dest, macHome]) {
    if (jdkIsSupported(candidate)) {
      ok(`JDK ${major} já presente em ${dim(candidate)}`);
      return candidate;
    }
  }

  const t = adoptiumTarget(osId);
  const api =
    `https://api.adoptium.net/v3/assets/latest/${major}/hotspot` +
    `?architecture=${t.arch}&image_type=jdk&os=${t.os}&vendor=eclipse`;

  info(`Baixando Temurin JDK ${major} (${t.os}/${t.arch}) para ${dim(root)}…`);

  let link: string;
  try {
    const res = await fetch(api);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const assets = (await res.json()) as Array<{ binary?: { package?: { link?: string } } }>;
    const found = assets?.[0]?.binary?.package?.link;
    if (!found) throw new Error("resposta da API sem link de download");
    link = found;
  } catch (e) {
    warn(`Não foi possível consultar a API do Adoptium: ${e instanceof Error ? e.message : e}`);
    return null;
  }

  fs.mkdirSync(root, { recursive: true });
  const archive = path.join(root, `temurin${major}.${t.ext}`);
  const staging = path.join(root, `.staging-${major}`);
  fs.rmSync(staging, { recursive: true, force: true });
  fs.mkdirSync(staging, { recursive: true });

  try {
    const res = await fetch(link);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    fs.writeFileSync(archive, Buffer.from(await res.arrayBuffer()));

    if (t.ext === "zip") {
      const r = run("powershell", [
        "-NoProfile", "-Command",
        `Expand-Archive -LiteralPath '${archive}' -DestinationPath '${staging}' -Force`,
      ]);
      if (r.status !== 0) throw new Error(r.stderr || "falha ao extrair o zip");
    } else {
      const r = run("tar", ["xzf", archive, "-C", staging]);
      if (r.status !== 0) throw new Error(r.stderr || "falha ao extrair o tar.gz");
    }

    const inner = fs.readdirSync(staging).map((d) => path.join(staging, d)).find((d) => fs.statSync(d).isDirectory());
    if (!inner) throw new Error("arquivo extraído sem diretório raiz esperado");

    fs.rmSync(dest, { recursive: true, force: true });
    fs.renameSync(inner, dest);

    const home = jdkIsSupported(macHome) ? macHome : dest;
    if (!jdkIsSupported(home)) throw new Error("instalação concluída mas 'javac' não respondeu como esperado");

    ok(`JDK ${major} instalado em ${dim(home)}`);
    return home;
  } catch (e) {
    warn(`Falha ao instalar o Temurin: ${e instanceof Error ? e.message : e}`);
    return null;
  } finally {
    fs.rmSync(archive, { force: true });
    fs.rmSync(staging, { recursive: true, force: true });
  }
}

/**
 * Garante um JDK utilizável e devolve o JAVA_HOME, instalando se necessário.
 * `autoInstall=false` apenas diagnostica (usado pelo bootstrap em modo consulta).
 */
export async function ensureJdk(autoInstall = true): Promise<string | null> {
  const existing = findSupportedJdk();
  if (existing) {
    ok(`JDK ${jdkMajor(existing)} · ${dim(existing)}`);
    return existing;
  }

  warn(`Nenhum JDK entre ${JDK_MIN} e ${JDK_MAX} encontrado (exigido pelo Android Gradle Plugin).`);
  for (const note of describeRejectedJdks()) info(dim(`  ${note}`));

  if (!autoInstall) return null;
  return installTemurin(JDK_PREFERRED);
}

/** Ambiente com JAVA_HOME e PATH ajustados para o JDK escolhido. */
export function jdkEnv(javaHome: string, base: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  const sep = detectOS() === "windows" ? ";" : ":";
  return {
    ...base,
    JAVA_HOME: javaHome,
    PATH: `${path.join(javaHome, "bin")}${sep}${base.PATH ?? ""}`,
  };
}

// ── CLI ──────────────────────────────────────────────────────────────────────
// Permite que `scripts/requirements.ts` provisione o JDK sem duplicar lógica:
//   npx tsx scripts/lib/jdk.ts --install
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const wantsInstall = process.argv.includes("--install");
  ensureJdk(wantsInstall).then((home) => {
    if (home) {
      console.log(home);
      process.exit(0);
    }
    process.exit(1);
  });
}
