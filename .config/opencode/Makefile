SHELL := /usr/bin/env bash

install:
	@set -Eeuo pipefail; \
	[[ -f .env ]] || { echo "❌ .env file not found"; exit 1; }; \
	[[ -f opencode.config.tmpl.json ]] || { echo "❌ Template not found"; exit 1; }; \
	set -a; source .env; set +a; \
	set -u; \
	envsubst < opencode.config.tmpl.json > opencode.json; \
	echo "✅ Installed config to ./opencode.json"
