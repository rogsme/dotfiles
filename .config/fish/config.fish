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
alias config='/usr/bin/git --git-dir=$HOME/.cfg/ --work-tree=$HOME'
alias rm='rm -i'
alias mv='mv -i'
alias ..='cd ..'
alias doom='$HOME/.config/emacs/bin/doom'
alias ls='exa -la --color=always --group-directories-first'
alias pr='ping rogs.me'
alias my-ip="curl ifconfig.me"
alias emacs="emacsclient -c -a 'emacs'"
alias ptc="pritunl-client"
alias gr="grep --color=auto -rin -C 3 --exclude-dir={.git,.svn,CVS,.bzr,.hg,.idea,.tox,.cache,.vscode,.npm,.yarn,.stack,__pycache__}"
source "$HOME/.config/fish/abbreviations.fish"

# tabtab source for packages
# uninstall by removing these lines
# [ -f ~/.config/tabtab/__tabtab.fish ]; and . ~/.config/tabtab/__tabtab.fish; or true

# The next line updates PATH for the Google Cloud SDK.
if [ -f '/home/roger/.google-cloud-sdk/path.fish.inc' ]; . '/home/roger/.google-cloud-sdk/path.fish.inc'; end
