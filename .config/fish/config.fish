#
# | '__/ _ \ / _` / __|    Roger González
# | | | (_) | (_| \__ \    https://rogs.me
# |_|  \___/ \__, |___/    https://git.rogs.me
#            |___/
#
fish_vi_key_bindings
set fish_greeting ""
set -gx PATH /home/roger/.gem/ruby/2.7.0/bin /opt/sonar-scanner/bin $PATH
set -g theme_powerline_fonts yes
set -x VIRTUAL_ENV_DISABLE_PROMPT 1
set -g theme_color_scheme dark
set -g theme_display_date no
set -x TERM xterm-256color
set -x EDITOR vim
set -x VISUAL vim
alias config='/usr/bin/git --git-dir=$HOME/.cfg/ --work-tree=$HOME'
alias rm='rm -i'
alias mv='mv -i'
alias ..='cd ..'
alias doom='$HOME/.config/emacs/bin/doom'
alias ls='exa -la --color=always --group-directories-first --icons'
alias pr='ping rogs.me'
alias my-ip="curl ifconfig.me"
alias emacs="emacsclient -c -a 'emacs'"
alias grep="rg -n --with-filename --smart-case"
alias dock="xrandr --output DP-2-3 --auto --primary --left-of DP-2-1 --output DP-2-1 --auto --output eDP-1 --off"
source "$HOME/.config/fish/abbreviations.fish"
alias cpuinfo="watch -n1 'grep \"^[c]pu MHz\" /proc/cpuinfo'"
alias vpn-on="sudo protonvpn c --cc US -p UDP"
alias vpn-off="sudo protonvpn d"
alias fix-bluetooth="sudo systemctl restart bluetooth.service && sleep 10 && sudo systemctl restart logid.service && bash ~/.config/i3/connect-speakers.sh > /dev/null 2>&1"
alias get-class="xprop | grep WM_CLASS"

# tabtab source for packages
# uninstall by removing these lines
# [ -f ~/.config/tabtab/__tabtab.fish ]; and . ~/.config/tabtab/__tabtab.fish; or true

# The next line updates PATH for the Google Cloud SDK.
if [ -f '/home/roger/.google-cloud-sdk/path.fish.inc' ]; . '/home/roger/.google-cloud-sdk/path.fish.inc'; end

# Ngrok completion
if command -v ngrok >/dev/null
    eval (ngrok completion | source)
end

# Kubectl completion
if command -v kubectl >/dev/null
    eval (kubectl completion fish | source)
end

# ASDF
source ~/.asdf/asdf.fish
