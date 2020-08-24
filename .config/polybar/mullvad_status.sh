#!/bin/bash
set -euo pipefail
IFS=$'\n\t'

MULLVAD_STATUS=$(mullvad status)

if echo $MULLVAD_STATUS | grep -q 'Connected'; then
  echo "%{u#75d85a}VPN %{T5}✅%{T-}"
 elif echo $MULLVAD_STATUS | grep -q 'Connecting'; then
   echo "VPN ..."
 else
  echo "%{u#f90000}VPN %{T5}🚫%{T-}"
fi
