#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "→ [1/2] Frontend compiling..."
cd "$ROOT/frontend"
npm install
npm run build

echo "→ [2/2] Go binary compiling..."
cd "$ROOT/backend"
go mod tidy

TARGET="${1:-host}"
OUT="$ROOT/dist"
mkdir -p "$OUT"

case "$TARGET" in
  windows)
    CGO_ENABLED=0 GOOS=windows GOARCH=amd64 go build -ldflags "-s -w" -o "$OUT/gemini-cli-app.exe" .
    echo "✓ Produced: dist/gemini-cli-app.exe"
    ;;
  mac)
    CGO_ENABLED=0 GOOS=darwin GOARCH=arm64 go build -ldflags "-s -w" -o "$OUT/gemini-cli-app-mac" .
    echo "✓ Produced: dist/gemini-cli-app-mac"
    ;;
  linux)
    CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags "-s -w" -o "$OUT/gemini-cli-app-linux" .
    echo "✓ Produced: dist/gemini-cli-app-linux"
    ;;
  *)
    go build -ldflags "-s -w" -o "$OUT/gemini-cli-app" .
    echo "✓ Produced: dist/gemini-cli-app (current platform)"
    ;;
esac
