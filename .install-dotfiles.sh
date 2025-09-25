#!/usr/bin/env bash
#
# | '__/ _ \ / _` / __|    Roger González
# | | | (_) | (_| \__ \    https://rogs.me
# |_|  \___/ \__, |___/    https://git.rogs.me
#            |___/
#
# Restore dotfiles using the git bare-repo method.

set -euo pipefail

REPO_URL="https://git.rogs.me/rogs/dotfiles"
GIT_DIR="$HOME/.cfg"
WORK_TREE="$HOME"

echo "==> Cloning bare repo into $GIT_DIR ..."
rm -rf "$GIT_DIR"
git clone --bare "$REPO_URL" "$GIT_DIR"

config() {
  /usr/bin/git --git-dir="$GIT_DIR" --work-tree="$WORK_TREE" "$@"
}

echo "==> Attempting initial checkout..."
mkdir -p "$HOME/.config-backup"
if config checkout; then
  echo "Checked out dotfiles."
else
  echo "Backing up pre-existing dotfiles..."
  config checkout 2>&1 | egrep "\s+\." | awk '{print $1}' | while read -r f; do
    mkdir -p "$(dirname "$HOME/.config-backup/$f")"
    mv "$HOME/$f" "$HOME/.config-backup/$f"
  done
fi

config checkout
config config status.showUntrackedFiles no

echo "==> Done. You can use the 'config' function in this shell to manage your dotfiles."
