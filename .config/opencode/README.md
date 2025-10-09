# OpenCode Configuration Setup

This directory contains the configuration files for OpenCode. To set up your local configuration:

## Steps

1. **Create your own `.env` file**: Copy `.env.example` to `.env` and fill in your API keys.
   ```bash
   cp .env.example .env
   # Edit .env with your actual API keys
   ```

2. **Run `make install`**: This will generate the `opencode.json` configuration file by substituting environment variables from your `.env` file into the template.
   ```bash
   make install
   ```

That's it! The configuration file will be generated.

## Important Notes

- **NEVER ADD `opencode.json` TO THE REPOSITORY!** It contains sensitive API keys.
- The `.env` file should also not be committed.
- Only commit the template files (`.env.example`, `opencode.config.tmpl.json`, `Makefile`, and this README).
