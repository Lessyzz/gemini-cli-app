#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "→ [1/2] Frontend compiling..."
cd "$ROOT/frontend"
npm install
npm run build

echo "→ [2/2] Go binary compiling for all platforms..."
cd "$ROOT/backend"
go mod tidy

OUT="$ROOT/dist"
mkdir -p "$OUT"

platforms=(
  "windows/amd64/.exe"
  "darwin/arm64/"
  "darwin/amd64/"
  "linux/amd64/"
  "linux/arm64/"
)

for platform in "${platforms[@]}"; do
  IFS='/' read -r os arch ext <<< "$platform"
  output_name="gemini-cli-app-${os}-${arch}${ext}"
  
  echo "Building for ${os}/${arch}..."
  CGO_ENABLED=0 GOOS="$os" GOARCH="$arch" go build -ldflags "-s -w" -o "$OUT/$output_name" .
  echo "✓ Produced: dist/$output_name"
done

echo "✓ All builds finished successfully!"
