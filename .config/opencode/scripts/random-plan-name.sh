#!/usr/bin/env bash
set -euo pipefail

# Generate a random 3-word kebab-case name for plan files.
# Prefers system dictionary words and falls back to an embedded list.

words=()

if [[ -f "/usr/share/dict/words" ]]; then
  while IFS= read -r line; do
    if [[ "$line" =~ ^[a-z]{4,10}$ ]]; then
      words+=("$line")
    fi
  done < "/usr/share/dict/words"
fi

if [[ "${#words[@]}" -lt 100 ]]; then
  words=(
    amber atlas bamboo beacon breeze canyon cedar citrus comet coral
    dapper dawn delta ember falcon fern figment forest galaxy garden
    glacier harbor hazel emberlight island jasmine juniper kettle lagoon
    lantern maple meadow mercury misty mosaic nectar ocean olive orchid
    pebble pine prism quartz raven ripple rocket saffron sage scarlet
    shadow silver spruce summit sunset thunder tide timber topaz valley
    velvet walnut willow winter zephyr acorn aurora birch blossom copper
    crimson driftwood dune eclipse fable feather firefly frost garnet
    granite harborlight honey horizon indigo ivy lagoonlight limestone
    lucid marble meadowlight moonbeam morning opal parchment pebblelight
    pinecone raincloud rosemary sandstone sequoia shoreline skylight
    snowdrop songbird starlight stonebridge sunflower terracotta trail
    twilight veridian violet wildflower windmill woodland
  )
fi

pick_word() {
  local index
  index=$((RANDOM % ${#words[@]}))
  printf "%s" "${words[$index]}"
}

w1="$(pick_word)"
w2="$(pick_word)"
while [[ "$w2" == "$w1" ]]; do
  w2="$(pick_word)"
done

w3="$(pick_word)"
while [[ "$w3" == "$w1" || "$w3" == "$w2" ]]; do
  w3="$(pick_word)"
done

printf "%s-%s-%s\n" "$w1" "$w2" "$w3"
