install:
	@set -euo pipefail; \
	if [ ! -f ".env" ]; then echo "❌ .env file not found"; exit 1; fi; \
	if [ ! -f "opencode.config.tmpl.json" ]; then echo "❌ Template not found"; exit 1; fi; \
	mkdir -p "$${XDG_CONFIG_HOME:-$$HOME/.config}/opencode"; \
	set -a; source .env; set +a; \
	envsubst < opencode.config.tmpl.json > "$${XDG_CONFIG_HOME:-$$HOME/.config}/opencode/opencode.json"; \
	echo "✅ Installed config to ~/.config/opencode/opencode.json"
