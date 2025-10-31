#!/usr/bin/env bash
#
# | '__/ _ \ / _` / __|    Roger González
# | | | (_) | (_| \__ \    https://rogs.me
# |_|  \___/ \__, |___/    https://git.rogs.me
#            |___/
#
# Restore dotfiles using the git bare-repo method and setup system.

set -euo pipefail

REPO_URL="https://git.rogs.me/rogs/dotfiles"
GIT_DIR="$HOME/.cfg"
WORK_TREE="$HOME"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}==>${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}==>${NC} $1"
}

log_error() {
    echo -e "${RED}==>${NC} $1"
}

# Detect distribution
detect_distro() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        case "$ID" in
            manjaro)
                echo "manjaro"
                ;;
            debian)
                echo "debian"
                ;;
            *)
                log_error "Unsupported distribution: $ID"
                exit 1
                ;;
        esac
    else
        log_error "Cannot detect distribution"
        exit 1
    fi
}

# Install packages based on distro
install_packages() {
    local distro=$(detect_distro)
    
    log_info "Detected distribution: $distro"
    
    case "$distro" in
        manjaro)
            log_info "Installing packages from .new-package-list..."
            if [ -f "$HOME/.new-package-list" ]; then
                sudo pacman -S --needed --noconfirm $(cat "$HOME/.new-package-list" | tr '\n' ' ')
            else
                log_warn ".new-package-list not found, skipping pacman packages"
            fi
            
            log_info "Installing AUR packages from .new-aur-package-list..."
            if [ -f "$HOME/.new-aur-package-list" ]; then
                # Check if yay is installed
                if ! command -v yay &> /dev/null; then
                    log_error "yay is not installed. Please install yay first."
                    exit 1
                fi
                yay -S --needed --noconfirm $(cat "$HOME/.new-aur-package-list" | tr '\n' ' ')
            else
                log_warn ".new-aur-package-list not found, skipping AUR packages"
            fi
            ;;
            
        debian)
            log_info "Updating package lists..."
            sudo apt update
            
            log_info "Installing packages from .debian-package-list..."
            if [ -f "$HOME/.debian-package-list" ]; then
                sudo apt install -y $(cat "$HOME/.debian-package-list" | tr '\n' ' ')
            else
                log_warn ".debian-package-list not found, skipping apt packages"
            fi
            ;;
    esac
}

# Setup fish shell
setup_fish() {
    log_info "Setting up fish shell..."
    
    # Change default shell to fish
    if [ "$SHELL" != "$(which fish)" ]; then
        log_info "Changing default shell to fish..."
        chsh -s $(which fish)
        log_info "Default shell changed. Please log out and log back in for changes to take effect."
    else
        log_info "Fish is already the default shell"
    fi
    
    # Install Oh My Fish
    if [ ! -d "$HOME/.local/share/omf" ]; then
        log_info "Installing Oh My Fish..."
        curl -L https://get.oh-my.fish | fish
    else
        log_info "Oh My Fish is already installed"
    fi
    
    # Install Tide theme
    log_info "Installing Tide theme..."
    fish -c "omf install tide" || log_warn "Tide installation failed or already installed"
    
    log_info "Fish shell setup complete (Tide not configured yet)"
}

# Install fonts
install_fonts() {
    log_info "Installing Nerd Fonts..."
    
    if [ -f "$HOME/.config/fontconfig/install-fonts.sh" ]; then
        bash "$HOME/.config/fontconfig/install-fonts.sh"
    else
        log_warn "Font installation script not found at $HOME/.config/fontconfig/install-fonts.sh"
    fi
}

# Install Doom Emacs
install_doom_emacs() {
    log_info "Installing Doom Emacs..."
    
    if [ -d "$HOME/.config/emacs" ]; then
        log_warn "Doom Emacs directory already exists at $HOME/.config/emacs"
        read -p "Do you want to remove it and reinstall? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            rm -rf "$HOME/.config/emacs"
        else
            log_info "Skipping Doom Emacs installation"
            return
        fi
    fi
    
    log_info "Cloning Doom Emacs..."
    git clone --depth 1 https://github.com/doomemacs/doomemacs ~/.config/emacs
    
    log_info "Running Doom install..."
    ~/.config/emacs/bin/doom install
    
    log_info "Doom Emacs installation complete"
}

# Install OpenCode
install_opencode() {
    log_info "Installing OpenCode..."
    
    if command -v opencode &> /dev/null; then
        log_warn "OpenCode is already installed"
        read -p "Do you want to reinstall? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Skipping OpenCode installation"
            return
        fi
    fi
    
    log_info "Downloading and installing OpenCode..."
    curl -fsSL https://opencode.ai/install | bash
    
    log_info "OpenCode installation complete"
}

# Install Aider
install_aider() {
    log_info "Installing Aider..."
    
    if command -v aider &> /dev/null; then
        log_warn "Aider is already installed"
        read -p "Do you want to reinstall? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Skipping Aider installation"
            return
        fi
    fi
    
    log_info "Downloading and installing Aider..."
    curl -LsSf https://aider.chat/install.sh | sh
    
    log_info "Aider installation complete"
}

# Clone and setup dotfiles
setup_dotfiles() {
    log_info "Cloning bare repo into $GIT_DIR..."
    
    if [ -d "$GIT_DIR" ]; then
        log_warn "Git directory $GIT_DIR already exists"
        read -p "Do you want to remove it and re-clone? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            rm -rf "$GIT_DIR"
        else
            log_info "Using existing git directory"
            return
        fi
    fi
    
    git clone --bare "$REPO_URL" "$GIT_DIR"
    
    config() {
        /usr/bin/git --git-dir="$GIT_DIR" --work-tree="$WORK_TREE" "$@"
    }
    
    log_info "Attempting initial checkout..."
    mkdir -p "$HOME/.config-backup"
    
    if config checkout; then
        log_info "Checked out dotfiles successfully."
    else
        log_warn "Backing up pre-existing dotfiles..."
        config checkout 2>&1 | egrep "\s+\." | awk '{print $1}' | while read -r f; do
            mkdir -p "$(dirname "$HOME/.config-backup/$f")"
            mv "$HOME/$f" "$HOME/.config-backup/$f"
            log_info "Backed up: $f"
        done
        
        log_info "Retrying checkout..."
        config checkout
    fi
    
    config config status.showUntrackedFiles no
    log_info "Dotfiles setup complete"
}

# Main installation flow
main() {
    log_info "Starting dotfiles installation and system setup..."
    echo
    
    # Step 1: Clone and setup dotfiles first
    setup_dotfiles
    echo
    
    # Step 2: Install packages
    install_packages
    echo
    
    # Step 3: Setup fish shell
    setup_fish
    echo
    
    # Step 4: Install fonts
    install_fonts
    echo
    
    # Step 5: Install Doom Emacs
    install_doom_emacs
    echo
    
    # Step 6: Install OpenCode
    install_opencode
    echo
    
    # Step 7: Install Aider
    install_aider
    echo
    
    log_info "Installation complete!"
    log_info "You can use the 'config' function to manage your dotfiles."
    log_info "Please log out and log back in for shell changes to take effect."
}

# Run main installation
main
