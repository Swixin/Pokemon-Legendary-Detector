#!/usr/bin/env bash
# Install an official Node.js build into ~/.local/opt and put it first on PATH.
# Usage: ./setup-node.sh [version]     e.g. ./setup-node.sh 26.13.0   (default: 26.13.0)
set -euo pipefail

VERSION="${1:-26.13.0}"
VERSION="${VERSION#v}"
INSTALL_DIR="$HOME/.local/opt"
NAME="node-v${VERSION}-linux-x64"
URL="https://nodejs.org/dist/v${VERSION}"
BASHRC="$HOME/.bashrc"
PATH_LINE='export PATH="$HOME/.local/opt/node/bin:$PATH"'

if [ "$(uname -m)" != "x86_64" ] || [ "$(uname -s)" != "Linux" ]; then
  echo "This script only handles Linux x86_64 (found $(uname -s) $(uname -m))." >&2
  exit 1
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "==> Downloading Node v${VERSION}"
curl -fsSL -o "$TMP/$NAME.tar.xz" "$URL/$NAME.tar.xz"
curl -fsSL -o "$TMP/SHASUMS256.txt" "$URL/SHASUMS256.txt"

echo "==> Verifying checksum"
(cd "$TMP" && grep " $NAME.tar.xz\$" SHASUMS256.txt | sha256sum -c -)

echo "==> Installing to $INSTALL_DIR/$NAME"
mkdir -p "$INSTALL_DIR"
rm -rf "${INSTALL_DIR:?}/$NAME"
tar -xJf "$TMP/$NAME.tar.xz" -C "$INSTALL_DIR"
ln -sfn "$INSTALL_DIR/$NAME" "$INSTALL_DIR/node"

echo "==> Adding to PATH in $BASHRC"
if grep -qF "$PATH_LINE" "$BASHRC" 2>/dev/null; then
  echo "    already there, skipping"
else
  printf '\n# Node.js (official tarball in ~/.local/opt/node)\n%s\n' "$PATH_LINE" >> "$BASHRC"
fi

echo
echo "Installed: $("$INSTALL_DIR/node/bin/node" -v), npm $(PATH="$INSTALL_DIR/node/bin:$PATH" npm -v)"
echo "Open a new terminal, or run:  source ~/.bashrc"
echo "Then check:  node -v   and   which node"
