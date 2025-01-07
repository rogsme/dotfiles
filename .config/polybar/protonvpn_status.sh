#!/bin/bash
set -euo pipefail
IFS=$'\n\t'

PROTONVPN_STATUS=$(curl -s https://am.i.mullvad.net/country)

if echo $PROTONVPN_STATUS | grep -q 'Uruguay'; then
  echo "🚫 VPN"
else
  echo "✅ VPN"
fi
