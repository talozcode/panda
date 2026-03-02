#!/usr/bin/env bash
set -euo pipefail

echo "== Panda Flood Fly deploy context check =="
echo "cwd: $(pwd)"
echo "branch: $(git branch --show-current 2>/dev/null || echo 'n/a')"
echo "commit: $(git rev-parse --short HEAD 2>/dev/null || echo 'n/a')"

printf "\nChecking required files...\n"
for f in fly.toml Dockerfile package.json server.mjs; do
  if [[ ! -f "$f" ]]; then
    echo "ERROR: missing $f in current directory"
    exit 1
  fi
  echo "ok: $f"
done

printf "\nChecking fly.toml build section...\n"
if ! rg -n "^\[build\]" fly.toml >/dev/null; then
  echo "ERROR: fly.toml is missing [build] section"
  exit 1
fi
if ! rg -n "dockerfile\s*=\s*\"Dockerfile\"" fly.toml >/dev/null; then
  echo "ERROR: fly.toml [build] does not point to Dockerfile"
  exit 1
fi

printf "\nChecking Dockerfile for npm ci references...\n"
if rg -n "^[^#]*npm ci" Dockerfile >/dev/null; then
  echo "WARNING: Dockerfile still contains npm ci; lockfile may be required"
else
  echo "ok: no npm ci usage found"
fi

printf "\nIf deploy still says no Dockerfile/buildpacks configured, verify target app and config path:\n"
echo "  fly status -a panda-w5karw"
echo "  fly deploy --config fly.toml -a panda-w5karw --remote-only --build-only --push --no-cache"
