# Enable Vi key bindings for command-line editing
fish_vi_key_bindings
# Disable the default Fish greeting message
set fish_greeting ""
# Add paths for Ruby gems and Sonar Scanner to the system PATH
set -gx PATH /home/roger/.gem/ruby/2.7.0/bin /opt/sonar-scanner/bin /home/roger/.fly/bin $PATH
# Enable Powerline fonts for the theme
set -g theme_powerline_fonts yes
# Disable prompt modification by Python virtual environments (handled by the theme)
set -x VIRTUAL_ENV_DISABLE_PROMPT 1
# Set the Bobthefish theme color scheme to dark
set -g theme_color_scheme dark
# Disable date display in the theme's prompt
set -g theme_display_date no
# Set the terminal type for compatibility (ensures colors and features work correctly)
set -x TERM xterm-256color
# Set the default command-line editor to Vim
set -x EDITOR vim
# Set the default visual editor (often used by programs like git) to Vim
set -x VISUAL vim

# Alias for managing dotfiles using a bare Git repository
alias config='/usr/bin/git --git-dir=$HOME/.cfg/ --work-tree=$HOME'
# Add interactive confirmation prompts before removing files
alias rm='rm -i'
# Add interactive confirmation prompts before moving/renaming files
alias mv='mv -i'
# Shortcut to navigate to the parent directory
alias ..='cd ..'
# Shortcut for the Doom Emacs command-line interface
alias doom='$HOME/.config/emacs/bin/doom'
# Use 'eza' for directory listings: long format, all files, colors, icons, dirs first
alias ls='eza -la --color=always --group-directories-first --icons'
# Ping personal website
alias pr='ping rogs.me'
# Get current public IP address using ifconfig.me
alias my-ip="curl ifconfig.me"
# Use emacsclient to connect to a running Emacs daemon for faster startup
alias emacs="emacsclient -c -a 'emacs'"
# Use ripgrep (rg) for searching: show line numbers, filename, smart case sensitivity
alias grep="rg -n --with-filename --smart-case"
# Specific xrandr command to configure displays for a docking station setup
alias dock="xrandr --output DP-2-3 --auto --primary --left-of DP-2-1 --output DP-2-1 --auto --output eDP-1 --off"
# Cool cmatrix
alias cmatrix="cmatrix -a -r"
# Open a quick webserver at point
alias s="python -m http.server 8000"

# Source a separate file containing custom Fish shell abbreviations
source "$HOME/.config/fish/abbreviations.fish"

# Monitor CPU frequency in real-time using 'watch'
alias cpuinfo="watch -n1 'grep \"^[c]pu MHz\" /proc/cpuinfo'"
# Connect to ProtonVPN, specifying US servers and UDP protocol
alias vpn-on="sudo protonvpn c --cc US -p UDP"
# Disconnect from ProtonVPN
alias vpn-off="sudo protonvpn d"
# Attempt to fix Bluetooth issues by restarting services and running a connection script
alias fix-bluetooth="sudo systemctl restart bluetooth.service && sleep 10 && sudo systemctl restart logid.service && bash ~/.config/i3/connect-speakers.sh > /dev/null 2>&1"
# Use xprop to get the WM_CLASS property of a window (useful for window manager rules)
alias get-class="xprop | grep WM_CLASS"
# Update the aider-chat tool using uv and pip, ensuring playwright dependencies are met
alias update-aider="uv tool install --force --python python3.12 --with pip aider-chat@latest && /home/roger/.local/share/uv/tools/aider-chat/bin/python3 -m pip install --upgrade --upgrade-strategy only-if-needed aider-chat[playwright] && /home/roger/.local/share/uv/tools/aider-chat/bin/python3 -m playwright install chromium"

# tabtab source for packages (Currently commented out)
# Provides generic completion support for various tools.
# uninstall by removing these lines
# [ -f ~/.config/tabtab/__tabtab.fish ]; and . ~/.config/tabtab/__tabtab.fish; or true

# The next line updates PATH for the Google Cloud SDK.
# Sources the script provided by Google Cloud SDK to add its tools to the PATH.
if [ -f '/home/roger/.google-cloud-sdk/path.fish.inc' ]; . '/home/roger/.google-cloud-sdk/path.fish.inc'; end

# Ngrok completion
# Enables command-line completion for the ngrok tool if it's installed.
if command -v ngrok >/dev/null
    eval (ngrok completion | source)
end

# Kubectl completion
# Enables command-line completion for the kubectl (Kubernetes CLI) tool if it's installed.
if command -v kubectl >/dev/null
    eval (kubectl completion fish | source)
end

# ASDF
# Sources the initialization script for the ASDF version manager, making its commands available.
source ~/.asdf/asdf.fish

# flyctl
