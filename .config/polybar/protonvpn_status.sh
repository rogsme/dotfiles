#!/bin/bash
set -euo pipefail
IFS=$'\n\t'

PROTONVPN_STATUS=$(curl -s https://am.i.mullvad.net/country)

if echo $PROTONVPN_STATUS | grep -q 'Uruguay'; then
  echo "%{u#f90000}VPN %{T5}🚫%{T-}"
 else
  echo "%{u#75d85a}VPN %{T5}✅%{T-}"
fi
