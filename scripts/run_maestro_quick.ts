import { execSync, spawn } from "child_process";
import fs from "fs";
import path from "path";

async function main() {
  console.log("🚀 Iniciando execução autônoma do Maestro...");

  // 1. Detectar dispositivo conectado via adb (priorizando emulator se houver múltiplos)
  let devicesOutput = "";
  try {
    devicesOutput = execSync("adb devices", { encoding: "utf8" });
  } catch (e) {
    console.error("❌ Falha ao executar adb:", e);
    process.exit(1);
  }

  const lines = devicesOutput
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.includes("\tdevice"));

  if (lines.length === 0) {
    console.error("❌ Nenhum emulador ou dispositivo Android conectado em estado 'device'.");
    process.exit(1);
  }

  // Priorizar o emulador (onde compilamos x86_64) ou pegar o especificado via argumento
  const argDevice = process.argv[2];
  let serial = "";
  if (argDevice) {
    serial = argDevice;
  } else {
    const emulatorDevice = lines.find((l) => l.startsWith("emulator-"));
    serial = (emulatorDevice || lines[0]).split("\t")[0];
  }

  console.log(`📱 Dispositivo selecionado: ${serial}`);

  // 2. Garantir permissões do sistema
  console.log("🔑 Concedendo permissões do sistema...");
  try {
    execSync(`adb -s ${serial} shell pm grant com.presco.app android.permission.ACCESS_FINE_LOCATION 2>/dev/null || true`);
    execSync(`adb -s ${serial} shell pm grant com.presco.app android.permission.ACCESS_COARSE_LOCATION 2>/dev/null || true`);
    execSync(`adb -s ${serial} reverse tcp:8081 tcp:8081 2>/dev/null || true`);
    execSync(`adb -s ${serial} reverse tcp:3333 tcp:3333 2>/dev/null || true`);
  } catch {}

  // 3. Resolver binário do Maestro
  let maestroBin = "maestro";
  const userMaestro = path.join(process.env.HOME || "", ".maestro/bin/maestro");
  if (fs.existsSync(userMaestro)) {
    maestroBin = userMaestro;
  }

  // 4. Executar o fluxo smoke_suite.yaml com --device <serial>
  const flowPath = path.join(process.cwd(), "tests/maestro/flows/smoke_suite.yaml");
  console.log(`🧪 Executando suíte rápida no dispositivo ${serial}: ${flowPath}`);

  const child = spawn(maestroBin, ["--device", serial, "test", flowPath], {
    stdio: "inherit",
    env: { ...process.env, PATH: `${process.env.PATH}:${path.join(process.env.HOME || "", ".maestro/bin")}` },
  });

  child.on("close", (code) => {
    if (code === 0) {
      console.log("\n✅ Maestro finalizou com sucesso todos os testes autônomos!");
      process.exit(0);
    } else {
      console.error(`\n❌ Maestro encerrou com código ${code}`);
      process.exit(code || 1);
    }
  });
}

main().catch((err) => {
  console.error("Erro inesperado:", err);
  process.exit(1);
});
