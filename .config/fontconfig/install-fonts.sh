#!/usr/bin/env bash
set -euo pipefail

FONT_DIR="/usr/local/share/fonts"

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
sudo mkdir -p "${FONT_DIR}"

echo "[*] Downloading Meslo Nerd Font..."
TMP_ZIP="$(mktemp)"
wget -qO "${TMP_ZIP}" "${LATEST_URL}"

echo "[*] Extracting fonts..."
sudo unzip -o "${TMP_ZIP}" -d "${FONT_DIR}"

echo "[*] Cleaning up..."
rm -f "${TMP_ZIP}"

echo "[*] Updating font cache..."
sudo fc-cache -fv

echo "[*] Verifying installation..."
fc-list | grep "MesloLGS Nerd Font" || {
    echo "[!] MesloLGS Nerd Font not found in fc-list"
    exit 1
}

echo "[+] Meslo Nerd Font installed and verified successfully!"

