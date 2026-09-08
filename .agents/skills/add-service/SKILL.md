---
name: add-service
description: Register a new required CLI tool or backing service (database, cache, queue, object store) so the setup/bootstrap flow detects it, offers to install it cross-platform, and — for services — resolves native-first with a Docker fallback.
when_to_use: "When adding a new mandatory dependency to Presco: a binary the project needs on PATH, or a backing service the backend connects to (Mongo, RabbitMQ, MinIO, Elasticsearch, MailHog...). NOT for npm packages (use npm install) or optional dev tools."
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
version: 1.0.0
effort: low
---

# add-service — Extend the bootstrap manifest

> One manifest drives `setup.sh` / `setup.ps1` → `scripts/bootstrap.ts`.
> Adding a requirement = one entry in `scripts/requirements.ts`. No script edits.

## How the flow works

`setup.sh` / `setup.ps1` only guarantee **Node + npm + git**, then hand off to
`npx tsx scripts/bootstrap.ts`, which:

1. detects the OS + package manager (`apt`/`dnf`/`pacman`/`zypper`/`brew`/`winget`/`choco`)
2. for each **tool** in `TOOLS`: if missing → prompt `[S/n]` → install
3. for each **service** in `SERVICES`: resolve a strategy
   - **native usable?** (port open + project DB/creds + required extensions) → use it
   - else prompt: **Docker** / **install native now** / **skip**
   - `native` → install package, start the OS service, provision (role/db/extensions)
   - `docker` → `docker compose up -d <service>`, wait healthy
4. writes `src/backend/.env` with the resolved connection URLs
5. runs migrations + seed, prints a network diagnostic
6. saves what it found to `.dev/services.json` (gitignored)

`--yes` skips every prompt (CI). `--force-docker` / `--force-native` pin the strategy.

## Add a TOOL (a required binary)

Append to `TOOLS` in `scripts/requirements.ts`:

```ts
{
  id: "ffmpeg",
  label: "FFmpeg",
  bin: "ffmpeg",                 // must exist on PATH once installed
  versionArgs: ["-version"],     // optional
  minMajor: 6,                   // optional
  optional: false,               // true = warn & continue if missing
  packages: {
    apt: ["ffmpeg"], dnf: ["ffmpeg"], pacman: ["ffmpeg"],
    zypper: ["ffmpeg"], brew: ["ffmpeg"],
    winget: ["Gyan.FFmpeg"], choco: ["ffmpeg"],
  },
  // fallback when there's no package for the OS:
  script: { linux: "curl -fsSL https://example.com/install.sh | sh" },
  docs: "https://ffmpeg.org/download.html",
}
```

`bootstrap.ts` needs no changes — it iterates `TOOLS`.

## Add a SERVICE (something the backend connects to)

### 1. Manifest entry (`SERVICES` in `scripts/requirements.ts`)

```ts
{
  id: "mongo",
  label: "MongoDB",
  kind: "postgres" | "redis",    // reuse the closest built-in flavor, OR see step 3
  envVar: "MONGO_URL",           // backend .env key it fills
  nativePort: 27017,
  dockerPort: 27018,             // pick a non-clashing published port
  dockerService: "mongo",        // must match docker-compose.yml service name
  bin: "mongod",                 // indicates a native install
  url: {
    native: "mongodb://{host}:27017/presco",
    docker: "mongodb://{host}:27018/presco",
  },
  packages: {
    apt: ["mongodb-org"], brew: ["mongodb-community"],
    // ...per manager; omit a manager to disable native install there
  },
  note: "Mensagem exibida quando não dá para instalar nativo.",
}
```

### 2. Add the service to `docker-compose.yml`

```yaml
  mongo:
    image: mongo:7
    container_name: presco_mongo
    restart: unless-stopped
    ports:
      - "27018:27017"           # host:container — host port = dockerPort above
    volumes:
      - mongo_data:/data/db
    healthcheck:
      test: ["CMD", "mongosh", "--quiet", "--eval", "db.runCommand('ping').ok"]
      interval: 5s
      timeout: 3s
      retries: 10
```

...and register `mongo_data:` under top-level `volumes:`.

### 3. If it needs a custom "usable / provision" check

The built-in `kind` values only cover Postgres (port + project DB + extensions +
`sudo -u postgres` provisioning) and Redis (port + `PING` without auth). For a
service that needs its own validation (auth, a database, a bucket, a schema),
extend `nativeUsable()` / `setupNative()` in `scripts/bootstrap.ts`:

- `nativeUsable(svc)` → `{ usable, reason }`: is the native instance ready for the project?
- inside `setupNative()`, add a branch for `svc.kind === "mongo"` that creates the
  db/user after the service starts (mirror `provisionPostgres`).

Keep the logic in `bootstrap.ts` — the manifest stays declarative data.

### 4. Backend reads the new env var

Add `MONGO_URL` to `src/backend/.env.example` and to `src/backend/src/shared/config/env.ts`.

## Verify

```bash
npx tsx scripts/bootstrap.ts --yes        # non-interactive dry-ish run
npm run dev:check                          # verify_connection.ts
cat .dev/services.json                     # what was resolved
```

## Don't

- Don't hardcode ports/hosts in the backend — read from `process.env.<ENV_VAR>`.
- Don't use `latest` image tags — pin a version.
- Don't commit `.env` or `.dev/`.
- Don't add optional dev-only tools here — this manifest is for **mandatory** deps.
