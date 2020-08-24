#!/bin/bash
set -euo pipefail

LANG=$(setxkbmap -query | grep layout | awk -F ' ' '{print $2}')

if [ "$LANG" = 'us' ]; then
  echo "%{T5}󾓦%{T-}"
else
  echo "%{T5}󾓫%{T-}"
fi
