#!/usr/bin/env bash
set -Eeuo pipefail
printf '\n--- Vitest ---\n'; npm test
printf '\n--- API/SQLite ---\n'; npm run test:api
printf '\n--- Vite build ---\n'; npm run build
printf '\n--- API demo ---\n'; npm run demo:api
printf '\n--- Project files ---\n'
for f in desktop/main.cjs desktop/preload.cjs server/api.cjs server/storage.cjs electron-builder.yml .github/workflows/ci.yml .github/workflows/release.yml; do test -s "$f" || { echo "Missing $f" >&2; exit 1; }; done
printf '\nAll scripted checks passed. EXE/AppImage runtime still requires validation on real hosts.\n'
