# Presco Monorepo Release & SemVer Policy

This document details the exact release and versioning requirements for the Presco (INI3A-EQ3) monorepo.

## 1. Monorepo Structure & Synchronization

Presco contains multiple packages and configurations that must remain synchronized:

```
.
├── package.json                   # Root package (canonical version)
├── src/
│   ├── backend/
│   │   └── package.json           # Express 5 backend version
│   └── frontend/
│       ├── package.json           # React Native Expo version
│       └── app.json               # expo.version and expo.android.versionCode
```

When incrementing the version:
1. `package.json` -> `"version": "<newVersion>"`
2. `src/backend/package.json` -> `"version": "<newVersion>"`
3. `src/frontend/package.json` -> `"version": "<newVersion>"`
4. `src/frontend/app.json`:
   - `expo.version`: `"<newVersion>"`
   - `expo.android.versionCode`: `previousCode + 1` (integer)

## 2. Automated Script

Use the project's atomic bumping utility:
```bash
# Patch
npm run version:bump
# Minor
npm run version:bump:minor
# Major
npm run version:bump:major
```

## 3. GitHub Actions Release Automation

Releases are triggered by git tags matching `v*.*.*` or manual `workflow_dispatch`:
- File: `.github/workflows/release.yml`
- Steps:
  1. Checks out repository.
  2. Sets up Node.js and Java 17 (Temurin).
  3. Validates types with `npm run typecheck`.
  4. Runs tests with `npm test`.
  5. Runs Expo prebuild (`npx expo prebuild --platform android`).
  6. Compiles Android release APK via `./gradlew assembleRelease`.
  7. Publishes release to GitHub Releases with generated changelog and APK attached.
