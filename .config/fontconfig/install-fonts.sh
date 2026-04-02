#!/usr/bin/env bash
set -euo pipefail

OS="$(uname -s)"

if [ "$OS" = "Darwin" ]; then
    FONT_DIR="$HOME/Library/Fonts"
else
    FONT_DIR="/usr/local/share/fonts"
fi

echo "[*] Detecting latest Nerd Fonts release..."
LATEST_URL=$(curl -s https://api.github.com/repos/ryanoasis/nerd-fonts/releases/latest \
    | grep "browser_download_url" \
    | grep "Meslo.zip" \
    | cut -d '"' -f 4)

if [ -z "$LATEST_URL" ]; then
    echo "[!] Could not find latest Meslo release URL"
    exit 1
fi

echo "[*] Latest release found: $LATEST_URL"

echo "[*] Creating font directory at ${FONT_DIR}..."
if [ "$OS" = "Darwin" ]; then
    mkdir -p "${FONT_DIR}"
else
    sudo mkdir -p "${FONT_DIR}"
fi

echo "[*] Downloading Meslo Nerd Font..."
TMP_ZIP="$(mktemp)"
curl -Lo "${TMP_ZIP}" "${LATEST_URL}"

echo "[*] Extracting fonts..."
if [ "$OS" = "Darwin" ]; then
    unzip -o "${TMP_ZIP}" -d "${FONT_DIR}"
else
    sudo unzip -o "${TMP_ZIP}" -d "${FONT_DIR}"
fi

echo "[*] Cleaning up..."
rm -f "${TMP_ZIP}"

echo "[*] Verifying installation..."
if [ "$OS" = "Darwin" ]; then
    # macOS auto-discovers fonts in ~/Library/Fonts; no fc-cache needed
    ls "${FONT_DIR}" | grep -i "Meslo" || {
        echo "[!] Meslo Nerd Font files not found in ${FONT_DIR}"
        exit 1
    }
else
    echo "[*] Updating font cache..."
    sudo fc-cache -fv
    fc-list | grep "MesloLGS Nerd Font" || {
        echo "[!] MesloLGS Nerd Font not found in fc-list"
        exit 1
    }
fi

echo "[+] Meslo Nerd Font installed and verified successfully!"
